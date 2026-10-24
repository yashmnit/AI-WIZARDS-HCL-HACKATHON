import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  status: { type: String, enum: ['reserved', 'waitlisted', 'collected', 'cancelled', 'expired'], required: true },
  queuePosition: { type: Number, default: 0 },
  reservedAt: { type: Date, default: Date.now },
  pickupBy: Date,
  traceId: String,
});

export default mongoose.model('Reservation', reservationSchema);