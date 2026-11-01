import mongoose from 'mongoose';
import Status from '../models/Status.js';
import Persona from '../models/Persona.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { getIO } from '../config/socket.js';
import { sendPushNotifications } from '../config/push.js';

// Create a new status (Text, Image, Video) with 24-hour expiration
export const createStatus = async (req, res) => {
  try {
    const { type = 'text', content = '', mediaUrl = '', backgroundColor = '#6366f1', fontStyle = 'default', privacy } = req.body;

    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    if (type === 'text' && !content.trim()) {
      return res.status(400).json({ success: false, message: 'Text status content cannot be empty' });
    }

    if ((type === 'image' || type === 'video') && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Media URL is required for image/video status' });
    }

    const author = await Persona.findById(req.personaId).select('displayName username avatar statusPrivacy contacts blockedPersonas');
    if (!author) {
      return res.status(404).json({ success: false, message: 'Author persona not found' });
    }

    // Determine privacy settings
    let privacySettings = {
      type: privacy?.type || author.statusPrivacy?.defaultType || 'all_contacts',
      excludedPersonas: privacy?.excludedPersonas || author.statusPrivacy?.mutedViewers || []
    };

    // Calculate exact 24-hour expiration from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newStatus = await Status.create({
      authorPersonaId: req.personaId,
      type,
      content: content.trim(),
      mediaUrl: mediaUrl.trim(),
      backgroundColor: backgroundColor || '#6366f1',
      fontStyle: fontStyle || 'default',
      privacy: privacySettings,
      viewers: [],
      expiresAt
    });

    const populatedStatus = await Status.findById(newStatus._id)
      .populate('authorPersonaId', 'displayName username avatar');

    // Notify connected clients via Socket.IO
    const io = getIO();
    if (io) {
      io.emit('status:created', {
        status: populatedStatus,
        authorId: req.personaId
      });
    }

    res.status(201).json({ success: true, status: populatedStatus });
  } catch (error) {
    console.error('Error in createStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to create status', error: error.message });
  }
};

