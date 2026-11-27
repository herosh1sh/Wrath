import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = join(DATA_DIR, 'notion-clone.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  icon_color TEXT,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, user_id)
);

-- Pages table (hierarchical)
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  parent_id TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT,
  icon_color TEXT,
  cover_url TEXT,
  cover_position REAL DEFAULT 0.5,
  content TEXT, -- JSON serialized blocks
  properties TEXT, -- JSON for custom properties
  is_deleted INTEGER DEFAULT 0,
  deleted_at INTEGER,
  created_by TEXT NOT NULL,
  last_edited_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (last_edited_by) REFERENCES users(id)
);

-- Page blocks (for granular editing)
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  parent_block_id TEXT,
  type TEXT NOT NULL,
  content TEXT, -- JSON
  position INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_block_id) REFERENCES blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Page versions for history
CREATE TABLE IF NOT EXISTS page_versions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  block_id TEXT,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  resolved INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, name)
);

-- Page tags (many-to-many)
CREATE TABLE IF NOT EXISTS page_tags (
  page_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (page_id, tag_id),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Favorites/Bookmarks
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  UNIQUE(user_id, page_id)
);

-- Search index (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  page_id UNINDEXED,
  title,
  content,
  tokenize = 'porter unicode61'
);

-- Triggers for search index
CREATE TRIGGER IF NOT EXISTS search_index_insert AFTER INSERT ON pages BEGIN
  INSERT INTO search_index (page_id, title, content)
  VALUES (NEW.id, NEW.title, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS search_index_update AFTER UPDATE ON pages BEGIN
  UPDATE search_index
  SET title = NEW.title, content = NEW.content
  WHERE page_id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS search_index_delete AFTER DELETE ON pages BEGIN
  DELETE FROM search_index WHERE page_id = OLD.id;
END;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pages_workspace ON pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parent_block_id);
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
`;

db.exec(schema);

console.log('Database initialized successfully at:', dbPath);
db.close();