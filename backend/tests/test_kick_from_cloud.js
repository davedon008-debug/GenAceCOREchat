import 'dotenv/config';
import mongoose from 'mongoose';
import { removeMemberFromSpace } from '../controllers/space.controller.js';
import Space from '../models/Space.js';
import Persona from '../models/Persona.js';

async function kickFromCloud() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas MongoDB');

  const space = await Space.findOne({ title: 'Cloud' }).populate('members.personaId');
  const targetPersona = await Persona.findOne({ username: 'plataindodo@gmail.com' });
  const ownerPersona = space?.ownerPersonaId;

  if (!space || !targetPersona) {
    console.log('Target space or persona not found');
    await mongoose.disconnect();
    return;
  }

  console.log('Space:', space.title, 'ID:', space._id);
  console.log('Initial Members Count:', space.members.length);
  space.members.forEach(m => console.log(' - Member:', m.personaId?.username, 'ID:', m.personaId?._id));

  const req = {
    params: { spaceId: space._id.toString(), personaId: targetPersona._id.toString() },
    personaId: ownerPersona ? ownerPersona.toString() : '6aa06b797cbba271663077b1',
    userId: '6aa06a147cbba271663077ad'
  };

  const res = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('\n--- KICK FROM CLOUD RESULT ---');
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

kickFromCloud().catch(console.error);
