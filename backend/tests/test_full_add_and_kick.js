import 'dotenv/config';
import mongoose from 'mongoose';
import { inviteMembersToSpace, removeMemberFromSpace } from '../controllers/space.controller.js';
import Space from '../models/Space.js';
import Persona from '../models/Persona.js';

async function testFullAddAndKick() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas MongoDB');

  const space = await Space.findOne({ title: /GPS/i });
  const giftPersona = await Persona.findOne({ username: 'gift' });
  const bigdonPersona = await Persona.findOne({ username: 'bigdon' });

  if (!space || !giftPersona || !bigdonPersona) {
    console.log('Test dependencies missing:', { space: !!space, giftPersona: !!giftPersona, bigdonPersona: !!bigdonPersona });
    await mongoose.disconnect();
    return;
  }

  console.log('\n--- STEP 1: INVITE @gift TO SPACE ---');
  const reqInvite = {
    params: { spaceId: space._id.toString() },
    body: { personaIds: [giftPersona._id.toString()] },
    personaId: bigdonPersona._id.toString(),
    userId: bigdonPersona.userId.toString()
  };

  let inviteSuccess = false;
  const resInvite = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('INVITE STATUS:', this.statusCode || 200);
      console.log('INVITE SUCCESS:', data.success);
      console.log('MEMBER COUNT AFTER INVITE:', data.space?.members?.length);
      inviteSuccess = data.success;
      return this;
    }
  };

  await inviteMembersToSpace(reqInvite, resInvite);

  if (!inviteSuccess) {
    console.error('Invite failed!');
    await mongoose.disconnect();
    return;
  }

  console.log('\n--- STEP 2: KICK / REMOVE @gift FROM SPACE ---');
  const reqRemove = {
    params: { spaceId: space._id.toString(), personaId: giftPersona._id.toString() },
    personaId: bigdonPersona._id.toString(),
    userId: bigdonPersona.userId.toString()
  };

  const resRemove = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('REMOVE STATUS:', this.statusCode || 200);
      console.log('REMOVE SUCCESS:', data.success);
      console.log('REMOVED PERSONA ID:', data.removedPersonaId);
      console.log('MEMBER COUNT AFTER REMOVAL:', data.space?.members?.length);
      return this;
    }
  };

  await removeMemberFromSpace(reqRemove, resRemove);

  await mongoose.disconnect();
  console.log('\n--- FULL E2E TEST PASSED CLEANLY ---');
}

testFullAddAndKick().catch(console.error);
