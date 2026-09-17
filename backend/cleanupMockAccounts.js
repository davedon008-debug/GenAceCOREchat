import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import Persona from './models/Persona.js';
import Conversation from './models/Conversation.js';

const mockUsernames = ['david', 'white', 'chimaski', 'momo', 'enny', 'babygift', 'isabella'];

const runCleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/donchat');
    console.log('[Cleanup] Connected to MongoDB...');

    // 1. Delete system user
    const systemUser = await User.findOneAndDelete({ email: 'system@donchat.internal' });
    if (systemUser) {
      console.log(`[Cleanup] Deleted system seed user account (${systemUser._id})`);
    }

    // 2. Find and delete mock personas
    const mockPersonas = await Persona.find({ username: { $in: mockUsernames } });
    const mockPersonaIds = mockPersonas.map(p => p._id);

    if (mockPersonaIds.length > 0) {
      await Persona.deleteMany({ _id: { $in: mockPersonaIds } });
      console.log(`[Cleanup] Deleted ${mockPersonaIds.length} mock persona accounts (${mockUsernames.join(', ')})`);

      // Delete any conversations involving these mock personas
      const deletedConvs = await Conversation.deleteMany({ participants: { $in: mockPersonaIds } });
      console.log(`[Cleanup] Deleted ${deletedConvs.deletedCount} associated mock conversations.`);
    } else {
      console.log('[Cleanup] No mock persona accounts found in MongoDB.');
    }

    console.log('[Cleanup] Database cleanup completed successfully! Only genuine user accounts remain.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('[Cleanup Error]', err);
    process.exit(1);
  }
};

runCleanup();
