import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null, index: true },
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null, index: true },
  senderPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  content: { type: String, default: '' },
  contentType: { 
    type: String, 
    enum: ['text', 'voice', 'image', 'video', 'file', 'document', 'poll', 'task_card'], 
    default: 'text' 
  },
  mediaUrl: { type: String, default: '' },
  voiceDuration: { type: Number, default: 0 },
  privacyMode: { 
    type: String, 
    enum: ['normal', 'private', 'disappearing', 'burn', 'vault', 'anonymous'], 
    default: 'normal' 
  },
  isBurned: { type: Boolean, default: false },
  reactions: [{
    emoji: { type: String, required: true },
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true }
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  expiresAt: { type: Date, default: null, index: { expires: 0 } }
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ spaceId: 1, createdAt: -1 });
MessageSchema.index({ senderPersonaId: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
