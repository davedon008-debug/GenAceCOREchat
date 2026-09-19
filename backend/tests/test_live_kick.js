import 'dotenv/config';
import mongoose from 'mongoose';
import { removeMemberFromSpace } from '../controllers/space.controller.js';
import Space from '../models/Space.js';

async function executeLiveRemoval() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas MongoDB');

  const space = await Space.findOne({ title: /GPS/i }).populate('members.personaId');
  if (!space) {
    console.log('Space not found');
    await mongoose.disconnect();
    return;
  }

  console.log('Target Space:', space.title, 'ID:', space._id);
  console.log('Current Members count:', space.members.length);
  space.members.forEach(m => console.log(' - Member:', m.personaId?.username, 'ID:', m.personaId?._id));

  const giftMember = space.members.find(m => m.personaId?.username === 'gift');
  if (!giftMember) {
    console.log('@gift is not currently in this space roster or was already removed.');
    await mongoose.disconnect();
    return;
  }

  const req = {
    params: { spaceId: space._id.toString(), personaId: giftMember.personaId._id.toString() },
    personaId: space.ownerPersonaId ? space.ownerPersonaId.toString() : '6aa06b797cbba271663077b1',
    userId: '6aa06a147cbba271663077ad'
  };

  const res = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('\n--- API REMOVAL RESULT ---');
      console.log('STATUS:', this.statusCode || 200);
      console.log('SUCCESS:', data.success);
      console.log('REMOVED PERSONA ID:', data.removedPersonaId);
      console.log('UPDATED MEMBERS COUNT:', data.space?.members?.length);
      return this;
    }
  };

  await removeMemberFromSpace(req, res);
  await mongoose.disconnect();
}

executeLiveRemoval().catch(console.error);
