import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '../lib/utils';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(null);

  // Extract workspaceId from URL
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const workspaceIndex = pathParts.indexOf('workspaces');
    if (workspaceIndex !== -1 && pathParts[workspaceIndex + 1]) {
      setWorkspaceId(pathParts[workspaceIndex + 1]);
    }
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Escape to close sidebar on mobile
      if (e.key === 'Escape') {
        closeSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, closeSidebar]);

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        workspaceId={workspaceId}
      />

      {/* Main content */}
      <div className={cn('flex-1 transition-all duration-300', sidebarOpen && 'lg:ml-[260px]')}>
        <Header
          onMenuClick={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden animate-fade-in"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      <header className="h-14 bg-background-secondary border-b border-border-light flex items-center px-4">
        <div className="flex items-center gap-4 w-full max-w-screen-2xl mx-auto">
          <Link to="/workspaces" className="flex items-center gap-2 text-foreground-primary hover:text-primary transition-colors">
            <span className="text-xl">⚡</span>
            <span className="font-display font-bold text-xl">Wrath</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';