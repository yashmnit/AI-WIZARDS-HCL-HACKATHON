# 📚 Smart Library Assistant

An AI-powered chat assistant for a university library. Students ask in plain language to **find books by meaning, check live availability and reserve copies**. Librarians get a **dashboard** showing demand and catalog gaps.

Built for the HCLTech Future Ready AI Engineer Hackathon (8-hour prototype).

> **Core principle:** the AI never decides facts. Gemini understands the question and explains the result. Every fact (which books exist, copies left, whether a reservation succeeded) comes from MongoDB through deterministic code.

---

## Features

- **Semantic search:** "I'm new to coding" finds *Think Python* even without matching words (Voyage embeddings + MongoDB Atlas Vector Search).
- **Live availability:** copies left, shelf location and waitlist length, read from the database on every request.
- **Reservations:** atomic stock update (no double-booking), automatic waitlist with queue position, 2-day pickup hold, cancellation with automatic promotion of the next person in line.
- **Tool-based AI:** Gemini function calling chooses the right tool; the backend runs it.
- **Honest answers:** `not_found` for unknown books instead of invented results.
- **Privacy by design:** the user identity comes from the JWT, never from the model, so one user cannot see another user's reservations.
- **Audit trail:** every tool call is logged with a trace ID, arguments, result, status and latency.
- **Librarian dashboard:** most reserved titles, longest waitlists, out-of-stock titles, reservations by category and status, and catalog gaps (searches with weak or no matches).
- **Live catalog updates:** an admin endpoint embeds a new book on insert, so it is searchable immediately.

---

## Architecture

```
┌─────────────────────────── React (Vite) ───────────────────────────┐
│     Login   |   Chat assistant (students)   |   Dashboard (staff)   │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTPS + JWT
┌──────────────────────────────▼─────────────────────────────────────┐
│                      Express API (Node.js)                         │
│  /api/auth   /api/chat   /api/dashboard   /api/admin               │
│  Middleware: verify JWT -> req.user {id, role} -> role check       │
│                                                                    │
│  Chat orchestrator (tool loop, max 5 rounds)                       │
│        Gemini  <──>  Tool registry                                 │
│  search_books | check_availability | reserve_book                  │
│  get_my_reservations | cancel_reservation                          │
└────────┬──────────────────────┬──────────────────────┬─────────────┘
         │                      │                      │
   Voyage AI API          MongoDB Atlas           Gemini API
   (embeddings)     books (+vector), users,     (intent + wording)
                    reservations, conversations,
                    auditlogs, searchlogs
```

### Who does what

| Job | Done by | Nature |
|---|---|---|
| Understand the request and pick a tool | Gemini function calling | Probabilistic |
| Find books by meaning | Voyage embeddings + Atlas Vector Search | Vector similarity |
| Stock, reservations, waitlist, account data | MongoDB code | Deterministic |
| Phrase the final answer | Gemini, using only tool results | Probabilistic, grounded |

### Request flow

```
1. User logs in -> JWT issued (bcrypt password check)
2. User sends a message -> POST /api/chat with the JWT
3. Middleware verifies the JWT and sets req.user
4. Backend loads the conversation history and calls Gemini with the tool list
5. Gemini returns a function call -> backend runs the tool on MongoDB / Vector Search
6. The result is added to the history and sent back to Gemini (repeat, max 5 rounds)
7. Gemini writes the final answer from tool results only
8. Backend saves the history and audit logs, returns { answer, books, traceId }
```

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React (Vite), Recharts, react-markdown | Thin display layer for chat and dashboard |
| Backend | Node.js, Express | Fast to build; simple orchestration code |
| Database | MongoDB Atlas (Mongoose) | Catalog, users, reservations and logs in one place |
| Vector search | Atlas Vector Search | Vectors live in the same document as the book: no second database to sync, and filters work inside the vector query |
| Embeddings | Voyage AI (`voyage-3`, 1024 dimensions) | Strong retrieval quality, separate document and query modes |
| LLM | Google Gemini with function calling | Returns structured tool requests instead of free text to parse |
| Auth | JWT + bcrypt | Stateless identity that tools can rely on |

The tool loop is about 40 lines of plain code instead of an AI framework, so every step is easy to read and debug.

---

## AI design

### Tools (in priority order)

