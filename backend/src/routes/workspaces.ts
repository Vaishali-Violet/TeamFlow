import { Router } from 'express';
import { db } from '../db';
import { workspaces, workspaceMembers, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Create a new workspace
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, slug } = req.body;
    const userId = req.session.userId!;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const now = Date.now();
    let finalSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Ensure slug uniqueness by appending short random suffix if slug exists
    const existingSlug = db.select().from(workspaces).where(eq(workspaces.slug, finalSlug)).get();
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const newWorkspace = db.transaction((tx) => {
      const workspace = tx.insert(workspaces).values({
        name,
        slug: finalSlug,
        createdById: userId,
        createdAt: now,
      }).returning().get();

      // Add creator as admin member
      tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: 'admin',
        joinedAt: now,
        createdAt: now,
        createdById: userId,
      }).run();

      return workspace;
    });

    res.status(201).json(newWorkspace);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's workspaces (includes both joined workspaces and created workspaces)
router.get('/', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId!;

    // 1. Get workspaces from workspace_members
    const memberWorkspaces = db.select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      createdById: workspaces.createdById,
      createdAt: workspaces.createdAt,
      role: workspaceMembers.role,
    })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(
        eq(workspaceMembers.userId, userId)
      ))
      .all();

    // 2. Get workspaces created by the user (ensures owner never loses visibility)
    const createdWorkspaces = db.select()
      .from(workspaces)
      .where(eq(workspaces.createdById, userId))
      .all();

    // Merge and deduplicate
    const workspaceMap = new Map<number, any>();

    for (const ws of createdWorkspaces) {
      workspaceMap.set(ws.id, {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        createdById: ws.createdById,
        createdAt: ws.createdAt,
        role: 'admin',
      });
    }

    for (const ws of memberWorkspaces) {
      if (!workspaceMap.has(ws.id)) {
        workspaceMap.set(ws.id, ws);
      }
    }

    const allWorkspaces = Array.from(workspaceMap.values());
    res.json(allWorkspaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workspace details
router.get('/:workspaceId', requireAuth, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.session.userId!;

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Owner override
    if (workspace.createdById === userId) {
      return res.json({ ...workspace, role: 'admin' });
    }

    // Check membership
    const membership = db.select().from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )).get();

    if (!membership || membership.isActive === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ ...workspace, role: membership.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update workspace
router.put('/:workspaceId', requireAuth, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.session.userId!;
    const { name } = req.body;

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isOwner = workspace.createdById === userId;

    if (!isOwner) {
      // Check admin role
      const membership = db.select().from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.role, 'admin')
        )).get();

      if (!membership) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    const updated = db.update(workspaces)
      .set({ name, modifiedAt: Date.now(), modifiedById: userId })
      .where(eq(workspaces.id, workspaceId))
      .returning().get();

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to workspace
router.post('/:workspaceId/members', requireAuth, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const userId = req.session.userId!;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isOwner = workspace.createdById === userId;

    if (!isOwner) {
      // Check admin or manager membership
      const membership = db.select().from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )).get();

      if (!membership || (membership.role !== 'admin' && membership.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or manager access required' });
      }
    }

    // Find user by email
    const targetUser = db.select().from(users).where(eq(users.email, email)).get();
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found with that email. Make sure they have registered an account first.' });
    }

    // Check if already a member
    const existing = db.select().from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUser.id)
      )).get();

    if (existing) {
      // If previously inactive, reactivate
      if (existing.isActive === 0) {
        db.update(workspaceMembers)
          .set({ isActive: 1, role: role as any, modifiedAt: Date.now(), modifiedById: userId })
          .where(eq(workspaceMembers.id, existing.id))
          .run();
        return res.json({ message: 'Member reactivated' });
      }
      return res.status(409).json({ error: 'User is already a member of this workspace' });
    }

    const now = Date.now();
    db.insert(workspaceMembers).values({
      workspaceId,
      userId: targetUser.id,
      role: role as 'admin' | 'manager' | 'member',
      joinedAt: now,
      createdAt: now,
      createdById: userId,
    }).run();

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List workspace members (ALWAYS includes workspace creator)
router.get('/:workspaceId/members', requireAuth, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();

    const members = db.select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      isActive: workspaceMembers.isActive,
    })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .all();

    // Ensure the workspace creator is ALWAYS included in members list
    if (workspace) {
      const creatorExists = members.some(m => m.userId === workspace.createdById);
      if (!creatorExists) {
        const creatorUser = db.select().from(users).where(eq(users.id, workspace.createdById)).get();
        if (creatorUser) {
          members.unshift({
            userId: creatorUser.id,
            name: creatorUser.name,
            email: creatorUser.email,
            avatarUrl: creatorUser.avatarUrl,
            role: 'admin',
            joinedAt: workspace.createdAt,
            isActive: 1,
          });
        }
      }
    }

    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from workspace
router.delete('/:workspaceId/members/:targetUserId', requireAuth, (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId as string, 10);
    const targetUserId = parseInt(req.params.targetUserId as string, 10);
    const userId = req.session.userId!;

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isOwner = workspace.createdById === userId;

    if (!isOwner) {
      const membership = db.select().from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.role, 'admin')
        )).get();

      if (!membership) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    db.update(workspaceMembers)
      .set({ isActive: 0, modifiedAt: Date.now(), modifiedById: userId })
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, targetUserId)
      )).run();

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
