import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
  creatorPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  assigneePersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  dueDate: { type: Date }
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