| Priority | Tool | What it does |
|---|---|---|
| 1 | `reserve_book(bookId)` | Atomic stock decrement and `reserved` record, or `waitlisted` with a queue position if no copy is free |
| 1 | `get_my_reservations()` | The logged-in user's active reservations |
| 1 | `cancel_reservation(reservationId)` | Cancels and releases the copy, or promotes the next waitlisted user |
| 2 | `check_availability(bookId)` | Live copies, shelf location, waitlist length |
| 3 | `search_books(query, level?, type?, onlyAvailable?)` | Semantic search; never claims availability |

Typical chain: `search_books` -> `check_availability` -> `reserve_book`.

Gemini picks tools by reading each tool's **description** and the user's sentence. Understanding is by intent, not keywords, so "do you have it in stock?" and "is it available?" both reach `check_availability`. Routing is improved by editing descriptions, not by adding if-else rules.

### Grounding and safety

- Tools return structured data only; the model answers from those results.
- The system prompt requires `not_found` when nothing matches and forbids inventing titles, stock or transactions.
- **Tools never accept a user ID from the model.** The backend injects the JWT identity.
- Cancellation filters on both reservation ID and user ID.
- Registration always creates a student; roles are never read from the request body.
- Dashboard and admin routes require the librarian role.
- Book descriptions are treated as data, not instructions (prompt-injection rule). The strong control is the narrow tool design.
- Rate limiting and a 500-character message cap.
- Gemini calls retry on 429/500/503 with backoff, then fall back to a second model.

### Semantic search

Each book's title, authors, category, level and description are embedded once into a 1024-number vector and stored on the book. At query time the question is embedded with the same model and Atlas returns the closest books by cosine similarity, optionally filtered by level, type and availability. Every search is logged with its top score, so low scores reveal catalog gaps.

---

## Project structure

