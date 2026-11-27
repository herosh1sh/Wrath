import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, MoreVertical, Trash2, Duplicate, ArrowLeftRight, Type, Code, Quote, List, ListOrdered, CheckSquare, Image, Link as LinkIcon, Table, Heading1, Heading2, Heading3, Divider, Eye, EyeOff, Share2, Download, Clock, Tag, Star, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { pagesApi, blocksApi, favoritesApi, tagsApi } from '../lib/api';
import { BlockEditor } from '../components/BlockEditor';
import { PageHeader } from '../components/PageHeader';
import { PageSidebar } from '../components/PageSidebar';
import { SlashMenu } from '../components/SlashMenu';
import { Modal, ModalContent, ModalFooter, ModalTitle, ModalDescription } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dropdown, DropdownItem, DropdownSeparator } from '../components/ui/Dropdown';
import { Tooltip } from '../components/ui/Tooltip';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';

export default function Workspace() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { joinPage, leavePage, on } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { pageId } = useParams();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch page data
  const fetchPage = useCallback(async () => {
    if (!pageId) return;
    try {
      setLoading(true);
      const data = await pagesApi.get(pageId);
      setPage(data.page);
      setIsFavorite(data.page.isFavorite);
    } catch (err) {
      console.error('Failed to fetch page:', err);
      if (err.message.includes('404')) {
        navigate('/workspace', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [pageId, navigate]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Socket listeners
  useEffect(() => {
    if (!pageId) return;

    joinPage(pageId);

    const unsubPageUpdated = on('page:updated', (updatedPage) => {
      if (updatedPage.id === pageId) {
        setPage(updatedPage);
      }
    });

    const unsubPageDeleted = on('page:deleted', ({ id }) => {
      if (id === pageId) {
        navigate('/workspace', { replace: true });
      }
    });

    const unsubBlocksReordered = on('blocks:reordered', (blocks) => {
      // BlockEditor handles this internally
    });

    return () => {
      leavePage(pageId);
      unsubPageUpdated();
      unsubPageDeleted();
      unsubBlocksReordered();
    };
  }, [pageId, joinPage, leavePage, on, navigate]);

  // Auto-save
  const saveTimeoutRef = useRef(null);
  const savePage = useCallback(async (updates) => {
    if (!pageId || saving) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        setSaveError(null);
        await pagesApi.update(pageId, updates);
      } catch (err) {
        console.error('Failed to save page:', err);
        setSaveError(err.message);
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [pageId, saving]);

  const handleContentChange = useCallback((content) => {
    savePage({ content });
  }, [savePage]);

  const handlePropertiesChange = useCallback((properties) => {
    savePage({ properties });
  }, [savePage]);

  const handleTitleChange = useCallback((title) => {
    savePage({ title });
  }, [savePage]);

  const handleIconChange = useCallback((icon, iconColor) => {
    savePage({ icon, iconColor });
  }, [savePage]);

  const handleCoverChange = useCallback((coverUrl, coverPosition) => {
    savePage({ coverUrl, coverPosition });
  }, [savePage]);

  const handleFavoriteToggle = async () => {
    try {
      if (isFavorite) {
        await favoritesApi.remove(pageId);
      } else {
        await favoritesApi.add(pageId);
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await pagesApi.delete(pageId);
      setShowDeleteConfirm(false);
      navigate('/workspace', { replace: true });
    } catch (err) {
      console.error('Failed to delete page:', err);
    }
  };

  const handleDuplicate = async () => {
    try {
      const data = await pagesApi.duplicate(pageId);
      setShowDuplicateConfirm(false);
      navigate(`/workspace/${data.page.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to duplicate page:', err);
    }
  };

  const handleRestoreVersion = async (versionId) => {
    try {
      const data = await pagesApi.restoreVersion(pageId, versionId);
      setPage(data.page);
      setShowHistory(false);
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await pagesApi.getHistory(pageId);
      setHistory(data.versions);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Страница не найдена</h1>
          <p className="text-foreground-muted mb-4">Эта страница могла быть перемещена или удалена.</p>
          <Button onClick={() => navigate('/workspace')}>Перейти в рабочее пространство</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Page sidebar */}
      <PageSidebar
        page={page}
        workspaceId={currentWorkspace.id}
        onClose={() => navigate('/workspace')}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        <PageHeader
          page={page}
          workspace={currentWorkspace}
          user={user}
          isFavorite={isFavorite}
          saving={saving}
          saveError={saveError}
          onTitleChange={handleTitleChange}
          onIconChange={handleIconChange}
          onCoverChange={handleCoverChange}
          onFavoriteToggle={handleFavoriteToggle}
          onShowMenu={() => setShowPageMenu(true)}
        />

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <BlockEditor
            pageId={page.id}
            initialContent={page.content}
            onContentChange={handleContentChange}
            readOnly={false}
          />
        </div>
      </div>

      {/* Page menu dropdown */}
      <Dropdown
        trigger={({ open, onClick }) => null}
        align="end"
      >
        <DropdownItem onClick={() => fetchHistory()}>
          <Clock className="h-4 w-4" />
          История страницы
        </DropdownItem>
        <DropdownItem onClick={() => setShowDuplicateConfirm(true)}>
          <Duplicate className="h-4 w-4" />
          Дублировать
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onClick={() => setShowDeleteConfirm(true)} variant="destructive">
          <Trash2 className="h-4 w-4" />
          Удалить
        </DropdownItem>
      </Dropdown>

      {/* Share modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Поделиться страницей"
        description="Пригласите других к сотрудничеству на этой странице."
      >
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ссылка для доступа</label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/workspace/${page.id}`}
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/workspace/${page.id}`)}>
                  Копировать
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Права доступа</label>
              <select className="input w-full">
                <option value="view">Может просматривать</option>
                <option value="comment">Может комментировать</option>
                <option value="edit">Может редактировать</option>
              </select>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowShareModal(false)}>Закрыть</Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Удалить страницу"
        description="Это действие нельзя отменить. Страница будет перемещена в корзину."
      >
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Отмена</Button>
          <Button variant="destructive" onClick={handleDelete}>Удалить</Button>
        </ModalFooter>
      </Modal>

      {/* Duplicate confirmation modal */}
      <Modal
        isOpen={showDuplicateConfirm}
        onClose={() => setShowDuplicateConfirm(false)}
        title="Дублировать страницу"
        description="Создать копию этой страницы в том же месте."
      >
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowDuplicateConfirm(false)}>Отмена</Button>
          <Button onClick={handleDuplicate}>Дублировать</Button>
        </ModalFooter>
      </Modal>

      {/* History modal */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="История страницы"
        size="lg"
      >
        <ModalContent className="max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <div className="py-12 text-center text-foreground-muted">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>История недоступна</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(version => (
                <button
                  key={version.id}
                  onClick={() => handleRestoreVersion(version.id)}
                  className="w-full p-3 text-left hover:bg-muted rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Версия {version.version_number}</span>
                    <span className="text-sm text-foreground-muted">
                      {new Date(version.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground-muted mt-1">
                    <Avatar src={version.author_avatar} fallback={version.author_name?.charAt(0)} size="xs" />
                    <span>{version.author_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowHistory(false)}>Закрыть</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}