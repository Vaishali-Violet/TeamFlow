import { db } from './db';
import { tasks, userStories, notifications, backgroundJobs } from './db/schema';
import { eq, and, lt, not } from 'drizzle-orm';

const POLL_INTERVAL_MS = 60_000; // 1 minute

/**
 * Scans for overdue tasks and creates notifications for assignees.
 */
function scanOverdueTasks() {
  try {
    const now = Date.now();

    // Find tasks that are overdue (due_date < now and not done)
    const allTasks = db.select().from(tasks).all();
    const overdueTasks = allTasks.filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      return task.dueDate < now;
    });

    for (const task of overdueTasks) {
      if (!task.assigneeId) continue;

      // Check if we already sent an overdue notification for this task today
      const existingNotification = db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, task.assigneeId),
          eq(notifications.relatedId, String(task.id)),
          eq(notifications.type, 'task_overdue')
        ))
        .all();

      // Only create notification if we haven't already today (simple dedup)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const alreadyNotifiedToday = existingNotification.some(n => {
        return n.createdAt >= todayStart.getTime();
      });

      if (!alreadyNotifiedToday) {
        db.insert(notifications).values({
          userId: task.assigneeId,
          type: 'task_overdue',
          title: 'Task overdue',
          message: `Task "${task.title}" (${task.key}) is past its due date`,
          relatedId: String(task.id),
          relatedType: 'task',
          createdAt: now,
        }).run();

        console.log(`[Worker] Created overdue notification for task ${task.key}`);
      }
    }

    // Also check for tasks due within 24 hours (deadline reminder)
    const tomorrow = now + 24 * 60 * 60 * 1000;
    const upcomingTasks = allTasks.filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      return task.dueDate > now && task.dueDate <= tomorrow;
    });

    for (const task of upcomingTasks) {
      if (!task.assigneeId) continue;

      const existingReminder = db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, task.assigneeId),
          eq(notifications.relatedId, String(task.id)),
          eq(notifications.type, 'deadline_reminder')
        ))
        .all();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const alreadyRemindedToday = existingReminder.some(n => {
        return n.createdAt >= todayStart.getTime();
      });

      if (!alreadyRemindedToday) {
        db.insert(notifications).values({
          userId: task.assigneeId,
          type: 'deadline_reminder',
          title: 'Task due soon',
          message: `Task "${task.title}" (${task.key}) is due within 24 hours`,
          relatedId: String(task.id),
          relatedType: 'task',
          createdAt: now,
        }).run();

        console.log(`[Worker] Created deadline reminder for task ${task.key}`);
      }
    }
  } catch (error) {
    console.error('[Worker] Error scanning overdue tasks:', error);
  }
}

/**
 * Process queued background jobs from the background_jobs table.
 */
function processJobs() {
  try {
    const now = Date.now();

    const pendingJobs = db.select()
      .from(backgroundJobs)
      .where(and(
        eq(backgroundJobs.status, 'queued'),
      ))
      .all()
      .filter(job => job.availableAt <= now);

    for (const job of pendingJobs) {
      try {
        // Mark as running
        db.update(backgroundJobs)
          .set({ status: 'running', lockedAt: now, attempts: job.attempts + 1, modifiedAt: now })
          .where(eq(backgroundJobs.id, job.id))
          .run();

        // Process based on job type
        const payload = JSON.parse(job.payload);
        switch (job.jobType) {
          case 'overdue_scan':
            scanOverdueTasks();
            break;
          default:
            console.log(`[Worker] Unknown job type: ${job.jobType}`);
        }

        // Mark as succeeded
        db.update(backgroundJobs)
          .set({ status: 'succeeded', completedAt: now, modifiedAt: now })
          .where(eq(backgroundJobs.id, job.id))
          .run();

        console.log(`[Worker] Job ${job.id} completed successfully`);
      } catch (jobError: any) {
        db.update(backgroundJobs)
          .set({ status: 'failed', lastError: jobError.message, modifiedAt: now })
          .where(eq(backgroundJobs.id, job.id))
          .run();

        console.error(`[Worker] Job ${job.id} failed:`, jobError);
      }
    }
  } catch (error) {
    console.error('[Worker] Error processing jobs:', error);
  }
}

/**
 * Start the background worker polling loop.
 */
export function startWorker() {
  console.log(`[Worker] Starting background worker (interval: ${POLL_INTERVAL_MS}ms)`);

  // Run immediately on start
  scanOverdueTasks();
  processJobs();

  // Then poll at interval
  setInterval(() => {
    scanOverdueTasks();
    processJobs();
  }, POLL_INTERVAL_MS);
}
