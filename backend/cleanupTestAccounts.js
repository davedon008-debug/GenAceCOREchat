import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import Persona from './models/Persona.js';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';

const cleanupTestAccounts = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/donchat';
    await mongoose.connect(mongoURI);
    console.log('[Cleanup] Connected to MongoDB...');

    // Genuine accounts to keep explicitly
    const keepEmails = ['davedon008@gmail.com', 'admin@donchat.com', 'gift.gmail com', 'plataindodo@gmail.com', 'somto008@gmail.com', 'demo@donchat.com'];
    const keepHandles = ['bigdon', 'admin_o00a', 'gift', 'plataindodo@gmail.com', 'somtos', 'donald_demo'];

    // Find all temporary/test accounts to remove
    const testUsers = await User.find({
      email: { $nin: keepEmails }
    });
    const testUserIds = testUsers.map(u => u._id);

    const testPersonas = await Persona.find({
      $or: [
        { userId: { $in: testUserIds } },
        { username: { $nin: keepHandles } }
      ]
    });
    const testPersonaIds = testPersonas.map(p => p._id);

    console.log(`[Cleanup] Found ${testUsers.length} automated test accounts and ${testPersonas.length} automated test personas to clean.`);

    if (testPersonaIds.length > 0) {
      const deletedMsgs = await Message.deleteMany({ senderPersonaId: { $in: testPersonaIds } });
      console.log(`[Cleanup] Deleted ${deletedMsgs.deletedCount} test messages.`);

      const deletedConvs = await Conversation.deleteMany({ participants: { $in: testPersonaIds } });
      console.log(`[Cleanup] Deleted ${deletedConvs.deletedCount} test conversations.`);

      const deletedPersonas = await Persona.deleteMany({ _id: { $in: testPersonaIds } });
      console.log(`[Cleanup] Deleted ${deletedPersonas.deletedCount} test personas.`);

      await Persona.updateMany({}, {
        $pull: {
          contacts: { $in: testPersonaIds },
          blockedPersonas: { $in: testPersonaIds }
        }
      });
    }

    if (testUserIds.length > 0) {
      const deletedUsers = await User.deleteMany({ _id: { $in: testUserIds } });
      console.log(`[Cleanup] Deleted ${deletedUsers.deletedCount} test user accounts.`);
    }

    console.log('\n================ CLEANED GENUINE USERS IN DB ================');
    const remainingUsers = await User.find({}).select('email role createdAt');
    remainingUsers.forEach((u, i) => console.log(`${i + 1}. User: ${u.email} | Role: ${u.role}`));

    console.log('\n================ CLEANED GENUINE PERSONAS IN DB ================');
    const remainingPersonas = await Persona.find({}).select('username displayName type');
    remainingPersonas.forEach((p, i) => console.log(`${i + 1}. Persona: ${p.displayName} (@${p.username})`));

    await mongoose.disconnect();
    console.log('\n[Cleanup] All test accounts cleaned! Database is now 100% clean!');
    process.exit(0);
  } catch (err) {
    console.error('[Cleanup Error]', err);
    process.exit(1);
  }
};

cleanupTestAccounts();
