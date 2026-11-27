import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { api } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await api('/workspaces');
      setWorkspaces(data.workspaces);
      // Restore last selected workspace
      const saved = localStorage.getItem('currentWorkspaceId');
      if (saved) {
        const ws = data.workspaces.find(w => w.id === saved);
        if (ws) setCurrentWorkspace(ws);
      }
      if (!currentWorkspace && data.workspaces.length > 0) {
        setCurrentWorkspace(data.workspaces[0]);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [api, currentWorkspace]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback((workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspaceId', workspace.id);
  }, []);

  const createWorkspace = useCallback(async (data) => {
    const result = await api('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setWorkspaces(prev => [result.workspace, ...prev]);
    return result.workspace;
  }, [api]);

  const updateWorkspace = useCallback(async (id, data) => {
    const result = await api(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setWorkspaces(prev => prev.map(w => w.id === id ? result.workspace : w));
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(result.workspace);
    }
    return result.workspace;
  }, [api, currentWorkspace]);

  const deleteWorkspace = useCallback(async (id) => {
    await api(`/workspaces/${id}`, { method: 'DELETE' });
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    if (currentWorkspace?.id === id) {
      const remaining = workspaces.find(w => w.id !== id);
      setCurrentWorkspace(remaining || null);
    }
  }, [api, currentWorkspace, workspaces]);

  const value = {
    workspaces,
    currentWorkspace,
    loading,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refetch: fetchWorkspaces,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}