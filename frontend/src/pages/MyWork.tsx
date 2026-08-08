import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskApi, workspaceApi } from '../api';
import { CheckSquare, UserCheck } from 'lucide-react';

const MyWork = () => {
  const { user, currentWorkspace } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!currentWorkspace) return;

    Promise.all([
      taskApi.myWork(),
      workspaceApi.getMembers(currentWorkspace.id),
    ])
      .then(([taskList, memberList]) => {
        setTasks(taskList);
        setMembers(memberList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // 0ms Optimistic UI Update for zero-lag status change
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await taskApi.updateStatus(taskId, newStatus);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    // If reassigned to someone else, remove from My Work view
    if (updates.assigneeId !== undefined && updates.assigneeId !== user?.id) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }

    try {
      await taskApi.update(taskId, updates);
    } catch (err) {
      console.error(err);
    }
  };

  const priorityColors: Record<string, string> = {
    low: '#94a3b8',
    medium: '#60a5fa',
    high: '#f59e0b',
    urgent: '#ef4444',
  };

  const filteredTasks = tasks.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  if (loading) {
    return <div className="loading-state">Loading your tasks…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Work</h2>
          <p className="text-sm text-secondary">Tasks assigned to you across all projects</p>
        </div>
        <div className="flex items-center gap-2 glass-card p-1">
          {['all', 'todo', 'in_progress', 'done'].map(st => (
            <button
              key={st}
              className={`btn btn-xs ${filterStatus === st ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus(st)}
              style={{ textTransform: 'capitalize' }}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state glass-panel">
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 className="font-semibold text-lg" style={{ marginBottom: '0.5rem' }}>No tasks found</h3>
          <p className="text-secondary text-sm">You have no tasks matching this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTasks.map(task => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

            return (
              <div key={task.id} className="glass-card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3" style={{ flex: 1, minWidth: '220px' }}>
                  <div>
                    <span className="text-xs font-semibold text-indigo-400">{task.key}</span>
                    <div className={`font-medium text-sm ${task.status === 'done' ? 'task-done' : ''}`}>
                      {task.title}
                    </div>
                    <div className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>
                      {task.projectName} · {task.storyTitle}
                    </div>
                  </div>
                </div>

                {/* Interactive Task Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Priority Select */}
                  <div className="flex items-center gap-1.5">
                    <div className="priority-dot" style={{ background: priorityColors[task.priority] || '#94a3b8' }} title={`Priority: ${task.priority}`}></div>
                    <select
                      className="form-input text-xs p-1"
                      value={task.priority || 'medium'}
                      onChange={(e) => handleTaskUpdate(task.id, { priority: e.target.value })}
                      style={{ width: '95px' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    className="form-input text-xs p-1"
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    style={{ width: '120px' }}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>

                  {/* Reassign Selector */}
                  <div className="flex items-center gap-1">
                    <UserCheck size={14} className="text-muted" />
                    <select
                      className="form-input text-xs p-1"
                      value={task.assigneeId || user?.id || ''}
                      onChange={(e) => handleTaskUpdate(task.id, { assigneeId: e.target.value })}
                      style={{ width: '130px' }}
                    >
                      {members.map(m => (
                        <option key={m.userId} value={m.userId}>
                          {m.userId === user?.id ? 'Me' : m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date Picker */}
                  <input
                    type="date"
                    className={`form-input text-xs p-1 ${isOverdue ? 'border-red-500 text-red-400' : ''}`}
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleTaskUpdate(task.id, { dueDate: e.target.value || null })}
                    style={{ width: '130px' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyWork;
