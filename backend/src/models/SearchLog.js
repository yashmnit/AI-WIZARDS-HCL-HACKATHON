import mongoose from 'mongoose';

const searchSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  query: String,
  topScore: Number,
  resultsCount: Number,
}, { timestamps: true });

export default mongoose.model('SearchLog', searchSchema);