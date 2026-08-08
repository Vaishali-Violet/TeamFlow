import { Router } from 'express';
import { db } from '../db';
import { workspaces, workspaceMembers, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create a new workspace
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, slug } = req.body;
    const userId = req.session.userId!;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const now = new Date();
    const workspaceId = uuidv4();
    let finalSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Ensure slug uniqueness by appending short random suffix if slug exists
    const existingSlug = db.select().from(workspaces).where(eq(workspaces.slug, finalSlug)).get();
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const newWorkspace = db.transaction((tx) => {
      const workspace = tx.insert(workspaces).values({
        id: workspaceId,
        name,
        slug: finalSlug,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      }).returning().get();

      // Add creator as admin
      tx.insert(workspaceMembers).values({
        id: uuidv4(),
        workspaceId,
        userId,
        role: 'admin',
        joinedAt: now,
        isActive: true,
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
      createdBy: workspaces.createdBy,
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
      .where(eq(workspaces.createdBy, userId))
      .all();

    // Merge and deduplicate
    const workspaceMap = new Map<string, any>();

    for (const ws of createdWorkspaces) {
      workspaceMap.set(ws.id, {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        createdBy: ws.createdBy,
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
    const { workspaceId } = req.params;
    const userId = req.session.userId!;

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Owner override
    if (workspace.createdBy === userId) {
      return res.json({ ...workspace, role: 'admin' });
    }

    // Check membership
    const membership = db.select().from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )).get();

    if (!membership || membership.isActive === false) {
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
    const { workspaceId } = req.params;
    const userId = req.session.userId!;
    const { name } = req.body;

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isOwner = workspace.createdBy === userId;

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
      .set({ name, updatedAt: new Date() })
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
    const { workspaceId } = req.params;
    const userId = req.session.userId!;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isOwner = workspace.createdBy === userId;

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
      if (!existing.isActive) {
        db.update(workspaceMembers)
          .set({ isActive: true, role: role as any })
          .where(and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, targetUser.id)
          )).run();
        return res.json({ message: 'Member reactivated' });
      }
      return res.status(409).json({ error: 'User is already a member of this workspace' });
    }

    db.insert(workspaceMembers).values({
      id: uuidv4(),
      workspaceId,
      userId: targetUser.id,
      role: role as 'admin' | 'manager' | 'member',
      joinedAt: new Date(),
      isActive: true,
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
    const { workspaceId } = req.params;

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
      const creatorExists = members.some(m => m.userId === workspace.createdBy);
      if (!creatorExists) {
        const creatorUser = db.select().from(users).where(eq(users.id, workspace.createdBy)).get();
        if (creatorUser) {
          members.unshift({
            userId: creatorUser.id,
            name: creatorUser.name,
            email: creatorUser.email,
            avatarUrl: creatorUser.avatarUrl,
            role: 'admin',
            joinedAt: workspace.createdAt,
            isActive: true,
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
    const { workspaceId, targetUserId } = req.params;
    const userId = req.session.userId!;

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isOwner = workspace.createdBy === userId;

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
      .set({ isActive: false })
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
