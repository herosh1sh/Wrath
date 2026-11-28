import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, MoreHorizontal, Star, Tag, Share2, Eye, Edit, Trash2, Copy, Download, ArrowLeft, ArrowRight, Home, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Dropdown } from '../components/ui/Dropdown';
import { Modal } from '../components/ui/Modal';
import { Tooltip } from '../components/ui/Tooltip';
import { BlockEditor } from '../components/BlockEditor';
import { PageHeader } from '../components/PageHeader';
import { PageSidebar } from '../components/PageSidebar';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toaster';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { formatRelativeTime, parseBlocks, serializeBlocks, ICONS } from '../lib/utils';

export function PageView() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { joinPage, leavePage, subscribeToBlock } = useSocket();

  const [page, setPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const saveTimeoutRef = useRef(null);
  const blockRefs = useRef({});

  // Fetch page data
  const fetchPage = useCallback(async () => {
    try {
      const data = await api.pages.get(pageId);
      setPage(data.page);
      setBlocks(parseBlocks(data.page.content));
      if (data.page.published_url) {
        setPublishedUrl(`${window.location.origin}/p/${data.page.published_url}`);
      }
    } catch (error) {
      console.error('Failed to fetch page:', error);
      toast.error('Error', 'Failed to load page');
      navigate('/workspaces');
    } finally {
      setLoading(false);
    }
  }, [pageId, navigate, toast]);

  useEffect(() => {
    fetchPage();
    joinPage(pageId);
    return () => leavePage(pageId);
  }, [fetchPage, joinPage, leavePage, pageId]);

  // Auto-save
  const savePage = useCallback(async (newBlocks) => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.pages.update(pageId, {
        content: serializeBlocks(newBlocks)
      });
      setSaveError(null);
    } catch (error) {
      setSaveError(error.message);
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [pageId]);

  const handleBlocksChange = (newBlocks) => {
    setBlocks(newBlocks);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => savePage(newBlocks), 1000);
  };

  const handleDuplicate = async () => {
    try {
      const data = await api.pages.duplicate(pageId);
      toast.success('Duplicated', 'Page copied');
      navigate(`/pages/${data.page.id}`);
    } catch (error) {
      toast.error('Error', 'Failed to duplicate page');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Move this page to archive?')) return;
    try {
      await api.pages.delete(pageId);
      toast.success('Archived', 'Page moved to archive');
      navigate('/workspaces');
    } catch (error) {
      toast.error('Error', 'Failed to archive page');
    }
  };

  const handlePublish = async () => {
    try {
      const data = await api.pages.publish(pageId);
      if (data.publishedUrl) {
        setPublishedUrl(data.publishedUrl);
        setShowPublishModal(true);
      }
      toast.success(page.is_published ? 'Unpublished' : 'Published', page.is_published ? 'Page is now private' : 'Page is now public');
      fetchPage();
    } catch (error) {
      toast.error('Error', 'Failed to publish page');
    }
  };

  const copyPublishedUrl = () => {
    navigator.clipboard.writeText(publishedUrl);
    toast.success('Copied', 'Public URL copied to clipboard');
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    try {
      // Find or create tag
      const tags = await api.tags.list(page.workspace_id);
      let tag = tags.tags.find(t => t.name.toLowerCase() === newTag.trim().toLowerCase());
      if (!tag) {
        tag = (await api.tags.create({ workspaceId: page.workspace_id, name: newTag.trim() })).tag;
      }
      await api.tags.addToPage(pageId, tag.id);
      fetchPage();
      setShowTagInput(false);
      setNewTag('');
      toast.success('Tag added', newTag.trim());
    } catch (error) {
      toast.error('Error', 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await api.tags.removeFromPage(pageId, tagId);
      fetchPage();
      toast.success('Tag removed');
    } catch (error) {
      toast.error('Error', 'Failed to remove tag');
    }
  };

  const handleFavorite = async () => {
    try {
      if (page.isFavorited) {
        await api.favorites.remove(pageId);
      } else {
        await api.favorites.add(pageId);
      }
      fetchPage();
    } catch (error) {
      toast.error('Error', 'Failed to update favorite');
    }
  };

  const pageMenuItems = [
    { label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onClick: handleDuplicate, shortcut: '' },
    { label: page.is_published ? 'Unpublish' : 'Publish', icon: page.is_published ? <Eye className="w-4 h-4" /> : <Share2 className="w-4 h-4" />, onClick: handlePublish, shortcut: '' },
    { type: 'divider' },
    { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: () => {}, shortcut: '' },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDelete, shortcut: '', className: 'text-error' }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!page) return null;

  const workspaceId = page.workspace_id;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Page Header */}
      <PageHeader
        page={page}
        onFavorite={handleFavorite}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        newTag={newTag}
        setNewTag={setNewTag}
        showTagInput={showTagInput}
        setShowTagInput={setShowTagInput}
        showPageMenu={showPageMenu}
        setShowPageMenu={setShowPageMenu}
        pageMenuItems={pageMenuItems}
        publishedUrl={publishedUrl}
        showPublishModal={showPublishModal}
        setShowPublishModal={setShowPublishModal}
        copyPublishedUrl={copyPublishedUrl}
        saving={saving}
        saveError={saveError}
      />

      {/* Page Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <BlockEditor
              blocks={blocks}
              onChange={handleBlocksChange}
              pageId={pageId}
              readOnly={false}
              blockRefs={blockRefs}
            />
          </div>

          {/* Save indicator */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-background-primary border border-border-light rounded-full shadow-lg text-sm animate-slide-up">
            {saving && (
              <span className="flex items-center gap-1 text-foreground-secondary">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                Saving...
              </span>
            )}
            {!saving && !saveError && (
              <span className="text-foreground-tertiary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success" />
                Saved just now
              </span>
            )}
            {saveError && (
              <span className="text-error flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-error" />
                Save failed
              </span>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <PageSidebar
          page={page}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  );
}