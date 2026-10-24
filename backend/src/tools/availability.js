import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Reservation from '../models/Reservation.js';
import { expireHolds } from './reservations.js';

export async function checkAvailability({ bookId }) {
  if (!mongoose.isValidObjectId(bookId)) return { status: 'not_found' };
  await expireHolds();
  const book = await Book.findById(bookId).select('title copiesAvailable copiesTotal shelfLocation branch');
  if (!book) return { status: 'not_found' };
  const waitlistLength = await Reservation.countDocuments({ bookId, status: 'waitlisted' });
  return {
    status: 'ok', bookId: String(book._id), title: book.title,
    available: book.copiesAvailable > 0, copiesAvailable: book.copiesAvailable, copiesTotal: book.copiesTotal,
    shelfLocation: book.shelfLocation, branch: book.branch, waitlistLength,
  };
}