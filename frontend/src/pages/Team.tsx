import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { workspaceApi } from '../api';
import { UserPlus, Crown, Shield, User, X } from 'lucide-react';

const Team = () => {
  const { currentWorkspace } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!currentWorkspace) return;
    workspaceApi.getMembers(currentWorkspace.id)
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      await workspaceApi.addMember(currentWorkspace.id, { email, role });
      setSuccess(`Successfully added ${email} to the workspace`);
      setEmail('');
      // Refresh members
      const updated = await workspaceApi.getMembers(currentWorkspace.id);
      setMembers(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Crown size={14} style={{ color: '#f59e0b' }} />,
    manager: <Shield size={14} style={{ color: '#60a5fa' }} />,
    member: <User size={14} style={{ color: '#94a3b8' }} />,
  };

  if (loading) {
    return <div className="loading-state">Loading team…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Team</h2>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
          {members.length} member{members.length !== 1 ? 's' : ''} in {currentWorkspace?.name}
        </div>
        <div className="flex flex-col gap-2">
          {members.map(member => (
            <div key={member.userId} className="team-member-row">
              <div className="flex items-center gap-3">
                <div className="member-avatar">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} />
                  ) : (
                    <span>{member.name[0]}</span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">{member.name}</div>
                  <div className="text-xs text-secondary">{member.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {roleIcons[member.role]}
                <span className="text-sm text-secondary" style={{ textTransform: 'capitalize' }}>
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold text-lg">Invite Team Member</h3>
              <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            <form onSubmit={handleInvite} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
