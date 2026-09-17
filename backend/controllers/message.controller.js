import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Persona from '../models/Persona.js';
import Space from '../models/Space.js';
import { getIO } from '../config/socket.js';

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const spaceId = req.params.spaceId || req.query.spaceId;
    const { limit = 50, before } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    if (!req.personaId) {
      return res.status(401).json({ success: false, message: 'Active persona ID required' });
    }

    const currentPersonaIdStr = req.personaId.toString();

    let query = {};
    if (spaceId && spaceId !== 'null' && spaceId !== 'undefined') {
      if (!mongoose.Types.ObjectId.isValid(spaceId)) {
        return res.status(400).json({ success: false, message: 'Invalid space ID' });
      }

      const spaceObj = await Space.findById(spaceId);
      if (spaceObj) {
        const isMember = spaceObj.members?.some(m => m.personaId?.toString() === currentPersonaIdStr) ||
                         spaceObj.ownerPersonaId?.toString() === currentPersonaIdStr;
        if (!isMember) {
          if (spaceObj.visibility === 'public' || !spaceObj.visibility) {
            // Auto-join public space
            spaceObj.members.push({ personaId: req.personaId, role: 'member' });
            await spaceObj.save();
            if (spaceObj.conversationId) {
              await Conversation.findByIdAndUpdate(spaceObj.conversationId, {
                $addToSet: { participants: req.personaId }
              });
            }
          } else {
            // Check if user is participant in linked conversation
            const isConvParticipant = spaceObj.conversationId && await Conversation.exists({ _id: spaceObj.conversationId, participants: req.personaId });
            if (!isConvParticipant) {
              return res.status(403).json({ success: false, message: 'Not authorized to view messages in this space' });
            }
          }
        }
      } else {
        // Fallback authorization check if space document isn't directly found by ID
        const linkedConv = await Conversation.findOne({ spaceId });
        if (!linkedConv) {
          return res.status(404).json({ success: false, message: 'Space not found' });
        }
        const isConvParticipant = linkedConv.participants?.some(p => p.toString() === currentPersonaIdStr);
        if (!isConvParticipant) {
          return res.status(403).json({ success: false, message: 'Not authorized to view messages in this space' });
        }
      }

      query.spaceId = spaceId;
    } else if (conversationId && conversationId !== 'null' && conversationId !== 'undefined') {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      const isParticipant = conversation.participants?.some(p => p.toString() === currentPersonaIdStr);
      if (!isParticipant) {
        // Check if this conversation belongs to a public space or space where persona is member
        if (conversation.spaceId) {
          const spaceObj = await Space.findById(conversation.spaceId);
          if (spaceObj && (spaceObj.visibility === 'public' || !spaceObj.visibility || spaceObj.members?.some(m => m.personaId?.toString() === currentPersonaIdStr))) {
            // Auto-add persona to conversation participants
            await Conversation.findByIdAndUpdate(conversationId, {
              $addToSet: { participants: req.personaId }
            });
          } else {
            return res.status(403).json({ success: false, message: 'Not authorized to view messages in this conversation' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Not authorized to view messages in this conversation' });
        }
      }

      query.conversationId = conversationId;
      query.$or = [{ spaceId: null }, { spaceId: { $exists: false } }];
    } else {
      return res.status(400).json({ success: false, message: 'conversationId or spaceId required' });
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    if (req.personaId) {
      query.deletedFor = { $ne: req.personaId };

      // Mutual Block Check: Exclude messages sent by personas I have blocked OR personas that have blocked me
      const mePersona = await Persona.findById(req.personaId).select('blockedPersonas');
      const myBlockedIds = (mePersona?.blockedPersonas || []).map(id => id.toString());

      const personasWhoBlockedMe = await Persona.find({ blockedPersonas: req.personaId }).select('_id');
      const blockerIds = personasWhoBlockedMe.map(p => p._id.toString());

      const allBlockedPersonaIds = Array.from(new Set([...myBlockedIds, ...blockerIds]));
      if (allBlockedPersonaIds.length > 0) {
        query.senderPersonaId = { $nin: allBlockedPersonaIds };
      }
    }

    const fetchedMessages = await Message.find(query)
      .populate('senderPersonaId', 'username displayName avatar bio status customStatus type')
      .populate('spaceId', 'title icon description')
      .populate('reactions.personaId', 'username displayName')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderPersonaId', select: 'username displayName' }
      })
      .sort({ createdAt: -1 })
      .limit(parsedLimit);

    // Reverse to return in chronological order (oldest to newest for chat UI stream)
    const messages = fetchedMessages.reverse();

    // Auto-mark unread messages in this conversation/space from other personas as read
    if (req.personaId && (query.conversationId || query.spaceId)) {
      const readFilter = {
        senderPersonaId: { $ne: req.personaId },
        readBy: { $nin: [req.personaId] }
      };
      if (query.conversationId) readFilter.conversationId = query.conversationId;
      if (query.spaceId) readFilter.spaceId = query.spaceId;

      Message.updateMany(readFilter, {
        $set: { status: 'read' },
        $addToSet: { readBy: req.personaId }
      }).exec().then(result => {
        if (result.modifiedCount > 0) {
          const io = getIO();
          if (io) {
            const targetRoom = query.spaceId || query.conversationId;
            io.to(String(targetRoom)).emit('messages:read', {
              conversationId: query.conversationId,
              spaceId: query.spaceId,
              readerPersonaId: req.personaId
            });
          }
        }
      }).catch(err => console.error('[getMessages] markAsRead error:', err));
    }

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { conversationId, spaceId } = req.body;
    if (!conversationId && !spaceId) {
      return res.status(400).json({ success: false, message: 'conversationId or spaceId required' });
    }

    const filter = {
      senderPersonaId: { $ne: req.personaId },
      readBy: { $nin: [req.personaId] }
    };
    if (conversationId) filter.conversationId = conversationId;
    if (spaceId) filter.spaceId = spaceId;

    const result = await Message.updateMany(filter, {
      $set: { status: 'read' },
      $addToSet: { readBy: req.personaId }
    });

    if (result.modifiedCount > 0) {
      const io = getIO();
      if (io) {
        const targetRoom = spaceId || conversationId;
        io.to(String(targetRoom)).emit('messages:read', {
          conversationId,
          spaceId,
          readerPersonaId: req.personaId
        });
      }
    }

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark messages as read', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, spaceId, content, contentType, mediaUrl, voiceDuration, replyTo, privacyMode } = req.body;

    let conversation;

    // Strict Authorization Verification
    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
      }
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      const isParticipant = conversation.participants?.some(p => p.toString() === req.personaId.toString());
      if (!isParticipant) {
        if (conversation.spaceId) {
          const spaceObj = await Space.findById(conversation.spaceId);
          if (spaceObj && (spaceObj.visibility === 'public' || !spaceObj.visibility || spaceObj.members?.some(m => m.personaId?.toString() === req.personaId.toString()))) {
            await Conversation.findByIdAndUpdate(conversationId, {
              $addToSet: { participants: req.personaId }
            });
            if (!spaceObj.members?.some(m => m.personaId?.toString() === req.personaId.toString())) {
              spaceObj.members.push({ personaId: req.personaId, role: 'member' });
              await spaceObj.save();
            }
          } else {
            return res.status(403).json({ success: false, message: 'Not authorized to send messages in this conversation' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Not authorized to send messages in this conversation' });
        }
      }
    } else if (spaceId) {
      if (!mongoose.Types.ObjectId.isValid(spaceId)) {
        return res.status(400).json({ success: false, message: 'Invalid space ID' });
      }
      const spaceObj = await Space.findById(spaceId);
      if (!spaceObj) {
        return res.status(404).json({ success: false, message: 'Space not found' });
      }

      const isMember = spaceObj.members?.some(m => m.personaId?.toString() === req.personaId.toString()) ||
                       spaceObj.ownerPersonaId?.toString() === req.personaId.toString();

      if (!isMember) {
        if (spaceObj.visibility === 'public' || !spaceObj.visibility) {
          spaceObj.members.push({ personaId: req.personaId, role: 'member' });
          await spaceObj.save();
          if (spaceObj.conversationId) {
            await Conversation.findByIdAndUpdate(spaceObj.conversationId, {
              $addToSet: { participants: req.personaId }
            });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Not authorized to send messages in this space' });
        }
      }
    } else {
      return res.status(400).json({ success: false, message: 'conversationId or spaceId required' });
    }

    // Check block status and DND status if sending a message in a direct conversation
    if (conversation && conversation.type === 'direct' && conversation.participants?.length === 2) {
      const otherPersonaId = conversation.participants.find(p => p.toString() !== req.personaId.toString());
      if (otherPersonaId) {
        const senderPersona = await Persona.findById(req.personaId);
        const recipientPersona = await Persona.findById(otherPersonaId);

        const isSenderBlocking = senderPersona?.blockedPersonas?.some(id => id.toString() === otherPersonaId.toString());
        const isRecipientBlocking = recipientPersona?.blockedPersonas?.some(id => id.toString() === req.personaId.toString());

        if (isSenderBlocking || isRecipientBlocking) {
          return res.status(403).json({
            success: false,
            message: 'Messaging is blocked between these users.'
          });
        }
      }
    }

    let targetSpace;
    if (spaceId) {
      targetSpace = await Space.findById(spaceId);
    }

    const activePrivacyMode = privacyMode || (conversation ? conversation.privacyMode : (targetSpace ? targetSpace.privacyMode : 'normal'));
    let expiresAt = null;

    if (activePrivacyMode === 'disappearing') {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL
    }

    const message = await Message.create({
      conversationId: conversationId || null,
      spaceId: spaceId || null,
      senderPersonaId: req.personaId,
      content: content || '',
      contentType: contentType || 'text',
      mediaUrl: mediaUrl || '',
      voiceDuration: voiceDuration || 0,
      replyTo: replyTo || null,
      privacyMode: activePrivacyMode,
      expiresAt
    });

    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: Date.now()
      });
    }

    const populated = await Message.findById(message._id)
      .populate('senderPersonaId', 'username displayName avatar bio status customStatus type')
      .populate('spaceId', 'title icon description')
      .populate('reactions.personaId', 'username displayName')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderPersonaId', select: 'username displayName' }
      });

    // Broadcast real-time message notification via Socket.IO
    const io = getIO();
    if (io) {
      try {
        let recipientPersonaIds = [];
        if (conversationId) {
          const conv = await Conversation.findById(conversationId).select('participants').lean();
          if (conv && Array.isArray(conv.participants)) {
            recipientPersonaIds = conv.participants.map(String);
          }
        } else if (spaceId) {
          const space = await Space.findById(spaceId).select('members').lean();
          if (space && Array.isArray(space.members)) {
            recipientPersonaIds = space.members.map(m => String(m.personaId));
          }
        }

        const targetRoom = spaceId || conversationId;
        const msgObject = populated.toObject ? populated.toObject({ virtuals: true }) : populated;

        if (targetRoom) {
          io.to(String(targetRoom)).emit('message:new', msgObject);
        }

        recipientPersonaIds.forEach(pId => {
          if (pId) {
            io.to(`persona:${pId}`).emit('message:new', msgObject);
          }
        });
      } catch (socketErr) {
        console.error('[sendMessage Controller] Socket dispatch error:', socketErr);
      }
    }

    res.status(201).json({ success: true, message: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
};

export const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Verify user authorization for target chat
    let isAuthorized = (message.conversationId && await Conversation.exists({ _id: message.conversationId, participants: req.personaId }));
    if (!isAuthorized && message.spaceId) {
      const spaceObj = await Space.findById(message.spaceId);
      if (spaceObj) {
        isAuthorized = spaceObj.visibility === 'public' || !spaceObj.visibility ||
                       spaceObj.members?.some(m => m.personaId?.toString() === req.personaId.toString()) ||
                       spaceObj.ownerPersonaId?.toString() === req.personaId.toString();
      }
    }
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to react to messages in this chat' });
    }

    const existingIndex = message.reactions.findIndex(
      r => r.personaId.toString() === req.personaId.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, personaId: req.personaId });
    }

    await message.save();

    const updated = await Message.findById(message._id)
      .populate('senderPersonaId', 'username displayName avatar bio status customStatus type')
      .populate('reactions.personaId', 'username displayName');

    const io = getIO();
    if (io) {
      const targetRoom = message.spaceId || message.conversationId;
      if (targetRoom) {
        io.to(String(targetRoom)).emit('reaction:update', {
          messageId: message._id,
          reactions: updated.reactions
        });
      }
    }

    res.json({ success: true, message: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle reaction', error: error.message });
  }
};

