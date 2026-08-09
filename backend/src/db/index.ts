import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const dbPath = process.env.DATABASE_URL?.replace(/^file:/, '') || 'teamflow.db';
const sqlite = new Database(dbPath);

// Enable foreign key enforcement
sqlite.pragma('foreign_keys = ON');

// Ensure all database tables exist on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    timezone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    joined_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id),
    UNIQUE(workspace_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    owner_id INTEGER NOT NULL REFERENCES users(id),
    start_date INTEGER,
    target_date INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id),
    UNIQUE(workspace_id, key)
  );

  CREATE TABLE IF NOT EXISTS user_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    story_points INTEGER,
    assignee_id INTEGER REFERENCES users(id),
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    due_date INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id),
    UNIQUE(project_id, key)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL REFERENCES user_stories(id),
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id INTEGER REFERENCES users(id),
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    estimate_minutes INTEGER,
    due_date INTEGER,
    sort_order INTEGER,
    completed_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id),
    UNIQUE(story_id, key)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id TEXT,
    related_type TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS background_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at INTEGER NOT NULL,
    locked_at INTEGER,
    last_error TEXT,
    completed_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    created_by_id INTEGER REFERENCES users(id),
    modified_at INTEGER,
    modified_by_id INTEGER REFERENCES users(id)
  );
`);

export const db = drizzle(sqlite, { schema });
