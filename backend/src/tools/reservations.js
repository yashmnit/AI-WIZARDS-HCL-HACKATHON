import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Reservation from '../models/Reservation.js';

const HOLD_MS = 2 * 24 * 60 * 60 * 1000;   // a reserved copy is held for 2 days
const valid = (id) => mongoose.isValidObjectId(id);

// give a copy back: promote the first waitlisted user, else add the copy to stock
async function releaseCopy(bookId) {
  const next = await Reservation.findOneAndUpdate(
    { bookId, status: 'waitlisted' },
    { status: 'reserved', queuePosition: 0, pickupBy: new Date(Date.now() + HOLD_MS) },
    { sort: { reservedAt: 1 } }
  );
  if (!next) await Book.updateOne({ _id: bookId }, { $inc: { copiesAvailable: 1 } });
}

// expire holds that were not collected in time (runs lazily, no cron job needed)
export async function expireHolds() {
  const old = await Reservation.find({ status: 'reserved', pickupBy: { $lt: new Date() } });
  for (const r of old) {
    r.status = 'expired';
    await r.save();
    await releaseCopy(r.bookId);
  }
}

export async function reserveBook({ bookId }, user, traceId) {
  if (!valid(bookId)) return { status: 'not_found' };
  await expireHolds();
  const book = await Book.findById(bookId).select('title shelfLocation branch');
  if (!book) return { status: 'not_found' };

  const existing = await Reservation.findOne({ userId: user.id, bookId, status: { $in: ['reserved', 'waitlisted'] } });
  if (existing) return { status: 'already_exists', title: book.title, reservationStatus: existing.status };

  // atomic: only succeeds if a copy is still available
  const updated = await Book.findOneAndUpdate(
    { _id: bookId, copiesAvailable: { $gt: 0 } },
    { $inc: { copiesAvailable: -1, reservedCount: 1 } },
    { new: true }
  );

  if (updated) {
    const r = await Reservation.create({
      userId: user.id, bookId, status: 'reserved', pickupBy: new Date(Date.now() + HOLD_MS), traceId,
    });
    return {
      status: 'reserved', reservationId: String(r._id), title: book.title,
      shelfLocation: book.shelfLocation, branch: book.branch, pickupBy: r.pickupBy, traceId,
    };
  }

  const position = (await Reservation.countDocuments({ bookId, status: 'waitlisted' })) + 1;
  await Book.updateOne({ _id: bookId }, { $inc: { reservedCount: 1 } });
  const r = await Reservation.create({ userId: user.id, bookId, status: 'waitlisted', queuePosition: position, traceId });
  return { status: 'waitlisted', reservationId: String(r._id), title: book.title, queuePosition: position, traceId };
}

export async function getMyReservations(args, user) {
  await expireHolds();
  const rows = await Reservation.find({ userId: user.id, status: { $in: ['reserved', 'waitlisted'] } })
    .populate('bookId', 'title shelfLocation branch').sort({ reservedAt: -1 });
  if (rows.length === 0) return { status: 'ok', reservations: [], message: 'You have no active reservations.' };
  return {
    status: 'ok',
    reservations: rows.map((r) => ({
      reservationId: String(r._id), title: r.bookId?.title, shelfLocation: r.bookId?.shelfLocation,
      state: r.status, queuePosition: r.queuePosition, pickupBy: r.pickupBy,
    })),
  };
}

export async function cancelReservation({ reservationId }, user) {
  if (!valid(reservationId)) return { status: 'not_found' };
  // userId is part of the filter, so a user can only cancel their own reservation
  const r = await Reservation.findOne({ _id: reservationId, userId: user.id, status: { $in: ['reserved', 'waitlisted'] } });
  if (!r) return { status: 'not_found' };
  const wasReserved = r.status === 'reserved';
  r.status = 'cancelled';
  await r.save();
  if (wasReserved) await releaseCopy(r.bookId);
  return { status: 'cancelled', reservationId };
}