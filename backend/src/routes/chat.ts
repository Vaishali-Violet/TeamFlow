import { Router } from 'express';
import { db } from '../db';
import { chatMessages, users } from '../db/schema';
import { requireAuth, requireWorkspaceAccess } from '../middleware/auth';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get messages for a workspace
router.get('/workspace/:workspaceId', requireAuth, requireWorkspaceAccess, (req, res) => {
  try {
    const { workspaceId } = req.params;

    const messages = db.select({
      id: chatMessages.id,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
      userId: users.id,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.workspaceId, workspaceId))
      .orderBy(chatMessages.createdAt)
      .all();

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post a new chat message
router.post('/workspace/:workspaceId', requireAuth, requireWorkspaceAccess, (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { content } = req.body;
    const userId = req.session.userId!;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const now = new Date();
    const id = uuidv4();

    db.insert(chatMessages).values({
      id,
      workspaceId,
      userId,
      content: content.trim(),
      createdAt: now,
    }).run();

    const user = db.select().from(users).where(eq(users.id, userId)).get();

    res.status(201).json({
      id,
      content: content.trim(),
      createdAt: now,
      userId,
      userName: user?.name || 'User',
      userAvatar: user?.avatarUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
