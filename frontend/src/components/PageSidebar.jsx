import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Tag, Star, Clock, Share2, Link as LinkIcon, Download, Trash2, MoreVertical, X, Plus, Search, Settings, HelpCircle, Info, FileText, Users, Bell, Key, Shield, Palette, Moon, Sun, Monitor, Globe, Lock, Unlock, Eye, Edit, Comment, Copy, Check, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { api, pagesApi, tagsApi, commentsApi } from '../lib/api';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel } from './ui/Dropdown';
import { Modal, ModalContent, ModalFooter, ModalTitle, ModalDescription } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Avatar } from './ui/Avatar';
import Tooltip from './ui/Tooltip';

const ICONS = ['📝', '🛡️', '🏹', '⚡', '🔥', '💀', '👑', '🏰', '⚖️', '🗝️', '📜', '📋', '📚', '📖', '📔', '📕', '📗', '📘', '📙', '🗂️', '🗃️', '🗄️', '📁', '📂', '🗒️', '🗓️', '📅', '📆', '📇', '🏠', '🏢', '🏭', '🏫', '🏪', '🏬', '⚙️', '🔧', '🔨', '🔋', '💡', '🔍', '🔎', '🔑', '🎯', '🎨', '🎭', '🎪', '🎫', '🎬', '🎮', '🕹️', '🎲', '♟️', '🌟', '⭐', '💫', '✨', '🌙', '☀️', '☁️', '⛈️', '🌈', '🚀', '🛸', '🛩️', '✈️', '🚁', '🚂', '⛵'];

