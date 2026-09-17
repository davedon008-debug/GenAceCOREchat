import mongoose from 'mongoose';

const PollSchema = new mongoose.Schema({
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
  creatorPersonaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona', required: true },
  question: { type: String, required: true, trim: true },
  options: [{
    optionText: { type: String, required: true, trim: true },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Persona' }]
  }]
}, { timestamps: true });

export default mongoose.models.Poll || mongoose.model('Poll', PollSchema);
