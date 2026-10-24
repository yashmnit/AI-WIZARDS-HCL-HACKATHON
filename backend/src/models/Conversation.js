import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  contents: { type: [mongoose.Schema.Types.Mixed], default: [] },  // raw Gemini history
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);