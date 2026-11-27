import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Star, Trash2, Tag, Clock, Search, Home, FileText, ChevronRight, Filter, X } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { api, pagesApi, favoritesApi, tagsApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown, DropdownItem, DropdownSeparator } from '../components/ui/Dropdown';
import { Modal, ModalContent, ModalFooter } from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';

export default function WorkspaceHome({ view: propView }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Determine view from prop or URL
  const pathView = location.pathname.split('/').pop();
  const view = propView || (pathView === 'workspace' ? 'home' : pathView) || 'home';
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageParentId, setNewPageParentId] = useState(null);

  // Fetch pages based on view
  const fetchPages = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      let data;
      switch (view) {
        case 'favorites':
          data = await favoritesApi.get();
          setPages(data.favorites || []);
          break;
        case 'trash':
          data = await api(`/pages/trash/${currentWorkspace.id}`);
          setPages(data.pages || []);
          break;
        case 'tags':
          data = await tagsApi.getWorkspaceTags(currentWorkspace.id);
          // Tags view shows tags, not pages
          setPages([]);
          break;
        case 'recent':
          data = await api(`/search/recent?workspaceId=${currentWorkspace.id}&limit=20`);
          setPages(data.results || []);
          break;
        default:
          data = await pagesApi.getTree(currentWorkspace.id);
          setPages(data.tree || []);
      }
    } catch (err) {
      console.error('Failed to fetch pages:', err);
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, view]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleCreatePage = async (parentId = null) => {
    try {
      const title = newPageTitle.trim() || 'Без названия';
      const data = await pagesApi.create({
        workspaceId: currentWorkspace.id,
        parentId,
        title,
      });
      setShowCreatePage(false);
      setNewPageTitle('');
      setNewPageParentId(null);
      navigate(`/workspace/${data.page.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const handleCreateSubPage = (parentId) => {
    setNewPageParentId(parentId);
    setNewPageTitle('');
    setShowCreatePage(true);
  };

  const renderPageNode = (page, depth = 0) => {
    const hasChildren = page.children && page.children.length > 0;

    return (
      <div key={page.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors duration-fast ${
            hasChildren ? 'hover:bg-muted' : ''
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {hasChildren && (
            <span className="flex-shrink-0 w-4 text-foreground-muted">{ChevronRight}</span>
          ) : (
            <span className="flex-shrink-0 w-4" />
          )}
          {page.icon && <span className="flex-shrink-0 text-base">{page.icon}</span>}
          <span className="truncate flex-1 cursor-pointer hover:text-foreground" onClick={() => navigate(`/workspace/${page.id}`)}>
            {page.title}
          </span>
          {hasChildren && (
            <Tooltip content="Добавить подстраницу" position="right">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateSubPage(page.id);
                }}
                className="flex-shrink-0 p-1 text-foreground-muted hover:text-foreground opacity-0 transition-opacity"
                aria-label="Добавить подстраницу"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
        {hasChildren && (
          <div>
            {page.children.map(child => renderPageNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!currentWorkspace) return null;

  // View-specific rendering
  if (view === 'favorites') {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-heading-1 font-heading font-semibold">Избранное</h1>
              <p className="text-foreground-muted mt-1">Быстрый доступ к отмеченным страницам</p>
            </div>
            <Button onClick={() => handleCreatePage()}>
              <Plus className="h-4 w-4" />
              Новая страница
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-16">
              <Star className="h-16 w-16 text-foreground-muted/50 mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Избранное пусто</h2>
              <p className="text-foreground-muted mb-6">Отмечайте страницы звездочкой, чтобы они появлялись здесь</p>
              <Button onClick={() => handleCreatePage()}>
                <Plus className="h-4 w-4" />
                Создать первую страницу
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map(page => (
                <div
                  key={page.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => navigate(`/workspace/${page.id}`)}
                >
                  {page.icon && <span className="text-2xl">{page.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{page.title}</h3>
                    <p className="text-sm text-foreground-muted truncate">{page.workspace_name}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/workspace/${page.id}`); }}>
                    Открыть
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'trash') {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-heading-1 font-heading font-semibold">Корзина</h1>
              <p className="text-foreground-muted mt-1">Удалённые страницы можно восстановить в течение 30 дней</p>
            </div>
            <Button onClick={() => handleCreatePage()}>
              <Plus className="h-4 w-4" />
              Новая страница
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-16">
              <Trash2 className="h-16 w-16 text-foreground-muted/50 mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Корзина пуста</h2>
              <p className="text-foreground-muted">Удалённые страницы будут появляться здесь</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map(page => (
                <div
                  key={page.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors"
                >
                  {page.icon && <span className="text-2xl opacity-50">{page.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{page.title}</h3>
                    <p className="text-sm text-foreground-muted truncate">Удалена {new Date(page.deleted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={async () => {
                      try {
                        await pagesApi.restore(page.id);
                        fetchPages();
                      } catch (err) {
                        console.error('Failed to restore page:', err);
                      }
                    }}>
                      Восстановить
                    </Button>
                    <Button variant="ghost" size="sm" variant="destructive" onClick={async () => {
                      // Permanently delete - would need a new API endpoint
                    }}>
                      Удалить навсегда
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'tags') {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-heading-1 font-heading font-semibold">Теги</h1>
              <p className="text-foreground-muted mt-1">Организуйте страницы с помощью тегов</p>
            </div>
            <Button onClick={() => handleCreatePage()}>
              <Plus className="h-4 w-4" />
              Новая страница
            </Button>
          </div>

          <div className="text-center py-16">
            <Tag className="h-16 w-16 text-foreground-muted/50 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">Представление тегов скоро появится</h2>
            <p className="text-foreground-muted">Управляйте тегами рабочего пространства и фильтруйте страницы по тегам</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'recent') {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-heading-1 font-heading font-semibold">Недавние</h1>
              <p className="text-foreground-muted mt-1">Ваши недавно отредактированные страницы</p>
            </div>
            <Button onClick={() => handleCreatePage()}>
              <Plus className="h-4 w-4" />
              Новая страница
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-16 w-16 text-foreground-muted/50 mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Нет недавних страниц</h2>
              <p className="text-foreground-muted mb-6">Страницы, которые вы редактируете, будут появляться здесь</p>
              <Button onClick={() => handleCreatePage()}>
                <Plus className="h-4 w-4" />
                Создать страницу
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map(page => (
                <div
                  key={page.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => navigate(`/workspace/${page.id}`)}
                >
                  {page.icon && <span className="text-2xl">{page.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{page.title}</h3>
                    <p className="text-sm text-foreground-muted truncate">
                      {page.workspace_id} • Обновлена {new Date(page.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default home view - show page tree
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-heading-1 font-heading font-semibold">{currentWorkspace.name}</h1>
            <p className="text-foreground-muted mt-1">Все страницы в этом рабочем пространстве</p>
          </div>
          <Button onClick={() => handleCreatePage()}>
            <Plus className="h-4 w-4" />
            Новая страница
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-foreground-muted/50 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">Страниц пока нет</h2>
            <p className="text-foreground-muted mb-6">Создайте свою первую страницу, чтобы начать</p>
            <Button onClick={() => handleCreatePage()}>
              <Plus className="h-4 w-4" />
              Создать страницу
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map(page => renderPageNode(page))}
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-4">Быстрые действия</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => navigate('/workspace/new')}>
              <Plus className="h-4 w-4" />
              <span>Новая страница</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/workspace/favorites')}>
              <Star className="h-4 w-4" />
              <span>Избранное</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/workspace/recent')}>
              <Clock className="h-4 w-4" />
              <span>Недавние</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/workspace/trash')}>
              <Trash2 className="h-4 w-4" />
              <span>Корзина</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}