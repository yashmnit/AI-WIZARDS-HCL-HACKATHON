import Book from '../models/Book.js';
import SearchLog from '../models/SearchLog.js';
import { embed } from '../services/voyage.js';

export async function searchBooks({ query, level, type, onlyAvailable }, user) {
  const [queryVector] = await embed([query], 'query');

  const clauses = [];
  if (level) clauses.push({ level: { $eq: level } });
  if (type) clauses.push({ type: { $eq: type } });
  if (onlyAvailable) clauses.push({ copiesAvailable: { $gt: 0 } });

  const stage = { index: 'book_vector_index', path: 'embedding', queryVector, numCandidates: 100, limit: 5 };
  if (clauses.length === 1) stage.filter = clauses[0];
  if (clauses.length > 1) stage.filter = { $and: clauses };

  const rows = await Book.aggregate([
    { $vectorSearch: stage },
    { $project: { title: 1, authors: 1, categories: 1, level: 1, type: 1, score: { $meta: 'vectorSearchScore' } } },
  ]);

  await SearchLog.create({
    userId: user.id, query, resultsCount: rows.length, topScore: rows[0]?.score ?? 0,
  });

  if (rows.length === 0) return { status: 'not_found', message: 'No matching resources in the catalog.' };

  return {
    status: 'ok',
    results: rows.map((r) => ({
      bookId: String(r._id), title: r.title, authors: r.authors, categories: r.categories,
      level: r.level, type: r.type, relevance: Number(r.score.toFixed(2)),
    })),
  };
}