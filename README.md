# TeamFlow 🚀

TeamFlow is a full-stack project management and collaboration workspace platform built with **TypeScript**, **React**, **Node.js/Express**, and **SQLite (Drizzle ORM)**.

---

## 🏗 Project Architecture

- **`backend/`**: Node.js & Express REST API using Drizzle ORM + Better-SQLite3.
- **`frontend/`**: React SPA powered by Vite, Tailwind CSS, and Lucide icons.

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **npm** or **pnpm**

---

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Run Backend Server:
```bash
npm start
```
*Runs the Express API on `http://localhost:5000` (or `PORT` specified in `.env`).*

#### Database Management & Drizzle Studio:
```bash
# Run Drizzle Studio to inspect SQLite database tables visually
npm run db:studio

# Push schema changes to SQLite
npm run db:push
```
*Drizzle Studio opens at `https://local.drizzle.studio`.*

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
*Runs Vite dev server on `http://localhost:5173`.*

---

## 🛠 Features

- **Workspaces & Projects**: Manage multi-tenant workspaces and user projects.
- **User Stories & Tasks**: Task tracking, status updates, and estimations.
- **Real-time & Background Processing**: Chat messages and background jobs.
- **Database Visualizer**: Integrated Drizzle Studio support with cross-platform SQLite configuration.

---

## Links

Deployed Link : https://6a7780f7dad05ac3c0c58cce--teamflow-internproject.netlify.app/projects
Video Link : https://drive.google.com/file/d/1_0rP41AsGCUWKUyvm4xdrdyZJtxJOiJN/view?usp=sharing

