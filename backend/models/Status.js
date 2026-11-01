import mongoose from 'mongoose';

const StatusSchema = new mongoose.Schema({
  authorPersonaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona', 
    required: true, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['text', 'image', 'video'], 
    default: 'text' 
  },
  content: { 
    type: String, 
    default: '' 
  },
  mediaUrl: { 
    type: String, 
    default: '' 
  },
  backgroundColor: { 
    type: String, 
    default: '#6366f1' 
  },
  fontStyle: { 
    type: String, 
    default: 'default' 
  },
  privacy: {
    type: { 
      type: String, 
      enum: ['all_contacts', 'everyone', 'exclude'], 
      default: 'all_contacts' 
    },
    excludedPersonas: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Persona' 
    }]
  },
  viewers: [{
    personaId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Persona', 
      required: true 
    },
    viewedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  expiresAt: { 
    type: Date, 
    required: true, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), 
    index: { expires: 0 } 
  }
}, { timestamps: true });
StatusSchema.index({ authorPersonaId: 1, createdAt: -1 });
StatusSchema.index({ authorPersonaId: 1, expiresAt: 1 });
StatusSchema.index({ expiresAt: 1, createdAt: 1 });

export default mongoose.models.Status || mongoose.model('Status', StatusSchema);
