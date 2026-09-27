import mongoose from 'mongoose';

const SecretLoversGameSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  creatorPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  partnerPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  
  // Array of user-created questions/challenges
  questions: [{
    number: { type: Number, required: true }, // Tile number 1..N
    text: { type: String, required: true },   // Custom question typed by user
    category: { type: String, default: 'General' }, // Optional category
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }
  }],

  // Gameplay state tracking
  selectedNumbers: [{ type: Number }],  // Numbers already chosen
  completedNumbers: [{ type: Number }], // Numbers completed with 'Done'
  skippedNumbers: [{ type: Number }],   // Numbers skipped

  currentTurnPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  currentRevealedTile: {
    number: { type: Number, default: null },
    text: { type: String, default: '' },
    category: { type: String, default: '' },
    revealedById: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', default: null },
    status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' }
  },

  status: {
    type: String,
    enum: ['invited', 'active', 'declined', 'completed', 'cancelled'],
    default: 'invited',
    index: true
  },

  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

SecretLoversGameSchema.index({ conversationId: 1, status: 1 });
SecretLoversGameSchema.index({ creatorPersonaId: 1, partnerPersonaId: 1 });

export default mongoose.models.SecretLoversGame || mongoose.model('SecretLoversGame', SecretLoversGameSchema);
