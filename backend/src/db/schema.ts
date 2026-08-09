import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── 1. Users ────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").references((): any => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references((): any => users.id),
});

// ─── 2. Workspaces ───────────────────────────────────────
export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
});

// ─── 3. Workspace Members ───────────────────────────────
export const workspaceMembers = sqliteTable("workspace_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["admin", "manager", "member"] }).notNull(),
  isActive: integer("is_active").notNull().default(1),
  joinedAt: integer("joined_at").notNull(),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
}, (table) => ({
  uniqueWorkspaceUser: uniqueIndex("uq_workspace_user").on(table.workspaceId, table.userId),
}));

// ─── 4. Projects ─────────────────────────────────────────
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["planning", "active", "paused", "completed", "archived"] }).notNull().default("planning"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  startDate: integer("start_date"),
  targetDate: integer("target_date"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
}, (table) => ({
  uniqueWorkspaceKey: uniqueIndex("uq_workspace_project_key").on(table.workspaceId, table.key),
}));

// ─── 5. User Stories ─────────────────────────────────────
export const userStories = sqliteTable("user_stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  acceptanceCriteria: text("acceptance_criteria"),
  status: text("status", { enum: ["backlog", "todo", "in_progress", "blocked", "done"] }).notNull().default("backlog"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  storyPoints: integer("story_points"),
  assigneeId: integer("assignee_id").references(() => users.id),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  dueDate: integer("due_date"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
}, (table) => ({
  uniqueProjectKey: uniqueIndex("uq_project_story_key").on(table.projectId, table.key),
}));

// ─── 6. Tasks ────────────────────────────────────────────
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => userStories.id),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "blocked", "done"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  assigneeId: integer("assignee_id").references(() => users.id),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  estimateMinutes: integer("estimate_minutes"),
  dueDate: integer("due_date"),
  sortOrder: integer("sort_order"),
  completedAt: integer("completed_at"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
}, (table) => ({
  uniqueStoryKey: uniqueIndex("uq_story_task_key").on(table.storyId, table.key),
}));

// ─── 7. Notifications ───────────────────────────────────
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: text("related_id"),
  relatedType: text("related_type"),
  isRead: integer("is_read").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
});

// ─── 8. Activity Logs ───────────────────────────────────
export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: integer("user_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
});

// ─── 9. Chat Messages ───────────────────────────────────
export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
});

// ─── 10. Background Jobs ────────────────────────────────
export const backgroundJobs = sqliteTable("background_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobType: text("job_type").notNull(),
  payload: text("payload").notNull(),
  status: text("status", { enum: ["queued", "running", "succeeded", "failed"] }).notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: integer("available_at").notNull(),
  lockedAt: integer("locked_at"),
  lastError: text("last_error"),
  completedAt: integer("completed_at"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  createdById: integer("created_by_id").references(() => users.id),
  modifiedAt: integer("modified_at"),
  modifiedById: integer("modified_by_id").references(() => users.id),
});
