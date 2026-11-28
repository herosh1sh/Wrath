import { useState, useRef } from 'react';
import { cn } from '../lib/utils';
import { Star, Tag, Share2, MoreHorizontal, ChevronDown, Copy, Link as LinkIcon, X, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Dropdown } from './ui/Dropdown';
import { Tooltip } from './ui/Tooltip';
import { Modal } from './ui/Modal';
import { Avatar } from './ui/Avatar';
import { ICONS } from '../lib/utils';
import { useToast } from './ui/Toaster';

export function PageHeader({
  page,
  onFavorite,
  onAddTag,
  onRemoveTag,
  newTag,
  setNewTag,
  showTagInput,
  setShowTagInput,
  showPageMenu,
  setShowPageMenu,
  pageMenuItems,
  publishedUrl,
  showPublishModal,
  setShowPublishModal,
  copyPublishedUrl,
  saving,
  saveError
}) {
  const { toast } = useToast();
  const [icon, setIcon] = useState(page.icon || '📄');
  const [coverUrl, setCoverUrl] = useState(page.cover_url || '');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverInput, setShowCoverInput] = useState(false);
  const iconSearchRef = useRef('');

  const handleTitleChange = (e) => {
    // Title is handled by the editor
  };

  const handleIconSelect = (selectedIcon) => {
    setIcon(selectedIcon);
    // In a real app, you'd save this to the backend
  };

  const handleCoverSubmit = (e) => {
    e.preventDefault();
    setCoverUrl(coverUrl);
    setShowCoverInput(false);
  };

  const tagColors = {
    'Important': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    'Ideas': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Projects': 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400',
    'Personal': 'bg-lavender-100 text-lavender-700 dark:bg-lavender-900/30 dark:text-lavender-400',
    'Reference': 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400'
  };

  return (
    <header className="page-header">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {/* Icon, Title, Favorite */}
        <div className="flex items-start gap-4">
          {/* Icon picker */}
          <div className="relative">
            <Tooltip content="Change icon" position="bottom">
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors',
                  'hover:bg-background-hover',
                  showIconPicker && 'ring-2 ring-primary'
                )}
                aria-label="Change page icon"
              >
                {icon}
              </button>
            </Tooltip>

            {showIconPicker && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-background-primary border border-border-light rounded-xl shadow-lg p-3 w-80 max-h-60 overflow-y-auto animate-slide-down">
                <div className="mb-2">
                  <input
                    ref={iconSearchRef}
                    type="text"
                    placeholder="Search icons..."
                    className="w-full px-3 py-2 text-sm bg-background-tertiary border border-border-light rounded-lg focus:border-border-focus focus:ring-2 focus:ring-primary-light"
                    onChange={(e) => iconSearchRef.current = e.target.value}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {ICONS.filter(ic => ic.toLowerCase().includes(iconSearchRef.current.toLowerCase())).map((ic, index) => (
                    <button
                      key={index}
                      onClick={() => { handleIconSelect(ic); setShowIconPicker(false); }}
                      className="p-2 rounded-lg hover:bg-background-hover transition-colors text-2xl"
                      aria-label={`Select ${ic}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1
              contentEditable={true}
              onInput={handleTitleChange}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              onPaste={(e) => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, text); }}
              className={cn(
                'text-3xl font-display font-bold text-foreground-primary min-h-[3rem]',
                'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1 rounded',
                'prose prose-neutral max-w-none',
                'placeholder:text-foreground-tertiary'
              )}
              data-placeholder="Untitled"
              spellCheck={true}
              suppressContentEditableWarning
            >
              {page.title}
            </h1>
          </div>

          {/* Favorite */}
          <Tooltip content={page.isFavorited ? 'Remove from favorites' : 'Add to favorites'} position="bottom">
            <button
              onClick={onFavorite}
              className={cn(
                'p-2 rounded-lg transition-colors flex-shrink-0',
                page.isFavorited
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30'
                  : 'text-foreground-tertiary hover:text-amber-500 hover:bg-background-hover'
              )}
              aria-label={page.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={page.isFavorited}
            >
              <Star className={cn('w-5 h-5', page.isFavorited && 'fill-current')} />
            </button>
          </Tooltip>

          {/* Page menu */}
          <Tooltip content="Page options" position="bottom">
            <Dropdown
              trigger={
                <button
                  onClick={() => setShowPageMenu(!showPageMenu)}
                  className={cn(
                    'p-2 rounded-lg transition-colors text-foreground-tertiary hover:text-foreground-primary hover:bg-background-hover',
                    showPageMenu && 'bg-background-hover'
                  )}
                  aria-label="Page options"
                  aria-expanded={showPageMenu}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              }
              items={pageMenuItems}
              align="right"
            />
          </Tooltip>
        </div>

        {/* Tags, Cover, Published */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tags */}
          <div className="flex items-center gap-2">
            {(page.tags || []).map(tag => (
              <Tooltip key={tag.name} content="Remove tag" position="top">
                <Badge
                  variant="default"
                  className={cn('gap-1', tagColors[tag.name] || 'bg-primary-light text-primary')}
                  onClick={() => onRemoveTag(tag.id)}
                >
                  {tag.name}
                  <X className="w-3 h-3 hover:opacity-100 transition-opacity cursor-pointer" />
                </Badge>
              </Tooltip>
            ))}

            {showTagInput ? (
              <form onSubmit={onAddTag} className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="px-2 py-1 text-sm bg-background-tertiary border border-border-light rounded-lg focus:border-border-focus focus:ring-2 focus:ring-primary-light w-32"
                  autoFocus
                />
                <button type="submit" className="p-1.5 text-foreground-tertiary hover:text-primary">
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowTagInput(false); setNewTag(''); }}
                  className="p-1.5 text-foreground-tertiary hover:text-error"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <Tooltip content="Add tag" position="bottom">
                <button
                  onClick={() => setShowTagInput(true)}
                  className="p-1.5 text-foreground-tertiary hover:text-primary rounded-lg transition-colors"
                  aria-label="Add tag"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>

          {/* Cover image */}
          <div className="relative">
            {coverUrl ? (
              <div className="relative h-20 w-40 rounded-lg overflow-hidden">
                <img
                  src={coverUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <Tooltip content="Change cover" position="top">
                  <button
                    onClick={() => setShowCoverInput(true)}
                    className="absolute bottom-1 right-1 p-1.5 bg-background-primary/90 backdrop-blur rounded hover:bg-background-hover transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Change cover"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Remove cover" position="top">
                  <button
                    onClick={() => setCoverUrl('')}
                    className="absolute bottom-1 left-1 p-1.5 bg-background-primary/90 backdrop-blur rounded hover:bg-background-hover transition-colors opacity-0 group-hover:opacity-100 transition-opacity text-error"
                    aria-label="Remove cover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <Tooltip content="Add cover" position="bottom">
                <button
                  onClick={() => setShowCoverInput(true)}
                  className="h-20 w-40 border-2 border-dashed border-border-default rounded-lg flex items-center justify-center text-foreground-tertiary hover:border-primary hover:text-primary transition-colors"
                  aria-label="Add cover image"
                >
                  <span className="text-sm">Add cover</span>
                </button>
              </Tooltip>
            )}

            {showCoverInput && (
              <form onSubmit={handleCoverSubmit} className="absolute top-full left-0 mt-2 w-64 animate-slide-down">
                <div className="bg-background-primary border border-border-light rounded-lg shadow-lg p-2">
                  <Input
                    type="url"
                    placeholder="Image URL"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCoverInput(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" size="sm">Apply</Button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Publish status */}
          {publishedUrl && (
            <Tooltip content="Copy public link" position="bottom">
              <button
                onClick={copyPublishedUrl}
                className="px-3 py-1.5 bg-primary-light text-primary rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Public
              </button>
            </Tooltip>
          )}

          {/* Save indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {saving && (
              <span className="flex items-center gap-1 text-foreground-secondary">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </span>
            )}
            {!saving && !saveError && (
              <span className="text-foreground-tertiary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success" />
                Saved
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
      </div>

      {/* Publish modal */}
      {showPublishModal && (
        <Modal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          title="Page Published"
          description="Your page is now publicly accessible"
        >
          <div className="space-y-3">
            <div className="p-3 bg-background-tertiary rounded-lg flex items-center gap-2">
              <input
                type="text"
                value={publishedUrl}
                readOnly
                className="flex-1 text-sm bg-transparent border-none focus:outline-none text-foreground-primary"
              />
              <Button variant="outline" size="sm" onClick={copyPublishedUrl}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-sm text-foreground-secondary">
              Anyone with this link can view your page. Changes sync automatically.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowPublishModal(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
}