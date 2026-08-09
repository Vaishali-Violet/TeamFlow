import { Router } from 'express';
import { db } from '../db';
import { tasks, userStories, projects, notifications, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, desc, isNull } from 'drizzle-orm';

const router = Router();

// Create a task
router.post('/', requireAuth, (req, res) => {
  try {
    const { storyId, title, description, priority, assigneeId, estimateMinutes, dueDate } = req.body;
    const userId = req.session.userId!;
    const parsedStoryId = typeof storyId === 'string' ? parseInt(storyId, 10) : storyId;

    if (!storyId || !title) {
      return res.status(400).json({ error: 'Story ID and title are required' });
    }

    // Verify story exists and get project key
    const story = db.select().from(userStories).where(eq(userStories.id, parsedStoryId)).get();
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Generate task key
    const existingCount = db.select().from(tasks).where(eq(tasks.storyId, parsedStoryId)).all().length;
    const key = `${story.key}-T${existingCount + 1}`;

    const now = Date.now();

    // Get max sort order
    const existingTasks = db.select().from(tasks).where(eq(tasks.storyId, parsedStoryId)).all();
    const maxSortOrder = existingTasks.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0);

    const parsedAssigneeId = assigneeId ? (typeof assigneeId === 'string' ? parseInt(assigneeId, 10) : assigneeId) : undefined;

    const newTask = db.insert(tasks).values({
      storyId: parsedStoryId,
      key,
      title,
      description,
      priority: priority || 'medium',
      assigneeId: parsedAssigneeId,
      reporterId: userId,
      estimateMinutes,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      createdById: userId,
    }).returning().get();

    // Create notification whenever assigned
    if (parsedAssigneeId) {
      db.insert(notifications).values({
        userId: parsedAssigneeId,
        type: 'task_assigned',
        title: 'New task assigned',
        message: `You have been assigned to task "${title}" (${key})`,
        relatedId: String(newTask.id),
        relatedType: 'task',
        createdAt: now,
        createdById: userId,
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
    const storyId = parseInt(req.params.storyId as string, 10);

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
      .orderBy(desc(tasks.modifiedAt))
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
    const taskId = parseInt(req.params.taskId as string, 10);

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
    const taskId = parseInt(req.params.taskId as string, 10);
    const userId = req.session.userId!;
    const { title, description, status, priority, assigneeId, estimateMinutes, dueDate, sortOrder } = req.body;

    const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const now = Date.now();
    const updateData: any = { modifiedAt: now, modifiedById: userId };

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
    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId ? (typeof assigneeId === 'string' ? parseInt(assigneeId, 10) : assigneeId) : null;
    }
    if (estimateMinutes !== undefined) updateData.estimateMinutes = estimateMinutes;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate).getTime() : null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning().get();

    // Create notification if assignee changed
    const parsedAssigneeId = assigneeId ? (typeof assigneeId === 'string' ? parseInt(assigneeId, 10) : assigneeId) : null;
    if (parsedAssigneeId && parsedAssigneeId !== existing.assigneeId && parsedAssigneeId !== userId) {
      const assigner = db.select().from(users).where(eq(users.id, userId)).get();
      db.insert(notifications).values({
        userId: parsedAssigneeId,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `${assigner?.name || 'A team member'} assigned you to task "${updated.title}" (${updated.key})`,
        relatedId: String(taskId),
        relatedType: 'task',
        createdAt: now,
        createdById: userId,
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
    const taskId = parseInt(req.params.taskId as string, 10);
    const { status } = req.body;
    const userId = req.session.userId!;

    const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const now = Date.now();

    const updated = db.update(tasks)
      .set({
        status,
        modifiedAt: now,
        modifiedById: userId,
        completedAt: status === 'done' ? now : null,
      })
      .where(eq(tasks.id, taskId))
      .returning().get();

    // Create completion notification if completed
    if (status === 'done') {
      const completer = db.select().from(users).where(eq(users.id, userId)).get();
      const targetUserId = (existing.reporterId && existing.reporterId !== userId)
        ? existing.reporterId
        : (existing.assigneeId && existing.assigneeId !== userId ? existing.assigneeId : null);

      if (targetUserId) {
        db.insert(notifications).values({
          userId: targetUserId,
          type: 'story_updated',
          title: 'Task Completed',
          message: `${completer?.name || 'A team member'} completed task "${existing.title}" (${existing.key})`,
          relatedId: String(taskId),
          relatedType: 'task',
          createdAt: now,
          createdById: userId,
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
    const taskId = parseInt(req.params.taskId as string, 10);

    db.delete(tasks).where(eq(tasks.id, taskId)).run();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
