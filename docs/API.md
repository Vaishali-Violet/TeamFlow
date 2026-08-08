# TeamFlow API Documentation

All API endpoints return JSON payloads and require session cookies unless otherwise specified.

---

## 1. Authentication Routes (`/auth`)

### `POST /auth/register`
Creates a new user account.
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "uuid-v4",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
  ```

### `POST /auth/login`
Authenticates credentials and sets session cookie.
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": "uuid-v4",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
  ```

---

## 2. Workspaces (`/api/workspaces`)

### `GET /api/workspaces`
Returns all workspaces the active user belongs to.

### `POST /api/workspaces`
Creates a new workspace.
- **Request Body:**
  ```json
  {
    "name": "Acme Engineering",
    "slug": "acme-eng"
  }
  ```

---

## 3. Projects (`/api/projects`)

### `GET /api/projects/workspace/:workspaceId`
Fetches all projects in the specified workspace.

### `POST /api/projects`
Creates a project under a workspace.
- **Request Body:**
  ```json
  {
    "workspaceId": "ws-uuid",
    "key": "MOB",
    "name": "Mobile Redesign",
    "description": "iOS and Android app redesign"
  }
  ```

### `PUT /api/projects/:projectId`
Updates project name, status, target date, or description.

### `DELETE /api/projects/:projectId`
Cascade deletes project and all child stories/tasks.

---

## 4. User Stories (`/api/stories`)

### `GET /api/stories/project/:projectId`
Fetches stories under a project.

### `POST /api/stories`
Creates a user story.
- **Request Body:**
  ```json
  {
    "projectId": "proj-uuid",
    "title": "User Authentication Flow",
    "priority": "high",
    "assigneeId": "user-uuid",
    "dueDate": "2026-08-15"
  }
  ```

### `PUT /api/stories/:storyId`
Updates story priority, assignee, description, due date.

### `DELETE /api/stories/:storyId`
Deletes story and its sub-tasks.

---

## 5. Tasks (`/api/tasks`)

### `GET /api/tasks/story/:storyId`
Fetches sub-tasks under a user story.

### `GET /api/tasks/my-work`
Fetches tasks assigned to the active user across all projects.

### `POST /api/tasks`
Creates a sub-task under a user story.

### `PUT /api/tasks/:taskId`
Updates task title, priority, assignee, due date.

### `DELETE /api/tasks/:taskId`
Deletes an individual task.
