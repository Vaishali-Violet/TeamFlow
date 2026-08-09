import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { workspaceMembers, workspaces } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Extend express Request to include session user
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Middleware to require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to require workspace membership
export const requireWorkspaceAccess = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session.userId;
  const workspaceIdRaw = req.params.workspaceId || req.body.workspaceId;
  const workspaceId = typeof workspaceIdRaw === 'string' ? parseInt(workspaceIdRaw, 10) : workspaceIdRaw;

  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  if (!workspaceId || isNaN(workspaceId)) return res.status(400).json({ error: 'Workspace ID required' });

  // 1. Check if user is the creator/owner of the workspace
  const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
  if (workspace && workspace.createdById === userId) {
    (req as any).workspaceRole = 'admin';
    return next();
  }

  // 2. Check membership table
  const membership = db.select().from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    )).get();

  if (!membership || membership.isActive === 0) {
    return res.status(403).json({ error: 'Access denied to this workspace' });
  }

  // Attach role for further checking
  (req as any).workspaceRole = membership.role;
  next();
};

// Middleware for workspace admin/manager access
export const requireWorkspaceAdminOrManager = (req: Request, res: Response, next: NextFunction) => {
  requireWorkspaceAccess(req, res, () => {
    const role = (req as any).workspaceRole;
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  });
};
