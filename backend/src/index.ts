import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import SQLiteStoreFactory from 'connect-sqlite3';
import { db } from './db';
import { startWorker } from './worker';

// Route imports
import authRouter from './routes/auth';
import workspaceRouter from './routes/workspaces';
import projectRouter from './routes/projects';
import storyRouter from './routes/stories';
import taskRouter from './routes/tasks';
import notificationRouter from './routes/notifications';
import chatRouter from './routes/chat';
import calendarRouter from './routes/calendar';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const SQLiteStore = SQLiteStoreFactory(session);

// CORS: allow any localhost port or configured origin with credentials
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Persistent Sessions via SQLite
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './',
  }) as any,
  secret: process.env.SESSION_SECRET || 'super-secret-key-for-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  }
}));

// Basic route to verify server
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: !!db });
});

// API Routes
app.use('/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/projects', projectRouter);
app.use('/api/stories', storyRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/chat', chatRouter);
app.use('/api/calendar', calendarRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);

  // Start background worker after server is listening
  startWorker();
});
