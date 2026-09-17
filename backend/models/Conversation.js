import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
  name: { type: String, default: '' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true }],
  privacyMode: { 
    type: String, 
    enum: ['normal', 'private', 'disappearing', 'burn', 'vault', 'anonymous'], 
    default: 'normal' 
  },
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }]
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ participants: 1, updatedAt: -1 });

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
