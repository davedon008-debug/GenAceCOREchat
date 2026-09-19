import 'dotenv/config';
import mongoose from 'mongoose';
import { sendMessage, getMessages } from '../controllers/message.controller.js';
import Space from '../models/Space.js';
import Message from '../models/Message.js';
import Persona from '../models/Persona.js';

async function testSendReplyQuote() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas MongoDB');

  const space = await Space.findOne({ title: /GPS/i });
  const bigdonPersona = await Persona.findOne({ username: 'bigdon' });

  if (!space || !bigdonPersona) {
    console.log('Space or persona missing');
    await mongoose.disconnect();
    return;
  }

  // Find a target message in the space to reply to
  let originalMsg = await Message.findOne({ spaceId: space._id }).sort({ createdAt: -1 });
  if (!originalMsg) {
    // Create an original message to reply to
    originalMsg = await Message.create({
      spaceId: space._id,
      senderPersonaId: bigdonPersona._id,
      content: 'You dey house',
      contentType: 'text'
    });
  }

  console.log('Original Message to Reply To:', originalMsg._id, originalMsg.content);

  // Send WhatsApp Quoted Reply
  const req = {
    body: {
      spaceId: space._id.toString(),
      content: 'I no dey mammie 👀',
      contentType: 'text',
      replyTo: originalMsg._id.toString()
    },
    personaId: bigdonPersona._id.toString(),
    userId: bigdonPersona.userId.toString()
  };

  let createdReplyMsg = null;
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('\n--- SEND REPLY RESULT ---');
      console.log('STATUS:', this.statusCode || 200);
      console.log('SUCCESS:', data.success);
      console.log('REPLY MESSAGE CONTENT:', data.message?.content);
      console.log('REPLIED TO AUTHOR:', data.message?.replyTo?.senderPersonaId?.displayName || data.message?.replyTo?.senderPersonaId?.username);
      console.log('REPLIED TO CONTENT:', data.message?.replyTo?.content);
      createdReplyMsg = data.message;
      return this;
    }
  };

  await sendMessage(req, res);
  await mongoose.disconnect();
}

testSendReplyQuote().catch(console.error);
