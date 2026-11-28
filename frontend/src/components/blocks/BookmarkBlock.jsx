import { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ExternalLink, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toaster';

export const BookmarkBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);

  const fetchMetadata = async (url) => {
    if (!url) return;
    setLoading(true);
    try {
      // In a real app, you'd have a backend endpoint to fetch metadata
      // For now, we'll just use the URL
      setMetadata({ url, title: '', description: '', image: '' });
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    onChange?.({ ...block.content, url });
    // Debounce metadata fetch
    clearTimeout(window.bookmarkTimeout);
    window.bookmarkTimeout = setTimeout(() => fetchMetadata(url), 500);
  };

  const handleTitleChange = (e) => {
    const title = e.target.innerText;
    onChange?.({ ...block.content, title });
  };

  const handleDescriptionChange = (e) => {
    const description = e.target.innerText;
    onChange?.({ ...block.content, description });
  };

  const handleRemove = () => {
    onChange?.({ ...block.content, url: '', title: '', description: '', image: '' });
    setMetadata(null);
  };

  useEffect(() => {
    if (block.content?.url) {
      fetchMetadata(block.content.url);
    }
  }, [block.content?.url]);

  const { url, title, description, image } = block.content || {};

  return (
    <div className="prose prose-neutral max-w-none my-4">
      {url ? (
        <div className="border border-border-light rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
          <div className="p-4">
            <div className="flex items-start gap-3">
              {image && (
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-foreground-tertiary">
                    <span className="font-mono text-xs bg-background-tertiary px-1.5 py-0.5 rounded">
                      {new URL(url).hostname}
                    </span>
                  </div>
                  {!readOnly && (
                    <Tooltip content="Remove bookmark" position="right">
                      <button
                        onClick={handleRemove}
                        className="p-1.5 rounded hover:bg-background-hover text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove bookmark"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  )}
                </div>

                <div
                  ref={!title && !readOnly ? ref : undefined}
                  contentEditable={!readOnly}
                  onInput={handleTitleChange}
                  onKeyDown={onKeyDown}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  className={cn(
                    'font-medium text-foreground-primary mb-1 min-h-[1.5rem]',
                    'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1 rounded',
                    'prose prose-neutral max-w-none',
                    readOnly ? 'pointer-events-none' : ''
                  )}
                  data-placeholder={loading ? 'Loading...' : 'Title'}
                  spellCheck={true}
                  suppressContentEditableWarning
                >
                  {title || (loading ? <Loader2 className="w-4 h-4 inline animate-spin" /> : '')}
                </div>

                {description && (
                  <p
                    contentEditable={!readOnly}
                    onInput={handleDescriptionChange}
                    onKeyDown={onKeyDown}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text/plain');
                      document.execCommand('insertText', false, text);
                    }}
                    className={cn(
                      'text-sm text-foreground-secondary line-clamp-3 min-h-[1.5rem]',
                      'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1 rounded',
                      'prose prose-neutral max-w-none',
                      readOnly ? 'pointer-events-none' : ''
                    )}
                    data-placeholder="Description"
                    spellCheck={true}
                    suppressContentEditableWarning
                  >
                    {description}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Open link
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border-default rounded-lg p-6 text-center hover:border-primary transition-colors">
          <ExternalLink className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
          <p className="text-foreground-secondary mb-4">Add a bookmark</p>
          <Input
            type="url"
            placeholder="Paste a URL (https://...)"
            value={url || ''}
            onChange={handleUrlChange}
            className="w-full max-w-md mx-auto"
            autoFocus
          />
        </div>
      )}
    </div>
  );
});

BookmarkBlock.displayName = 'BookmarkBlock';