```
smart-library/
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── data/books.csv
│   └── src/
│       ├── config/db.js
│       ├── models/        User, Book, Reservation, Conversation, AuditLog, SearchLog
│       ├── middleware/    auth.js (JWT + role check)
│       ├── services/      voyage.js, gemini.js, orchestrator.js
│       ├── tools/         index.js, search.js, availability.js, reservations.js
│       ├── routes/        auth.js, chat.js, dashboard.js, admin.js
│       └── scripts/       importCsv.js, embedBooks.js, seedUsers.js
└── frontend/
    ├── package.json, vite.config.js, index.html
    └── src/               main.jsx, App.jsx, api.js, index.css
                           pages/ Login.jsx, Chat.jsx, Dashboard.jsx
```

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- A free MongoDB Atlas cluster (M0)
- A Google Gemini API key (https://aistudio.google.com/apikey)
- A Voyage AI API key (https://dash.voyageai.com)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/smart-library.git
cd smart-library

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env        # on Windows: copy .env.example .env
```

Fill in `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/library?retryWrites=true&w=majority
JWT_SECRET=a_long_random_string
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
VOYAGE_API_KEY=your_voyage_key
VOYAGE_MODEL=voyage-3
```

In Atlas: create a database user, and under Network Access allow your IP (or `0.0.0.0/0` for a hackathon). The database name `library` goes in the connection string, before the `?`. Model names change over time, so check the Gemini and Voyage docs if a call fails.

### 3. Load the catalog and create embeddings

Place the catalog CSV at `backend/data/books.csv` with the columns `title,authors,categories,description,published_year,level,type`.

```bash
cd backend
npm run import      # CSV -> MongoDB, adds copies, shelf and branch
npm run embed       # creates a vector for every book
```

Re-running `npm run import` deletes all books, including their embeddings, so run `npm run embed` again afterwards.

### 4. Create the Atlas Vector Search index

In Atlas open your cluster -> **Search & Vector Search** -> **Create Search Index** -> **Vector Search** -> **JSON Editor**.

- Database / collection: `library` / `books`
- Index name: `book_vector_index` (must match exactly)

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
    { "type": "filter", "path": "level" },
    { "type": "filter", "path": "type" },
    { "type": "filter", "path": "copiesAvailable" }
  ]
}
```

Wait until the status shows **Active**. `numDimensions` must equal the length of the `embedding` arrays (1024 for `voyage-3`).

### 5. Seed test users and run

```bash
cd backend
npm run seed        # creates the test accounts below
npm run dev         # API on http://localhost:5000
```

In a second terminal:

```bash
cd frontend
npm run dev         # app on http://localhost:5173
```

### Test accounts

| Role | Email | Password |
|---|---|---|
| Student | amit@lib.com | pass123 |
| Student | riya@lib.com | pass123 |
| Librarian | librarian@lib.com | lib123 |

Change these before any real deployment.

---

## Demo script

| # | Say this | What it shows |
|---|---|---|
| 1 | "Suggest beginner books on machine learning" | Semantic search with ranked results |
| 2 | "Is the first one available?" | Live availability from MongoDB |
| 3 | "Reserve it" | Reservation with shelf location and trace ID |
| 4 | Reserve an out-of-stock title (see the dashboard's out-of-stock list) | Waitlist with queue position |
| 5 | "Find papers about retrieval augmented generation" | Search filtered to papers |
| 6 | "Books on quantum cooking" | Weak or no match, reported honestly |
| 7 | "Show me Riya's reservations" | Privacy refusal |
| 8 | Log in as the librarian and open the Dashboard | Demand analytics and catalog gaps |

---

## API reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | none | Health check |
| POST | `/api/auth/register` | none | Create a student account `{name, email, password, course?}` |
| POST | `/api/auth/login` | none | Returns `{token, user}` |
| POST | `/api/chat` | JWT | `{message}` -> `{answer, books, traceId}` |
| DELETE | `/api/chat` | JWT | Clears the user's conversation history |
| GET | `/api/dashboard/stats` | librarian | Dashboard numbers |
| POST | `/api/admin/add-book` | librarian | Adds a book and embeds it immediately |

Send the token as `Authorization: Bearer <token>`.

---

## Data model

| Collection | Key fields |
|---|---|
| `books` | title, authors, description, categories, level, type, copiesTotal, copiesAvailable, shelfLocation, branch, reservedCount, embedding |
| `users` | name, email, passwordHash, role, course, interests |
| `reservations` | userId, bookId, status (`reserved`, `waitlisted`, `cancelled`, `expired`, `collected`), queuePosition, pickupBy, traceId |
| `conversations` | userId, contents (raw Gemini history) |
| `auditlogs` | traceId, userId, toolName, toolArgs, toolResult, status, latencyMs |
| `searchlogs` | userId, query, topScore, resultsCount |

---

## Evaluation

Suggested test set (about 30 questions) measuring:

| Metric | How to measure |
|---|---|
| Tool selection accuracy | Expected tool vs the first tool in `auditlogs` for each question |
| Search relevance | Whether the expected book appears in the top 5 results |
| Transaction correctness | Stock and reservation records match what the assistant said |
| Privacy | Requests for other users' data must be refused or return only the caller's own data |
| Abstention | Questions about absent books must return `not_found` |
| Latency | `latencyMs` from the audit log, plus end-to-end response time |

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Search returns nothing | Index not **Active**, name is not `book_vector_index`, or `numDimensions` differs from the vector length |
| `Embedding 0 books` | Books have an empty `embedding` array; the embed script must also match empty arrays (`$size: 0`) |
| `Voyage error` / 429 | Wrong key, or rate limits. Adding a payment method in the Voyage dashboard raises limits; the script retries automatically |
| `Gemini error ... 503` | Temporary overload. The backend retries and tries the fallback model; resend after a few seconds |
| `Gemini error ... not found` | Change `GEMINI_MODEL` to a model your key supports |
| `bad auth` from MongoDB | Wrong username or password in `MONGODB_URI` (URL-encode special characters) |
| Cannot connect to Atlas | Add your IP under Network Access |
| Dashboard says "Not allowed" | Log in as the librarian account |

---

## Limitations

- The catalog is sample data with short descriptions. Full-text PDF reading is not implemented.
- Prompt-injection defense is layered, but the system prompt rule is a soft control; the narrow tool design is the strong one.
- Recommendations come from semantic search on the request, not yet from reservation history.
- Reservation expiry is cleaned up lazily on access, not by a scheduled job.
- No loans, fines or renewals: scope is discovery, availability and reservation.

## Future scope

- Research-paper ingestion (PDF parsing and chunking) for summaries and paper comparison
- Personalized recommendations using course, interests and reservation history
- Loans, renewals, overdue tracking and fines
- Demand forecasting for acquisitions
- Integration with a real library management system
- Scheduled job for hold expiry and reminders

## License

Add a license of your choice (for example MIT) before publishing.