export default function PageSidebar({ page, workspaceId, onClose }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('properties');
  const [tags, setTags] = useState([]);
  const [workspaceTags, setWorkspaceTags] = useState([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#0891B2');
  const [showShareModal, setShowShareModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [pageIcon, setPageIcon] = useState(page.icon || '📝');
  const [pageIconColor, setPageIconColor] = useState(page.iconColor || '#DC2626');
  const [pageCover, setPageCover] = useState(page.coverUrl || '');
  const [pageCoverPosition, setPageCoverPosition] = useState(page.coverPosition || 0.5);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState(page.properties || {});

  const COLORS = ['#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0D9488', '#CA8A04', '#65A30D', '#2563EB', '#9333EA', '#EC4899'];

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const [pageTagsData, wsTagsData] = await Promise.all([
          api(`/tags/pages/${page.id}`),
          tagsApi.getWorkspaceTags(workspaceId),
        ]);
        setTags(pageTagsData.tags || []);
        setWorkspaceTags(wsTagsData.tags || []);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    fetchTags();
  }, [page.id, workspaceId]);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await commentsApi.getPageComments(page.id);
        setComments(data.comments || []);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      }
    };
    fetchComments();
  }, [page.id]);

  // Handle tag toggle
  const handleTagToggle = async (tag) => {
    try {
      const isTagged = tags.some(t => t.id === tag.id);
      if (isTagged) {
        await tagsApi.removeFromPage(page.id, tag.id);
        setTags(prev => prev.filter(t => t.id !== tag.id));
      } else {
        await tagsApi.addToPage(page.id, tag.id);
        setTags(prev => [...prev, tag]);
      }
    } catch (err) {
      console.error('Failed to toggle tag:', err);
    }
  };

  // Create new tag
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const data = await tagsApi.create(workspaceId, { name: newTagName.trim(), color: newTagColor });
      await tagsApi.addToPage(page.id, data.tag.id);
      setTags(prev => [...prev, data.tag]);
      setWorkspaceTags(prev => [...prev, data.tag]);
      setShowTagInput(false);
      setNewTagName('');
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
  };

  // Handle property change
  const handlePropertyChange = (key, value) => {
    const newProps = { ...properties, [key]: value };
    setProperties(newProps);
    // Could add debounced save here
  };

  // Add property
  const handleAddProperty = () => {
    const key = `property_${Date.now()}`;
    setProperties(prev => ({ ...prev, [key]: '' }));
  };

  // Remove property
  const handleRemoveProperty = (key) => {
    setProperties(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Handle share
  const handleShare = () => setShowShareModal(true);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Вчера';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    if (days < 365) return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!page) return null;

  return (
    <aside className="w-80 border-l border-border bg-surface flex flex-col">
      {/* Tab bar */}
      <div className="border-b border-border">
        <nav className="flex" role="tablist">
          {[
            { id: 'properties', label: 'Свойства', icon: Info },
            { id: 'comments', label: 'Комментарии', icon: Comment },
            { id: 'sharing', label: 'Доступ', icon: Share2 },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Properties tab */}
        {activeTab === 'properties' && (
          <div className="space-y-6">
            {/* Page icon & cover */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowIconPicker(true)}
                    className="flex items-center justify-center w-14 h-14 rounded-lg bg-muted text-3xl hover:bg-muted-foreground/10 transition-colors"
                    aria-label="Сменить иконку"
                  >
                    {pageIcon}
                  </button>
                  {showIconPicker && (
                    <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-surface border border-border rounded-lg shadow-xl p-3 animate-in">
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-2">Цвет иконки</label>
                        <div className="flex flex-wrap gap-1">
                          {COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setPageIconColor(color)}
                              className={`w-7 h-7 rounded transition-colors ${
                                pageIconColor === color ? 'ring-2 ring-accent ring-offset-2 scale-110' : 'hover:ring-1 ring-border'
                              }`}
                              style={{ backgroundColor: color }}
                              aria-label={`Цвет ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <DropdownSeparator />
                      <div className="grid grid-cols-7 gap-1 max-h-56 overflow-auto">
                        {ICONS.map(icon => (
                          <button
                            key={icon}
                            onClick={() => { setPageIcon(icon); setShowIconPicker(false); }}
                            className={`p-1.5 text-xl rounded transition-colors hover:bg-muted ${
                              pageIcon === icon ? 'bg-muted ring-2 ring-accent' : ''
                            }`}
                            aria-label={`Иконка ${icon}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    value={page.title}
                    onChange={(e) => handlePropertyChange('title', e.target.value)}
                    placeholder="Без названия"
                    className="text-lg font-semibold bg-transparent border-none focus:ring-0 placeholder:text-foreground-muted"
                  />
                </div>
              </div>

              {pageCover && (
                <div className="relative h-32 w-full rounded-lg overflow-hidden">
                  <img
                    src={pageCover}
                    alt="Обложка страницы"
                    className="w-full h-full object-cover"
                    style={{ transform: `translateY(${pageCoverPosition * 20}%)` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                </div>
              )}
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-3">Свойства</h3>
              <div className="space-y-2">
                {Object.entries(properties).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input
                      value={key}
                      onChange={(e) => {
                        if (e.target.value !== key) {
                          handleRemoveProperty(key);
                          handlePropertyChange(e.target.value, value);
                        }
                      }}
                      placeholder="Имя свойства"
                      className="flex-1 text-sm"
                    />
                    <Input
                      value={value}
                      onChange={(e) => handlePropertyChange(key, e.target.value)}
                      placeholder="Значение"
                      className="flex-1 text-sm"
                    />
                    <Tooltip content="Удалить свойство" position="top">
                      <button
                        onClick={() => handleRemoveProperty(key)}
                        className="btn-icon p-1.5 text-foreground-muted hover:text-foreground hover:bg-muted rounded"
                        aria-label="Удалить свойство"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
                <button
                  onClick={handleAddProperty}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-foreground-muted rounded-sm hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Добавить свойство
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">Теги</h3>
                <button
                  onClick={() => setShowTagInput(true)}
                  className="btn-icon p-1.5 text-foreground-muted hover:bg-muted rounded"
                  aria-label="Добавить тег"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {showTagInput && (
                <form onSubmit={handleCreateTag} className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Имя тега"
                      className="flex-1"
                      autoFocus
                    />
                    <select
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="input w-24"
                    >
                      {COLORS.map(color => (
                        <option key={color} value={color} style={{ backgroundColor: color }}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" type="button" onClick={() => { setShowTagInput(false); setNewTagName(''); }}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={!newTagName.trim()}>Создать</Button>
                  </div>
                </form>
              )}

              {workspaceTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {workspaceTags.map(tag => (
                    <Tooltip key={tag.id} content={tag.name} position="top">
                      <button
                        onClick={() => handleTagToggle(tag)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          tags.some(t => t.id === tag.id)
                            ? 'bg-opacity-20 ring-2 ring-offset-2'
                            : 'bg-opacity-10 hover:bg-opacity-20'
                        }`}
                        style={{
                          backgroundColor: `${tag.color}1A`,
                          borderColor: tag.color,
                          color: tag.color,
                        }}
                        aria-label={tags.some(t => t.id === tag.id) ? `Удалить тег ${tag.name}` : `Добавить тег ${tag.name}`}
                      >
                        {tags.some(t => t.id === tag.id) && <Check className="h-3 w-3" />}
                        <span>{tag.name}</span>
                      </button>
                    </Tooltip>
                  ))}
                </div>
              )}

              {workspaceTags.length === 0 && !showTagInput && (
                <p className="text-sm text-foreground-muted">В этом рабочем пространстве нет тегов. Создайте один, чтобы начать.</p>
              )}
            </div>

            {/* Page info */}
            <div className="pt-4 border-t border-border space-y-2 text-sm text-foreground-muted">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>Создана {formatDate(page.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>Изменена {formatDate(page.updated_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span>ID страницы: {page.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        )}

        {/* Comments tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-foreground-muted">
                <Comment className="h-10 w-10 opacity-50 mb-3" />
                <p>Комментариев пока нет</p>
                <p className="text-sm">Начните обсуждение на этой странице</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar src={comment.author_avatar} fallback={comment.author_name?.charAt(0)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-foreground-muted">{formatDate(comment.created_at)}</span>
                        {comment.resolved && (
                          <Badge variant="success" className="text-xs">Решено</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {comment.user_id === user?.id && (
                          <>
                            <button className="text-xs text-foreground-muted hover:text-foreground transition-colors">Редактировать</button>
                            <button className="text-xs text-foreground-muted hover:text-foreground transition-colors">Удалить</button>
                          </>
                        )}
                        {!comment.resolved && (
                          <button className="text-xs text-accent hover:text-accent-hover transition-colors">Отметить как решено</button>
                        )}
                        {comment.resolved && (
                          <button className="text-xs text-foreground-muted hover:text-foreground transition-colors">Открыть снова</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="border-t border-border pt-4">
              {showCommentInput ? (
                <div className="flex gap-3">
                  <Avatar src={user?.avatar_url} fallback={user?.name?.charAt(0)} size="sm" />
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Напишите комментарий..."
                      className="textarea min-h-[80px]"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => { setShowCommentInput(false); setCommentText(''); }}>
                        Отмена
                      </Button>
                      <Button onClick={async () => {
                        if (!commentText.trim()) return;
                        try {
                          await commentsApi.create({ pageId: page.id, content: commentText });
                          setCommentText('');
                          setShowCommentInput(false);
                        } catch (err) {
                          console.error('Failed to add comment:', err);
                        }
                      }} disabled={!commentText.trim()}>
                        Комментировать
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCommentInput(true)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-foreground-muted rounded-sm hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Avatar src={user?.avatar_url} fallback={user?.name?.charAt(0)} size="sm" />
                  <span className="text-sm">Добавить комментарий...</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sharing tab */}
        {activeTab === 'sharing' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-3">Ссылка для доступа</h3>
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
              <p className="text-sm text-foreground-muted mt-2">Любой человек с этой ссылкой может просматривать эту страницу.</p>
            </div>

            <DropdownSeparator />

            <div>
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-3">Права доступа</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="permission" defaultChecked className="sr-only" />
                  <div className="flex items-center justify-between w-full p-3 rounded-sm border border-border bg-surface hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-foreground-muted" />
                      <div>
                        <p className="font-medium text-sm">Все, у кого есть ссылка</p>
                        <p className="text-xs text-foreground-muted">Публичный доступ — вход не требуется</p>
                      </div>
                    </div>
                    <Badge variant="primary">Может просматривать</Badge>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="permission" className="sr-only" />
                  <div className="flex items-center justify-between w-full p-3 rounded-sm border border-border bg-surface hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-foreground-muted" />
                      <div>
                        <p className="font-medium text-sm">Участники рабочего пространства</p>
                        <p className="text-xs text-foreground-muted">Только участники этого рабочего пространства</p>
                      </div>
                    </div>
                    <select className="input w-32 text-sm py-1">
                      <option value="view">Может просматривать</option>
                      <option value="comment">Может комментировать</option>
                      <option value="edit">Может редактировать</option>
                    </select>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="permission" className="sr-only" />
                  <div className="flex items-center justify-between w-full p-3 rounded-sm border border-border bg-surface hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-foreground-muted" />
                      <div>
                        <p className="font-medium text-sm">Приглашённые люди</p>
                        <p className="text-xs text-foreground-muted">Конкретные люди, которых вы пригласили</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      Пригласить
                    </Button>
                  </div>
                </label>
              </div>
            </div>

            <DropdownSeparator />

            <div>
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-3">Экспорт</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground hover:bg-muted transition-colors">
                  <Download className="h-4 w-4" />
                  <span>Экспорт в PDF</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground hover:bg-muted transition-colors">
                  <FileText className="h-4 w-4" />
                  <span>Экспорт в Markdown</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-foreground hover:bg-muted transition-colors">
                  <LinkIcon className="h-4 w-4" />
                  <span>Экспорт в HTML</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}