import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from './lib/utils';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Badge } from './components/ui/Badge';
import { Search } from 'lucide-react';
import { Layout, PublicLayout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Workspaces } from './pages/Workspaces';
import { PageView } from './pages/PageView';
import { SearchPage } from './pages/Search';
import { Settings } from './pages/Settings';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './components/ui/Toaster';
import { api } from './lib/api';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/workspaces" replace /> : children;
}

// Placeholder components
function PublicPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground-primary mb-4">Public Page</h1>
        <p className="text-foreground-secondary">This page is publicly accessible</p>
      </div>
    </div>
  );
}

function NewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      // Get first workspace
      const workspaces = await api.workspaces.list();
      if (!workspaces.workspaces?.length) {
        toast.error('Error', 'No workspace found');
        return;
      }

      const data = await api.pages.create({
        workspaceId: workspaces.workspaces[0].id,
        title: title.trim(),
        icon: '📄'
      });
      toast.success('Created', 'Page created successfully');
      navigate(`/pages/${data.page.id}`);
    } catch (error) {
      toast.error('Error', 'Failed to create page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-foreground-primary mb-6 text-center">Create New Page</h1>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Page Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter page title"
            autoFocus
          />
          <Button type="submit" className="w-full" size="lg" loading={saving}>
            Create Page
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/p/:publicId" element={<PublicPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<Layout />}>
        <Route
          path="/workspaces"
          element={
            <ProtectedRoute>
              <Workspaces />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:workspaceId"
          element={
            <ProtectedRoute>
              <Workspaces />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/:pageId"
          element={
            <ProtectedRoute>
              <PageView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pages/new"
          element={
            <ProtectedRoute>
              <NewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/*"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect root */}
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
}