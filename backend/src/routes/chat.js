import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { runChat } from '../services/orchestrator.js';
import Conversation from '../models/Conversation.js';

const router = Router();

router.post('/', auth, async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message || message.length > 500) return res.status(400).json({ error: 'Message must be 1-500 characters' });
  try {
    res.json(await runChat(req.user, message));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Assistant failed. Please try again.' });
  }
});

// "New chat" button: clears this user's history
router.delete('/', auth, async (req, res) => {
  await Conversation.deleteOne({ userId: req.user.id });
  res.json({ ok: true });
});

export default router;