// Get the status feed: My statuses + Other users' statuses grouped by author
export const getStatusFeed = async (req, res) => {
  try {
    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    const currentPersonaId = req.personaId.toString();
    const now = new Date();

    // 1. Concurrently fetch persona details, blockers, direct conversations, and active statuses
    const [currentPersona, blockers, myConversations, myStatuses, otherActiveStatuses] = await Promise.all([
      Persona.findById(req.personaId)
        .select('contacts blockedPersonas mutedStatusPersonas statusPrivacy')
        .lean(),
      Persona.find({ blockedPersonas: req.personaId }).select('_id').lean(),
      Conversation.find({
        participants: req.personaId,
        $or: [{ spaceId: null }, { spaceId: { $exists: false } }]
      }).select('participants').lean(),
      Status.find({
        authorPersonaId: req.personaId,
        expiresAt: { $gt: now }
      })
        .populate('viewers.personaId', 'displayName username avatar')
        .sort({ createdAt: 1 })
        .lean(),
      Status.find({
        authorPersonaId: { $ne: req.personaId },
        expiresAt: { $gt: now }
      })
        .populate('authorPersonaId', 'displayName username avatar contacts')
        .sort({ createdAt: 1 })
        .lean()
    ]);

    if (!currentPersona) {
      return res.status(404).json({ success: false, message: 'Persona not found' });
    }

    const myBlockedIds = (currentPersona.blockedPersonas || []).map(id => id.toString());
    const mutedAuthorIds = new Set((currentPersona.mutedStatusPersonas || []).map(id => id.toString()));
    const myContactIds = new Set((currentPersona.contacts || []).map(id => id.toString()));

    // Collect all direct DM conversation partner IDs
    const myDmPartnerIds = new Set();
    for (const conv of (myConversations || [])) {
      for (const p of (conv.participants || [])) {
        const pIdStr = (p?._id || p)?.toString();
        if (pIdStr && pIdStr !== currentPersonaId) {
          myDmPartnerIds.add(pIdStr);
        }
      }
    }

    // Find users who have blocked me
    const blockerIds = blockers.map(b => b._id.toString());
    const allBlockedIds = new Set([...myBlockedIds, ...blockerIds]);

    // 2. Filter statuses according to privacy & blocking
    const eligibleStatuses = otherActiveStatuses.filter(st => {
      const author = st.authorPersonaId;
      if (!author || !author._id) return false;
      const authorId = author._id.toString();

      // Skip blocked personas
      if (allBlockedIds.has(authorId)) return false;

      // Check if current user is excluded by the author
      const excludedList = (st.privacy?.excludedPersonas || []).map(id => id.toString());
      if (excludedList.includes(currentPersonaId)) return false;

      // Check privacy scope
      const privacyType = st.privacy?.type || 'all_contacts';
      if (privacyType === 'all_contacts') {
        const authorContacts = (author.contacts || []).map(c => c.toString());
        // Visible if:
        // 1. Current user is in author's contacts
        // 2. Author is in current user's contacts
        // 3. Current user and author share an active direct DM conversation
        const isConnected = 
          authorContacts.includes(currentPersonaId) || 
          myContactIds.has(authorId) ||
          myDmPartnerIds.has(authorId);

        if (!isConnected) return false;
      }

      return true;
    });

    // 5. Group by author persona
    const authorMap = new Map();

    for (const st of eligibleStatuses) {
      const authorId = st.authorPersonaId._id.toString();
      if (!authorMap.has(authorId)) {
        authorMap.set(authorId, {
          persona: st.authorPersonaId,
          statuses: [],
          latestTimestamp: st.createdAt,
          hasUnseen: false,
          isMuted: mutedAuthorIds.has(authorId)
        });
      }

      const group = authorMap.get(authorId);
      const isSeen = (st.viewers || []).some(v => (v.personaId?._id || v.personaId)?.toString() === currentPersonaId);
      
      group.statuses.push({
        ...st,
        isSeen
      });

      if (!isSeen) {
        group.hasUnseen = true;
      }

      if (new Date(st.createdAt) > new Date(group.latestTimestamp)) {
        group.latestTimestamp = st.createdAt;
      }
    }

    const groups = Array.from(authorMap.values());

    // 6. Partition into Recent (unseen), Viewed (all seen), and Muted
    const recentStatuses = [];
    const viewedStatuses = [];
    const mutedStatuses = [];

    for (const grp of groups) {
      if (grp.isMuted) {
        mutedStatuses.push(grp);
      } else if (grp.hasUnseen) {
        recentStatuses.push(grp);
      } else {
        viewedStatuses.push(grp);
      }
    }

    // Sort recent & viewed by latest activity (newest first)
    recentStatuses.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
    viewedStatuses.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
    mutedStatuses.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));

    // Deduplicate viewers in myStatuses
    const sanitizedMyStatuses = myStatuses.map(st => {
      const seen = new Set();
      const uniqueViewers = [];
      for (const v of (st.viewers || [])) {
        const vId = (v.personaId?._id || v.personaId)?.toString();
        if (vId && !seen.has(vId)) {
          seen.add(vId);
          uniqueViewers.push(v);
        }
      }
      return { ...st, viewers: uniqueViewers };
    });

    res.json({
      success: true,
      myStatuses: sanitizedMyStatuses,
      recentStatuses,
      viewedStatuses,
      mutedStatuses,
      totalUpdatesCount: recentStatuses.length + viewedStatuses.length
    });
  } catch (error) {
    console.error('Error in getStatusFeed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch status feed', error: error.message });
  }
};

