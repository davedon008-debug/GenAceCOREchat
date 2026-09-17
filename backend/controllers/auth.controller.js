import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Persona from '../models/Persona.js';
import PasswordResetRequest from '../models/PasswordResetRequest.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'donchat_secure_default_secret_key_2026';
};

export const registerUser = async (req, res) => {
  try {
    const { email, password, masterName, username, displayName, personaType } = req.body;

    if (!email || !password || !masterName || !username) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const existingPersona = await Persona.findOne({ username: cleanUsername });
    if (existingPersona) {
      return res.status(400).json({ success: false, message: 'Username handle is already taken. Please choose a different one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: cleanEmail,
      password: hashedPassword,
      masterName,
      personas: []
    });

    const defaultPersona = await Persona.create({
      userId: user._id,
      username: cleanUsername,
      displayName: displayName || masterName,
      type: personaType || 'personal',
      isDefault: true
    });

    user.personas.push(defaultPersona._id);
    await user.save();

    const token = jwt.sign(
      { userId: user._id, personaId: defaultPersona._id },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        masterName: user.masterName,
        role: user.role || 'user'
      },
      activePersona: defaultPersona
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email/username and password are required' });
    }

    const cleanInput = email.trim().toLowerCase().replace(/^@/, '');

    // Search by email case-insensitively
    let user = await User.findOne({ email: cleanInput }).populate('personas');

    // If not found by email, search by persona username handle
    if (!user) {
      const persona = await Persona.findOne({ username: cleanInput });
      if (persona) {
        user = await User.findById(persona.userId).populate('personas');
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Account not found with this email or username' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid password' });
    }

    // Ensure testalex@gmail.com and admin@donchat.com have admin role assigned
    if (['testalex@gmail.com', 'admin@donchat.com'].includes(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    let userPersonas = (user.personas || []).filter(Boolean);
    if (!userPersonas.length) {
      userPersonas = await Persona.find({ userId: user._id });
    }

    let defaultPersona = userPersonas.find(p => p.isDefault) || userPersonas[0];

    if (!defaultPersona) {
      const fallbackHandle = (user.email ? user.email.split('@')[0] : 'user') + '_' + Math.random().toString(36).substring(2, 6);
      defaultPersona = await Persona.create({
        userId: user._id,
        username: fallbackHandle,
        displayName: user.masterName || 'User',
        type: 'personal',
        isDefault: true
      });
      await User.findByIdAndUpdate(user._id, { $push: { personas: defaultPersona._id } });
      userPersonas = [defaultPersona];
    }

    const token = jwt.sign(
      { userId: user._id, personaId: defaultPersona._id },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        masterName: user.masterName,
        role: user.role || 'user'
      },
      activePersona: defaultPersona,
      personas: userPersonas
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

export const demoLogin = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Demo login is disabled in production mode.' });
  }

  try {
    const demoEmail = 'demo@donchat.com';
    let user = await User.findOne({ email: demoEmail }).populate('personas');

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('demo123', salt);

      user = await User.create({
        email: demoEmail,
        password: hashedPassword,
        masterName: 'Demo Guest',
        role: 'user',
        personas: []
      });

      // Try to assign or create @donald persona for demo
      let persona = await Persona.findOne({ username: 'donald' });
      if (!persona) {
        persona = await Persona.create({
          userId: user._id,
          username: 'donald',
          displayName: 'Donald (Demo)',
          type: 'personal',
          isDefault: true
        });
      } else if (persona.userId.toString() !== user._id.toString()) {
        // Handle handle collision if @donald belongs to another user
        const demoHandle = 'donald_demo';
        persona = await Persona.findOne({ username: demoHandle });
        if (!persona) {
          persona = await Persona.create({
            userId: user._id,
            username: demoHandle,
            displayName: 'Donald (Demo)',
            type: 'personal',
            isDefault: true
          });
        }
      }

      user.personas = [persona._id];
      await user.save();
      user = await User.findById(user._id).populate('personas');
    } else {
      // Ensure user role is explicitly 'user', never 'admin'
      if (user.role !== 'user') {
        user.role = 'user';
        await user.save();
      }
    }

    let userPersonas = (user.personas || []).filter(Boolean);
    if (!userPersonas.length) {
      userPersonas = await Persona.find({ userId: user._id });
    }

    const defaultPersona = userPersonas.find(p => p.isDefault) || userPersonas[0];
    const token = jwt.sign(
      { userId: user._id, personaId: defaultPersona._id },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, masterName: user.masterName, role: 'user' },
      activePersona: defaultPersona,
      personas: userPersonas
    });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ success: false, message: 'Demo auth failed', error: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password', error: error.message });
  }
};

