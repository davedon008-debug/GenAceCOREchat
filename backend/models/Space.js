import mongoose from 'mongoose';

const SpaceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '⚡' },
  ownerPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  members: [{
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' }
  }],
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  visibility: { type: String, enum: ['public', 'private'], default: 'private' },
  privacyMode: { 
    type: String, 
    enum: ['normal', 'private', 'disappearing', 'burn', 'vault', 'anonymous'], 
    default: 'normal' 
  },
  aiSummary: { type: String, default: 'No summary generated yet.' },
  lastAiUpdate: { type: Date, default: Date.now }
}, { timestamps: true });

SpaceSchema.index({ 'members.personaId': 1 });
SpaceSchema.index({ visibility: 1, updatedAt: -1 });

export default mongoose.models.Space || mongoose.model('Space', SpaceSchema);
