import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, storyApi, taskApi, workspaceApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, ArrowLeft, CheckSquare, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

const STATUSES = [
  { key: 'backlog', label: 'Backlog', color: '#94a3b8' },
  { key: 'todo', label: 'To Do', color: '#60a5fa' },
  { key: 'in_progress', label: 'In Progress', color: '#a78bfa' },
  { key: 'done', label: 'Done', color: '#34d399' },
];

const PRIORITIES = [
  { key: 'low', label: 'Low', color: '#94a3b8' },
  { key: 'medium', label: 'Medium', color: '#60a5fa' },
  { key: 'high', label: 'High', color: '#f59e0b' },
  { key: 'urgent', label: 'Urgent', color: '#ef4444' },
];

interface Story {
  id: string;
  key: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
}

interface Member {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

const ProjectBoard = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyTasks, setStoryTasks] = useState<any[]>([]);
  const [draggedStory, setDraggedStory] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: '',
    dueDate: '',
  });
  const [creating, setCreating] = useState(false);

  // Sub-task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      projectApi.get(projectId),
      storyApi.listByProject(projectId),
      currentWorkspace ? workspaceApi.getMembers(currentWorkspace.id).catch(() => []) : Promise.resolve([]),
    ]).then(([proj, storyList, memberList]) => {
      setProject(proj);
      setStories(storyList);
      setMembers(memberList);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, currentWorkspace]);

  // Load tasks when story is selected
  useEffect(() => {
    if (!selectedStory) {
      setStoryTasks([]);
      return;
    }
    taskApi.listByStory(selectedStory.id)
      .then(setStoryTasks)
      .catch(console.error);
  }, [selectedStory]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setCreating(true);
    try {
      const story = await storyApi.create({
        projectId,
        title: form.title,
        description: form.description,
        priority: form.priority,
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate || undefined,
      });

      setStories(prev => [...prev, story]);
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (storyId: string, newStatus: string) => {
    // 0ms Optimistic UI Update for zero-lag Kanban drag & drop
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, status: newStatus } : s));
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory(prev => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      await storyApi.updateStatus(storyId, newStatus);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssigneeChange = async (storyId: string, assigneeId: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, assigneeId: assigneeId || undefined } : s));
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory(prev => prev ? { ...prev, assigneeId: assigneeId || undefined } : null);
    }
    try {
      await storyApi.update(storyId, { assigneeId: assigneeId || null });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDueDateChange = async (storyId: string, dueDate: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, dueDate: dueDate || undefined } : s));
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory(prev => prev ? { ...prev, dueDate: dueDate || undefined } : null);
    }
    try {
      await storyApi.update(storyId, { dueDate: dueDate || null });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (storyId: string, priority: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, priority } : s));
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory(prev => prev ? { ...prev, priority } : null);
    }
    try {
      await storyApi.update(storyId, { priority });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDescriptionChange = async (storyId: string, description: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, description } : s));
    if (selectedStory && selectedStory.id === storyId) {
      setSelectedStory(prev => prev ? { ...prev, description } : null);
    }
    try {
      await storyApi.update(storyId, { description });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    setStoryTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    try {
      await taskApi.update(taskId, updates);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory || !newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const task = await taskApi.create({
        storyId: selectedStory.id,
        title: newTaskTitle,
        priority: newTaskPriority,
        assigneeId: newTaskAssignee || undefined,
        dueDate: newTaskDueDate || undefined,
      });
      setStoryTasks(prev => [...prev, task]);
      setNewTaskTitle('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingTask(false);
    }
  };

  const handleTaskStatusToggle = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';

    // 0ms Optimistic UI Update for instant checkbox toggle
    setStoryTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));

    try {
      await taskApi.updateStatus(taskId, nextStatus);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStory = async (e: React.MouseEvent, storyId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete story "${title}" and all associated sub-tasks?`)) return;

    setStories(prev => prev.filter(s => s.id !== storyId));
    if (selectedStory?.id === storyId) setSelectedStory(null);

    try {
      await storyApi.delete(storyId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Delete task "${title}"?`)) return;

    setStoryTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await taskApi.delete(taskId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragStart = (e: React.DragEvent, storyId: string) => {
    setDraggedStory(storyId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedStory) {
      handleStatusChange(draggedStory, status);
      setDraggedStory(null);
    }
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITIES.find(p => p.key === priority) || PRIORITIES[1];
  };

  const getMember = (userId?: string) => {
    if (!userId) return null;
    return members.find(m => m.userId === userId);
  };

  if (loading) {
    return <div className="loading-state">Loading board…</div>;
  }

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="btn btn-ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="project-key-badge">{project?.key}</span>
              <h2 className="text-xl font-bold">{project?.name}</h2>
            </div>
            {project?.description && (
              <p className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>{project.description}</p>
            )}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Story
        </button>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {STATUSES.map(status => {
          const columnStories = stories.filter(s => s.status === status.key);
          return (
            <div
              key={status.key}
              className={`kanban-column ${draggedStory ? 'kanban-column-droppable' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.key)}
            >
              <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                  <div className="kanban-status-dot" style={{ background: status.color }}></div>
                  <span className="font-semibold text-sm">{status.label}</span>
                </div>
                <span className="kanban-count">{columnStories.length}</span>
              </div>
              <div className="kanban-cards">
                {columnStories.map(story => {
                  const priorityInfo = getPriorityInfo(story.priority);
                  const assignee = getMember(story.assigneeId);

                  return (
                    <div
                      key={story.id}
                      className="kanban-card glass-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, story.id)}
                      onClick={() => setSelectedStory(story)}
                    >
                      <div className="kanban-card-header flex items-center justify-between">
                        <span className="text-xs text-muted">{story.key}</span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="priority-dot"
                            style={{ background: priorityInfo.color }}
                            title={priorityInfo.label}
                          ></div>
                          <button
                            className="btn btn-ghost p-1 text-muted hover:text-red-400"
                            onClick={(e) => handleDeleteStory(e, story.id, story.title)}
                            title="Delete Story"
                            style={{ padding: '2px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium" style={{ marginBottom: '0.5rem' }}>{story.title}</p>
                      <div className="kanban-card-footer">
                        <div className="flex items-center gap-2">
                          <span className="priority-label" style={{ color: priorityInfo.color }}>
                            {priorityInfo.label}
                          </span>
                          {story.dueDate && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <CalendarIcon size={12} /> {new Date(story.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {assignee ? (
                          <div className="avatar-circle" style={{ width: '24px', height: '24px', fontSize: '0.75rem' }} title={`Assigned to ${assignee.name}`}>
                            {assignee.name[0]}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Story Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold text-lg">Create User Story</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateStory} className="auth-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="As a user, I want to…"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="Describe the user story…"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="flex gap-4">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Assignee</label>
                  <select
                    className="form-input"
                    value={form.assigneeId}
                    onChange={e => setForm(prev => ({ ...prev, assigneeId: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.name} ({m.email})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={form.priority}
                    onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline / Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dueDate}
                  onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Detail Slide-out */}
      {selectedStory && (
        <div className="slideout-overlay" onClick={() => setSelectedStory(null)}>
          <div className="slideout glass-panel" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
            <div className="slideout-header">
              <div>
                <span className="text-xs text-muted">{selectedStory.key}</span>
                <h3 className="font-semibold text-lg">{selectedStory.title}</h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedStory(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="slideout-body">
              {/* Status, Priority & Assignee Controls */}
              <div className="flex gap-3 mb-3 flex-wrap">
                <div className="form-group" style={{ flex: 1, minWidth: '130px' }}>
                  <label className="form-label">Status</label>
                  <select
                    className="form-input text-xs"
                    value={selectedStory.status}
                    onChange={(e) => {
                      handleStatusChange(selectedStory.id, e.target.value);
                      setSelectedStory({ ...selectedStory, status: e.target.value });
                    }}
                  >
                    {STATUSES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '130px' }}>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input text-xs"
                    value={selectedStory.priority || 'medium'}
                    onChange={(e) => handlePriorityChange(selectedStory.id, e.target.value)}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '140px' }}>
                  <label className="form-label">Assignee</label>
                  <select
                    className="form-input text-xs"
                    value={selectedStory.assigneeId || ''}
                    onChange={(e) => handleAssigneeChange(selectedStory.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Deadline / Due Date</label>
                <input
                  type="date"
                  className="form-input text-xs"
                  value={selectedStory.dueDate ? new Date(selectedStory.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDueDateChange(selectedStory.id, e.target.value)}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input text-xs"
                  rows={3}
                  placeholder="Add a detailed description for this story…"
                  value={selectedStory.description || ''}
                  onChange={(e) => handleDescriptionChange(selectedStory.id, e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Sub-Tasks Section */}
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckSquare size={16} /> Sub-Tasks ({storyTasks.length})
                  </h4>
                </div>

                {/* Sub-task List with Priority, Assignee & Due Date updation */}
                <div className="flex flex-col gap-2.5 mb-4">
                  {storyTasks.map(task => {
                    return (
                      <div key={task.id} className="task-row-compact flex flex-col gap-1.5 p-2 rounded glass-panel">
                        <div className="flex items-center gap-2" style={{ flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={task.status === 'done'}
                            onChange={() => handleTaskStatusToggle(task.id, task.status)}
                            className="task-checkbox"
                          />
                          <span className={`text-sm font-medium ${task.status === 'done' ? 'task-done' : ''}`} style={{ flex: 1 }}>
                            {task.title}
                          </span>
                          <button
                            className="btn btn-ghost p-1 text-muted hover:text-red-400"
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            title="Delete Task"
                            style={{ padding: '2px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {/* Task Priority, Assignee, Due Date inline row */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <select
                            className="form-input text-xs p-1"
                            value={task.priority || 'medium'}
                            onChange={(e) => handleTaskUpdate(task.id, { priority: e.target.value })}
                            style={{ width: '90px' }}
                          >
                            {PRIORITIES.map(p => (
                              <option key={p.key} value={p.key}>{p.label}</option>
                            ))}
                          </select>

                          <select
                            className="form-input text-xs p-1"
                            value={task.assigneeId || ''}
                            onChange={(e) => handleTaskUpdate(task.id, { assigneeId: e.target.value || null })}
                            style={{ flex: 1, minWidth: '110px' }}
                          >
                            <option value="">Unassigned</option>
                            {members.map(m => (
                              <option key={m.userId} value={m.userId}>{m.name}</option>
                            ))}
                          </select>

                          <input
                            type="date"
                            className="form-input text-xs p-1"
                            value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleTaskUpdate(task.id, { dueDate: e.target.value || null })}
                            style={{ width: '120px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Sub-task Form */}
                <form onSubmit={handleAddTask} className="flex flex-col gap-2">
                  <input
                    type="text"
                    className="form-input text-xs"
                    placeholder="Add a sub-task title…"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      className="form-input text-xs"
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value)}
                      style={{ width: '90px' }}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                    <select
                      className="form-input text-xs"
                      value={newTaskAssignee}
                      onChange={e => setNewTaskAssignee(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Assign sub-task to…</option>
                      {members.map(m => (
                        <option key={m.userId} value={m.userId}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="form-input text-xs"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-secondary text-xs" disabled={addingTask}>
                      <Plus size={14} /> Add Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBoard;
