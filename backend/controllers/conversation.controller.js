import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Persona from '../models/Persona.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

export const getConversations = async (req, res) => {
  try {
    const personaObjId = mongoose.Types.ObjectId.isValid(req.personaId)
      ? new mongoose.Types.ObjectId(req.personaId)
      : req.personaId;

    // Fetch user lock info, blocked list, and conversations concurrently
    const [user, mePersona, personasWhoBlockedMe, rawConversations] = await Promise.all([
      User.findById(req.userId).select('lockedConversations chatLockEnabled').lean(),
      Persona.findById(req.personaId).select('blockedPersonas').lean(),
      Persona.find({ blockedPersonas: req.personaId }).select('_id').lean(),
      Conversation.find({
        participants: req.personaId,
        deletedBy: { $ne: req.personaId },
        $or: [
          { spaceId: { $exists: false } },
          { spaceId: null }
        ]
      })
        .populate({
          path: 'participants',
          select: 'username displayName avatar bio status customStatus type userId',
          populate: { path: 'userId', select: 'role email' }
        })
        .populate({
          path: 'lastMessage',
          populate: { path: 'senderPersonaId', select: 'username displayName' }
        })
        .populate('spaceId')
        .sort({ updatedAt: -1 })
        .lean()
    ]);

    const lockedSet = new Set((user?.lockedConversations || []).map(id => String(id)));
    const myBlockedIds = (mePersona?.blockedPersonas || []).map(id => id.toString());
    const blockerIds = personasWhoBlockedMe.map(p => p._id.toString());
    const allBlockedPersonaIds = new Set([...myBlockedIds, ...blockerIds]);

    // Exclude direct conversations with blocked users and any space-linked conversation
    const filteredConversations = rawConversations.filter(conv => {
      if (conv.spaceId) return false;
      if (conv.type === 'direct') {
        const otherParticipant = (conv.participants || []).find(p => {
          const pId = p._id ? p._id.toString() : p.toString();
          return pId && pId !== req.personaId.toString();
        });
        if (otherParticipant) {
          const otherId = otherParticipant._id ? otherParticipant._id.toString() : otherParticipant.toString();
          if (allBlockedPersonaIds.has(otherId)) {
            return false;
          }
        }
      }
      return true;
    });

    // Batch compute unread message counts for all conversations in a SINGLE aggregation query
    const convIds = filteredConversations.map(c => c._id);
    const unreadMap = {};

    if (convIds.length > 0) {
      const unreadAgg = await Message.aggregate([
        {
          $match: {
            conversationId: { $in: convIds },
            senderPersonaId: { $ne: personaObjId },
            status: { $ne: 'read' },
            readBy: { $nin: [personaObjId] },
            deletedFor: { $nin: [personaObjId] }
          }
        },
        {
          $group: {
            _id: '$conversationId',
            count: { $sum: 1 }
          }
        }
      ]);

      unreadAgg.forEach(item => {
        unreadMap[String(item._id)] = item.count;
      });
    }

    const conversations = filteredConversations.map((conv) => {
      const convIdStr = String(conv._id);
      const isLocked = lockedSet.has(convIdStr);
      let lastMessage = conv.lastMessage;
      if (isLocked && lastMessage && typeof lastMessage === 'object') {
        lastMessage = {
          ...lastMessage,
          content: '🔒 Passcode locked conversation'
        };
      }

      return {
        ...conv,
        isLocked,
        lastMessage,
        unreadCount: unreadMap[convIdStr] || 0
      };
    });

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversations', error: error.message });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { targetPersonaId, type, name, privacyMode } = req.body;

    if (type === 'direct' && targetPersonaId) {
      // Check if conversation already exists between these 2 personas
      let existingConv = await Conversation.findOne({
        type: 'direct',
        participants: { $all: [req.personaId, targetPersonaId] }
      }).populate('participants', 'username displayName avatar bio status customStatus type');

      if (existingConv) {
        // If it was deleted by current user, restore it
        if (existingConv.deletedBy && existingConv.deletedBy.includes(req.personaId)) {
          await Conversation.findByIdAndUpdate(existingConv._id, {
            $pull: { deletedBy: req.personaId }
          });
        }

        // Add each other to contacts
        await Persona.findByIdAndUpdate(req.personaId, { $addToSet: { contacts: targetPersonaId } });
        if (targetPersonaId !== req.personaId) {
          await Persona.findByIdAndUpdate(targetPersonaId, { $addToSet: { contacts: req.personaId } });
        }

        const io = getIO();
        if (io && existingConv) {
          (existingConv.participants || []).forEach(p => {
            const pId = p._id ? p._id.toString() : p.toString();
            if (pId) io.to(`persona:${pId}`).emit('conversation:new', existingConv);
          });
        }

        return res.json({ success: true, conversation: existingConv });
      }
    }

    const participants = [req.personaId];
    if (targetPersonaId && targetPersonaId !== req.personaId) {
      participants.push(targetPersonaId);
    }

    const conversation = await Conversation.create({
      type: type || 'direct',
      name: name || '',
      participants,
      privacyMode: privacyMode || 'normal'
    });

    if (targetPersonaId && targetPersonaId !== req.personaId) {
      await Persona.findByIdAndUpdate(req.personaId, { $addToSet: { contacts: targetPersonaId } });
      await Persona.findByIdAndUpdate(targetPersonaId, { $addToSet: { contacts: req.personaId } });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'username displayName avatar bio status customStatus type');

    const io = getIO();
    if (io && populated) {
      (populated.participants || []).forEach(p => {
        const pId = p._id ? p._id.toString() : p.toString();
        if (pId) io.to(`persona:${pId}`).emit('conversation:new', populated);
      });
    }

    res.status(201).json({ success: true, conversation: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create conversation', error: error.message });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const user = await User.findById(req.userId).select('lockedConversations');
    const lockedSet = new Set((user?.lockedConversations || []).map(id => String(id)));

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.personaId
    })
      .populate('participants', 'username displayName avatar bio status customStatus type')
      .populate('spaceId');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const convObj = conversation.toObject();
    convObj.isLocked = lockedSet.has(String(conversation._id));

    res.json({ success: true, conversation: convObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversation', error: error.message });
  }
};

export const updatePrivacyMode = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { privacyMode } = req.body;

    const validModes = ['normal', 'private', 'disappearing', 'burn', 'vault', 'anonymous'];
    if (!validModes.includes(privacyMode)) {
      return res.status(400).json({ success: false, message: 'Invalid privacy mode' });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, participants: req.personaId },
      { privacyMode },
      { new: true }
    ).populate('participants', 'username displayName avatar bio status customStatus type');

    if (conversation) {
      const io = getIO();
      if (io) {
        io.to(String(conversationId)).emit('conversation:privacy:updated', { roomId: conversationId, privacyMode });
        (conversation.participants || []).forEach(p => {
          const pId = p._id || p;
          if (pId) io.to(`persona:${pId}`).emit('conversation:privacy:updated', { roomId: conversationId, privacyMode });
        });
      }
    }

    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update privacy mode', error: error.message });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.personaId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: { deletedBy: req.personaId }
    });

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete conversation', error: error.message });
  }
};

