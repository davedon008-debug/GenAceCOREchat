import Persona from '../models/Persona.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

export const seedDefaultContacts = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Seed Safety] Automatic contact seeding is disabled in production mode.');
    return;
  }

  try {
    const defaultContactsData = [
      { username: 'david', displayName: 'David 🥂', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&q=80', bio: '📞 Voice call available' },
      { username: 'white', displayName: 'White 🤍🤍', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=128&q=80', bio: 'Omo me self that time too' },
      { username: 'chimaski', displayName: 'Chimaski', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&q=80', bio: '⚡ Active on Fluid Spaces' },
      { username: 'momo', displayName: 'Momo', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&q=80', bio: '📹 Video call ready' },
      { username: 'enny', displayName: 'enny', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=128&q=80', bio: 'Living the moment ✨' },
      { username: 'babygift', displayName: 'Baby Gift 💜💜', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80', bio: '🏷️ Sticker collector' },
      { username: 'isabella', displayName: 'Isabella', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=128&q=80', bio: 'When you come you\'ll know how far' }
    ];

    let systemUser = await User.findOne({ email: 'system@donchat.internal' });
    if (!systemUser) {
      const systemPass = process.env.SEED_SYSTEM_PASSWORD || 'system_pass_dev_2026!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(systemPass, salt);
      systemUser = await User.create({
        email: 'system@donchat.internal',
        password: hashedPassword,
        masterName: 'DONCHAT Directory',
        personas: []
      });
    }

    for (const cData of defaultContactsData) {
      const existing = await Persona.findOne({ username: cData.username });
      if (!existing) {
        const created = await Persona.create({
          userId: systemUser._id,
          username: cData.username,
          displayName: cData.displayName,
          avatar: cData.avatar,
          bio: cData.bio,
          type: 'personal',
          isDefault: true
        });
        await User.findByIdAndUpdate(systemUser._id, { $push: { personas: created._id } });
      }
    }
    console.log('[Seed] Development default contact list verified in database.');
  } catch (err) {
    console.error('[Seed Error] Failed to seed default contacts:', err.message);
  }
};

// Executed directly via `npm run seed` or `node config/seed.js`
if (process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].includes('seed'))) {
  connectDB().then(async () => {
    await seedDefaultContacts();
    await mongoose.connection.close();
    process.exit(0);
  }).catch(err => {
    console.error('Seed execution failed:', err);
    process.exit(1);
  });
}
