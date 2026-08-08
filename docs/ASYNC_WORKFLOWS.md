# TeamFlow Asynchronous & Background Workflows

---

## 1. Background Worker Overview (`backend/src/worker.ts`)

TeamFlow implements an asynchronous background processing engine that operates independently from Express HTTP request/response loops.

```
 [ HTTP API Thread ]                         [ Async Worker Thread ]
          │                                             │
          ├──> Handle Client Requests                   ├──> Runs every 10 mins
          │                                             ├──> Scans SQLite for due items
          └──> Send Responses                           └──> Creates Notification Log
```

---

## 2. Worker Functions

### `checkApproachingDeadlines()`
- Scans `tasks` and `projects` in SQLite for items where `dueDate` or `targetDate` falls within the next 24 hours.
- Verifies that items are not marked `done` or `completed`.
- Dispatches reminder notifications (`type: 'deadline_approaching'`) to task assignees or project owners.

---

## 3. Idempotency & Deduplication
To prevent flooding users with duplicate reminders:
- Before creating a reminder notification, the worker queries `notifications` for existing records with matching `userId`, `relatedId`, `type`, and timestamp within the current calendar day.
- If a matching notification already exists, the step is skipped.

---

## 4. Failure & Retry Handling
1. **Fault Isolation**: The entire worker loop is encapsulated in top-level `try/catch` blocks. An exception inside the background worker will log error details to `console.error` without crashing the Express server.
2. **Database Lock Resilience**: SQLite handles concurrent readers/writers smoothly. If a database lock occurs during heavy write operations, the worker safely aborts the current tick and automatically retries on the next 10-minute tick.
