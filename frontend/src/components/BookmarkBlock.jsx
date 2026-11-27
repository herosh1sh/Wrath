import { useState, useEffect } from 'react';
import { Link as LinkIcon, X, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export function BookmarkBlock({ content, readOnly, onUpdate }) {
  const [url, setUrl] = useState(content.url || '');
  const [metadata, setMetadata] = useState(content.metadata || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setUrl(content.url || '');
    setMetadata(content.metadata || null);
  }, [content.url, content.metadata]);

  const fetchMetadata = async (bookmarkUrl) => {
    setLoading(true);
    setError(null);
    try {
      // Use a metadata fetching service or try to fetch directly
      const response = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(bookmarkUrl)}`);
      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
        onUpdate?.({ content: { ...content, url: bookmarkUrl, metadata: data } });
      } else {
        setError('Не удалось получить превью ссылки');
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
      setError('Не удалось получить превью ссылки');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (newUrl && (newUrl.startsWith('http://') || newUrl.startsWith('https://'))) {
      // Debounce metadata fetch
      clearTimeout(window.metadataFetchTimeout);
      window.metadataFetchTimeout = setTimeout(() => fetchMetadata(newUrl), 500);
    }
  };

  const removeBookmark = () => {
    setUrl('');
    setMetadata(null);
    onUpdate?.({ content: { ...content, url: '', metadata: null } });
  };

  if (!url && !metadata) {
    return (
      <div className="border-2 border-dashed border-border rounded-md p-6">
        {!readOnly ? (
          <div className="space-y-3 max-w-md">
            <Input
              value={url}
              onChange={handleUrlChange}
              placeholder="Вставьте ссылку для создания закладки..."
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {loading && <p className="text-sm text-foreground-muted">Получение превью...</p>}
          </div>
        ) : (
          <p className="text-center text-foreground-muted">Нет закладки</p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md overflow-hidden hover:shadow-md transition-shadow">
      {!readOnly && (
        <div className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="icon" onClick={removeBookmark} aria-label="Удалить закладку">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
        onClick={(e) => {
          if (readOnly) return;
          // Allow clicking on the link, but not on the remove button
        }}
      >
        {metadata?.image && (
          <img
            src={metadata.image}
            alt=""
            className="w-20 h-20 object-cover rounded flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground-muted truncate">{new URL(url).hostname}</p>
          <h4 className="font-medium text-foreground truncate">{metadata?.title || url}</h4>
          {metadata?.description && (
            <p className="text-sm text-foreground-muted line-clamp-2 mt-1">{metadata.description}</p>
          )}
        </div>
        <ExternalLink className="flex-shrink-0 text-foreground-muted" />
      </a>
    </div>
  );
}