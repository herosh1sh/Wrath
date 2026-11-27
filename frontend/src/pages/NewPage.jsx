import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { api } from '../lib/api';
import { Loader2, FileText, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NewPage() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Get title from query params if provided
  const searchParams = new URLSearchParams(location.search);
  const titleFromQuery = searchParams.get('title') || '';

  useEffect(() => {
    const createPage = async () => {
      if (!currentWorkspace) {
        navigate('/settings');
        return;
      }

      setCreating(true);
      try {
        const data = await api('/pages', {
          method: 'POST',
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            title: titleFromQuery || 'Без названия',
          }),
        });
        navigate(`/workspace/${data.page.id}`, { replace: true });
      } catch (err) {
        setError(err.message);
        setCreating(false);
      }
    };

    createPage();
  }, [currentWorkspace, navigate, titleFromQuery]);

  if (creating) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground-muted">Создание страницы...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <FileText className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Не удалось создать страницу</h1>
          <p className="text-foreground-muted mb-4">{error}</p>
          <Button onClick={() => navigate('/workspace')}>
            <Plus className="h-4 w-4" />
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
        <p className="text-foreground-muted">Создание страницы...</p>
      </div>
    </div>
  );
}