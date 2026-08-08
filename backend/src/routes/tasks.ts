import { Router } from 'express';
import { db } from '../db';
import { tasks, userStories, projects, notifications, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create a task
router.post('/', requireAuth, (req, res) => {
  try {
    const { storyId, title, description, priority, assigneeId, estimateMinutes, dueDate } = req.body;
    const reporterId = req.session.userId!;

    if (!storyId || !title) {
      return res.status(400).json({ error: 'Story ID and title are required' });
    }

    // Verify story exists and get project key
    const story = db.select().from(userStories).where(eq(userStories.id, storyId)).get();
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Generate task key
    const existingCount = db.select().from(tasks).where(eq(tasks.storyId, storyId)).all().length;
    const key = `${story.key}-T${existingCount + 1}`;

    const now = new Date();
    const taskId = uuidv4();

    // Get max sort order
    const existingTasks = db.select().from(tasks).where(eq(tasks.storyId, storyId)).all();
    const maxSortOrder = existingTasks.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0);

    const newTask = db.insert(tasks).values({
      id: taskId,
      storyId,
      key,
      title,
      description,
      priority: priority || 'medium',
      assigneeId,
      reporterId,
      estimateMinutes,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    // Create notification whenever assigned
    if (assigneeId) {
      db.insert(notifications).values({
        id: uuidv4(),
        userId: assigneeId,
        type: 'task_assigned',
        title: 'New task assigned',
        message: `You have been assigned to task "${title}" (${key})`,
        relatedId: taskId,
        relatedType: 'task',
        createdAt: now,
      }).run();
    }

    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List tasks for a story
router.get('/story/:storyId', requireAuth, (req, res) => {
  try {
    const storyId = req.params.storyId as string;

    const storyTasks = db.select()
      .from(tasks)
      .where(eq(tasks.storyId, storyId))
      .orderBy(tasks.sortOrder)
      .all();

    res.json(storyTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's assigned tasks ("My Work")
router.get('/my-work', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId!;

    const userTasks = db.select({
      id: tasks.id,
      key: tasks.key,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      storyId: tasks.storyId,
      storyTitle: userStories.title,
      storyKey: userStories.key,
      projectId: userStories.projectId,
      projectName: projects.name,
    })
      .from(tasks)
      .innerJoin(userStories, eq(tasks.storyId, userStories.id))
      .innerJoin(projects, eq(userStories.projectId, projects.id))
      .where(eq(tasks.assigneeId, userId))
      .orderBy(desc(tasks.updatedAt))
      .all();

    res.json(userTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task details
router.get('/:taskId', requireAuth, (req, res) => {
  try {
    const taskId = req.params.taskId as string;

    const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/:taskId', requireAuth, (req, res) => {
  try {
    const taskId = req.params.taskId as string;
    const { title, description, status, priority, assigneeId, estimateMinutes, dueDate, sortOrder } = req.body;

    const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const now = new Date();
    const updateData: any = { updatedAt: now };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'done') {
        updateData.completedAt = now;
      } else {
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (estimateMinutes !== undefined) updateData.estimateMinutes = estimateMinutes;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning().get();

    // Create notification if assignee changed
    if (assigneeId && assigneeId !== existing.assigneeId && assigneeId !== req.session.userId) {
      const assigner = db.select().from(users).where(eq(users.id, req.session.userId!)).get();
      db.insert(notifications).values({
        id: uuidv4(),
        userId: assigneeId,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `${assigner?.name || 'A team member'} assigned you to task "${updated.title}" (${updated.key})`,
        relatedId: taskId,
        relatedType: 'task',
        createdAt: now,
      }).run();
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task status
router.patch('/:taskId/status', requireAuth, (req, res) => {
  try {
    const taskId = req.params.taskId as string;
    const { status } = req.body;

    const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const now = new Date();
    const currentUserId = req.session.userId!;

    const updated = db.update(tasks)
      .set({
        status,
        updatedAt: now,
        completedAt: status === 'done' ? now : null,
      })
      .where(eq(tasks.id, taskId))
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
          title: 'Task Completed',
          message: `${completer?.name || 'A team member'} completed task "${existing.title}" (${existing.key})`,
          relatedId: taskId,
          relatedType: 'task',
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

// Delete task
router.delete('/:taskId', requireAuth, (req, res) => {
  try {
    const taskId = req.params.taskId as string;

    db.delete(tasks).where(eq(tasks.id, taskId)).run();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
