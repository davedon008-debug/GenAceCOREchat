import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Persona from '../models/Persona.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Space from '../models/Space.js';
import Task from '../models/Task.js';
import Poll from '../models/Poll.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import { evictUserSockets } from '../config/socket.js';

// Get Admin System Overview Statistics
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPersonas = await Persona.countDocuments();
    const totalSpaces = await Space.countDocuments();
    const totalMessages = await Message.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPersonas,
        totalSpaces,
        totalMessages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
  }
};

// Get List of All Registered Users with Personas
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('personas', 'username displayName avatar type status createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users list', error: error.message });
  }
};

// Update / Reset User Password
export const updateUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: `Password for ${user.email} updated successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update password', error: error.message });
  }
};

// Update User Role (Admin <-> User)
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password').populate('personas');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user, message: `User role updated to ${role}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user role', error: error.message });
  }
};

// Cascade helper to thoroughly erase personas across conversations, spaces, messages, and contacts
async function cascadeDeletePersonas(personaIds) {
  if (!personaIds || !personaIds.length) return;

  // 1. Delete all messages sent by these personas
  await Message.deleteMany({ senderPersonaId: { $in: personaIds } });

  // 2. Remove deleted personas from all conversation participants & deletedBy lists
  await Conversation.updateMany(
    {},
    { $pull: { participants: { $in: personaIds }, deletedBy: { $in: personaIds } } }
  );

  // 3. Remove direct conversations that have 0 or 1 participant remaining
  await Conversation.deleteMany({
    type: 'direct',
    $or: [
      { participants: { $size: 0 } },
      { participants: { $size: 1 } }
    ]
  });

  // 4. Remove deleted personas from space memberships
  await Space.updateMany(
    {},
    { $pull: { members: { personaId: { $in: personaIds } } } }
  );

  // 5. Delete spaces owned by deleted personas or empty spaces
  await Space.deleteMany({
    $or: [
      { ownerPersonaId: { $in: personaIds } },
      { members: { $size: 0 } }
    ]
  });

  // 6. Remove deleted personas from blockedPersonas lists
  await Persona.updateMany(
    {},
    { $pull: { blockedPersonas: { $in: personaIds } } }
  );

  // 7. Delete persona documents themselves
  await Persona.deleteMany({ _id: { $in: personaIds } });
}

// Delete a Single User and Clean Up Data Globally
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent admin self-deletion via single delete endpoint
    if (String(user._id) === String(req.userId)) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete their own active account.' });
    }

    // Get all persona IDs owned by this user
    const userPersonas = await Persona.find({ userId: user._id });
    const personaIds = userPersonas.map(p => p._id);

    // Thorough cascade cleanup across conversations, spaces, messages & contacts
    await cascadeDeletePersonas(personaIds);

    // Remove user document
    await User.findByIdAndDelete(userId);

    // Evict active socket sessions for deleted user immediately
    await evictUserSockets([user._id], personaIds);

    res.json({ success: true, message: `User ${user.email} and all associated data completely erased from the platform.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
};

// Purge All Users and System Data (Danger Zone)
export const purgeAllUsers = async (req, res) => {
  try {
    const { keepCurrentAdmin = true } = req.body;

    let query = {};
    if (keepCurrentAdmin && req.userId) {
      query._id = { $ne: req.userId };
    }

    const targetUsers = await User.find(query);
    const targetUserIds = targetUsers.map(u => u._id);

    // Get persona IDs for target users
    const targetPersonas = await Persona.find({ userId: { $in: targetUserIds } });
    const targetPersonaIds = targetPersonas.map(p => p._id);

    // Thorough cascade cleanup across conversations, spaces, messages & contacts
    await cascadeDeletePersonas(targetPersonaIds);

    await User.deleteMany(query);

    // Evict active socket sessions for purged users immediately
    await evictUserSockets(targetUserIds, targetPersonaIds);

    res.json({
      success: true,
      message: `System purge completed. ${targetUsers.length} user accounts and all associated data were completely erased.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to purge users', error: error.message });
  }
};

// Get All Spaces for Admin (Public & Private)
export const getAllSpacesAdmin = async (req, res) => {
  try {
    const spaces = await Space.find()
      .populate('members.personaId', 'username displayName avatar type')
      .populate('ownerPersonaId', 'username displayName avatar')
      .sort({ updatedAt: -1 });

    res.json({ success: true, spaces });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch spaces for admin', error: error.message });
  }
};

// Delete a Fluid Space Completely from Existence
export const deleteSpaceAdmin = async (req, res) => {
  try {
    const { spaceId } = req.params;

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // 1. Delete all messages associated with spaceId
    await Message.deleteMany({ spaceId });

    // 2. Delete linked conversation if exists
    if (space.conversationId) {
      await Conversation.findByIdAndDelete(space.conversationId);
    }

    // 3. Delete tasks and polls associated with spaceId
    await Task.deleteMany({ spaceId });
    await Poll.deleteMany({ spaceId });

    // 4. Delete space document itself
    await Space.findByIdAndDelete(spaceId);

    res.json({ success: true, message: `Fluid Space "${space.title}" and all its activity erased from existence.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete space', error: error.message });
  }
};

// Get list of all password reset requests submitted by users
export const getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate('user', 'email masterName role')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch password reset requests', error: error.message });
  }
};

// Resolve / Reset password for a pending reset request
export const resolvePasswordResetRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { newPassword, adminNote, status = 'resolved' } = req.body;

    const resetReq = await PasswordResetRequest.findById(requestId).populate('user');
    if (!resetReq) {
      return res.status(404).json({ success: false, message: 'Password reset request not found' });
    }

    let targetUser = resetReq.user;
    if (!targetUser) {
      targetUser = await User.findOne({ email: resetReq.userEmail || resetReq.emailOrHandle });
    }

    if (newPassword && targetUser) {
      if (newPassword.trim().length < 4) {
        return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long' });
      }
      const salt = await bcrypt.genSalt(10);
      targetUser.password = await bcrypt.hash(newPassword, salt);
      await targetUser.save();
    }

    resetReq.status = status;
    resetReq.adminNote = adminNote || (newPassword ? `Password reset by Admin to new credentials.` : 'Request updated by Admin');
    resetReq.resolvedAt = new Date();
    await resetReq.save();

    res.json({
      success: true,
      message: `Request status updated to ${status}.${newPassword && targetUser ? ` Password for ${targetUser.email} reset successfully.` : ''}`,
      request: resetReq
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to resolve reset request', error: error.message });
  }
};

