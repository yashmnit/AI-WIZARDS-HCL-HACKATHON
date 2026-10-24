import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();
const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '1d' });

// role is never taken from the request body: new accounts are always students
router.post('/register', async (req, res) => {
  const { name, email, password, course } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and a password of 6+ characters are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ name, email, course, passwordHash: await bcrypt.hash(password, 10) });
  res.json({ token: sign(user), user: { name: user.name, role: user.role } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(user), user: { name: user.name, role: user.role } });
});

export default router;