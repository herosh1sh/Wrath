import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, PublicLayout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Workspaces } from './pages/Workspaces';
import { PageView } from './pages/PageView';
import { Settings } from './pages/Settings';
import { SearchPage } from './pages/Search';
import { useAuth } from './contexts/AuthContext';

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
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground-primary mb-4">New Page</h1>
        <p className="text-foreground-secondary">Creating a new page...</p>
      </div>
    </div>
  );
}

function Settings() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({ displayName: user?.displayName || '', email: user?.email || '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile(profileData);
    setSaving(false);
    if (result.success) {
      toast.success('Saved', 'Profile updated');
    } else {
      toast.error('Error', result.error);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Error', 'Passwords do not match');
      return;
    }
    setSaving(true);
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    setSaving(false);
    if (result.success) {
      toast.success('Changed', 'Password updated');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      toast.error('Error', result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground-primary mb-6">Settings</h1>

      <div className="flex gap-4 mb-6 border-b border-border-light">
        {['profile', 'account', 'appearance'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-tertiary hover:text-foreground-primary'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input
            label="Display Name"
            value={profileData.displayName}
            onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
          />
          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      )}

      {activeTab === 'account' && (
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          />
          <Button type="submit" variant="danger" loading={saving}>Change Password</Button>
        </form>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <p className="text-foreground-secondary">Appearance settings coming soon...</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border-light">
        <Button variant="danger" onClick={handleLogout}>Log Out</Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { cn } from './lib/utils';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './components/ui/Toaster';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // In a real app, you'd get workspaceId from context
      const data = await api.search.query({ q: query, workspaceId: 'default', limit: '20' });
      setResults(data.results || []);
    } catch (error) {
      toast.error('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground-primary mb-6">Search</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all pages..."
            className="w-full h-12 pl-12 pr-4 text-base bg-background-tertiary border border-border-light rounded-xl focus:border-border-focus focus:ring-2 focus:ring-primary-light"
            autoFocus
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-tertiary">
            <Search className="w-5 h-5" />
          </span>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : results.length === 0 && query ? (
        <div className="text-center py-12 text-foreground-secondary">
          <p>No results found for "{query}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(result => (
            <div
              key={result.id}
              className="p-4 bg-background-secondary border border-border-light rounded-xl hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/pages/${result.id}`)}
            >
              <h3 className="font-medium text-foreground-primary">{result.title || 'Untitled'}</h3>
              <p className="text-sm text-foreground-tertiary mt-1 line-clamp-2">{result.snippet}</p>
              <div className="flex items-center gap-2 mt-2">
                {result.tags?.map(tag => (
                  <Badge key={tag.name} variant="outline" className="text-xs">{tag.name}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Search } from 'lucide-react';
import { api } from './lib/api';
import { navigate } from 'react-router-dom';