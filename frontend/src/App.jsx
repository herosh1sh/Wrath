import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useWorkspace } from './contexts/WorkspaceContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Workspace from './pages/Workspace';
import WorkspaceHome from './pages/WorkspaceHome';
import Settings from './pages/Settings';
import NewPage from './pages/NewPage';
import NotFound from './pages/NotFound';
import LoadingScreen from './components/LoadingScreen';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function WorkspaceRoute({ children }) {
  const { currentWorkspace, loading } = useWorkspace();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!currentWorkspace) {
    return <Navigate to="/settings" replace />;
  }

  return children;
}

export default function App() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceRoute>
              <Layout />
            </WorkspaceRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/workspace" replace />} />
        <Route path="workspace" element={<WorkspaceHome />} />
        <Route path="workspace/:pageId" element={<Workspace />} />
        <Route path="workspace/new" element={<NewPage />} />
        <Route path="workspace/favorites" element={<WorkspaceHome view="favorites" />} />
        <Route path="workspace/trash" element={<WorkspaceHome view="trash" />} />
        <Route path="workspace/tags" element={<WorkspaceHome view="tags" />} />
        <Route path="workspace/recent" element={<WorkspaceHome view="recent" />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}