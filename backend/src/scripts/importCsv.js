import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import mongoose from 'mongoose';
import Book from '../models/Book.js';

const KEYWORDS = /computer|programming|software|algorithm|data|machine learning|artificial|python|java|database|network|science|mathematics|technology/i;
const MAX_BOOKS = 300;

const guessLevel = (text) => {
  if (/introduct|beginner|basics|fundamental|first|getting started|for dummies|primer/i.test(text)) return 'beginner';
  if (/advanced|mastering|expert|professional|in depth|graduate/i.test(text)) return 'advanced';
  return 'intermediate';
};

// books the PDF mentions, added manually in case the CSV does not have them
const manual = [
  { title: 'Artificial Intelligence: A Modern Approach', authors: 'Stuart Russell; Peter Norvig', categories: 'Computers / Artificial Intelligence',
    description: 'The leading textbook on artificial intelligence, covering search, knowledge representation, reasoning, planning, machine learning and robotics for university students.', level: 'intermediate', year: 2020 },
  { title: 'Python Crash Course', authors: 'Eric Matthes', categories: 'Computers / Programming',
    description: 'A fast-paced, beginner-friendly introduction to Python programming with hands-on projects including games, data visualizations and web apps.', level: 'beginner', year: 2019 },
  { title: 'Generative AI for Beginners', authors: 'Library Learning Path', categories: 'Computers / Artificial Intelligence',
    description: 'An introductory guide to generative AI, large language models, prompt engineering and building simple AI applications. No prior experience required.', level: 'beginner', year: 2024 },
];

await mongoose.connect(process.env.MONGODB_URI);
const rows = parse(fs.readFileSync('data/books.csv'), { columns: true, skip_empty_lines: true, relax_quotes: true });

const seen = new Set();
const csvBooks = rows
  .filter((r) => r.title && r.description && r.description.length > 100)
  .filter((r) => KEYWORDS.test(`${r.categories || ''} ${r.description}`))
  .filter((r) => (seen.has(r.title.toLowerCase()) ? false : seen.add(r.title.toLowerCase())))
  .slice(0, MAX_BOOKS)
  .map((r) => ({
    title: r.title, authors: r.authors, categories: r.categories, description: r.description,
    isbn: r.isbn13 || r.isbn10 || r.isbn, year: Number(r.published_year) || undefined,
    level: guessLevel(`${r.title} ${r.description}`),
  }));

const docs = [...manual, ...csvBooks].map((b, i) => {
  const copies = i % 6 === 0 ? 0 : 1 + (i % 4);            // some books are out of stock (for the waitlist demo)
  return {
    ...b, type: 'book', copiesTotal: Math.max(copies, 2), copiesAvailable: copies,
    shelfLocation: `CS-Shelf ${1 + (i % 8)}`, branch: 'Central Library', reservedCount: 0,
  };
});

await Book.deleteMany({});
await Book.insertMany(docs);
console.log(`Imported ${docs.length} books`);
await mongoose.disconnect();