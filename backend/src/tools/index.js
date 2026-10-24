import { searchBooks } from './search.js';
import { checkAvailability } from './availability.js';
import { reserveBook, getMyReservations, cancelReservation } from './reservations.js';

// Gemini reads these descriptions to decide which tool fits the user's sentence
export const toolDeclarations = [
  {
    name: 'search_books',
    description: 'Find books or papers by topic, subject or meaning, and give recommendations. Use when the user wants to discover or search resources. Does NOT tell availability; call check_availability for that.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Topic or natural-language search text' },
        level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], description: 'Only if the user mentions a level' },
        type: { type: 'string', enum: ['book', 'paper'], description: 'Only if the user asks for books or papers specifically' },
        onlyAvailable: { type: 'boolean', description: 'True only if the user wants only currently available items' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_availability',
    description: 'Check live stock of one book: whether it is available, copies left, shelf location and waitlist length. ALWAYS use this for any question about availability, copies or shelf location.',
    parameters: {
      type: 'object',
      properties: { bookId: { type: 'string', description: 'bookId taken from search_books results' } },
      required: ['bookId'],
    },
  },
  {
    name: 'reserve_book',
    description: 'Reserve a book for the logged-in user. If no copy is free, the user is added to the waitlist. Use only when the user clearly asks to reserve or hold a book.',
    parameters: {
      type: 'object',
      properties: { bookId: { type: 'string', description: 'bookId taken from earlier tool results' } },
      required: ['bookId'],
    },
  },
  {
    name: 'get_my_reservations',
    description: "Show the logged-in user's active reservations and waitlist positions. Use for questions like 'what have I reserved'.",
  },
  {
    name: 'cancel_reservation',
    description: "Cancel one of the logged-in user's reservations or waitlist entries.",
    parameters: {
      type: 'object',
      properties: { reservationId: { type: 'string', description: 'reservationId from get_my_reservations or reserve_book' } },
      required: ['reservationId'],
    },
  },
];

// the real functions that run on MongoDB; user always comes from the JWT, never from Gemini
export const toolImpl = {
  search_books: searchBooks,
  check_availability: checkAvailability,
  reserve_book: reserveBook,
  get_my_reservations: getMyReservations,
  cancel_reservation: cancelReservation,
};