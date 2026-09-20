import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Persona from '../models/Persona.js';
import Conversation from '../models/Conversation.js';
import { broadcastPresence, getIO } from '../config/socket.js';


const sanitizeAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('uploads/')) {
    return '/uploads/' + url.substring(url.indexOf('uploads/') + 'uploads/'.length);
  }
  return url;
};

export const checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || !username.trim()) {
      return res.json({ success: true, available: false });
    }
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const existing = await Persona.findOne({ username: cleanUsername });
    res.json({ success: true, available: !existing, username: cleanUsername });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Check failed', error: error.message });
  }
};

export const getPersonas = async (req, res) => {
  try {
    const personas = await Persona.find({ userId: req.userId });
    res.json({ success: true, personas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch personas', error: error.message });
  }
};

export const createPersona = async (req, res) => {
  try {
    const { username, displayName, type, bio, avatar } = req.body;

    const cleanUsername = username ? username.trim().toLowerCase().replace(/^@/, '') : '';

    const existingPersona = await Persona.findOne({ username: cleanUsername });
    if (existingPersona) {
      return res.status(400).json({ success: false, message: 'Username handle is already taken. Please choose a different one.' });
    }

    const newPersona = await Persona.create({
      userId: req.userId,
      username: cleanUsername,
      displayName: displayName || cleanUsername,
      type: type || 'personal',
      bio: bio || '',
      avatar: (avatar && typeof avatar === 'string' && avatar.trim()) ? sanitizeAvatarUrl(avatar) : '',
      isDefault: false
    });

    await User.findByIdAndUpdate(req.userId, { $push: { personas: newPersona._id } });

    res.status(201).json({ success: true, persona: newPersona });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create persona', error: error.message });
  }
};

export const switchPersona = async (req, res) => {
  try {
    const { targetPersonaId } = req.body;

    const persona = await Persona.findOne({ _id: targetPersonaId, userId: req.userId });
    if (!persona) {
      return res.status(404).json({ success: false, message: 'Persona not found or unauthorized' });
    }

    const token = jwt.sign(
      { userId: req.userId, personaId: persona._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      activePersona: persona
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to switch persona', error: error.message });
  }
};

export const searchPersonas = async (req, res) => {
  try {
    const { query } = req.query;
    const cleanQuery = query ? query.trim().replace(/^@/, '') : '';

    const reqPersonaId = req.personaId ? req.personaId.toString() : null;

    let filter = {};
    if (reqPersonaId) {
      filter._id = { $ne: req.personaId };
    }

    if (cleanQuery) {
      const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { username: { $regex: escapedQuery, $options: 'i' } },
        { displayName: { $regex: escapedQuery, $options: 'i' } }
      ];
    }

    const personas = await Persona.find(filter)
      .populate('userId', 'role email masterName')
      .sort({ updatedAt: -1 })
      .limit(30);

    res.json({ success: true, personas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to search personas', error: error.message });
  }
};

export const getAllContacts = async (req, res) => {
  try {
    const persona = await Persona.findById(req.personaId);
    if (!persona) {
      return res.status(404).json({ success: false, message: 'Persona not found' });
    }

    const contactIds = persona.contacts || [];
    const blockedIds = (persona.blockedPersonas || []).map(id => id.toString());

    // Filter out blocked personas and self
    const validContactIds = contactIds
      .map(id => id.toString())
      .filter(id => id !== req.personaId.toString() && !blockedIds.includes(id));

    const contacts = await Persona.find({ _id: { $in: validContactIds } })
      .select('username displayName avatar status customStatus type bio updatedAt userId')
      .populate('userId', 'role email')
      .sort({ displayName: 1 });

    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch contacts', error: error.message });
  }
};

export const addContact = async (req, res) => {
  try {
    const targetPersonaId = req.params.targetPersonaId || req.body?.targetPersonaId;
    if (!targetPersonaId || targetPersonaId === req.personaId.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid target persona' });
    }

    const targetPersona = await Persona.findById(targetPersonaId);
    if (!targetPersona) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    await Persona.findByIdAndUpdate(req.personaId, {
      $addToSet: { contacts: targetPersonaId }
    });

    res.json({ success: true, message: 'Contact added successfully', contact: targetPersona });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add contact', error: error.message });
  }
};

export const removeContact = async (req, res) => {
  try {
    const targetPersonaId = req.params.targetPersonaId || req.body?.targetPersonaId;
    if (!targetPersonaId) {
      return res.status(400).json({ success: false, message: 'Invalid target persona' });
    }

    await Persona.findByIdAndUpdate(req.personaId, {
      $pull: { contacts: targetPersonaId }
    });

    await Conversation.updateMany(
      {
        type: 'direct',
        participants: { $all: [req.personaId, targetPersonaId] }
      },
      {
        $addToSet: { deletedBy: req.personaId }
      }
    );

    res.json({ success: true, message: 'Contact removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove contact', error: error.message });
  }
};

export const updatePersona = async (req, res) => {
  try {
    const { personaId } = req.params;

    // Ownership check
    const persona = await Persona.findOne({ _id: personaId, userId: req.userId });
    if (!persona) {
      return res.status(404).json({ success: false, message: 'Persona not found or unauthorized' });
    }

    const { username, displayName, bio, avatar, customStatus, status } = req.body;

    // Username uniqueness check (if changing)
    if (username && username.toLowerCase() !== persona.username) {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      const existing = await Persona.findOne({ username: cleanUsername, _id: { $ne: personaId } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }
      persona.username = cleanUsername;
    }

    if (displayName !== undefined) persona.displayName = displayName.trim();
    if (bio !== undefined) persona.bio = bio;
    if (avatar !== undefined && avatar !== null && typeof avatar === 'string' && avatar.trim() !== '') {
      persona.avatar = sanitizeAvatarUrl(avatar);
    }
    if (customStatus !== undefined) persona.customStatus = customStatus;
    if (status !== undefined && ['online', 'away', 'dnd', 'offline'].includes(status)) persona.status = status;

    await persona.save();

    // Trigger real-time profile update broadcast to all user/persona device channels
    const io = getIO();
    if (io) {
      const personaObj = persona.toObject ? persona.toObject({ virtuals: true }) : persona;
      io.to(`persona:${persona._id}`).emit('persona:updated', personaObj);
      if (persona.userId) {
        io.to(`user:${persona.userId}`).emit('persona:updated', personaObj);
      }
    }

    broadcastPresence();

    // Update localStorage-cached persona on client via response
    res.json({ success: true, persona });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update persona', error: error.message });
  }
};

export const blockPersona = async (req, res) => {
  try {
    const targetPersonaId = req.params.targetPersonaId || req.body?.targetPersonaId;
    if (!targetPersonaId || targetPersonaId === req.personaId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself or invalid target' });
    }

    const targetPersona = await Persona.findById(targetPersonaId);
    if (!targetPersona) {
      return res.status(404).json({ success: false, message: 'User to block not found' });
    }

    await Persona.findByIdAndUpdate(req.personaId, {
      $addToSet: { blockedPersonas: targetPersonaId },
      $pull: { contacts: targetPersonaId }
    });

    await Conversation.updateMany(
      {
        type: 'direct',
        participants: { $all: [req.personaId, targetPersonaId] }
      },
      {
        $addToSet: { deletedBy: req.personaId }
      }
    );

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to block user', error: error.message });
  }
};

export const unblockPersona = async (req, res) => {
  try {
    const targetPersonaId = req.params.targetPersonaId || req.body?.targetPersonaId;
    if (!targetPersonaId) {
      return res.status(400).json({ success: false, message: 'Invalid target' });
    }

    // 1. Remove from blockedPersonas AND restore to contacts list
    await Persona.findByIdAndUpdate(req.personaId, {
      $pull: { blockedPersonas: targetPersonaId },
      $addToSet: { contacts: targetPersonaId }
    });

    // 2. Restore direct conversation if it was hidden
    await Conversation.updateMany(
      {
        type: 'direct',
        participants: { $all: [req.personaId, targetPersonaId] }
      },
      {
        $pull: { deletedBy: req.personaId }
      }
    );

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unblock user', error: error.message });
  }
};

export const getBlockedPersonas = async (req, res) => {
  try {
    const persona = await Persona.findById(req.personaId)
      .populate('blockedPersonas', 'username displayName avatar status customStatus type bio');

    const list = persona ? (persona.blockedPersonas || []) : [];

    res.json({
      success: true,
      blockedPersonas: list,
      blocked: list
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch blocked users', error: error.message });
  }
};

export const registerPushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Push token string required' });
    }

    await Persona.findByIdAndUpdate(req.personaId, {
      $addToSet: { pushTokens: token }
    });

    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to register push token', error: error.message });
  }
};

export const getVapidKey = async (req, res) => {
  try {
    const { getVapidPublicKey } = await import('../config/push.js');
    res.json({ success: true, vapidPublicKey: getVapidPublicKey() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch VAPID key', error: error.message });
  }
};