// Mark a status as viewed by the current persona
export const viewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    const status = await Status.findById(id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const currentPersonaId = req.personaId.toString();

    // Check if already viewed
    const alreadyViewed = (status.viewers || []).some(
      v => (v.personaId?._id || v.personaId)?.toString() === currentPersonaId
    );

    if (!alreadyViewed) {
      status.viewers.push({
        personaId: req.personaId,
        viewedAt: new Date()
      });
      await status.save();

      // Emit socket notification to BOTH author and viewer
      const io = getIO();
      if (io) {
        const payload = {
          statusId: status._id,
          authorPersonaId: status.authorPersonaId,
          viewerPersonaId: req.personaId
        };
        io.to(`persona:${status.authorPersonaId}`).emit('status:viewed', payload);
        io.to(`persona:${currentPersonaId}`).emit('status:viewed', payload);
      }
    }

    res.json({ success: true, viewersCount: status.viewers.length });
  } catch (error) {
    console.error('Error in viewStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to record status view', error: error.message });
  }
};

// Delete a status item before 24-hour expiration
export const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    const status = await Status.findById(id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (status.authorPersonaId.toString() !== req.personaId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this status' });
    }

    await Status.findByIdAndDelete(id);

    // Broadcast deletion
    const io = getIO();
    if (io) {
      io.emit('status:deleted', { statusId: id, authorId: req.personaId });
    }

    res.json({ success: true, message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Error in deleteStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to delete status', error: error.message });
  }
};

// Reply to a status privately -> Creates/retrieves 1-on-1 direct conversation and sends a message
export const replyToStatus = async (req, res) => {
  try {
    const { statusId, content = '', reaction = '' } = req.body;

    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    if (!statusId) {
      return res.status(400).json({ success: false, message: 'statusId is required' });
    }

    const messageText = (content || reaction || '').trim();
    if (!messageText) {
      return res.status(400).json({ success: false, message: 'Reply content or reaction required' });
    }

    const status = await Status.findById(statusId).populate('authorPersonaId', 'displayName username avatar pushTokens');
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status story not found or has expired' });
    }

    const authorPersona = status.authorPersonaId;
    const authorId = authorPersona._id.toString();
    const currentPersonaId = req.personaId.toString();

    if (authorId === currentPersonaId) {
      return res.status(400).json({ success: false, message: 'Cannot reply to your own status' });
    }

    // Verify current persona is not excluded from seeing this status
    const excludedList = (status.privacy?.excludedPersonas || []).map(id => id.toString());
    if (excludedList.includes(currentPersonaId)) {
      return res.status(403).json({ success: false, message: 'You are not permitted to reply to this status' });
    }

    // Find or create direct conversation between sender and status author
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.personaId, authorPersona._id] },
      $or: [{ spaceId: null }, { spaceId: { $exists: false } }]
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [req.personaId, authorPersona._id]
      });
    } else if (conversation.deletedBy && conversation.deletedBy.length > 0) {
      await Conversation.findByIdAndUpdate(conversation._id, {
        $pull: { deletedBy: { $in: [req.personaId, authorPersona._id] } }
      });
    }

    // Add each other to contacts if not already added
    await Promise.all([
      Persona.findByIdAndUpdate(req.personaId, { $addToSet: { contacts: authorPersona._id } }),
      Persona.findByIdAndUpdate(authorPersona._id, { $addToSet: { contacts: req.personaId } })
    ]);

    // Create the status reply message
    const senderPersona = await Persona.findById(req.personaId).select('displayName username avatar');

    const statusReplyData = {
      statusId: status._id,
      mediaUrl: status.mediaUrl || '',
      mediaType: status.type || 'text',
      caption: status.content || '',
      text: status.type === 'text' ? status.content : '',
      authorPersonaId: authorPersona._id,
      authorName: authorPersona.displayName || authorPersona.username
    };

    const newMsg = await Message.create({
      conversationId: conversation._id,
      senderPersonaId: req.personaId,
      content: messageText,
      contentType: 'status_reply',
      statusReply: statusReplyData,
      status: 'sent'
    });

    // Update conversation
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: newMsg._id,
      updatedAt: new Date()
    });

    const populatedMsg = await Message.findById(newMsg._id)
      .populate('senderPersonaId', 'username displayName avatar bio status customStatus type')
      .populate('conversationId');

    // Emit real-time socket events
    const io = getIO();
    if (io) {
      const convIdStr = conversation._id.toString();
      io.to(convIdStr).emit('messages:received', populatedMsg);
      io.to(`persona:${authorId}`).emit('messages:received', populatedMsg);
    }

    // Push notification to the author
    try {
      const senderName = senderPersona?.displayName || senderPersona?.username || 'Someone';
      await sendPushNotifications(
        authorPersona.pushTokens || [],
        `Status reply from ${senderName}`,
        messageText,
        { conversationId: conversation._id.toString(), type: 'status_reply' }
      );
    } catch (pushErr) {
      // Continue even if push fails
    }

    res.status(201).json({
      success: true,
      message: populatedMsg,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('Error in replyToStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to send status reply', error: error.message });
  }
};

