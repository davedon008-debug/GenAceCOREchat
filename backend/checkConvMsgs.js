import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Message from './models/Message.js';
import Conversation from './models/Conversation.js';
import Persona from './models/Persona.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/donchat');

  const conv = await Conversation.findOne({
    participants: { $all: ['6aa06b797cbba271663077b1', '6aa07a8bc132abfdfa768413'] }
  });

  if (!conv) {
    console.log('Conversation not found');
    await mongoose.disconnect();
    return;
  }

  console.log(`=== CONVERSATION ${conv._id} MESSAGES ===`);
  const messages = await Message.find({ conversationId: conv._id }).populate('senderPersonaId');

  for (const m of messages) {
    console.log(`ID: ${m._id} | Sender: @${m.senderPersonaId?.username}`);
    console.log(`   Type: ${m.contentType}`);
    console.log(`   Content: "${m.content}"`);
    console.log(`   MediaUrl: "${m.mediaUrl}"`);
    console.log(`   PrivacyMode: ${m.privacyMode}`);
    console.log(`   IsBurned: ${m.isBurned}`);
    console.log('---');
  }

  await mongoose.disconnect();
};

run().catch(console.error);
