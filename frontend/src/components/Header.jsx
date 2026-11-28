import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Search, ChevronDown, LogOut, User, Settings, Home, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';
import { Avatar } from './ui/Avatar';
import { Tooltip } from './ui/Tooltip';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/Toaster';
import { api } from '../lib/api';

function Header({ onMenuClick, sidebarOpen }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSearch(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out', 'See you next time!');
    } catch {
      toast.error('Error', 'Failed to log out');
    }
  };

  const userMenuItems = [
    { label: 'Profile', icon: User, onClick: () => navigate('/settings/profile'), shortcut: '⌘,' },
    { label: 'Settings', icon: Settings, onClick: () => navigate('/settings'), shortcut: '' },
    { type: 'divider' },
    { label: 'Log out', icon: LogOut, onClick: handleLogout, shortcut: '' }
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [showSearch]);

  return (
    <header className={cn('h-14 bg-background-secondary border-b border-border-light flex items-center px-4', sidebarOpen ? 'lg:pl-[260px]' : 'lg:pl-16')}>
      <div className="flex items-center gap-4 w-full max-w-screen-2xl mx-auto">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden btn btn-ghost btn-sm p-2"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo / Home link */}
        <Link to="/workspaces" className="flex items-center gap-2 text-foreground-primary hover:text-primary transition-colors">
          <span className="text-xl">⚡</span>
          <span className="font-display font-bold text-xl hidden sm:block">Wrath</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-tertiary" />
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              placeholder="Search... (⌘K)"
              className="w-full h-9 pl-10 pr-4 text-sm bg-background-tertiary border border-border-light rounded-lg focus:border-border-focus focus:ring-2 focus:ring-primary-light transition-colors"
            />
            {showSearch && searchQuery && (
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-primary"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Mobile search */}
        <button
          onClick={() => setShowSearch(true)}
          className="md:hidden btn btn-ghost btn-sm p-2"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2">
          <Tooltip content="New page" position="bottom">
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => navigate('/pages/new')}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </Tooltip>

          <Dropdown
            trigger={
              <button
                ref={(el) => { triggerRef.current = el; }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-background-hover transition-colors"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <Avatar size="sm" name={user?.displayName || user?.username} src={user?.avatarUrl} />
                <span className="hidden sm:block text-sm font-medium text-foreground-primary">
                  {user?.displayName || user?.username}
                </span>
                <ChevronDown className="w-4 h-4 text-foreground-tertiary" />
              </button>
            }
            items={userMenuItems}
            onClose={() => setUserMenuOpen(false)}
          />
        </div>
      </div>

      {/* Mobile search overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-background-primary/95 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in">
          <form onSubmit={handleSearch} className="w-full max-w-md animate-slide-down">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                placeholder="Search pages, workspaces... (Esc to close)"
                className="w-full h-12 pl-12 pr-12 text-base bg-background-secondary border border-border-light rounded-xl focus:border-border-focus focus:ring-2 focus:ring-primary-light"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}

const triggerRef = { current: null };

export { Header };