# TeamFlow — Agile Project Management Tool (Small Teams)

> **Full-Stack Agile Project & Work Management Platform** built for small teams (3–10 users). Features hierarchical work tracking (**Project → User Story → Task**), real-time team chat, interactive calendar, background notification worker, role-based security, and dual color themes (*Sunflower Light* & *Midnight Dark*).

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Hierarchy Model (Project → User Story → Task)](#-hierarchy-model-project--user-story--task)
3. [Setup & Installation Instructions](#-setup--installation-instructions)
4. [Frontend Application & Screens](#-frontend-application--screens)
5. [Backend Architecture & API Reference](#-backend-architecture--api-reference)
6. [Database Schema & Entity Relationships](#-database-schema--entity-relationships)
7. [Asynchronous Background Workflow](#-asynchronous-background-workflow)
8. [Security Considerations & Guardrails](#-security-considerations--guardrails)
9. [Design Decisions & Tradeoffs](#-design-decisions--tradeoffs)
10. [Note on AI Usage](#-note-on-ai-usage)
11. [Future Enhancements & Next Steps](#-future-enhancements--next-steps)
12. [Extra Features & Enhancements](#-extra-features--enhancements)

---

## 🚀 Project Overview

**TeamFlow** is a modern full-stack web application designed for agile teams to organize workspaces, manage multi-level project hierarchies, collaborate in real time, and monitor upcoming deadlines.

### Key Highlights
- **Hierarchical Work Tracking**: Seamlessly navigate **Project → User Story → Sub-Task**.
- **Real-Time Collaboration**: Team Live Chat with automatic polling updates and workspace scoping.
- **Interactive Calendar Component**: Automatically highlights deadlines and due dates across projects and tasks in a responsive 7-column grid layout.
- **Asynchronous Background Worker**: Background polling job evaluating approaching deadlines and dispatching automatic reminder notifications.
- **Dual Themes**: Instant toggle between **Sunflower Light Mode** and **Midnight Dark Mode**.
- **Production Security**: Passwords salted and hashed with `bcrypt` (10 rounds), HTTP-only SQLite sessions, and strict workspace Role-Based Access Control (RBAC).

---

## 🌳 Hierarchy Model (Project → User Story → Task)

TeamFlow explicitly models and enforces a 3-tier work item hierarchy:

```
[ Workspace ]
     │
     └──> [ Project ] (e.g., "Mobile App Redesign" - Key: MOB)
               │
               └──> [ User Story ] (e.g., "MOB-1: User Authentication Flow")
                         │
                         ├──> [ Sub-Task 1 ] (e.g., "MOB-1.1: Design Login UI")
                         ├──> [ Sub-Task 2 ] (e.g., "MOB-1.2: Implement OAuth Route")
                         └──> [ Sub-Task 3 ] (e.g., "MOB-1.3: Write Integration Tests")
```

### Hierarchy Breakdown:
1. **Project**: Top-level initiative owned by a workspace. Has a unique prefix key (e.g., `MOB`, `WEB`), start date, target date, and status (`planning`, `active`, `paused`, `completed`, `archived`).
2. **User Story**: High-level feature requirement belonging to a Project. Features story status (`backlog`, `todo`, `in_progress`, `in_review`, `done`), priority (`low`, `medium`, `high`, `urgent`), assignee, and due date.
3. **Sub-Task**: Granular actionable checklist items belonging to a User Story. Features 0ms optimistic status toggles (`todo` / `done`), individual assignees, priority levels, and due dates.

---

## 🛠️ Setup & Installation Instructions

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)

### 1. Clone & Set Up Workspace
```bash
git clone <repository-url>
cd KPIT
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run build   # Compiles TypeScript to dist/
npm start       # Starts Express backend server on http://localhost:3000
```
*Environment Configuration (`backend/.env`):*
```env
PORT=3000
SESSION_SECRET=super-secret-key-for-dev
NODE_ENV=development
```

### 3. Frontend Setup
```bash
# Open a new terminal window
cd frontend
npm install
npm run dev     # Starts Vite frontend server on http://localhost:5173
```

### 4. Access the Application
Open your browser and navigate to **`http://localhost:5173`**.

---

## 🖥️ Frontend Application & Screens

Built with **React (TypeScript)**, **Vite**, **Tailwind CSS**, and **Lucide React Icons**.

### Available Screens & Workflows

| Screen | Route | Description | Key Interactions |
| :--- | :--- | :--- | :--- |
| **Login / Register** | `/login`, `/register` | User authentication portal | Salted login/signup, instant session creation, validation error alerts |
| **Workspace Setup** | `/workspace-setup` | First-time workspace wizard | Create a new workspace or join an existing workspace |
| **Dashboard** | `/` | Executive workspace overview | Active project count, open stories, completion rate %, quick action shortcuts |
| **Projects List** | `/projects` | All workspace projects grid | Create project modal, **Edit Project** modal, **Delete Project** with confirmation prompt |
| **Project Kanban Board** | `/projects/:projectId` | Interactive 5-column Kanban board | Drag & drop stories across columns, inline story creation, story detail drawer, sub-task management |
| **Interactive Calendar** | `/calendar` | Common workspace calendar component | Responsive 7-column grid layout, auto-marked project target dates and task due dates, month navigation, quick date presets |
| **Live Team Chat** | `/live-chat` | Real-time team messaging | Workspace-scoped messaging, auto-scrolling history, 3-second live polling |
| **My Work** | `/my-work` | Personal task management view | Filter tasks by status (`todo`, `in_progress`, `done`), inline priority selection, due date modification, task reassignment |
| **Notifications** | `/notifications` | Notification center | Real-time unread counter badge, mark as read, click-to-navigate redirect to assigned task/story |
| **Team Management** | `/team` | Workspace members & roles | View member roles (`admin`, `manager`, `member`), invite new members, change role privileges |

---

## ⚡ Backend Architecture & API Reference

Built with **Express.js (TypeScript)**, **Express Session (SQLite Store)**, and **Drizzle ORM**.

### Summary of REST API Endpoints

#### Authentication (`/auth`)
- `POST /auth/register` — Create a new user account (hashes password with `bcrypt`).
- `POST /auth/login` — Authenticate user and initiate session.
- `POST /auth/logout` — Destroy session and clear authentication cookies.
- `GET /auth/me` — Return current session user details.

#### Workspaces (`/api/workspaces`)
- `GET /api/workspaces` — List workspaces owned by or joined by the user.
- `POST /api/workspaces` — Create a new workspace.
- `GET /api/workspaces/:workspaceId/members` — Fetch workspace members.
- `POST /api/workspaces/:workspaceId/members` — Invite user to workspace.

#### Projects (`/api/projects`)
- `GET /api/projects/workspace/:workspaceId` — List projects in workspace.
- `POST /api/projects` — Create project (generates project key prefix).
- `PUT /api/projects/:projectId` — Update project details, status, or dates.
- `DELETE /api/projects/:projectId` — Cascade delete project, stories, and tasks.

#### User Stories (`/api/stories`)
- `GET /api/stories/project/:projectId` — List stories in project.
- `POST /api/stories` — Create user story under project.
- `PUT /api/stories/:storyId` — Update story details, priority, assignee, due date.
- `PATCH /api/stories/:storyId/status` — Quick status update (Kanban drag-drop).
- `DELETE /api/stories/:storyId` — Cascade delete story and its sub-tasks.

#### Tasks (`/api/tasks`)
- `GET /api/tasks/story/:storyId` — List sub-tasks for a story.
- `GET /api/tasks/my-work` — List tasks assigned to the current user.
- `POST /api/tasks` — Create sub-task under user story.
- `PUT /api/tasks/:taskId` — Update task title, priority, assignee, due date.
- `PATCH /api/tasks/:taskId/status` — Quick status toggle (`todo` ↔ `done`).
- `DELETE /api/tasks/:taskId` — Delete individual sub-task.

#### Notifications (`/api/notifications`)
- `GET /api/notifications` — List notifications for active user.
- `PATCH /api/notifications/:id/read` — Mark notification as read.
- `PATCH /api/notifications/read-all` — Mark all notifications as read.

#### Live Chat (`/api/chat`)
- `GET /api/chat/workspace/:workspaceId` — Fetch chat message history.
- `POST /api/chat/workspace/:workspaceId` — Post a new message.

---

## 🗄️ Database Schema & Entity Relationships

The storage engine uses **SQLite** managed via **Drizzle ORM**.

### Entity Relationship Diagram

```
 +------------------+           +----------------------+          +-------------------+
 |      users       |1        * |   workspace_members  | *       1|    workspaces     |
 +------------------+-----------+----------------------+----------+-------------------+
 | id (PK)          |           | id (PK)              |          | id (PK)           |
 | name             |           | workspace_id (FK)    |          | name              |
 | email            |           | user_id (FK)         |          | slug              |
 | password_hash    |           | role                 |          | created_by (FK)   |
 +------------------+           +----------------------+          +-------------------+
          │                                                                 │
          │1                                                               1│
          │                                                                 │
          │*                            +--------------------+              │*
          ├────────────────────────────>|      projects      |<─────────────┘
          │                             +--------------------+
          │                             | id (PK)            |
          │                             | workspace_id (FK)  |
          │                             | owner_id (FK)      |
          │                             | key, name, status  |
          │                             +--------------------+
          │                                       │1
          │                                       │
          │*                                      │*
          ├────────────────────────────>+--------------------+
          │                             |    user_stories    |
          │                             +--------------------+
          │                             | id (PK)            |
          │                             | project_id (FK)    |
          │                             | assignee_id (FK)   |
          │                             | title, status, due |
          │                             +--------------------+
          │                                       │1
          │                                       │
          │*                                      │*
          └────────────────────────────>+--------------------+
                                        |       tasks        |
                                        +--------------------+
                                        | id (PK)            |
                                        | story_id (FK)      |
                                        | assignee_id (FK)   |
                                        | title, status, due |
                                        +--------------------+
```

---

## 🔄 Asynchronous Background Workflow

### Workflow Overview (`backend/src/worker.ts`)
To satisfy the async/background processing requirement, TeamFlow runs a dedicated **background worker thread** alongside the Express API server.

```
 [ Express Server ] ──────(Runs in Parallel)──────> [ Background Worker Engine ]
                                                             │ (Runs every 10 mins)
                                                             ▼
                                                   [ Deadline Evaluator ]
                                                             │
                                                             ├──> Check Tasks due within 24 hours
                                                             ├──> Check Project target dates
                                                             ▼
                                                [ Dispatches Reminder Notifications ]
```

### Design & Implementation Details
1. **Periodic Deadline Evaluator**: Executes every 10 minutes (`INTERVAL = 10 * 60 * 1000 ms`).
2. **Idempotency Guard**: Queries existing notifications in SQLite to avoid dispatching duplicate reminder notifications for the same task/project on the same day.
3. **Failure & Retry Handling**:
   - **Fault Isolation**: Wrapped in isolated `try/catch` blocks so background worker exceptions never crash the main Express HTTP server.
   - **Automatic Retry**: If a database query fails due to temporary SQLite lock contention, the worker logs the warning and automatically retries on the next scheduled tick.

---

## 🛡️ Security Considerations & Guardrails

1. **Salted Password Hashing**: Passwords are salted and hashed using **`bcrypt` (10 rounds)** before database storage. Plaintext passwords are never saved or returned.
2. **Session Hijacking Prevention**: Session cookies are configured with `httpOnly: true`, `sameSite: 'lax'`, and stored in a server-side SQLite session store (`connect-sqlite3`).
3. **Workspace Isolation Guardrails**: Middleware (`requireWorkspaceAccess`) validates that requesting users belong to the workspace before exposing project/story/task data.
4. **Role-Based Privilege Guards**: `requireWorkspaceAdminOrManager` restricts workspace deletion, role promotion, and member removal to authorized roles (`admin`, `manager`).
5. **Cascading Relational Deletion**: Prevents orphaned records when deleting Projects or User Stories.

---

## 📐 Design Decisions & Tradeoffs

| Decision | Choice Made | Rationale & Tradeoffs |
| :--- | :--- | :--- |
| **Database** | SQLite + Drizzle ORM | Zero-config, fast, self-contained single-file storage. Great for small team deployments (3–10 users). Tradeoff: Write locks on high concurrency, easily upgradable to PostgreSQL via Drizzle ORM. |
| **State Syncing** | Real-time Polling (3s) | Clean, robust polling for chat and notifications without WebSockets complexity. Tradeoff: Minor background HTTP overhead vs. zero connection drop issues. |
| **UI Components** | Vanilla CSS + Tailwind | Maximum styling control with CSS Variables for seamless instant dual-theme switching (`Sunflower Light` & `Midnight Dark`). |

---

## 🤖 Note on AI Usage

AI tools were utilized during development for:
- Accelerating initial boilerplate generation for TypeScript interfaces and database schemas.
- Drafting initial CSS variable palettes for Sunflower Light and Midnight Dark modes.
- Assistance in refining responsive grid breakpoints for the interactive calendar component.

*All business logic, database relationships, security guardrails, async worker loops, and custom React components were reviewed, tested, and verified.*

---

## 🔮 Future Enhancements & Next Steps

If granted additional time, the following features would be implemented:
1. **WebSocket Integration**: Upgrade live chat and notification badges from HTTP polling to Socket.io WebSockets.
2. **File Attachments**: Integrate AWS S3 / Cloudinary upload support for story & task screenshots.
3. **Sprint & Velocity Analytics**: Add burn-down charts and sprint velocity tracking components on the Dashboard.
4. **Activity Audit Logs**: Detailed timeline of all project edits, assignment updates, and status changes.

---

## 🌟 Extra Features & Enhancements

Beyond the core assignment specifications, TeamFlow includes:
- **Dual Themes**: Sunflower Light & Midnight Dark mode switchable instantly from the header.
- **Interactive Common Calendar Component**: Responsive grid calendar automatically marking all story and task due dates with colored status badges.
- **Interactive Workspace Selector**: Active workspace indicator dot, member role badges, and workspace creation popup.
- **Clickable Notification Navigation**: Clicking any assignment or deadline notification immediately navigates to the exact project/story context.
