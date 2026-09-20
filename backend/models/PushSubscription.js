import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  personaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Persona', 
    required: true,
    index: true
  },
  endpoint: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: { type: String, default: '' },
  platform: { type: String, default: '' }
}, { timestamps: true });

PushSubscriptionSchema.index({ userId: 1, endpoint: 1 });
PushSubscriptionSchema.index({ personaId: 1, endpoint: 1 });

export default mongoose.models.PushSubscription || mongoose.model('PushSubscription', PushSubscriptionSchema);
