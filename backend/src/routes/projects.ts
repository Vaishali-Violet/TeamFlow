import { Router } from 'express';
import { db } from '../db';
import { projects, userStories, tasks, workspaceMembers, users } from '../db/schema';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceAdminOrManager } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Create a new project (requires workspace member access)
router.post('/', requireAuth, requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspaceId, key, name, description, startDate, targetDate } = req.body;
    const userId = req.session.userId!;
    const now = Date.now();

    const newProject = db.insert(projects).values({
      workspaceId: typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId,
      key,
      name,
      description,
      ownerId: userId,
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
      createdAt: now,
      createdById: userId,
    }).returning().get();

    res.status(201).json(newProject);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Project key already exists in this workspace' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all projects in a workspace (requires workspace access)
router.get('/workspace/:workspaceId', requireAuth, requireWorkspaceAccess, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const workspaceProjects = db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).all();
    res.json(workspaceProjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific project
router.get('/:projectId', requireAuth, (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);

    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:projectId', requireAuth, (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const userId = req.session.userId!;
    const { name, description, status, startDate, targetDate } = req.body;

    const existing = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updateData: any = { modifiedAt: Date.now(), modifiedById: userId };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate).getTime() : null;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate).getTime() : null;

    const updated = db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning().get();

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:projectId', requireAuth, (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);

    const existing = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete in order: tasks -> stories -> project
    db.transaction((tx) => {
      // Get all stories for this project
      const stories = tx.select().from(userStories).where(eq(userStories.projectId, projectId)).all();
      for (const story of stories) {
        tx.delete(tasks).where(eq(tasks.storyId, story.id)).run();
      }
      tx.delete(userStories).where(eq(userStories.projectId, projectId)).run();
      tx.delete(projects).where(eq(projects.id, projectId)).run();
    });

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats for a workspace
router.get('/stats/:workspaceId', requireAuth, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);

    const allProjects = db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).all();
    const activeProjects = allProjects.filter(p => p.status === 'active' || p.status === 'planning');

    let totalStories = 0;
    let doneStories = 0;
    let totalTasks = 0;
    let doneTasks = 0;

    for (const project of allProjects) {
      const stories = db.select().from(userStories).where(eq(userStories.projectId, project.id)).all();
      totalStories += stories.length;
      doneStories += stories.filter(s => s.status === 'done').length;

      for (const story of stories) {
        const storyTasks = db.select().from(tasks).where(eq(tasks.storyId, story.id)).all();
        totalTasks += storyTasks.length;
        doneTasks += storyTasks.filter(t => t.status === 'done').length;
      }
    }

    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    res.json({
      activeProjects: activeProjects.length,
      totalProjects: allProjects.length,
      openStories: totalStories - doneStories,
      totalStories,
      totalTasks,
      doneTasks,
      completionRate,
      projects: allProjects.map(p => ({
        id: p.id,
        name: p.name,
        key: p.key,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
