import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import chatRoutes from './src/routes/chat.js';
// import dashboardRoutes from './src/routes/dashboard.js';
// import adminRoutes from './src/routes/admin.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// basic protection against abuse
app.use('/api/chat', rateLimit({ windowMs: 60_000, max: 30 }));
app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 30 }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)));