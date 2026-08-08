# TeamFlow Frontend Screens & UI Workflows

---

## 1. Top Navbar Header & Common Controls
- **Workspace Selector (Left)**: Active workspace indicator dot (`bg-emerald-400`), member role badges (`ADMIN`, `MANAGER`), and `+ Create New Workspace` modal opener.
- **Theme Toggle (Far Right)**: Fixed on the top right margin. Allows 1-click instant switching between **Sunflower Light** and **Midnight Dark** modes across the application.

---

## 2. Dashboard Screen (`/`)
- Displays workspace metric summary cards: Active Projects, Open Stories, My Tasks, and Work Completion Rate %.
- Quick action links to recently modified projects and assigned tasks.

---

## 3. Projects Grid (`/projects`)
- Grid layout displaying all projects in the current workspace.
- **Create Project Modal**: Form with project name, auto-generated key prefix, and description.
- **Edit Project Modal**: Update project name, status, or description.
- **Delete Project**: Confirmation prompt with cascading deletion of associated user stories and tasks.

---

## 4. Project Kanban Board (`/projects/:projectId`)
- 5-column Kanban board (`Backlog`, `To Do`, `In Progress`, `In Review`, `Done`).
- Drag-and-drop story status movement.
- **Story Detail Slideout Drawer**:
  - Edit story priority (`Low`, `Medium`, `High`, `Urgent`).
  - Edit story description.
  - Change assignee & due date.
  - Sub-task checklist with 0ms optimistic status toggles (`todo` / `done`), sub-task priority dropdowns, assignee selectors, due date pickers, and deletion buttons.

---

## 5. Interactive Common Calendar (`/calendar`)
- Full 7-column grid layout filled with month dates.
- Automatically marks all Project target dates and Task due dates on the exact calendar cells with status badges.
- Quick date range preset buttons (`Today`, `This Week`, `Next Week`, `This Month`).

---

## 6. Live Team Chat (`/live-chat`)
- Occupies full viewport height & width.
- Auto-scrolls to the newest message.
- 3-second live background polling updates.

---

## 7. My Work Screen (`/my-work`)
- Consolidates tasks assigned to the active user across all projects.
- Status filter pills (`All`, `To Do`, `In Progress`, `Done`).
- Interactive inline controls for **Priority**, **Status**, **Reassign / Assignee**, and **Due Date**.

---

## 8. Notifications Screen (`/notifications`)
- Lists unread and read notifications with relative timestamps.
- Counter badge in sidebar header.
- Click-to-navigate action automatically opens the relevant project or story.
