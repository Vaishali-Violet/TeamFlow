import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
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
const isProduction = process.env.NODE_ENV === 'production';

// Trust reverse proxies (Render, Railway, Vercel, Netlify, Heroku) for secure cookies
app.set('trust proxy', 1);

// CORS configuration supporting credentials
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    callback(null, origin);
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key-for-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  }
}));

// Health check route
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

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    startWorker();
  });
}

export default app;
