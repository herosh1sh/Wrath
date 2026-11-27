import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Command, Sun, Moon, Monitor, Bell, MoreVertical, ChevronDown, User, Settings, LogOut, Plus, X, Home, Star, Tag, Clock } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel } from './ui/Dropdown';
import { Modal, ModalContent, ModalFooter } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import Tooltip from './ui/Tooltip';
import Avatar from './ui/Avatar';

export default function Header() {
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, toggleTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandResults, setCommandResults] = useState([]);
  const commandInputRef = useRef(null);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => commandInputRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [commandPaletteOpen]);

  // Search for command palette
  useEffect(() => {
    if (!commandQuery.trim() || !currentWorkspace) {
      setCommandResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await fetch(`/api/search/quick?q=${encodeURIComponent(commandQuery)}&workspaceId=${currentWorkspace.id}&limit=8`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }).then(r => r.json());
        setCommandResults(data.results || []);
      } catch (err) {
        console.error('Command palette search failed:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [commandQuery, currentWorkspace]);

  const handleCreatePage = () => {
    navigate('/workspace/new');
  };

  const handleCommandSelect = (result) => {
    navigate(`/workspace/${result.pageId}`);
    setCommandPaletteOpen(false);
    setCommandQuery('');
  };

  if (!currentWorkspace) return null;

  return (
    <>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-surface/80 backdrop-blur-sm px-4 py-3 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden btn-icon text-foreground-muted"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Workspace switcher */}
        <Dropdown
          trigger={({ open, onClick }) => (
            <button
              onClick={onClick}
              className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium text-foreground hover:bg-muted transition-colors"
              aria-label="Переключить рабочее пространство"
              aria-expanded={open}
            >
              <span className="text-xl">{currentWorkspace.icon || '⚔️'}</span>
              <span className="truncate max-w-[150px]">{currentWorkspace.name}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        >
          {workspaces.map(ws => (
            <DropdownItem
              key={ws.id}
              onClick={() => switchWorkspace(ws)}
              icon={ws.id === currentWorkspace.id ? <span className="h-4 w-4 text-accent">✓</span> : undefined}
            >
              <span className="flex items-center gap-2">
                <span>{ws.icon || '⚔️'}</span>
                <span>{ws.name}</span>
              </span>
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <DropdownItem onClick={() => { setShowCreateWorkspace(true); }}>
            <Plus className="h-4 w-4" />
            Создать новое рабочее пространство
          </DropdownItem>
        </Dropdown>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Command palette trigger / Search */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 w-full max-w-md px-4 py-2 rounded-sm text-sm text-foreground-muted bg-muted hover:bg-muted-foreground/10 transition-colors"
            aria-label="Поиск или переход к странице (⌘K)"
          >
            <Command className="h-4 w-4" />
            <span>Поиск страниц...</span>
            <kbd className="px-1.5 py-0.5 text-xs font-mono text-foreground-muted bg-background rounded-sm border border-border">⌘K</kbd>
          </button>
        </div>

        {/* Theme toggle */}
        <Tooltip content={resolvedTheme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'} position="bottom">
          <button
            onClick={toggleTheme}
            className="btn-icon text-foreground-muted hover:text-foreground"
            aria-label={resolvedTheme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </Tooltip>

        {/* Notifications */}
        <Tooltip content="Уведомления" position="bottom">
          <button className="btn-icon text-foreground-muted hover:text-foreground relative" aria-label="Уведомления">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </button>
        </Tooltip>

        {/* User menu */}
        <Dropdown
          trigger={({ open, onClick }) => (
            <button
              onClick={onClick}
              className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-muted transition-colors"
              aria-label="Меню пользователя"
              aria-expanded={open}
            >
              <Avatar src={user?.avatar_url} fallback={user?.name?.charAt(0)} size="sm" />
              {!mobileMenuOpen && <span className="hidden sm:block text-sm font-medium">{user?.name}</span>}
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        >
          <DropdownLabel>{user?.username}</DropdownLabel>
          <DropdownSeparator />
          <DropdownItem onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
            Настройки
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={logout} variant="destructive">
            <LogOut className="h-4 w-4" />
            Выйти
          </DropdownItem>
        </Dropdown>
      </header>

      {/* Mobile sidebar menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 border-l border-border bg-surface lg:hidden transform transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold">Меню</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="btn-icon text-foreground-muted"
              aria-label="Закрыть меню"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <Link
              to="/workspace"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
            >
              <Home className="h-5 w-5" />
              Главная
            </Link>
            <Link
              to="/workspace/favorites"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
            >
              <Star className="h-5 w-5" />
              Избранное
            </Link>
            <Link
              to="/workspace/trash"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
            >
              <Trash2 className="h-5 w-5" />
              Корзина
            </Link>
            <Link
              to="/workspace/tags"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
            >
              <Tag className="h-5 w-5" />
              Теги
            </Link>
            <Link
              to="/workspace/recent"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
            >
              <Clock className="h-5 w-5" />
              Недавние
            </Link>
            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="h-5 w-5" />
              Настройки
            </Link>
          </nav>
          <div className="border-t border-border p-4">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => setCommandPaletteOpen(false)}>
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-xl animate-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Command className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
              <input
                ref={commandInputRef}
                type="text"
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Поиск страниц, создать новую... (⌘K для закрытия)"
                className="w-full pl-12 pr-4 py-3 text-base bg-transparent focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commandResults[0]) {
                    handleCommandSelect(commandResults[0]);
                  }
                  if (e.key === 'Escape') {
                    setCommandPaletteOpen(false);
                  }
                }}
              />
            </div>
            <div className="border-t border-border max-h-96 overflow-y-auto">
              {commandQuery.trim() ? (
                <>
                  {commandResults.length > 0 && (
                    <>
                      <DropdownLabel className="p-3">Результаты</DropdownLabel>
                      {commandResults.map(result => (
                        <button
                          key={result.pageId}
                          onClick={() => handleCommandSelect(result)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        >
                          {result.icon && <span className="text-base">{result.icon}</span>}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.title}</p>
                            <p className="text-xs text-foreground-muted truncate">{result.workspaceId}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  <DropdownSeparator />
                  <button
                    onClick={() => {
                      navigate('/workspace/new');
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4 text-accent" />
                    <span>Создать новую страницу: "{commandQuery}"</span>
                  </button>
                </>
              ) : (
                <div className="p-6 text-center text-foreground-muted">
                  <Command className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Нажмите ⌘K для поиска страниц или создания новой</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newWorkspaceName.trim()) {
                createWorkspace({ name: newWorkspaceName.trim() });
                setShowCreateWorkspace(false);
                setNewWorkspaceName('');
              }
            }}
          />
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setShowCreateWorkspace(false); setNewWorkspaceName(''); }}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              if (!newWorkspaceName.trim()) return;
              createWorkspace({ name: newWorkspaceName.trim() });
              setShowCreateWorkspace(false);
              setNewWorkspaceName('');
            }}
          >
            Создать
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}