import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ChevronRight, ChevronDown, MessageSquare, Share2, Star, Tag, Archive, Clock, User, MoreHorizontal, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Dropdown } from './ui/Dropdown';
import { Tooltip } from './ui/Tooltip';
import { Modal } from './ui/Modal';
import { api } from '../lib/api';
import { useToast } from './ui/Toaster';
import { formatRelativeTime } from '../lib/utils';

export function PageSidebar({ page, workspaceId }) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (page) {
      fetchComments();
      fetchActivity();
    }
  }, [page?.id]);

  const fetchComments = async () => {
    if (!page?.id) return;
    setLoadingComments(true);
    try {
      const data = await api.comments.listByPage(page.id);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchActivity = async () => {
    if (!page?.id || !workspaceId) return;
    try {
      const data = await api.pages.get(page.id);
      // In a real app, you'd have an activity endpoint
      setActivities([]);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !page?.id) return;

    setSubmittingComment(true);
    try {
      const data = await api.comments.create({
        pageId: page.id,
        content: newComment.trim()
      });
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolveComment = async (commentId, resolved) => {
    try {
      await api.comments.resolve(commentId);
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, resolved: !resolved } : c
      ));
    } catch (error) {
      toast.error('Error', 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.comments.delete(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Error', 'Failed to delete comment');
    }
  };

  const commentMenuItems = (comment) => [
    { label: resolved ? 'Unresolve' : 'Resolve', icon: resolved ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />, onClick: () => handleResolveComment(comment.id, comment.resolved), shortcut: '' },
    { type: 'divider' },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDeleteComment(comment.id), shortcut: '', className: 'text-error' }
  ];

  const { Check, Trash2 } = require('lucide-react');

  if (!page) return null;

  return (
    <aside className="w-80 bg-background-secondary border-l border-border-light flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Properties */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground-primary">Properties</h3>
            <button
              onClick={() => setShowProperties(!showProperties)}
              className="p-1 rounded hover:bg-background-hover text-foreground-tertiary"
              aria-label={showProperties ? 'Collapse' : 'Expand'}
            >
              <ChevronRight className={cn('w-4 h-4 transition-transform', showProperties && 'rotate-90')} />
            </button>
          </div>

          {showProperties && (
            <div className="space-y-3">
              <PropertyRow label="Created by">
                <div className="flex items-center gap-2">
                  <Avatar size="sm" name={page.created_by_display_name} src={page.created_by_avatar} />
                  <span className="text-sm text-foreground-primary">{page.created_by_display_name || page.created_by_username}</span>
                </div>
              </PropertyRow>

              <PropertyRow label="Created">
                <span className="text-sm text-foreground-secondary">{formatRelativeTime(page.created_at)}</span>
              </PropertyRow>

              <PropertyRow label="Last edited">
                <div className="flex items-center gap-2">
                  <Avatar size="sm" name={page.last_edited_by_display_name} src={page.last_edited_by_avatar} />
                  <span className="text-sm text-foreground-secondary">{formatRelativeTime(page.last_edited_at)}</span>
                </div>
              </PropertyRow>

              {page.is_published && (
                <PropertyRow label="Published">
                  <Badge variant="success">Public</Badge>
                </PropertyRow>
              )}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-4 border-t border-border-light pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground-primary flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments
              {comments.length > 0 && (
                <Badge variant="outline">{comments.length}</Badge>
              )}
            </h3>
            <button
              onClick={() => setShowComments(!showComments)}
              className="p-1 rounded hover:bg-background-hover text-foreground-tertiary"
              aria-label={showComments ? 'Collapse' : 'Expand'}
            >
              <ChevronRight className={cn('w-4 h-4 transition-transform', showComments && 'rotate-90')} />
            </button>
          </div>

          {showComments && (
            <div className="space-y-4 mt-4">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onResolve={handleResolveComment}
                  onDelete={handleDeleteComment}
                  currentUserId={page.last_edited_by} // In real app, use auth user
                />
              ))}

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Avatar size="sm" name="You" />
                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="px-3 py-2 text-sm bg-background-tertiary border border-border-light rounded-lg focus:border-border-focus focus:ring-2 focus:ring-primary-light resize-none"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" loading={submittingComment}>
                      Comment
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="space-y-4 border-t border-border-light pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground-primary flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Activity
            </h3>
            <button
              onClick={() => setShowActivity(!showActivity)}
              className="p-1 rounded hover:bg-background-hover text-foreground-tertiary"
              aria-label={showActivity ? 'Collapse' : 'Expand'}
            >
              <ChevronRight className={cn('w-4 h-4 transition-transform', showActivity && 'rotate-90')} />
            </button>
          </div>

          {showActivity && (
            <div className="space-y-3 mt-4">
              {activities.length === 0 ? (
                <p className="text-sm text-foreground-tertiary text-center py-4">No recent activity</p>
              ) : (
                activities.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function PropertyRow({ label, children }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground-tertiary">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function CommentItem({ comment, onResolve, onDelete, currentUserId }) {
  const isOwn = comment.user_id === currentUserId;
  const resolved = comment.resolved;

  return (
    <div className={cn('flex gap-3', resolved && 'opacity-60')}>
      <Avatar size="sm" name={comment.display_name || comment.username} src={comment.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground-primary">{comment.display_name || comment.username}</span>
          <span className="text-xs text-foreground-tertiary">{formatRelativeTime(comment.created_at)}</span>
          {resolved && <Badge variant="success" className="text-xs">Resolved</Badge>}
          {isOwn && (
            <Tooltip content="Comment options" position="right">
              <Dropdown
                trigger={
                  <button className="p-1 rounded hover:bg-background-hover text-foreground-tertiary" aria-label="Comment options">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                }
                items={commentMenuItems(comment)}
                align="right"
              />
            </Tooltip>
          )}
        </div>
        <p className="text-sm text-foreground-secondary mt-1">{comment.content}</p>
      </div>
    </div>
  );
}

function ActivityItem({ activity }) {
  return (
    <div className="flex gap-3 text-sm">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-foreground-secondary">{activity.action} {activity.entity_type}</p>
        <p className="text-xs text-foreground-tertiary">{formatRelativeTime(activity.created_at)}</p>
      </div>
    </div>
  );
}