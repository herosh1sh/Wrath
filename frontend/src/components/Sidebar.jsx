import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Star, Tag, Archive, Settings, Home, Search, Folder, FileText, MoreHorizontal, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';
import { Tooltip } from './ui/Tooltip';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ICONS } from '../lib/utils';

function Sidebar({ isOpen, onClose, workspaceId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPages, setExpandedPages] = useState({});
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageParent, setNewPageParent] = useState(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  const sidebarRef = useRef(null);

  // Fetch pages for workspace
  useEffect(() => {
    if (!workspaceId) return;
    fetchPages();
  }, [workspaceId]);

  const fetchPages = async () => {
    try {
      const data = await api.pages.list(workspaceId);
      setPages(data.pages || []);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    try {
      const data = await api.pages.create({
        workspaceId,
        parentId: newPageParent,
        title: newPageTitle.trim(),
        icon: '📄'
      });
      setPages(prev => [...prev, data.page]);
      setShowCreatePage(false);
      setNewPageTitle('');
      setNewPageParent(null);
      navigate(`/pages/${data.page.id}`);
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const togglePageExpand = (pageId) => {
    setExpandedPages(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
    }));
  };

  const getPageIcon = (icon) => {
    if (!icon) return <FileText className="w-5 h-5" />;
    if (icon.length === 1 || icon.length === 2) return <span className="text-base">{icon}</span>;
    const IconComponent = icon;
    return <IconComponent className="w-5 h-5" />;
  };

  const renderPageTree = (pages, depth = 0) => {
    return pages.map(page => {
      const hasChildren = page.children && page.children.length > 0;
      const isExpanded = expandedPages[page.id];
      const isActive = location.pathname === `/pages/${page.id}` || location.pathname.startsWith(`/pages/${page.id}/`);

      return (
        <div key={page.id}>
          <div className="flex items-center gap-1">
            {depth > 0 && <span className={cn('w-4', collapsed && 'w-0')} />}

            <NavLink
              to={`/pages/${page.id}`}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
                'hover:bg-background-hover',
                isActive && 'bg-primary-light text-primary font-medium',
                !isActive && 'text-foreground-secondary hover:text-foreground-primary',
                collapsed && 'justify-center'
              )}
              title={collapsed ? page.title : undefined}
              onClick={onClose}
            >
              {getPageIcon(page.icon)}
              {!collapsed && (
                <span className="truncate flex-1">{page.title || 'Untitled'}</span>
              )}
            </NavLink>

            {!collapsed && hasChildren && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePageExpand(page.id);
                }}
                className={cn(
                  'p-1 rounded hover:bg-background-hover text-foreground-tertiary transition-colors',
                  isActive && 'text-primary'
                )}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                aria-expanded={isExpanded}
              >
                <ChevronRight className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
              </button>
            )}

            {!collapsed && (
              <Tooltip content="More options" position="right">
                <Dropdown
                  trigger={
                    <button className="p-1 rounded hover:bg-background-hover text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Page options">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  }
                  items={[
                    { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: () => {}, shortcut: '' },
                    { label: 'Duplicate', icon: <FileText className="w-4 h-4" />, onClick: () => {}, shortcut: '' },
                    { label: 'Delete', icon: <FileText className="w-4 h-4" />, onClick: () => {}, shortcut: '' },
                  ]}
                />
              </Tooltip>
            )}
          </div>

          {!collapsed && hasChildren && isExpanded && (
            <div className="ml-6 mt-1 border-l border-border-light pl-2">
              {renderPageTree(page.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!workspaceId) {
    return (
      <aside className={cn('sidebar fixed inset-y-0 left-0 z-40 transition-all duration-300', isOpen ? 'w-64' : 'w-0')}>
        <div className="flex flex-col h-full bg-background-secondary border-r border-border-light">
          <div className="p-4 border-b border-border-light">
            <p className="text-sm text-foreground-tertiary">Select a workspace</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'sidebar fixed inset-y-0 left-0 z-40 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-[260px]',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex flex-col h-full bg-background-secondary border-r border-border-light">
        {/* Workspace header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          {!collapsed && (
            <Link to={`/workspaces/${workspaceId}`} className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">📁</span>
              <span className="font-medium text-foreground-primary truncate">Workspace</span>
            </Link>
          )}
          <div className="flex items-center gap-1">
            <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-lg hover:bg-background-hover transition-colors"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <GripVertical className="w-5 h-5 text-foreground-tertiary" />
              </button>
            </Tooltip>
            {!collapsed && (
              <Tooltip content="Workspace options" position="left">
                <Dropdown
                  trigger={
                    <button className="p-1.5 rounded-lg hover:bg-background-hover transition-colors" aria-label="Workspace options">
                      <MoreHorizontal className="w-5 h-5 text-foreground-tertiary" />
                    </button>
                  }
                  items={[
                    { label: 'Settings', icon: <Settings className="w-4 h-4" />, onClick: () => navigate(`/workspaces/${workspaceId}/settings`), shortcut: '' },
                    { label: 'Members', icon: <Settings className="w-4 h-4" />, onClick: () => navigate(`/workspaces/${workspaceId}/members`), shortcut: '' },
                    { type: 'divider' },
                    { label: 'Leave workspace', icon: <Settings className="w-4 h-4" />, onClick: () => {}, shortcut: '' },
                  ]}
                  align="right"
                />
              </Tooltip>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Favorites */}
          <NavLink
            to={`/workspaces/${workspaceId}/favorites`}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
              'hover:bg-background-hover',
              location.pathname === `/workspaces/${workspaceId}/favorites` ? 'bg-primary-light text-primary font-medium' : 'text-foreground-secondary hover:text-foreground-primary',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Favorites' : undefined}
            onClick={onClose}
          >
            <Star className="w-5 h-5" />
            {!collapsed && <span>Favorites</span>}
          </NavLink>

          {/* Tags */}
          <NavLink
            to={`/workspaces/${workspaceId}/tags`}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
              'hover:bg-background-hover',
              location.pathname === `/workspaces/${workspaceId}/tags` ? 'bg-primary-light text-primary font-medium' : 'text-foreground-secondary hover:text-foreground-primary',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Tags' : undefined}
            onClick={onClose}
          >
            <Tag className="w-5 h-5" />
            {!collapsed && <span>Tags</span>}
          </NavLink>

          {/* Archive */}
          <NavLink
            to={`/workspaces/${workspaceId}/archive`}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
              'hover:bg-background-hover',
              location.pathname === `/workspaces/${workspaceId}/archive` ? 'bg-primary-light text-primary font-medium' : 'text-foreground-secondary hover:text-foreground-primary',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Archive' : undefined}
            onClick={onClose}
          >
            <Archive className="w-5 h-5" />
            {!collapsed && <span>Archive</span>}
          </NavLink>

          {/* Pages section */}
          {!collapsed && (
            <>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Pages</span>
                <Tooltip content="New page" position="right">
                  <button
                    onClick={() => setShowCreatePage(true)}
                    className="p-1.5 rounded-lg hover:bg-background-hover text-foreground-tertiary transition-colors"
                    aria-label="New page"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              {loading ? (
                <div className="px-2 py-4 text-center text-foreground-tertiary text-sm">
                  Loading pages...
                </div>
              ) : pages.length === 0 ? (
                <div className="px-2 py-4 text-center text-foreground-tertiary text-sm">
                  No pages yet. Create one to get started!
                </div>
              ) : (
                <div className="space-y-1">
                  {renderPageTree(pages)}
                </div>
              )}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border-light">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Avatar size="sm" name={user?.displayName || user?.username} src={user?.avatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary truncate">
                  {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-foreground-tertiary truncate">
                  @{user?.username}
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <Avatar size="sm" name={user?.displayName || user?.username} src={user?.avatarUrl} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && !collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Create page modal */}
      {showCreatePage && !collapsed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-background-primary border border-border-light rounded-xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="p-4 border-b border-border-light flex items-center justify-between">
              <h3 className="font-semibold text-foreground-primary">New Page</h3>
              <button
                onClick={() => { setShowCreatePage(false); setNewPageTitle(''); }}
                className="p-1 rounded-lg hover:bg-background-hover text-foreground-tertiary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePage} className="p-4 space-y-4">
              <Input
                label="Title"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="Page title"
                autoFocus
              />
              <Input
                label="Parent page (optional)"
                type="search"
                placeholder="Search for parent page..."
                value={newPageParent ? pages.find(p => p.id === newPageParent)?.title || '' : ''}
                readOnly
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => { setShowCreatePage(false); setNewPageTitle(''); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

export { Sidebar };