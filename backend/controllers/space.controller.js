import mongoose from 'mongoose';
import Space from '../models/Space.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Task from '../models/Task.js';
import Poll from '../models/Poll.js';
import User from '../models/User.js';
import { getIO } from '../config/socket.js';

export const createOrUpgradeSpace = async (req, res) => {
  try {
    const { conversationId, title, description, icon, invitedPersonaIds = [], visibility = 'private' } = req.body;

    let conversation;
    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
      }
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      // Check if conversation already has an active Space
      if (conversation.spaceId) {
        const existingSpace = await Space.findById(conversation.spaceId)
          .populate('members.personaId', 'username displayName avatar bio status customStatus type')
          .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type');
        return res.json({ success: true, space: existingSpace });
      }
    }

    // Unique list of participant IDs
    let initialMemberIds = [req.personaId];
    if (Array.isArray(invitedPersonaIds)) {
      invitedPersonaIds.forEach(id => {
        if (id && mongoose.Types.ObjectId.isValid(id) && !initialMemberIds.some(m => String(m) === String(id))) {
          initialMemberIds.push(id);
        }
      });
    }

    if (conversation) {
      conversation.participants.forEach(p => {
        if (p && !initialMemberIds.some(m => String(m) === String(p))) {
          initialMemberIds.push(p);
        }
      });
    } else {
      // Create a group Conversation specifically for this Fluid Space
      conversation = await Conversation.create({
        type: 'group',
        name: title || 'Fluid Space',
        participants: initialMemberIds,
        privacyMode: 'normal'
      });
    }

    const space = await Space.create({
      title: title || (conversation ? conversation.name || 'Fluid Space' : 'New Fluid Space'),
      description: description || 'Adaptive collaborative environment',
      icon: icon || '⚡',
      ownerPersonaId: req.personaId,
      visibility: ['public', 'private'].includes(visibility) ? visibility : 'private',
      members: initialMemberIds.map(id => ({
        personaId: id,
        role: String(id) === String(req.personaId) ? 'owner' : 'member'
      })),
      conversationId: conversation._id
    });

    conversation.spaceId = space._id;
    await conversation.save();

    const populated = await Space.findById(space._id)
      .populate('members.personaId', 'username displayName avatar bio status customStatus type')
      .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type');

    const io = getIO();
    if (io) {
      initialMemberIds.forEach(pId => {
        io.to(`persona:${pId}`).emit('space:created', populated);
        io.to(`persona:${pId}`).emit('space:updated', populated);
      });
      if (populated.visibility === 'public') {
        io.emit('space:created', populated);
        io.emit('space:updated', populated);
      }
    }

    res.status(201).json({ success: true, space: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create Space', error: error.message });
  }
};

export const inviteMembersToSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { personaIds = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid space ID' });
    }

    if (!Array.isArray(personaIds) || personaIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No personas specified to invite' });
    }

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // Verify requester belongs to the space
    const isMember = space.members.some(m => String(m.personaId) === String(req.personaId));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to invite members to this space' });
    }

    // Filter valid persona IDs
    const validPersonaIds = personaIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));
    const existingPersonaIds = space.members.map(m => m.personaId.toString());
    const newPersonaIds = validPersonaIds.filter(id => !existingPersonaIds.includes(String(id)));

    if (newPersonaIds.length > 0) {
      newPersonaIds.forEach(id => {
        space.members.push({ personaId: id, role: 'member' });
      });
      await space.save();

      // Update associated conversation participants
      if (space.conversationId) {
        const conversation = await Conversation.findById(space.conversationId);
        if (conversation) {
          const convParticipants = conversation.participants.map(p => p.toString());
          newPersonaIds.forEach(id => {
            if (!convParticipants.includes(String(id))) {
              conversation.participants.push(id);
            }
          });
          await conversation.save();
        }
      }
    }

    const updatedSpace = await Space.findById(spaceId)
      .populate('members.personaId', 'username displayName avatar bio status customStatus type')
      .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type');

    const io = getIO();
    if (io) {
      newPersonaIds.forEach(pId => {
        io.to(`persona:${pId}`).emit('space:created', updatedSpace);
        io.to(`persona:${pId}`).emit('space:updated', updatedSpace);
      });
      io.to(String(space._id)).emit('space:updated', updatedSpace);
    }

    res.json({ success: true, space: updatedSpace, addedCount: newPersonaIds.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to invite members to Space', error: error.message });
  }
};

