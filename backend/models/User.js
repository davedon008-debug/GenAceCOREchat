import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  masterName: { type: String, required: true, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  personas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }],
  chatPasscode: { type: String, default: null },
  chatLockEnabled: { type: Boolean, default: false },
  lockedConversations: [{ type: String }],
  lockedSpaces: [{ type: String }]
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
