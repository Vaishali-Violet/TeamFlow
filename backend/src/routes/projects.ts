import { Router } from 'express';
import { db } from '../db';
import { projects, projectMembers, userStories, tasks, workspaceMembers, users } from '../db/schema';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceAdminOrManager } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create a new project (requires workspace member access)
router.post('/', requireAuth, requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspaceId, key, name, description, startDate, targetDate } = req.body;
    const ownerId = req.session.userId!;

    const now = new Date();
    const projectId = uuidv4();

    // Start transaction to insert project and add owner as member
    const newProject = db.transaction((tx) => {
      const project = tx.insert(projects).values({
        id: projectId,
        workspaceId,
        key,
        name,
        description,
        ownerId,
        startDate: startDate ? new Date(startDate) : undefined,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      tx.insert(projectMembers).values({
        id: uuidv4(),
        projectId,
        userId: ownerId,
        projectRole: 'manager',
        joinedAt: now,
      }).run();

      return project;
    });

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
    const { workspaceId } = req.params;
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
    const { projectId } = req.params;

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
    const { projectId } = req.params;
    const { name, description, status, startDate, targetDate } = req.body;

    const existing = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;

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
    const { projectId } = req.params;

    const existing = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete in order: tasks -> stories -> project_members -> project
    db.transaction((tx) => {
      // Get all stories for this project
      const stories = tx.select().from(userStories).where(eq(userStories.projectId, projectId)).all();
      for (const story of stories) {
        tx.delete(tasks).where(eq(tasks.storyId, story.id)).run();
      }
      tx.delete(userStories).where(eq(userStories.projectId, projectId)).run();
      tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId)).run();
      tx.delete(projects).where(eq(projects.id, projectId)).run();
    });

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add project member
router.post('/:projectId/members', requireAuth, (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, projectRole } = req.body;

    if (!userId || !projectRole) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }

    const existing = db.select().from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )).get();

    if (existing) {
      return res.status(409).json({ error: 'User is already a project member' });
    }

    db.insert(projectMembers).values({
      id: uuidv4(),
      projectId,
      userId,
      projectRole: projectRole as 'manager' | 'member',
      joinedAt: new Date(),
    }).run();

    res.status(201).json({ message: 'Member added to project' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List project members
router.get('/:projectId/members', requireAuth, (req, res) => {
  try {
    const { projectId } = req.params;

    const members = db.select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      projectRole: projectMembers.projectRole,
      joinedAt: projectMembers.joinedAt,
    })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .all();

    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats for a workspace
router.get('/stats/:workspaceId', requireAuth, (req, res) => {
  try {
    const { workspaceId } = req.params;

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
