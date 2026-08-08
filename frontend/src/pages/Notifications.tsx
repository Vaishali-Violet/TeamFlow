import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api';
import { Bell, CheckCheck, Clock, AlertTriangle, UserPlus, CheckCircle2 } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi.list()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await handleMarkRead(notif.id);
    }

    // Redirect to the appropriate screen
    if (notif.relatedType === 'story') {
      navigate('/projects');
    } else if (notif.relatedType === 'task' || notif.type.includes('task')) {
      navigate('/my-work');
    } else if (notif.type === 'member_added') {
      navigate('/team');
    } else {
      navigate('/dashboard');
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    task_assigned: <UserPlus size={16} style={{ color: '#60a5fa' }} />,
    task_overdue: <AlertTriangle size={16} style={{ color: '#ef4444' }} />,
    story_updated: <CheckCircle2 size={16} style={{ color: '#34d399' }} />,
    member_added: <UserPlus size={16} style={{ color: '#a78bfa' }} />,
    deadline_reminder: <Clock size={16} style={{ color: '#f59e0b' }} />,
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return <div className="loading-state">Loading notifications…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={handleMarkAllRead}>
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state glass-panel">
          <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 className="font-semibold text-lg" style={{ marginBottom: '0.5rem' }}>No notifications</h3>
          <p className="text-secondary text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`notification-row glass-card ${!notif.isRead ? 'notification-unread' : ''}`}
              onClick={() => handleNotificationClick(notif)}
              style={{ cursor: 'pointer' }}
            >
              <div className="notification-icon">
                {typeIcons[notif.type] || <Bell size={16} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-medium text-sm">{notif.title}</div>
                <div className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>{notif.message}</div>
                <div className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
                  {new Date(notif.createdAt).toLocaleString()}
                </div>
              </div>
              {!notif.isRead && (
                <div className="notification-unread-dot"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
