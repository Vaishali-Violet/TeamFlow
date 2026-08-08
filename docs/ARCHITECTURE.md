# TeamFlow System Architecture

## Architecture Diagram

```
+-----------------------------------------------------------------------+
|                               FRONTEND                                |
|  React (TypeScript) + Vite + Tailwind CSS + Lucide Icons              |
|                                                                       |
|  [ AuthContext ] <───> [ API Client Layer (src/api.ts) ]              |
|                               │                                       |
|  [ Dashboard ] [ Projects ] [ Kanban ] [ Calendar ] [ Chat ]          |
+-------------------------------│---------------------------------------+
                                │ HTTP / REST (JSON) + Credentials Cookie
                                ▼
+-----------------------------------------------------------------------+
|                               BACKEND                                 |
|  Express.js Server (TypeScript) + SQLite Session Store                |
|                                                                       |
|  [ Auth Router ]      [ Workspace Router ]   [ Project Router ]       |
|  [ Story Router ]     [ Task Router ]        [ Chat Router ]          |
|  [ Calendar Router ]  [ Notification Router ]                          |
|                               │                                       |
|  [ Middleware Guards: requireAuth, requireWorkspaceAccess ]           |
+-------------------------------│---------------------------------------+
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
+------------------------------+  +------------------------------------+
|    BACKGROUND WORKER ENGINE  |  |           SQLITE DATABASE          |
|  (backend/src/worker.ts)     |  |          (Drizzle ORM Engine)        |
|                              |  |                                    |
|  - 10-min Deadline Evaluator |  |  Tables:                           |
|  - Idempotent Reminders      |  |  - users      - workspaces         |
|  - Auto Fault Retry Loop     |  |  - projects   - user_stories       |
+------------------------------+  |  - tasks      - notifications      |
                                  |  - chat_msgs  - workspace_members  |
                                  +------------------------------------+
```

## Layer Responsibilities

### 1. Presentation Layer (Frontend)
- Built using **React 18** and **Vite** for fast HMR and compilation.
- **Global Theme Engine**: CSS custom properties managed in `src/index.css` supporting instant toggle between Sunflower Light and Midnight Dark modes.
- **State Management**: React `Context` (`AuthContext`) manages login status, active workspace state, and global user session.

### 2. Service & Router Layer (Backend API)
- RESTful HTTP API built with **Express.js**.
- Modular router structure (`src/routes/`).
- Session management using `express-session` with `connect-sqlite3` storage engine.

### 3. Data & Persistence Layer (Database)
- Single-file SQLite database powered by **Drizzle ORM**.
- Strong typed schema definitions in `src/db/schema.ts`.

### 4. Background Processing Layer (Async Worker)
- Autonomous background loop (`src/worker.ts`) executing independently from HTTP request threads.
