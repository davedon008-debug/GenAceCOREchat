import Conversation from '../models/Conversation.js';
import Persona from '../models/Persona.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

export const getConversations = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('lockedConversations chatLockEnabled');
    const lockedSet = new Set((user?.lockedConversations || []).map(id => String(id)));

    // Fetch block lists to exclude blocked personas from direct conversations
    const mePersona = await Persona.findById(req.personaId).select('blockedPersonas');
    const myBlockedIds = (mePersona?.blockedPersonas || []).map(id => id.toString());
    const personasWhoBlockedMe = await Persona.find({ blockedPersonas: req.personaId }).select('_id');
    const blockerIds = personasWhoBlockedMe.map(p => p._id.toString());
    const allBlockedPersonaIds = Array.from(new Set([...myBlockedIds, ...blockerIds]));

    const rawConversations = await Conversation.find({
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
      .sort({ updatedAt: -1 });

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
          if (allBlockedPersonaIds.includes(otherId)) {
            return false;
          }
        }
      }
      return true;
    });

    const conversations = await Promise.all(filteredConversations.map(async (conv) => {
      const convObj = conv.toObject();
      const isLocked = lockedSet.has(String(conv._id));
      convObj.isLocked = isLocked;
      if (isLocked && convObj.lastMessage && typeof convObj.lastMessage === 'object') {
        convObj.lastMessage = {
          ...convObj.lastMessage,
          content: '🔒 Passcode locked conversation'
        };
      }

      // Compute unread message count for this persona
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        senderPersonaId: { $ne: req.personaId },
        status: { $ne: 'read' },
        readBy: { $nin: [req.personaId] },
        deletedFor: { $nin: [req.personaId] }
      });
      convObj.unreadCount = unreadCount;

      return convObj;
    }));

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

