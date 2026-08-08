import { Router } from 'express';
import { db } from '../db';
import { notifications } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Get notifications for current user
router.get('/', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId!;

    const userNotifications = db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .all();

    res.json(userNotifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId!;

    const unread = db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .all();

    res.json({ count: unread.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId!;

    const updated = db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ))
      .returning().get();

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.post('/mark-all-read', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId!;

    db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .run();

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
