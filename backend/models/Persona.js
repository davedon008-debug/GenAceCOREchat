import mongoose from 'mongoose';

const PersonaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  avatar: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80' 
  },
  bio: { type: String, default: '' },
  type: { 
    type: String, 
    enum: ['personal', 'business', 'gaming', 'anonymous'], 
    default: 'personal' 
  },
  status: { 
    type: String, 
    enum: ['online', 'away', 'dnd', 'offline'], 
    default: 'online' 
  },
  customStatus: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
  blockedPersonas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }]
}, { timestamps: true });

PersonaSchema.index({ userId: 1 });

export default mongoose.models.Persona || mongoose.model('Persona', PersonaSchema);
