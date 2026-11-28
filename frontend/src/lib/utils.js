import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date, options = {}) {
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  return new Date(date).toLocaleDateString(undefined, defaultOptions);
}

export function formatRelativeTime(date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function generateId() {
  return crypto.randomUUID();
}

export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str, length = 50) {
  if (str.length <= length) return str;
  return str.slice(0, length).trim() + '…';
}

export function parseBlocks(content) {
  try {
    return JSON.parse(content || '[]');
  } catch {
    return [];
  }
}

export function serializeBlocks(blocks) {
  return JSON.stringify(blocks);
}

export function getBlockTypeLabel(type) {
  const labels = {
    paragraph: 'Text',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    bulleted_list: 'Bulleted list',
    numbered_list: 'Numbered list',
    todo_list: 'To-do list',
    code: 'Code block',
    callout: 'Callout',
    quote: 'Quote',
    divider: 'Divider',
    image: 'Image',
    bookmark: 'Bookmark',
    table: 'Table',
    file: 'File'
  };
  return labels[type] || type;
}

export function getBlockTypeIcon(type) {
  const icons = {
    paragraph: 'Type',
    heading1: 'Heading1',
    heading2: 'Heading2',
    heading3: 'Heading3',
    bulleted_list: 'List',
    numbered_list: 'ListOrdered',
    todo_list: 'CheckSquare',
    code: 'Code',
    callout: 'MessageSquare',
    quote: 'Quote',
    divider: 'Minus',
    image: 'Image',
    bookmark: 'Bookmark',
    table: 'Table',
    file: 'File'
  };
  return icons[type] || 'FileText';
}

export const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Text', icon: 'Type', shortcut: '' },
  { type: 'heading1', label: 'Heading 1', icon: 'Heading1', shortcut: '1' },
  { type: 'heading2', label: 'Heading 2', icon: 'Heading2', shortcut: '2' },
  { type: 'heading3', label: 'Heading 3', icon: 'Heading3', shortcut: '3' },
  { type: 'bulleted_list', label: 'Bulleted list', icon: 'List', shortcut: '' },
  { type: 'numbered_list', label: 'Numbered list', icon: 'ListOrdered', shortcut: '' },
  { type: 'todo_list', label: 'To-do list', icon: 'CheckSquare', shortcut: '' },
  { type: 'code', label: 'Code block', icon: 'Code', shortcut: '' },
  { type: 'callout', label: 'Callout', icon: 'MessageSquare', shortcut: '' },
  { type: 'quote', label: 'Quote', icon: 'Quote', shortcut: '' },
  { type: 'divider', label: 'Divider', icon: 'Minus', shortcut: '' },
  { type: 'image', label: 'Image', icon: 'Image', shortcut: '' },
  { type: 'bookmark', label: 'Bookmark', icon: 'Bookmark', shortcut: '' },
  { type: 'table', label: 'Table', icon: 'Table', shortcut: '' },
  { type: 'file', label: 'File', icon: 'File', shortcut: '' }
];

export const CALL_TYPES = [
  { value: 'info', label: 'Info', icon: 'Info', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'warning', label: 'Warning', icon: 'AlertTriangle', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'success', label: 'Success', icon: 'CheckCircle', color: 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400' },
  { value: 'error', label: 'Error', icon: 'XCircle', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' }
];

export const ICONS = [
  '📝', '📄', '📂', '📁', '🗂️', '📋', '📌', '🏷️', '🔖', '⭐',
  '🏠', '💼', '🎯', '📚', '🗒️', '📖', '📕', '📗', '📘', '📙',
  '🎨', '🎮', '🎵', '🎬', '🖼️', '📸', '🎭', '🎪', '🎨', '🖌️',
  '💡', '💭', '💬', '💭', '💫', '✨', '🌟', '⭐', '💎', '🔮',
  '🌱', '🌿', '🍃', '🌲', '🌳', '🌴', '🌵', '🌾', '🌻', '🌸',
  '☕', '🍵', '🍶', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃',
  '🚀', '✈️', '🛸', '🛰️', '🌙', '☀️', '⭐', '☁️', '⛅', '🌤️',
  '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💿', '📀', '📷', '📹',
  '🔧', '🔨', '⚙️', '🔩', '🔗', '⛓️', '🧰', '🧲', '🔍', '🔎'
];