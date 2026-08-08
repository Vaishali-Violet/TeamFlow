import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectApi } from '../api';
import { Plus, FolderKanban, ArrowRight, X, Edit3, Trash2 } from 'lucide-react';

const Projects = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', key: '', description: '', status: 'active' });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentWorkspace) return;
    projectApi.listByWorkspace(currentWorkspace.id)
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const handleNameChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      name: val,
      key: val.toUpperCase().replace(/\s+/g, '').slice(0, 6),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setCreating(true);
    setError('');
    try {
      const project = await projectApi.create({
        workspaceId: currentWorkspace.id,
        name: form.name,
        key: form.key,
        description: form.description,
      });
      setProjects(prev => [...prev, project]);
      setShowCreate(false);
      setForm({ name: '', key: '', description: '', status: 'active' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setUpdating(true);
    setError('');
    try {
      const updated = await projectApi.update(editingProject.id, {
        name: form.name,
        description: form.description,
        status: form.status,
      });
      setProjects(prev => prev.map(p => p.id === editingProject.id ? updated : p));
      setEditingProject(null);
      setForm({ name: '', key: '', description: '', status: 'active' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"? This will delete all associated stories and tasks.`)) {
      return;
    }
    try {
      await projectApi.delete(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setEditingProject(project);
    setForm({
      name: project.name,
      key: project.key,
      description: project.description || '',
      status: project.status || 'active',
    });
  };

  const statusColors: Record<string, string> = {
    planning: 'status-todo',
    active: 'status-progress',
    paused: 'status-blocked',
    completed: 'status-done',
    archived: 'status-todo',
  };

  if (loading) {
    return <div className="loading-state">Loading projects…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state glass-panel">
          <FolderKanban size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 className="font-semibold text-lg" style={{ marginBottom: '0.5rem' }}>No projects yet</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
            Create your first project to start tracking work
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(project => (
            <div
              key={project.id}
              className="glass-card project-card relative group"
              onClick={() => navigate(`/projects/${project.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="project-card-header flex items-center justify-between">
                <div className="project-key-badge">{project.key}</div>
                <div className="flex items-center gap-2">
                  <span className={`status-badge ${statusColors[project.status] || 'status-todo'}`}>
                    {project.status}
                  </span>
                  <button
                    className="btn btn-ghost p-1 text-secondary hover:text-white"
                    onClick={(e) => startEdit(e, project)}
                    title="Edit Project"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="btn btn-ghost p-1 text-danger hover:text-red-400"
                    onClick={(e) => handleDelete(e, project.id, project.name)}
                    title="Delete Project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold mt-2" style={{ marginBottom: '0.5rem' }}>{project.name}</h3>
              {project.description && (
                <p className="text-sm text-secondary" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>{project.description}</p>
              )}
              <div className="project-card-footer mt-4 flex items-center justify-between">
                <span className="text-xs text-muted">Click to view Kanban board</span>
                <ArrowRight size={14} style={{ color: 'var(--accent-primary)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold text-lg">Create Project</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleCreate} className="auth-form">
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Website Redesign"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Key</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="WEB"
                  value={form.key}
                  onChange={e => setForm(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                  required
                  maxLength={6}
                />
                <span className="text-xs text-muted">Used to prefix story IDs (e.g., WEB-1)</span>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="Brief project description…"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="modal-overlay" onClick={() => setEditingProject(null)}>
          <div className="modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold text-lg">Edit Project ({editingProject.key})</h3>
              <button className="btn btn-ghost" onClick={() => setEditingProject(null)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleUpdate} className="auth-form">
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProject(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