export const setChatPasscode = async (req, res) => {
  try {
    const { passcode, currentPasscode } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const strPasscode = passcode !== undefined && passcode !== null ? String(passcode).trim() : '';
    const strCurrent = currentPasscode !== undefined && currentPasscode !== null ? String(currentPasscode).trim() : '';

    if (user.chatPasscode) {
      if (!strCurrent) {
        return res.status(400).json({ success: false, message: 'Current passcode is required to make changes' });
      }
      const isMatch = await bcrypt.compare(strCurrent, user.chatPasscode);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current passcode' });
      }
    }

    if (!strPasscode) {
      user.chatPasscode = null;
      user.chatLockEnabled = false;
      await user.save();
      return res.json({ success: true, message: 'Passcode removed. Chat Lock disabled.', chatLockEnabled: false });
    }

    if (strPasscode.length < 4) {
      return res.status(400).json({ success: false, message: 'Passcode must be at least 4 digits/characters' });
    }

    const salt = await bcrypt.genSalt(10);
    user.chatPasscode = await bcrypt.hash(strPasscode, salt);
    user.chatLockEnabled = true;
    await user.save();

    res.json({ success: true, message: 'Chat passcode saved successfully!', chatLockEnabled: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to set chat passcode', error: error.message });
  }
};

export const verifyChatPasscode = async (req, res) => {
  try {
    const { passcode } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.chatPasscode) {
      return res.json({ success: true, valid: true });
    }

    if (passcode === undefined || passcode === null || String(passcode).trim() === '') {
      return res.status(400).json({ success: false, valid: false, message: 'Passcode is required' });
    }

    const strPasscode = String(passcode).trim();
    const isMatch = await bcrypt.compare(strPasscode, user.chatPasscode);
    res.json({ success: true, valid: isMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

export const getPasscodeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      hasPasscode: !!user.chatPasscode,
      chatLockEnabled: !!(user.chatPasscode && user.chatLockEnabled),
      lockedConversations: user.lockedConversations || [],
      lockedSpaces: user.lockedSpaces || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch status', error: error.message });
  }
};

export const toggleLockConversation = async (req, res) => {
  try {
    const { conversationId, spaceId } = req.body;
    const targetId = spaceId || conversationId;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Conversation ID or Space ID is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.lockedConversations) user.lockedConversations = [];
    if (!user.lockedSpaces) user.lockedSpaces = [];

    const targetIdStr = String(targetId);
    let isLocked = false;

    if (spaceId) {
      const index = user.lockedSpaces.indexOf(targetIdStr);
      if (index > -1) {
        user.lockedSpaces.splice(index, 1);
        isLocked = false;
      } else {
        user.lockedSpaces.push(targetIdStr);
        isLocked = true;
        if (user.chatPasscode) {
          user.chatLockEnabled = true;
        }
      }
    } else {
      const index = user.lockedConversations.indexOf(targetIdStr);
      if (index > -1) {
        user.lockedConversations.splice(index, 1);
        isLocked = false;
      } else {
        user.lockedConversations.push(targetIdStr);
        isLocked = true;
        if (user.chatPasscode) {
          user.chatLockEnabled = true;
        }
      }
    }

    await user.save();
    res.json({
      success: true,
      isLocked,
      chatLockEnabled: user.chatLockEnabled,
      lockedConversations: user.lockedConversations,
      lockedSpaces: user.lockedSpaces,
      message: isLocked ? 'Item locked' : 'Item unlocked'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle lock status', error: error.message });
  }
};

export const toggleChatLock = async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (enabled && !user.chatPasscode) {
      return res.status(400).json({ success: false, message: 'Please set a passcode first before enabling Chat Lock' });
    }

    user.chatLockEnabled = !!enabled;
    await user.save();

    res.json({
      success: true,
      chatLockEnabled: user.chatLockEnabled,
      message: user.chatLockEnabled ? 'Chat Lock enabled' : 'Chat Lock disabled'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle Chat Lock', error: error.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { emailOrHandle, note } = req.body;
    if (!emailOrHandle || !emailOrHandle.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your email address or username handle.' });
    }

    const cleanInput = emailOrHandle.trim().toLowerCase().replace(/^@/, '');

    let user = await User.findOne({ email: cleanInput });
    if (!user) {
      const persona = await Persona.findOne({ username: cleanInput });
      if (persona) {
        user = await User.findById(persona.userId);
      }
    }

    const resetReq = await PasswordResetRequest.create({
      emailOrHandle: cleanInput,
      user: user ? user._id : null,
      userEmail: user ? user.email : cleanInput,
      masterName: user ? user.masterName : cleanInput,
      requestNote: note || 'User requested password reset via contact admin option.',
      status: 'pending'
    });

    // Send automatic Chat inbox notification to Admin Persona
    try {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        const adminPersona = await Persona.findOne({ userId: adminUser._id });
        if (adminPersona) {
          let conv = await Conversation.findOne({
            type: 'direct',
            participants: { $all: [adminPersona._id] }
          });
          if (!conv) {
            conv = await Conversation.create({
              type: 'direct',
              participants: [adminPersona._id],
              createdByPersonaId: adminPersona._id
            });
          }
          await Message.create({
            conversationId: conv._id,
            senderPersonaId: adminPersona._id,
            content: `🔑 PASSWORD RESET REQUEST: User account "${user ? user.email : cleanInput}" (@${user ? user.masterName : cleanInput}) submitted a password reset request.\nNote: "${note || 'No additional note provided'}"`
          });
          conv.lastMessageAt = new Date();
          await conv.save();
        }
      }
    } catch (msgErr) {
      console.error('[requestPasswordReset] Admin message alert error:', msgErr);
    }

    res.json({
      success: true,
      message: 'Password reset request sent to Workspace Admin successfully! An admin will assist you with your password credentials shortly.',
      requestId: resetReq._id,
      adminContactEmail: 'admin@donchat.com'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send password reset request', error: error.message });
  }
};

export const checkResetStatus = async (req, res) => {
  try {
    const { emailOrHandle } = req.body;
    if (!emailOrHandle || !emailOrHandle.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your email address or username handle.' });
    }

    const cleanInput = emailOrHandle.trim().toLowerCase().replace(/^@/, '');

    const existingReq = await PasswordResetRequest.findOne({
      $or: [
        { emailOrHandle: cleanInput },
        { userEmail: cleanInput }
      ]
    }).sort({ createdAt: -1 });

    if (!existingReq) {
      return res.status(404).json({
        success: false,
        message: 'No password reset request found for this email/handle. You can submit a new request below.'
      });
    }

    if (existingReq.status === 'resolved') {
      return res.json({
        success: true,
        status: 'resolved',
        message: `✅ RESOLVED BY ADMIN:\n\n"${existingReq.adminNote || 'Password reset by Admin.'}"\n\nYou can now use these credentials to log in!`,
        adminNote: existingReq.adminNote,
        resolvedAt: existingReq.resolvedAt
      });
    } else if (existingReq.status === 'rejected') {
      return res.json({
        success: true,
        status: 'rejected',
        message: `❌ REQUEST REJECTED: ${existingReq.adminNote || 'Please contact support at admin@donchat.com.'}`
      });
    } else {
      return res.json({
        success: true,
        status: 'pending',
        message: `⏳ PENDING REVIEW: Your password reset request was submitted on ${new Date(existingReq.createdAt).toLocaleTimeString()} and is currently being reviewed by the Admin.`
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check reset status', error: error.message });
  }
};



