import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Filter, Tag, Clock, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Dropdown } from '../components/ui/Dropdown';
import { Tooltip } from '../components/ui/Tooltip';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toaster';
import { formatRelativeTime, cn } from '../lib/utils';
import { MoreHorizontal, Star, Copy, Download, Edit, Trash2 } from 'lucide-react';

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [workspaceId, setWorkspaceId] = useState(searchParams.get('workspaceId') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const limit = 20;

  useEffect(() => {
    const q = searchParams.get('q');
    const ws = searchParams.get('workspaceId');
    if (q) setQuery(q);
    if (ws) setWorkspaceId(ws);
  }, [searchParams]);

  useEffect(() => {
    if (workspaceId) {
      fetchTags();
    }
  }, [workspaceId]);

  const fetchTags = async () => {
    try {
      const data = await api.tags.list(workspaceId);
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || !workspaceId) return;

    setLoading(true);
    setPage(1);
    try {
      const params = {
        q: query,
        workspaceId,
        limit: limit.toString(),
        offset: '0',
        tags: selectedTags.join(',')
      };
      const data = await api.search.query(params);
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Error', 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    setPage(newPage);
    setLoading(true);
    try {
      const params = {
        q: query,
        workspaceId,
        limit: limit.toString(),
        offset: ((newPage - 1) * limit).toString(),
        tags: selectedTags.join(',')
      };
      const data = await api.search.query(params);
      setResults(data.results || []);
    } catch (error) {
      toast.error('Error', 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const resultMenuItems = (result) => [
    { label: 'Open', icon: <FileText className="w-4 h-4" />, onClick: () => navigate(`/pages/${result.id}`), shortcut: '' },
    { label: result.isFavorited ? 'Remove from favorites' : 'Add to favorites', icon: result.isFavorited ? <Star className="w-4 h-4 fill-current text-amber-500" /> : <Star className="w-4 h-4" />, onClick: () => {}, shortcut: '' },
    { label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onClick: () => {}, shortcut: '' },
    { type: 'divider' },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => {}, shortcut: '', className: 'text-error' }
  ];

  if (!workspaceId) {
    return (
      <div className="flex-1 p-6 max-w-2xl mx-auto">
        <div className="text-center py-12">
          <Search className="w-16 h-16 mx-auto text-foreground-tertiary mb-4" />
          <h2 className="text-2xl font-bold text-foreground-primary mb-2">Select a workspace</h2>
          <p className="text-foreground-secondary">Choose a workspace from the sidebar to search within it</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, blocks, content..."
            className="w-full h-12 pl-12 pr-4 text-base bg-background-tertiary border border-border-light rounded-xl focus:border-border-focus focus:ring-2 focus:ring-primary-light"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setTotal(0); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Tooltip content="Filter by tags" position="bottom">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn('gap-1', showFilters && 'bg-primary-light text-primary border-primary')}
            >
              <Filter className="w-4 h-4" />
              Filters
              {selectedTags.length > 0 && (
                <Badge variant="primary" className="text-xs">{selectedTags.length}</Badge>
              )}
            </Button>
          </Tooltip>

          {availableTags.length > 0 && showFilters && (
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-full border transition-colors',
                    selectedTags.includes(tag.id)
                      ? `bg-${tag.color.replace('#', '')}20 text-${tag.color.replace('#', '')} border-${tag.color.replace('#', '')}`
                      : 'bg-background-tertiary text-foreground-secondary border-border-light hover:border-primary'
                  )}
                  style={{ borderColor: selectedTags.includes(tag.id) ? tag.color : undefined }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {selectedTags.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : query && results.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-foreground-tertiary mb-4" />
          <h3 className="text-lg font-medium text-foreground-primary mb-2">No results found</h3>
          <p className="text-foreground-secondary">Try different keywords or adjust filters</p>
        </div>
      ) : (
        <>
          {results.length > 0 && (
            <div className="space-y-3 mb-6">
              {results.map(result => (
                <Card
                  key={result.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/pages/${result.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-medium text-foreground-primary truncate">{result.title || 'Untitled'}</h3>
                          <Tooltip content="More options" position="right">
                            <Dropdown
                              trigger={
                                <button className="p-1 rounded hover:bg-background-hover text-foreground-tertiary" aria-label="Result options">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              }
                              items={resultMenuItems(result)}
                              align="right"
                            />
                          </Tooltip>
                        </div>
                        {result.snippet && (
                          <p className="text-sm text-foreground-secondary line-clamp-2 mb-2">{result.snippet}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-tertiary">
                          {result.tags?.map(tag => (
                            <Badge key={tag.name} variant="outline" className="text-xs">{tag.name}</Badge>
                          ))}
                          <span>•</span>
                          <span>{formatRelativeTime(result.updated_at)}</span>
                          {result.isFavorited && (
                            <>
                              <span>•</span>
                              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-foreground-secondary px-4">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= Math.ceil(total / limit)}
              >
                Next
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}