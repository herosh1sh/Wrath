import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { ChevronRight, ChevronDown, Plus, Search, Star, Trash2, MoreHorizontal, Settings, LogOut, Menu, X, Home, FileText, Tag, Clock, HelpCircle } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Dropdown, DropdownItem, DropdownSeparator } from './ui/Dropdown';
import { Modal, ModalContent, ModalFooter } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import Tooltip from './ui/Tooltip';

export default function Sidebar() {
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace, deleteWorkspace, refetch: refetchWorkspaces } = useWorkspace();
  const { user, logout, api: authApi } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [pageTree, setPageTree] = useState([]);
  const [expandedPages, setExpandedPages] = useState(new Set());
  const [loadingTree, setLoadingTree] = useState(true);
  const searchRef = useRef(null);

  // Fetch page tree
  useEffect(() => {
    if (!currentWorkspace) return;
    const fetchTree = async () => {
      try {
        const data = await api(`/pages/tree/${currentWorkspace.id}`);
        setPageTree(data.tree);
      } catch (err) {
        console.error('Failed to fetch page tree:', err);
      } finally {
        setLoadingTree(false);
      }
    };
    fetchTree();
  }, [currentWorkspace]);

  const togglePageExpand = (pageId) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const handleCreatePage = async (parentId = null) => {
    try {
      const data = await api('/pages', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          parentId,
          title: 'Без названия',
        }),
      });
      // Refresh tree
      const treeData = await api(`/pages/tree/${currentWorkspace.id}`);
      setPageTree(treeData.tree);
      // Navigate to new page
      window.location.href = `/workspace/${data.page.id}`;
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteWorkspace(deleteConfirm);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    }
  };

  const renderPageNode = (page, depth = 0) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedPages.has(page.id);
    const isActive = location.pathname === `/workspace/${page.id}`;

    return (
      <div key={page.id}>
        <NavLink
          to={`/workspace/${page.id}`}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors duration-fast ${
            isActive
              ? 'bg-muted text-foreground'
              : 'text-foreground-muted hover:bg-muted hover:text-foreground'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          title={page.title}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault();
                togglePageExpand(page.id);
              }}
              className="flex-shrink-0 p-0.5 text-foreground-muted hover:text-foreground"
              aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="flex-shrink-0 w-4" />
          )}
          {page.icon && <span className="flex-shrink-0 text-base">{page.icon}</span>}
          <span className="truncate flex-1">{page.title}</span>
          {!collapsed && hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCreatePage(page.id);
              }}
              className="flex-shrink-0 p-1 text-foreground-muted hover:text-foreground opacity-0 transition-opacity"
              aria-label="Добавить подстраницу"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </NavLink>
        {hasChildren && isExpanded && (
          <div>
            {page.children.map(child => renderPageNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!currentWorkspace) return null;

  return (
    <>
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 h-full border-r border-border bg-surface transition-all duration-base flex flex-col ${
          collapsed ? 'w-16' : 'w-72'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        aria-label="Навигация боковой панели"
      >
        {/* Workspace header */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden btn-icon text-foreground-muted"
            aria-label="Закрыть боковую панель"
          >
            <X className="h-5 w-5" />
          </button>
          <Link to="/workspace" className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-2xl">{currentWorkspace.icon || '⚔️'}</span>
            {!collapsed && (
              <span className="truncate font-semibold text-foreground">{currentWorkspace.name}</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex-shrink-0 btn-icon text-foreground-muted"
            aria-label={collapsed ? 'Расширить боковую панель' : 'Свернуть боковую панель'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Поиск страниц..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-sm border border-border bg-background text-foreground placeholder:text-foreground-muted focus:border-accent focus:ring-1 focus:ring-accent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = e.target.value;
                    if (query) {
                      window.location.href = `/workspace?search=${encodeURIComponent(query)}`;
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Page tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {!collapsed ? (
            <>
              <div className="mb-2">
                <button
                  onClick={() => handleCreatePage()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted rounded-sm hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span>Новая страница</span>
                </button>
              </div>
              {loadingTree ? (
                <div className="flex items-center justify-center py-8 text-foreground-muted">
                  <div className="h-5 w-5 animate-spin border-2 border-accent border-t-transparent rounded-full" />
                </div>
              ) : (
                pageTree.map(page => renderPageNode(page))
              )}
            </>
          ) : (
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => handleCreatePage()}
                className="btn-icon mx-auto text-foreground-muted hover:text-foreground"
                aria-label="Новая страница"
              >
                <Plus className="h-5 w-5" />
              </button>
            </nav>
          )}
        </div>

        {/* Bottom section */}
        <div className="border-t border-border p-3">
          {!collapsed ? (
            <>
              <div className="mb-3">
                <NavLink
                  to="/workspace/favorites"
                  className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Star className="h-4 w-4 flex-shrink-0" />
                  <span>Избранное</span>
                </NavLink>
              </div>
              <div className="mb-3">
                <NavLink
                  to="/workspace/trash"
                  className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Trash2 className="h-4 w-4 flex-shrink-0" />
                  <span>Корзина</span>
                </NavLink>
              </div>
              <div className="mb-3">
                <NavLink
                  to="/workspace/tags"
                  className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Tag className="h-4 w-4 flex-shrink-0" />
                  <span>Теги</span>
                </NavLink>
              </div>
              <div className="mb-3">
                <NavLink
                  to="/workspace/recent"
                  className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Недавние</span>
                </NavLink>
              </div>
              <Dropdown
                trigger={({ open, onClick }) => (
                  <button
                    onClick={onClick}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Ещё"
                    aria-expanded={open}
                  >
                    <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
                    <span>Ещё</span>
                  </button>
                )}
              >
                <DropdownItem onClick={() => window.location.href = '/settings'}>
                  <Settings className="h-4 w-4" />
                  Настройки
                </DropdownItem>
                <DropdownItem onClick={() => window.location.href = '/help'}>
                  <HelpCircle className="h-4 w-4" />
                  Помощь
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onClick={logout} variant="destructive">
                  <LogOut className="h-4 w-4" />
                  Выйти
                </DropdownItem>
              </Dropdown>
            </>
          ) : (
            <nav className="flex flex-col gap-1">
              <Tooltip content="Избранное" position="right">
                <NavLink to="/workspace/favorites" className="btn-icon mx-auto text-foreground-muted hover:text-foreground">
                  <Star className="h-5 w-5" />
                </NavLink>
              </Tooltip>
              <Tooltip content="Корзина" position="right">
                <NavLink to="/workspace/trash" className="btn-icon mx-auto text-foreground-muted hover:text-foreground">
                  <Trash2 className="h-5 w-5" />
                </NavLink>
              </Tooltip>
              <Tooltip content="Теги" position="right">
                <NavLink to="/workspace/tags" className="btn-icon mx-auto text-foreground-muted hover:text-foreground">
                  <Tag className="h-5 w-5" />
                </NavLink>
              </Tooltip>
              <Tooltip content="Недавние" position="right">
                <NavLink to="/workspace/recent" className="btn-icon mx-auto text-foreground-muted hover:text-foreground">
                  <Clock className="h-5 w-5" />
                </NavLink>
              </Tooltip>
              <Tooltip content="Настройки" position="right">
                <NavLink to="/settings" className="btn-icon mx-auto text-foreground-muted hover:text-foreground">
                  <Settings className="h-5 w-5" />
                </NavLink>
              </Tooltip>
            </nav>
          )}

          {/* User avatar */}
          {!collapsed && user && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-foreground-muted truncate">{user.username}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Create workspace modal */}
      <Modal
        isOpen={showCreateWorkspace}
        onClose={() => { setShowCreateWorkspace(false); setNewWorkspaceName(''); }}
        title="Создать рабочее пространство"
        description="Создайте новое рабочее пространство для вашей команды или проекта."
      >
        <ModalContent>
          <Input
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Название рабочего пространства"
            autoFocus
          />
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setShowCreateWorkspace(false); setNewWorkspaceName(''); }}>
            Отмена
          </Button>
          <Button
            onClick={async () => {
              if (!newWorkspaceName.trim()) return;
              try {
                await createWorkspace({ name: newWorkspaceName.trim() });
                setShowCreateWorkspace(false);
                setNewWorkspaceName('');
              } catch (err) {
                console.error('Failed to create workspace:', err);
              }
            }}
          >
            Создать
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete workspace confirmation modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Удалить рабочее пространство"
        description="Это действие нельзя отменить. Все страницы и данные будут безвозвратно удалены."
      >
        <ModalContent>
          <p className="text-sm text-foreground-muted">Введите название рабочего пространства для подтверждения:</p>
          <Input
            placeholder="Название рабочего пространства"
            onChange={(e) => setDeleteConfirm(e.target.value)}
            value={deleteConfirm || ''}
          />
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={deleteConfirm !== currentWorkspace?.name}>
            Удалить рабочее пространство
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}