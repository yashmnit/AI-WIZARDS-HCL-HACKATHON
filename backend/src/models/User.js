import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'librarian'], default: 'student' },
  course: String,
  interests: [String],
}, { timestamps: true });

export default mongoose.model('User', userSchema);