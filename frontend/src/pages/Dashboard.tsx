import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectApi, taskApi } from '../api';
import { TrendingUp, FolderKanban, CheckSquare, BarChart3 } from 'lucide-react';

const Dashboard = () => {
  const { user, currentWorkspace } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }

    Promise.all([
      projectApi.stats(currentWorkspace.id).catch(() => null),
      taskApi.myWork().catch(() => []),
    ]).then(([statsData, tasksData]) => {
      setStats(statsData);
      setMyTasks(tasksData.slice(0, 5)); // Show top 5
    }).finally(() => setLoading(false));
  }, [currentWorkspace]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleTaskStatusChange = async (taskId: string, done: boolean) => {
    try {
      await taskApi.updateStatus(taskId, done ? 'done' : 'todo');
      setMyTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: done ? 'done' : 'todo' } : t
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors: Record<string, string> = {
    todo: 'status-todo',
    in_progress: 'status-progress',
    blocked: 'status-blocked',
    done: 'status-done',
  };

  if (loading) {
    return <div className="loading-state">Loading dashboard…</div>;
  }

  if (!currentWorkspace) {
    return (
      <div className="empty-state glass-panel">
        <FolderKanban size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h3 className="font-semibold text-lg" style={{ marginBottom: '0.5rem' }}>No workspace selected</h3>
        <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>Create or select a workspace to get started</p>
        <button className="btn btn-primary" onClick={() => navigate('/workspace-setup')}>
          Set up Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{getGreeting()}, {user?.name?.split(' ')[0] || 'User'}</h2>
        <div className="text-sm text-secondary">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
            <FolderKanban size={20} style={{ color: '#818cf8' }} />
          </div>
          <span className="text-sm font-medium text-secondary">Active Projects</span>
          <span className="text-3xl font-bold">{stats?.activeProjects || 0}</span>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <BarChart3 size={20} style={{ color: '#60a5fa' }} />
          </div>
          <span className="text-sm font-medium text-secondary">Open Stories</span>
          <span className="text-3xl font-bold">{stats?.openStories || 0}</span>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
            <CheckSquare size={20} style={{ color: '#a78bfa' }} />
          </div>
          <span className="text-sm font-medium text-secondary">My Tasks</span>
          <span className="text-3xl font-bold">{myTasks.length}</span>
        </div>
        <div className="glass-card kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <TrendingUp size={20} style={{ color: '#34d399' }} />
          </div>
          <span className="text-sm font-medium text-secondary">Completion Rate</span>
          <span className="text-3xl font-bold">{stats?.completionRate || 0}%</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* My Work */}
        <div className="dashboard-main">
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3 className="font-semibold text-lg">My Work</h3>
              <button className="text-sm text-accent" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/my-work')}>
                View all
              </button>
            </div>
            {myTasks.length === 0 ? (
              <p className="text-sm text-secondary" style={{ padding: '1rem 0' }}>No tasks assigned. Create some stories and tasks to get started!</p>
            ) : (
              <div className="flex flex-col gap-2">
                {myTasks.map(task => (
                  <div key={task.id} className="task-row-compact">
                    <div className="flex items-center gap-3" style={{ flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={(e) => handleTaskStatusChange(task.id, e.target.checked)}
                        className="task-checkbox"
                      />
                      <div>
                        <div className={`font-medium text-sm ${task.status === 'done' ? 'task-done' : ''}`}>
                          {task.title}
                        </div>
                        <div className="text-xs text-secondary">{task.storyKey}</div>
                      </div>
                    </div>
                    <span className={`status-badge ${statusColors[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Projects sidebar */}
        <div className="dashboard-side">
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3 className="font-semibold text-lg">Projects</h3>
              <button className="text-sm text-accent" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/projects')}>
                View all
              </button>
            </div>
            {stats?.projects?.length === 0 ? (
              <p className="text-sm text-secondary" style={{ padding: '1rem 0' }}>No projects yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {stats?.projects?.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="project-row"
                    onClick={() => navigate(`/projects/${proj.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="project-key-badge-sm">{proj.key}</div>
                      <span className="text-sm font-medium">{proj.name}</span>
                    </div>
                    <span className={`status-badge ${
                      proj.status === 'active' ? 'status-progress' :
                      proj.status === 'completed' ? 'status-done' :
                      'status-todo'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {proj.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
