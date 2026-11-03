import mongoose from 'mongoose';

const PersonaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  avatar: { 
    type: String, 
    default: '' 
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
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  pushTokens: [{ type: String }],
  mutedStatusPersonas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  statusPrivacy: {
    defaultType: {
      type: String,
      enum: ['all_contacts', 'everyone', 'exclude'],
      default: 'all_contacts'
    },
    mutedViewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }]
  },
  privacySettings: {
    setupCompleted: { type: Boolean, default: true },
    whoCanFindMe: { 
      type: String, 
      enum: ['everyone', 'friends', 'nobody'], 
      default: 'everyone' 
    },
    onlineVisibility: { 
      type: String, 
      enum: ['everyone', 'friends', 'nobody'], 
      default: 'everyone' 
    },
    newAccountAnnouncements: { 
      type: Boolean, 
      default: true 
    },
    agreedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

PersonaSchema.index({ userId: 1 });
PersonaSchema.index({ blockedPersonas: 1 });
PersonaSchema.index({ contacts: 1 });
PersonaSchema.index({ updatedAt: -1 });
PersonaSchema.index({ 'privacySettings.setupCompleted': 1, 'privacySettings.whoCanFindMe': 1 });

export default mongoose.models.Persona || mongoose.model('Persona', PersonaSchema);
