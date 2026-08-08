# TeamFlow Database Documentation

SQLite schema managed by **Drizzle ORM** (`backend/src/db/schema.ts`).

---

## Table Definitions

### 1. `users`
Stores user profile credentials and status.
- `id` (TEXT, PK): UUID v4
- `name` (TEXT): Display name
- `email` (TEXT, UNIQUE): User email address
- `password_hash` (TEXT): `bcrypt` salted hash (cost factor 10)
- `avatar_url` (TEXT, OPTIONAL): Profile picture URL
- `is_active` (INTEGER): Account active flag (1/0)
- `created_at`, `updated_at` (TIMESTAMP)

### 2. `workspaces`
Workspace organizations.
- `id` (TEXT, PK): UUID v4
- `name` (TEXT): Workspace name
- `slug` (TEXT, UNIQUE): Workspace URL slug
- `created_by` (TEXT, FK -> `users.id`)

### 3. `workspace_members`
Links users to workspaces with role privileges.
- `id` (TEXT, PK): UUID v4
- `workspace_id` (TEXT, FK -> `workspaces.id`)
- `user_id` (TEXT, FK -> `users.id`)
- `role` (TEXT): `'admin'`, `'manager'`, `'member'`

### 4. `projects`
Top-level projects owned by a workspace.
- `id` (TEXT, PK): UUID v4
- `workspace_id` (TEXT, FK -> `workspaces.id`)
- `key` (TEXT): Unique project key prefix (e.g. `WEB`, `MOB`)
- `name` (TEXT): Project title
- `description` (TEXT)
- `owner_id` (TEXT, FK -> `users.id`)
- `status` (TEXT): `'planning'`, `'active'`, `'paused'`, `'completed'`, `'archived'`
- `start_date`, `target_date` (TIMESTAMP)

### 5. `user_stories`
User stories under a project.
- `id` (TEXT, PK): UUID v4
- `project_id` (TEXT, FK -> `projects.id`)
- `key` (TEXT): Story key (e.g. `WEB-1`)
- `title` (TEXT)
- `description` (TEXT)
- `status` (TEXT): `'backlog'`, `'todo'`, `'in_progress'`, `'in_review'`, `'done'`
- `priority` (TEXT): `'low'`, `'medium'`, `'high'`, `'urgent'`
- `assignee_id` (TEXT, FK -> `users.id`)
- `due_date` (TIMESTAMP)

### 6. `tasks`
Sub-tasks under a user story.
- `id` (TEXT, PK): UUID v4
- `story_id` (TEXT, FK -> `user_stories.id`)
- `key` (TEXT): Task key (e.g. `WEB-1.1`)
- `title` (TEXT)
- `status` (TEXT): `'todo'`, `'done'`
- `priority` (TEXT): `'low'`, `'medium'`, `'high'`, `'urgent'`
- `assignee_id` (TEXT, FK -> `users.id`)
- `due_date` (TIMESTAMP)

### 7. `notifications`
Notification log entries.
- `id` (TEXT, PK): UUID v4
- `user_id` (TEXT, FK -> `users.id`)
- `type` (TEXT): `'task_assigned'`, `'story_updated'`, `'deadline_approaching'`
- `title`, `message` (TEXT)
- `related_id`, `related_type` (TEXT)
- `is_read` (INTEGER): Read status (0/1)

### 8. `chat_messages`
Team live chat message stream.
- `id` (TEXT, PK): UUID v4
- `workspace_id` (TEXT, FK -> `workspaces.id`)
- `user_id` (TEXT, FK -> `users.id`)
- `content` (TEXT): Message text
