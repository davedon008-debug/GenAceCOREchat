import mongoose from 'mongoose';

const PasswordResetRequestSchema = new mongoose.Schema({
  emailOrHandle: { type: String, required: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userEmail: { type: String, trim: true },
  masterName: { type: String, trim: true },
  requestNote: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' },
  adminNote: { type: String, default: '' },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.models.PasswordResetRequest || mongoose.model('PasswordResetRequest', PasswordResetRequestSchema);
