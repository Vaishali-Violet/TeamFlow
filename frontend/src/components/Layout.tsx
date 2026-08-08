import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../api';
import { LayoutDashboard, FolderKanban, CheckSquare, Bell, Users, LogOut, ChevronDown, Calendar, MessageSquare, Sun, Moon, Plus, Check, Building2 } from 'lucide-react';

const Layout = () => {
  const { user, currentWorkspace, workspaces, setCurrentWorkspace, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showWsMenu, setShowWsMenu] = useState(false);
  const wsMenuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('teamflow_theme') as 'dark' | 'light') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('teamflow_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) {
        setShowWsMenu(false);
      }
    };
    if (showWsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWsMenu]);

  useEffect(() => {
    const fetchUnread = () => {
      notificationApi.unreadCount()
        .then(res => setUnreadCount(res.count))
        .catch(() => setUnreadCount(0));
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/50">
            TF
          </div>
          <h1 className="text-xl font-bold tracking-tight">TeamFlow</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1 w-full">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <FolderKanban size={18} /> Projects
          </NavLink>

          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Calendar size={18} /> Calendar
          </NavLink>

          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <MessageSquare size={18} /> Live Chat
          </NavLink>

          <NavLink
            to="/my-work"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <CheckSquare size={18} /> My Work
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-3">
                <Bell size={18} /> Notifications
              </span>
              {unreadCount > 0 && (
                <span className="badge-unread-count">{unreadCount}</span>
              )}
            </div>
          </NavLink>

          <NavLink
            to="/team"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Users size={18} /> Team
          </NavLink>
        </nav>

        {/* User profile & logout */}
        <div className="sidebar-footer">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="avatar-circle">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} />
              ) : (
                user?.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">{user?.name}</span>
              <span className="text-xs text-muted truncate">{user?.email}</span>
            </div>
          </div>
          <button
            className="btn btn-ghost text-muted hover:text-white p-2"
            onClick={handleLogout}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper flex flex-col flex-1 min-w-0">
        {/* Top Navbar Header */}
        <header className="header flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}>
          {/* Left: Workspace Selector */}
          <div className="relative z-50" ref={wsMenuRef}>
            <button
              className="workspace-selector-trigger"
              onClick={() => setShowWsMenu(!showWsMenu)}
            >
              <div className="workspace-trigger-avatar">
                {currentWorkspace?.name ? currentWorkspace.name[0].toUpperCase() : <Building2 size={14} />}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate max-w-[140px]">
                  {currentWorkspace?.name || 'Select Workspace'}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              </div>
              <ChevronDown
                size={15}
                style={{
                  color: 'var(--text-secondary)',
                  transform: showWsMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {showWsMenu && (
              <div className="workspace-dropdown-menu">
                <div className="workspace-dropdown-header">Workspaces</div>
                <div className="workspace-dropdown-list">
                  {workspaces.map((ws) => {
                    const isActive = ws.id === currentWorkspace?.id;
                    return (
                      <button
                        key={ws.id}
                        className={`workspace-dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentWorkspace(ws);
                          setShowWsMenu(false);
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="workspace-item-avatar">
                            {ws.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{ws.name}</span>
                            <span className="text-[11px] text-muted truncate">{ws.slug}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="workspace-role-badge">{ws.role || 'member'}</span>
                          {isActive && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="workspace-dropdown-divider" />
                <button
                  className="workspace-create-btn"
                  onClick={() => {
                    setShowWsMenu(false);
                    navigate('/workspace-setup');
                  }}
                >
                  <div className="workspace-create-icon">
                    <Plus size={13} />
                  </div>
                  <span>Create New Workspace</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Side of Header: Theme Toggle Button */}
          <button
            className="btn btn-secondary flex items-center gap-2 text-xs px-3.5 py-2 font-medium"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}
          >
            {theme === 'dark' ? <Sun size={15} style={{ color: '#e4a31e' }} /> : <Moon size={15} style={{ color: '#4f6e71' }} />}
            <span>{theme === 'dark' ? 'Sunflower Light' : 'Midnight Dark'}</span>
          </button>
        </header>

        {/* Page Content */}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
