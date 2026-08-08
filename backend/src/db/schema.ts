import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const workspaceMembers = sqliteTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["admin", "manager", "member"] }).notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["planning", "active", "paused", "completed", "archived"] }).notNull().default("planning"),
  ownerId: text("owner_id").notNull().references(() => users.id),
  startDate: integer("start_date", { mode: "timestamp" }),
  targetDate: integer("target_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const projectMembers = sqliteTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  userId: text("user_id").notNull().references(() => users.id),
  projectRole: text("project_role", { enum: ["manager", "member"] }).notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
});

export const userStories = sqliteTable("user_stories", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  acceptanceCriteria: text("acceptance_criteria"), // JSON string
  status: text("status", { enum: ["backlog", "todo", "in_progress", "blocked", "done"] }).notNull().default("backlog"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  storyPoints: integer("story_points"),
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").notNull().references(() => users.id),
  dueDate: integer("due_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => userStories.id),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "blocked", "done"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").notNull().references(() => users.id),
  estimateMinutes: integer("estimate_minutes"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  sortOrder: integer("sort_order"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const backgroundJobs = sqliteTable("background_jobs", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(),
  payload: text("payload").notNull(), // JSON string
  status: text("status", { enum: ["queued", "running", "succeeded", "failed"] }).notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: integer("available_at", { mode: "timestamp" }).notNull(),
  lockedAt: integer("locked_at", { mode: "timestamp" }),
  lastError: text("last_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["task_assigned", "task_overdue", "story_updated", "member_added", "deadline_reminder"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: text("related_id"),
  relatedType: text("related_type"),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  userId: text("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
