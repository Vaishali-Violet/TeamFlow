import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspaceApi } from '../api';
import { Plus, ArrowRight } from 'lucide-react';

const WorkspaceSetup = () => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshWorkspaces, workspaces, setCurrentWorkspace } = useAuth();
  const navigate = useNavigate();

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ws = await workspaceApi.create({ name, slug });
      await refreshWorkspaces();
      setCurrentWorkspace({ id: ws.id, name: ws.name, slug: ws.slug, role: 'admin' });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const selectExisting = (ws: any) => {
    setCurrentWorkspace(ws);
    navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient"></div>
      <div className="auth-card glass-panel" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <h1 className="auth-title">Set up your workspace</h1>
          <p className="auth-subtitle">A workspace is where your team collaborates on projects</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {workspaces.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 className="text-sm font-semibold" style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Your workspaces
            </h3>
            <div className="flex flex-col gap-2">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  className="workspace-select-btn"
                  onClick={() => selectExisting(ws)}
                >
                  <div className="workspace-avatar">{ws.name[0]}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div className="font-medium text-sm">{ws.name}</div>
                    <div className="text-xs text-secondary">{ws.slug} · {ws.role}</div>
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
            <div className="auth-divider">
              <span>or create a new one</span>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="ws-name">Workspace Name</label>
            <input
              id="ws-name"
              type="text"
              className="form-input"
              placeholder="Acme Corp"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ws-slug">URL Slug</label>
            <input
              id="ws-slug"
              type="text"
              className="form-input"
              placeholder="acme-corp"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            <Plus size={16} />
            {loading ? 'Creating…' : 'Create Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceSetup;
