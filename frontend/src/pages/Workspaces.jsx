import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Home, Users, Settings, MoreHorizontal, Search, Grid, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';
import { Tooltip } from '../components/ui/Tooltip';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toaster';
import { formatRelativeTime } from '../lib/utils';

export function Workspaces() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', icon: '📁' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const data = await api.workspaces.list();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      toast.error('Error', 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspace.name.trim()) return;

    setCreating(true);
    try {
      const data = await api.workspaces.create(newWorkspace);
      setWorkspaces(prev => [data.workspace, ...prev]);
      setShowCreateModal(false);
      setNewWorkspace({ name: '', description: '', icon: '📁' });
      toast.success('Workspace created', newWorkspace.name);
      navigate(`/workspaces/${data.workspace.id}`);
    } catch (error) {
      toast.error('Error', 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId, workspaceName) => {
    if (!confirm(`Delete "${workspaceName}"? This cannot be undone.`)) return;

    try {
      await api.workspaces.delete(workspaceId);
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      toast.success('Deleted', `${workspaceName} has been removed`);
    } catch (error) {
      toast.error('Error', 'Failed to delete workspace');
    }
  };

  const workspaceMenuItems = (workspace) => [
    { label: 'Open', icon: <Home className="w-4 h-4" />, onClick: () => navigate(`/workspaces/${workspace.id}`), shortcut: '' },
    { label: 'Settings', icon: <Settings className="w-4 h-4" />, onClick: () => navigate(`/workspaces/${workspace.id}/settings`), shortcut: '' },
    { label: 'Members', icon: <Users className="w-4 h-4" />, onClick: () => navigate(`/workspaces/${workspace.id}/members`), shortcut: '' },
    { type: 'divider' },
    { label: 'Delete', icon: <MoreHorizontal className="w-4 h-4" />, onClick: () => handleDeleteWorkspace(workspace.id, workspace.name), shortcut: '', className: 'text-error' }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground-primary">Workspaces</h1>
            <p className="text-foreground-secondary mt-1">All your workspaces in one place</p>
          </div>
          <Tooltip content="New workspace" position="bottom">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Button>
          </Tooltip>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Workspaces grid/list */}
        {workspaces.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary">
                <Home className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-foreground-primary mb-2">No workspaces yet</h3>
              <p className="text-foreground-secondary mb-6">Create your first workspace to get started</p>
              <Button onClick={() => setShowCreateModal(true)} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {workspaces.map(workspace => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => navigate(`/workspaces/${workspace.id}`)}
                  menuItems={workspaceMenuItems(workspace)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {workspaces.map(workspace => (
                <WorkspaceListItem
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => navigate(`/workspaces/${workspace.id}`)}
                  menuItems={workspaceMenuItems(workspace)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Create workspace modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Workspace"
        description="Give your workspace a name and optional description"
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Name"
            value={newWorkspace.name}
            onChange={(e) => setNewWorkspace(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My Workspace"
            autoFocus
            required
          />
          <Input
            label="Description (optional)"
            value={newWorkspace.description}
            onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
            placeholder="What's this workspace for?"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={creating}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function WorkspaceCard({ workspace, onClick, menuItems }) {
  return (
    <Card className="card-hover h-full cursor-pointer flex flex-col" onClick={onClick}>
      <CardContent className="flex-1 p-4 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{workspace.icon || '📁'}</span>
          <Tooltip content="Options" position="left">
            <Dropdown
              trigger={
                <button className="p-1.5 rounded-lg hover:bg-background-hover text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Workspace options">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              }
              items={menuItems}
              align="right"
            />
          </Tooltip>
        </div>
        <h3 className="font-semibold text-foreground-primary mb-1 truncate">{workspace.name}</h3>
        {workspace.description && (
          <p className="text-sm text-foreground-secondary mb-4 line-clamp-2 flex-1">{workspace.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
          <Badge variant="outline">{workspace.member_count || 1} member{workspace.member_count !== 1 ? 's' : ''}</Badge>
          <span>•</span>
          <span>{formatRelativeTime(workspace.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkspaceListItem({ workspace, onClick, menuItems }) {
  return (
    <Card className="card-hover cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-2xl flex-shrink-0">{workspace.icon || '📁'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground-primary truncate">{workspace.name}</h3>
            {workspace.description && (
              <p className="text-sm text-foreground-secondary truncate mt-0.5">{workspace.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-foreground-tertiary">
            <Badge variant="outline">{workspace.member_count || 1} member{workspace.member_count !== 1 ? 's' : ''}</Badge>
            <span>{formatRelativeTime(workspace.updated_at)}</span>
            <Tooltip content="Options" position="left">
              <Dropdown
                trigger={
                  <button className="p-1.5 rounded-lg hover:bg-background-hover text-foreground-tertiary" aria-label="Workspace options">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                }
                items={menuItems}
                align="right"
              />
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}