export const burnMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Verify user authorization for target chat
    let isAuthorized = (message.conversationId && await Conversation.exists({ _id: message.conversationId, participants: req.personaId }));
    if (!isAuthorized && message.spaceId) {
      const spaceObj = await Space.findById(message.spaceId);
      if (spaceObj) {
        isAuthorized = spaceObj.visibility === 'public' || !spaceObj.visibility ||
                       spaceObj.members?.some(m => m.personaId?.toString() === req.personaId.toString()) ||
                       spaceObj.ownerPersonaId?.toString() === req.personaId.toString();
      }
    }
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to burn messages in this chat' });
    }

    if (message.privacyMode !== 'burn') {
      return res.status(400).json({ success: false, message: 'Message is not a burn message' });
    }

    message.isBurned = true;
    message.content = '🔥 This message has been burned and destroyed.';
    message.mediaUrl = '';
    await message.save();

    const io = getIO();
    if (io) {
      const targetRoom = message.spaceId || message.conversationId;
      if (targetRoom) {
        io.to(String(targetRoom)).emit('message:burned', {
          messageId: message._id,
          conversationId: message.conversationId,
          spaceId: message.spaceId,
          content: message.content,
          isBurned: true
        });
      }
    }

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to burn message', error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const mode = req.query.mode || req.body.mode || 'everyone';

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.json({ success: true, messageId, mode });
    }

    // Delete for me only
    if (mode === 'me') {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: req.personaId }
      });
      return res.json({ success: true, messageId, mode: 'me' });
    }

    // Delete for everyone (sender only)
    if (message.senderPersonaId.toString() !== req.personaId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the sender can delete this message for everyone' });
    }

    const conversationId = message.conversationId;
    const spaceId = message.spaceId;
    await Message.findByIdAndDelete(messageId);

    // Update conversation lastMessage if needed
    if (conversationId) {
      const remainingLast = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: remainingLast ? remainingLast._id : null
      });
    }

    // Real-time broadcast to room members
    const io = getIO();
    if (io) {
      const targetRoom = spaceId || conversationId;
      if (targetRoom) {
        io.to(String(targetRoom)).emit('message:deleted', { messageId, conversationId, spaceId });
      }
    }

    res.json({ success: true, messageId, mode: 'everyone' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete message', error: error.message });
  }
};
