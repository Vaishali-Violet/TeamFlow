import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existingUser = db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();

    const newUser = db.insert(users).values({
      name,
      email,
      passwordHash,
      createdAt: now,
    }).returning().get();

    // Create session
    req.session.userId = newUser.id;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      res.status(201).json({ 
        id: newUser.id,
        name: newUser.name,
        email: newUser.email 
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.select().from(users).where(eq(users.email, email)).get();
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user (session check)
router.get('/me', (req, res) => {
  const userId = req.session.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatarUrl: users.avatarUrl,
    timezone: users.timezone
  }).from(users).where(eq(users.id, userId)).get();

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json(user);
});

export default router;
