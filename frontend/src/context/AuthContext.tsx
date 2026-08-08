import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, workspaceApi } from '../api';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  timezone?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);

  const setCurrentWorkspace = (ws: Workspace) => {
    setCurrentWorkspaceState(ws);
    localStorage.setItem('currentWorkspaceId', ws.id);
  };

  const refreshWorkspaces = useCallback(async () => {
    try {
      const wsList = await workspaceApi.list();
      setWorkspaces(wsList);

      // Restore last workspace from localStorage
      const savedId = localStorage.getItem('currentWorkspaceId');
      const saved = wsList.find((w: Workspace) => w.id === savedId);
      if (saved) {
        setCurrentWorkspaceState(saved);
      } else if (wsList.length > 0) {
        setCurrentWorkspaceState(wsList[0]);
        localStorage.setItem('currentWorkspaceId', wsList[0].id);
      }
    } catch {
      setWorkspaces([]);
    }
  }, []);

  useEffect(() => {
    authApi.me()
      .then(async (u) => {
        setUser(u);
        await refreshWorkspaces();
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const handleUnauthorized = () => {
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [refreshWorkspaces]);

  const login = async (email: string, password: string) => {
    const u = await authApi.login({ email, password });
    setUser(u);
    await refreshWorkspaces();
  };

  const register = async (name: string, email: string, password: string) => {
    const u = await authApi.register({ name, email, password });
    setUser(u);
    await refreshWorkspaces();
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspaceState(null);
    localStorage.removeItem('currentWorkspaceId');
  };

  return (
    <AuthContext.Provider value={{
      user, loading, workspaces, currentWorkspace, setCurrentWorkspace,
      login, register, logout, refreshWorkspaces,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
