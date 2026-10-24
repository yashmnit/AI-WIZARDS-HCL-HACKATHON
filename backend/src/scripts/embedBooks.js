import 'dotenv/config';
import mongoose from 'mongoose';
import Book from '../models/Book.js';
import { embed, buildEmbedText } from '../services/voyage.js';

await mongoose.connect(process.env.MONGODB_URI);
const books = await Book.find({
  $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
});
console.log(`Embedding ${books.length} books...`);

const BATCH = 32;
for (let i = 0; i < books.length; i += BATCH) {
  const batch = books.slice(i, i + BATCH);
  const vectors = await embed(batch.map(buildEmbedText), 'document');
  await Book.bulkWrite(batch.map((b, j) => ({
    updateOne: { filter: { _id: b._id }, update: { $set: { embedding: vectors[j] } } },
  })));
  console.log(`Done ${Math.min(i + BATCH, books.length)} / ${books.length}`);
}
await mongoose.disconnect();