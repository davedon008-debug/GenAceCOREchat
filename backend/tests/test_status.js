import mongoose from 'mongoose';
import Status from '../models/Status.js';
import Persona from '../models/Persona.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

async function testStatusFeature() {
  console.log('Testing Status Feature Models & Business Logic...');

  // 1. Check Model schemas
  console.log('1. Checking Status Schema fields...');
  const paths = Status.schema.paths;
  if (!paths.authorPersonaId) throw new Error('Missing authorPersonaId');
  if (!paths.type) throw new Error('Missing type');
  if (!paths.content) throw new Error('Missing content');
  if (!paths.mediaUrl) throw new Error('Missing mediaUrl');
  if (!paths.backgroundColor) throw new Error('Missing backgroundColor');
  if (!paths.expiresAt) throw new Error('Missing expiresAt');
  if (!paths['privacy.type']) throw new Error('Missing privacy.type');
  if (!paths['privacy.excludedPersonas']) throw new Error('Missing privacy.excludedPersonas');
  if (!paths.viewers) throw new Error('Missing viewers');

  console.log('✓ Status Schema has all required fields!');

  // 2. Check 24-hour expiration calculation
  console.log('2. Checking 24-hour expiration calculation...');
  const now = Date.now();
  const testStatus = new Status({
    authorPersonaId: new mongoose.Types.ObjectId(),
    type: 'text',
    content: 'Hello GenAce Status!'
  });

  const diffHours = (testStatus.expiresAt.getTime() - now) / (1000 * 60 * 60);
  console.log(`✓ Status expiresAt is set to ~${diffHours.toFixed(2)} hours in the future (Expected ~24h)`);
  if (diffHours < 23.9 || diffHours > 24.1) {
    throw new Error(`Unexpected expiration: ${diffHours}h`);
  }

  // 3. Check Persona Schema extensions
  console.log('3. Checking Persona schema extensions...');
  const personaPaths = Persona.schema.paths;
  if (!personaPaths.mutedStatusPersonas) throw new Error('Missing mutedStatusPersonas on Persona');
  if (!personaPaths['statusPrivacy.defaultType']) throw new Error('Missing statusPrivacy.defaultType on Persona');
  if (!personaPaths['statusPrivacy.mutedViewers']) throw new Error('Missing statusPrivacy.mutedViewers on Persona');
  console.log('✓ Persona Schema has mutedStatusPersonas and statusPrivacy!');

  // 4. Check Message Schema status_reply
  console.log('4. Checking Message schema statusReply...');
  const msgPaths = Message.schema.paths;
  if (!msgPaths['statusReply.statusId']) throw new Error('Missing statusReply on Message');
  if (!Message.schema.path('contentType').enumValues.includes('status_reply')) {
    throw new Error('contentType enum missing status_reply');
  }
  console.log('✓ Message Schema supports status_reply and statusReply details!');

  console.log('\n🎉 ALL STATUS FEATURE TESTS PASSED SUCCESSFULLY!');
}

testStatusFeature().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