// Get current persona's status privacy settings
export const getStatusPrivacy = async (req, res) => {
  try {
    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    const persona = await Persona.findById(req.personaId)
      .select('statusPrivacy contacts')
      .populate('statusPrivacy.mutedViewers', 'displayName username avatar')
      .populate('contacts', 'displayName username avatar')
      .lean();

    if (!persona) {
      return res.status(404).json({ success: false, message: 'Persona not found' });
    }

    res.json({
      success: true,
      statusPrivacy: persona.statusPrivacy || { defaultType: 'all_contacts', mutedViewers: [] },
      contacts: persona.contacts || []
    });
  } catch (error) {
    console.error('Error in getStatusPrivacy:', error);
    res.status(500).json({ success: false, message: 'Failed to get status privacy', error: error.message });
  }
};

// Update status privacy settings (Default type & muted viewers)
export const updateStatusPrivacy = async (req, res) => {
  try {
    const { defaultType, mutedViewers } = req.body;
    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    const updateObj = {};
    if (defaultType && ['all_contacts', 'everyone', 'exclude'].includes(defaultType)) {
      updateObj['statusPrivacy.defaultType'] = defaultType;
    }
    if (Array.isArray(mutedViewers)) {
      updateObj['statusPrivacy.mutedViewers'] = mutedViewers.filter(id => mongoose.Types.ObjectId.isValid(id));
    }

    const updatedPersona = await Persona.findByIdAndUpdate(
      req.personaId,
      { $set: updateObj },
      { new: true }
    )
      .select('statusPrivacy')
      .populate('statusPrivacy.mutedViewers', 'displayName username avatar');

    res.json({ success: true, statusPrivacy: updatedPersona.statusPrivacy });
  } catch (error) {
    console.error('Error in updateStatusPrivacy:', error);
    res.status(500).json({ success: false, message: 'Failed to update status privacy', error: error.message });
  }
};

// Mute or unmute another persona's status updates from appearing in active feed
export const toggleMuteStatusAuthor = async (req, res) => {
  try {
    const { targetPersonaId } = req.params;
    const { mute = true } = req.body;

    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    if (!targetPersonaId || !mongoose.Types.ObjectId.isValid(targetPersonaId)) {
      return res.status(400).json({ success: false, message: 'Valid target persona ID required' });
    }

    const updateQuery = mute
      ? { $addToSet: { mutedStatusPersonas: targetPersonaId } }
      : { $pull: { mutedStatusPersonas: targetPersonaId } };

    const updated = await Persona.findByIdAndUpdate(
      req.personaId,
      updateQuery,
      { new: true }
    ).select('mutedStatusPersonas');

    res.json({
      success: true,
      isMuted: mute,
      mutedStatusPersonas: updated.mutedStatusPersonas
    });
  } catch (error) {
    console.error('Error in toggleMuteStatusAuthor:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle status mute', error: error.message });
  }
};