export const getSpaces = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('lockedSpaces lockedConversations role');
    const lockedSpacesSet = new Set((user?.lockedSpaces || []).map(id => String(id)));
    const lockedConvSet = new Set((user?.lockedConversations || []).map(id => String(id)));

    // Return ONLY spaces where current persona is an actual member
    const query = {
      'members.personaId': req.personaId
    };

    const rawSpaces = await Space.find(query)
      .populate('members.personaId', 'username displayName avatar bio status customStatus type')
      .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type')
      .sort({ updatedAt: -1 });

    const spaces = await Promise.all(rawSpaces.map(async (space) => {
      const spaceObj = space.toObject();
      const isLocked = lockedSpacesSet.has(String(space._id)) || (space.conversationId && lockedConvSet.has(String(space.conversationId)));
      spaceObj.isLocked = !!isLocked;

      const unreadCount = await Message.countDocuments({
        spaceId: space._id,
        senderPersonaId: { $ne: req.personaId },
        status: { $ne: 'read' },
        readBy: { $nin: [req.personaId] },
        deletedFor: { $nin: [req.personaId] }
      });
      spaceObj.unreadCount = unreadCount;
      return spaceObj;
    }));

    res.json({ success: true, spaces });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch Spaces', error: error.message });
  }
};

export const getPublicSpaces = async (req, res) => {
  try {
    const spaces = await Space.find({ visibility: 'public' })
      .populate('members.personaId', 'username displayName avatar bio status customStatus type')
      .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type')
      .sort({ updatedAt: -1 });

    res.json({ success: true, spaces });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch public Spaces', error: error.message });
  }
};

export const joinPublicSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid space ID' });
    }

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }
    if (space.visibility !== 'public') {
      return res.status(403).json({ success: false, message: 'This space is private' });
    }

    // Check if already a member
    const alreadyMember = space.members.some(m => String(m.personaId) === String(req.personaId));
    if (!alreadyMember) {
      space.members.push({ personaId: req.personaId, role: 'member' });
      await space.save();

      // Also add to the linked conversation
      if (space.conversationId) {
        const conversation = await Conversation.findById(space.conversationId);
        if (conversation) {
          const inConv = conversation.participants.some(p => String(p) === String(req.personaId));
          if (!inConv) {
            conversation.participants.push(req.personaId);
            await conversation.save();
          }
        }
      }
    }

    const populated = await Space.findById(spaceId)
      .populate('members.personaId', 'username displayName avatar bio status customStatus type')
      .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type');

    const io = getIO();
    if (io) {
      io.to(`persona:${req.personaId}`).emit('space:created', populated);
      io.to(`persona:${req.personaId}`).emit('space:updated', populated);
      io.to(String(spaceId)).emit('space:updated', populated);
    }

    res.json({ success: true, space: populated, alreadyMember });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to join Space', error: error.message });
  }
};

