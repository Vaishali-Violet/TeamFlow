const API_BASE = 'http://localhost:3000';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    const errorMsg = error.error || 'Request failed';

    // If 401 Unauthorized, dispatch event so AuthContext can handle re-auth cleanly
    if (res.status === 401 && path !== '/auth/me') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    throw new Error(errorMsg);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }),

  me: () =>
    request('/auth/me'),
};

// ─── Workspaces ──────────────────────────────────────────
export const workspaceApi = {
  list: () =>
    request('/api/workspaces'),

  get: (id: string) =>
    request(`/api/workspaces/${id}`),

  create: (data: { name: string; slug: string }) =>
    request('/api/workspaces', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name: string }) =>
    request(`/api/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getMembers: (id: string) =>
    request(`/api/workspaces/${id}/members`),

  addMember: (id: string, data: { email: string; role: string }) =>
    request(`/api/workspaces/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),

  removeMember: (workspaceId: string, userId: string) =>
    request(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' }),
};

// ─── Projects ────────────────────────────────────────────
export const projectApi = {
  listByWorkspace: (workspaceId: string) =>
    request(`/api/projects/workspace/${workspaceId}`),

  get: (id: string) =>
    request(`/api/projects/${id}`),

  create: (data: { workspaceId: string; key: string; name: string; description?: string }) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    request(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/api/projects/${id}`, { method: 'DELETE' }),

  getMembers: (id: string) =>
    request(`/api/projects/${id}/members`),

  stats: (workspaceId: string) =>
    request(`/api/projects/stats/${workspaceId}`),
};

// ─── Stories ─────────────────────────────────────────────
export const storyApi = {
  listByProject: (projectId: string) =>
    request(`/api/stories/project/${projectId}`),

  get: (id: string) =>
    request(`/api/stories/${id}`),

  create: (data: { projectId: string; title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }) =>
    request('/api/stories', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    request(`/api/stories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string) =>
    request(`/api/stories/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  delete: (id: string) =>
    request(`/api/stories/${id}`, { method: 'DELETE' }),
};

// ─── Tasks ───────────────────────────────────────────────
export const taskApi = {
  listByStory: (storyId: string) =>
    request(`/api/tasks/story/${storyId}`),

  myWork: () =>
    request('/api/tasks/my-work'),

  get: (id: string) =>
    request(`/api/tasks/${id}`),

  create: (data: { storyId: string; title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }) =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string) =>
    request(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  delete: (id: string) =>
    request(`/api/tasks/${id}`, { method: 'DELETE' }),
};

// ─── Notifications ───────────────────────────────────────
export const notificationApi = {
  list: () =>
    request('/api/notifications'),

  unreadCount: () =>
    request('/api/notifications/unread-count'),

  markRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    request('/api/notifications/mark-all-read', { method: 'POST' }),
};

// ─── Chat ────────────────────────────────────────────────
export const chatApi = {
  listByWorkspace: (workspaceId: string) =>
    request(`/api/chat/workspace/${workspaceId}`),

  send: (workspaceId: string, content: string) =>
    request(`/api/chat/workspace/${workspaceId}`, { method: 'POST', body: JSON.stringify({ content }) }),
};

// ─── Calendar ────────────────────────────────────────────
export const calendarApi = {
  eventsByWorkspace: (workspaceId: string) =>
    request(`/api/calendar/workspace/${workspaceId}`),
};
