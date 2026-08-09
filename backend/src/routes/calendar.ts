import { Router } from 'express';
import { db } from '../db';
import { projects, userStories, tasks, users } from '../db/schema';
import { requireAuth, requireWorkspaceAccess } from '../middleware/auth';
import { eq, inArray } from 'drizzle-orm';

const router = Router();

// Get calendar events (projects, stories, and tasks with due dates) for a workspace
router.get('/workspace/:workspaceId', requireAuth, requireWorkspaceAccess, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);

    // 1. Get all projects in the workspace
    const workspaceProjects = db.select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .all();

    const projectIds = workspaceProjects.map(p => p.id);

    // 2. Project Target Dates
    const projectEvents = workspaceProjects
      .filter(p => p.targetDate !== null && p.targetDate !== undefined)
      .map(p => ({
        id: p.id,
        type: 'project',
        title: `🎯 Target: ${p.name} (${p.key})`,
        dueDate: p.targetDate,
        status: p.status,
        priority: 'high',
        colorCategory: 'orange',
      }));

    if (projectIds.length === 0) {
      return res.json(projectEvents);
    }

    // 3. Get all stories with due dates
    const storiesWithDueDate = db.select({
      id: userStories.id,
      key: userStories.key,
      title: userStories.title,
      dueDate: userStories.dueDate,
      status: userStories.status,
      priority: userStories.priority,
      projectId: userStories.projectId,
      assigneeId: userStories.assigneeId,
    })
      .from(userStories)
      .where(inArray(userStories.projectId, projectIds))
      .all()
      .filter(s => s.dueDate !== null);

    // 4. Get all tasks with due dates
    const allStoryIds = db.select({ id: userStories.id })
      .from(userStories)
      .where(inArray(userStories.projectId, projectIds))
      .all()
      .map(s => s.id);

    let tasksWithDueDate: any[] = [];
    if (allStoryIds.length > 0) {
      tasksWithDueDate = db.select({
        id: tasks.id,
        key: tasks.key,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        priority: tasks.priority,
        storyId: tasks.storyId,
        assigneeId: tasks.assigneeId,
      })
        .from(tasks)
        .where(inArray(tasks.storyId, allStoryIds))
        .all()
        .filter(t => t.dueDate !== null);
    }

    // Assign color categories based on priority/status
    const getColorCategory = (priority: string, status: string, type: string) => {
      if (status === 'done') return 'green';
      if (priority === 'urgent') return 'red';
      if (priority === 'high') return 'orange';
      if (type === 'project') return 'purple';
      if (priority === 'low') return 'cyan';
      return 'purple';
    };

    const storyEvents = storiesWithDueDate.map(s => ({
      id: s.id,
      type: 'story',
      title: `${s.key} ${s.title}`,
      dueDate: s.dueDate,
      status: s.status,
      priority: s.priority,
      assigneeId: s.assigneeId,
      colorCategory: getColorCategory(s.priority, s.status, 'story'),
    }));

    const taskEvents = tasksWithDueDate.map(t => ({
      id: t.id,
      type: 'task',
      title: `${t.key} ${t.title}`,
      dueDate: t.dueDate,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      colorCategory: getColorCategory(t.priority, t.status, 'task'),
    }));

    const events = [...projectEvents, ...storyEvents, ...taskEvents];
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
