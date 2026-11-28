import { getDatabase, initializeDatabase } from './init.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const db = initializeDatabase();

function seed() {
  console.log('🌱 Seeding database...');

  // Check if already seeded
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');
  if (existingUser) {
    console.log('✅ Database already seeded');
    return;
  }

  const now = new Date().toISOString();

  // Create demo user
  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync('demo123', 10);

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, display_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, 'demo', 'demo@wrath.local', passwordHash, 'Demo User', now);

  // Create demo workspace
  const workspaceId = uuidv4();
  db.prepare(`
    INSERT INTO workspaces (id, name, description, icon, owner_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(workspaceId, 'Wrath Demo', 'Welcome to Wrath - your Notion alternative', '📝', userId, now);

  // Add user as owner
  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), workspaceId, userId, 'owner', now);

  // Create welcome page
  const welcomePageId = uuidv4();
  const welcomeContent = JSON.stringify([
    { id: uuidv4(), type: 'heading1', content: { text: 'Welcome to Wrath 🎉' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'This is your new Notion-like workspace. Built with a minimalist design in soft tones that are easy on the eyes.' } },
    { id: uuidv4(), type: 'heading2', content: { text: 'Getting Started' } },
    { id: uuidv4(), type: 'bulleted_list', content: { items: ['Create pages with / command', 'Organize with nested pages', 'Add tags and favorites', 'Collaborate in real-time'] } },
    { id: uuidv4(), type: 'heading2', content: { text: 'Keyboard Shortcuts' } },
    { id: uuidv4(), type: 'paragraph', content: { text: '/ → Slash menu for blocks' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Cmd/Ctrl + P → Quick search' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Cmd/Ctrl + Shift + P → Command palette' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Tab → Indent block' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Shift + Tab → Outdent block' } },
    { id: uuidv4(), type: 'heading2', content: { text: 'Block Types Available' } },
    { id: uuidv4(), type: 'bulleted_list', content: { items: ['Text, Headings (1-3)', 'Bulleted/Numbered/Todo lists', 'Code blocks with syntax highlighting', 'Callouts (info, warning, success)', 'Bookmarks & Links', 'Images & Files', 'Tables', 'Dividers', 'Quotes'] } }
  ]);

  db.prepare(`
    INSERT INTO pages (id, workspace_id, title, content, icon, created_by, created_at, updated_at, last_edited_by, last_edited_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(welcomePageId, workspaceId, 'Welcome', welcomeContent, '👋', userId, now, now, userId, now);

  // Create getting started page
  const gettingStartedId = uuidv4();
  const gettingStartedContent = JSON.stringify([
    { id: uuidv4(), type: 'heading1', content: { text: 'Getting Started with Wrath' } },
    { id: uuidv4(), type: 'callout', content: { type: 'info', text: 'Wrath is a self-hosted Notion alternative. All your data stays on your server.' } },
    { id: uuidv4(), type: 'heading2', content: { text: 'Creating Pages' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Click the + button in the sidebar or press Cmd/Ctrl + N to create a new page. You can nest pages infinitely by dragging them in the sidebar.' } },
    { id: uuidv4(), type: 'heading2', content: { text: 'Using Blocks' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Type / anywhere to open the slash menu and add different block types. Each block can be moved with the drag handle (⋮⋮) on hover.' } },
    { id: uuidv4(), type: 'code', content: { language: 'javascript', code: 'console.log("Hello Wrath!");' } },
    { id: uuidv4(), type: 'heading2', content: { text: 'Tags & Organization' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Add tags to pages for easy filtering. Click the tag icon in the page header to manage tags.' } },
    { id: uuidv4(), type: 'heading2', content: { text: 'Favorites' } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Press ⭐ on any page to add it to favorites. Access them quickly from the sidebar.' } }
  ]);

  db.prepare(`
    INSERT INTO pages (id, workspace_id, title, content, icon, created_by, created_at, updated_at, last_edited_by, last_edited_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(gettingStartedId, workspaceId, 'Getting Started', gettingStartedContent, '🚀', userId, now, now, userId, now);

  // Create sample tags
  const tags = [
    { name: 'Important', color: '#E14B5C' },
    { name: 'Ideas', color: '#F5C52C' },
    { name: 'Projects', color: '#7E963B' },
    { name: 'Personal', color: '#9B87CD' },
    { name: 'Reference', color: '#65782E' }
  ];

  for (const tag of tags) {
    const tagId = uuidv4();
    db.prepare(`
      INSERT INTO tags (id, workspace_id, name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tagId, workspaceId, tag.name, tag.color, now);
  }

  // Add tags to welcome page
  const importantTag = db.prepare('SELECT id FROM tags WHERE workspace_id = ? AND name = ?').get(workspaceId, 'Important');
  const ideasTag = db.prepare('SELECT id FROM tags WHERE workspace_id = ? AND name = ?').get(workspaceId, 'Ideas');

  if (importantTag) {
    db.prepare('INSERT INTO page_tags (page_id, tag_id) VALUES (?, ?)').run(welcomePageId, importantTag.id);
  }
  if (ideasTag) {
    db.prepare('INSERT INTO page_tags (page_id, tag_id) VALUES (?, ?)').run(gettingStartedId, ideasTag.id);
  }

  // Add to favorites
  db.prepare(`
    INSERT INTO favorites (id, user_id, page_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, welcomePageId, now);

  console.log('✅ Database seeded successfully!');
  console.log('   Demo login: demo / demo123');
}

seed();