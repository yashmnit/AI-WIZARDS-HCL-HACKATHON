import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  book_id: {type: String},
  title: { type: String , required: true },
  authors: String,
  description: String,
  categories: String,
   isAvailable: { type: Boolean },
  copies: { type: Number, default: 3 },
  embedding: { type: [Number], select: false, default: undefined },   // vector lives in the same document
}, { timestamps: true });

export default mongoose.model('Book', bookSchema);