export const getSpaceDetails = async (req, res) => {
  try {
    const { spaceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid space ID' });
    }

    const space = await Space.findById(spaceId)
      .populate('members.personaId', 'username displayName avatar bio status customStatus type')
      .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type');

    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    const isMember = space.members.some(m => m.personaId && String(m.personaId._id || m.personaId) === String(req.personaId));

    if (!isMember && space.visibility !== 'public') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this private space' });
    }

    const user = await User.findById(req.userId).select('lockedSpaces lockedConversations');
    const lockedSpacesSet = new Set((user?.lockedSpaces || []).map(id => String(id)));
    const lockedConvSet = new Set((user?.lockedConversations || []).map(id => String(id)));
    const isLocked = lockedSpacesSet.has(String(space._id)) || (space.conversationId && lockedConvSet.has(String(space.conversationId)));

    const tasks = await Task.find({ spaceId })
      .populate('creatorPersonaId', 'username displayName')
      .populate('assigneePersonaId', 'username displayName');

    const polls = await Poll.find({ spaceId })
      .populate('creatorPersonaId', 'username displayName')
      .populate('options.votes', 'username displayName');

    const spaceObj = space.toObject();
    spaceObj.isLocked = !!isLocked;

    res.json({ success: true, space: spaceObj, tasks, polls, isMember });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch Space details', error: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { title, assigneePersonaId, dueDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid space ID' });
    }

    const space = await Space.findOne({ _id: spaceId, 'members.personaId': req.personaId });
    if (!space) {
      return res.status(403).json({ success: false, message: 'Not authorized to create tasks in this space' });
    }

    const task = await Task.create({
      spaceId,
      creatorPersonaId: req.personaId,
      assigneePersonaId: assigneePersonaId || null,
      title,
      dueDate: dueDate ? new Date(dueDate) : null
    });

    const populated = await Task.findById(task._id)
      .populate('creatorPersonaId', 'username displayName')
      .populate('assigneePersonaId', 'username displayName');

    res.status(201).json({ success: true, task: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Verify user authorization for target space
    const isMember = await Space.exists({ _id: task.spaceId, 'members.personaId': req.personaId });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to update tasks in this space' });
    }

    task.status = status;
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('creatorPersonaId', 'username displayName')
      .populate('assigneePersonaId', 'username displayName');

    res.json({ success: true, task: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update task status', error: error.message });
  }
};

export const createPoll = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { question, options } = req.body;

    if (!mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).json({ success: false, message: 'Invalid space ID' });
    }

    const isMember = await Space.exists({ _id: spaceId, 'members.personaId': req.personaId });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to create polls in this space' });
    }

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Poll requires a question and at least 2 options' });
    }

    const formattedOptions = options.map(opt => ({ optionText: typeof opt === 'string' ? opt : opt.optionText, votes: [] }));

    const poll = await Poll.create({
      spaceId,
      creatorPersonaId: req.personaId,
      question,
      options: formattedOptions
    });

    const populated = await Poll.findById(poll._id)
      .populate('creatorPersonaId', 'username displayName')
      .populate('options.votes', 'username displayName');

    res.status(201).json({ success: true, poll: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create poll', error: error.message });
  }
};

export const votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex } = req.body;

    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      return res.status(400).json({ success: false, message: 'Invalid poll ID' });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    // Verify user authorization for target space
    const isMember = await Space.exists({ _id: poll.spaceId, 'members.personaId': req.personaId });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to vote on polls in this space' });
    }

    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid poll option index selected' });
    }

    // Remove previous vote by this persona from all options
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== req.personaId.toString());
    });

    // Add vote to selected option
    if (poll.options[optionIndex]) {
      poll.options[optionIndex].votes.push(req.personaId);
    }

    await poll.save();

    const updated = await Poll.findById(poll._id)
      .populate('creatorPersonaId', 'username displayName')
      .populate('options.votes', 'username displayName');

    res.json({ success: true, poll: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to vote on poll', error: error.message });
  }
};

export const updateSpacePrivacyMode = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { privacyMode } = req.body;

    const validModes = ['normal', 'private', 'disappearing', 'burn', 'vault', 'anonymous'];
    if (!validModes.includes(privacyMode)) {
      return res.status(400).json({ success: false, message: 'Invalid privacy mode' });
    }

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    const isMember = space.members.some(m => String(m.personaId) === String(req.personaId));
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to update privacy mode for this space' });
    }

    space.privacyMode = privacyMode;
    await space.save();

    // Sync privacy mode with associated linked conversation if present
    if (space.conversationId) {
      await Conversation.findByIdAndUpdate(space.conversationId, { privacyMode });
    }

    const populated = await Space.findById(spaceId)
      .populate('members.personaId', 'username displayName avatar bio status customStatus type')
      .populate('ownerPersonaId', 'username displayName avatar bio status customStatus type');

    const io = getIO();
    if (io) {
      io.to(String(spaceId)).emit('conversation:privacy:updated', { roomId: spaceId, privacyMode });
      if (space.conversationId) {
        io.to(String(space.conversationId)).emit('conversation:privacy:updated', { roomId: space.conversationId, privacyMode });
      }
      (space.members || []).forEach(m => {
        const pId = m.personaId?._id || m.personaId;
        if (pId) io.to(`persona:${pId}`).emit('conversation:privacy:updated', { roomId: spaceId, privacyMode });
      });
    }

    res.json({ success: true, space: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update space privacy mode', error: error.message });
  }
};
