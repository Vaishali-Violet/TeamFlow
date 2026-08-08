import { Router } from 'express';
import { db } from '../db';
import { userStories, projects, notifications, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create a user story
router.post('/', requireAuth, (req, res) => {
  try {
    const { projectId, title, description, acceptanceCriteria, priority, storyPoints, assigneeId, dueDate } = req.body;
    const reporterId = req.session.userId!;

    if (!projectId || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }

    // Verify project exists
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate story key (e.g., PROJ-1)
    const existingCount = db.select().from(userStories).where(eq(userStories.projectId, projectId)).all().length;
    const key = `${project.key}-${existingCount + 1}`;

    const now = new Date();
    const storyId = uuidv4();

    const newStory = db.insert(userStories).values({
      id: storyId,
      projectId,
      key,
      title,
      description,
      acceptanceCriteria: acceptanceCriteria ? JSON.stringify(acceptanceCriteria) : undefined,
      priority: priority || 'medium',
      storyPoints,
      assigneeId,
      reporterId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    // Create notification whenever assigned
    if (assigneeId) {
      db.insert(notifications).values({
        id: uuidv4(),
        userId: assigneeId,
        type: 'task_assigned',
        title: 'New story assigned',
        message: `You have been assigned to story "${title}" (${key})`,
        relatedId: storyId,
        relatedType: 'story',
        createdAt: now,
      }).run();
    }

    res.status(201).json(newStory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List stories for a project
router.get('/project/:projectId', requireAuth, (req, res) => {
  try {
    const { projectId } = req.params;

    const stories = db.select()
      .from(userStories)
      .where(eq(userStories.projectId, projectId))
      .all();

    res.json(stories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get story details
router.get('/:storyId', requireAuth, (req, res) => {
  try {
    const { storyId } = req.params;

    const story = db.select().from(userStories).where(eq(userStories.id, storyId)).get();
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json(story);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update story
router.put('/:storyId', requireAuth, (req, res) => {
  try {
    const { storyId } = req.params;
    const { title, description, acceptanceCriteria, status, priority, storyPoints, assigneeId, dueDate } = req.body;

    const existing = db.select().from(userStories).where(eq(userStories.id, storyId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const now = new Date();
    const updated = db.update(userStories)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(acceptanceCriteria !== undefined && { acceptanceCriteria: JSON.stringify(acceptanceCriteria) }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(storyPoints !== undefined && { storyPoints }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        updatedAt: now,
      })
      .where(eq(userStories.id, storyId))
      .returning().get();

    // Create notification if assignee changed or assigned
    if (assigneeId && assigneeId !== existing.assigneeId) {
      const assigner = db.select().from(users).where(eq(users.id, req.session.userId!)).get();
      const isReassignment = !!existing.assigneeId;
      db.insert(notifications).values({
        id: uuidv4(),
        userId: assigneeId,
        type: 'task_assigned',
        title: isReassignment ? 'Story Reassigned to You' : 'Story Assigned to You',
        message: isReassignment
          ? `${assigner?.name || 'A team member'} reassigned story "${updated.title}" (${updated.key}) to you`
          : `${assigner?.name || 'A team member'} assigned story "${updated.title}" (${updated.key}) to you`,
        relatedId: storyId,
        relatedType: 'story',
        createdAt: now,
      }).run();
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quick status update (for Kanban drag-drop)
router.patch('/:storyId/status', requireAuth, (req, res) => {
  try {
    const { storyId } = req.params;
    const { status } = req.body;

    const existing = db.select().from(userStories).where(eq(userStories.id, storyId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const now = new Date();
    const currentUserId = req.session.userId!;

    const updated = db.update(userStories)
      .set({ status, updatedAt: now })
      .where(eq(userStories.id, storyId))
      .returning().get();

    // Create completion notification if completed
    if (status === 'done') {
      const completer = db.select().from(users).where(eq(users.id, currentUserId)).get();
      const targetUserId = (existing.reporterId && existing.reporterId !== currentUserId)
        ? existing.reporterId
        : (existing.assigneeId && existing.assigneeId !== currentUserId ? existing.assigneeId : null);

      if (targetUserId) {
        db.insert(notifications).values({
          id: uuidv4(),
          userId: targetUserId,
          type: 'story_updated',
          title: 'Story Completed',
          message: `${completer?.name || 'A team member'} completed story "${existing.title}" (${existing.key})`,
          relatedId: storyId,
          relatedType: 'story',
          createdAt: now,
        }).run();
      }
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete story
router.delete('/:storyId', requireAuth, (req, res) => {
  try {
    const { storyId } = req.params;

    db.delete(userStories).where(eq(userStories.id, storyId)).run();
    res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
