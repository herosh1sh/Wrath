import Database from 'better-sqlite3';
import { join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = join(process.cwd(), 'data');
const dbPath = join(DATA_DIR, 'notion-clone.db');
const db = new Database(dbPath);

const now = Date.now();
const userId = uuidv4();
const workspaceId = uuidv4();

// Hash password
const passwordHash = await bcrypt.hash('demo123', 10);

// Insert demo user
db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password_hash, name, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(userId, 'demo', passwordHash, 'Демо пользователь', now, now);

// Insert demo workspace
db.prepare(`
  INSERT OR IGNORE INTO workspaces (id, name, icon, icon_color, owner_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(workspaceId, 'Wrath Workspace', '⚔️', '#DC2626', userId, now, now);

// Add user as workspace member
db.prepare(`
  INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(uuidv4(), workspaceId, userId, 'owner', now);

// Create sample pages
const welcomePageId = uuidv4();
const gettingStartedId = uuidv4();
const featuresId = uuidv4();

const welcomeContent = JSON.stringify([
  { id: uuidv4(), type: 'heading1', content: { text: 'Добро пожаловать в Wrath' } },
  { id: uuidv4(), type: 'paragraph', content: { text: 'Мощное самохостируемое приложение для заметок и базы знаний для тех, кто требует больше.' } },
  { id: uuidv4(), type: 'heading2', content: { text: 'Основные возможности' } },
  { id: uuidv4(), type: 'bulletedList', content: { items: ['Блочный редактор с командами через /', 'Иерархическая организация страниц', 'Готовность к совместной работе в реальном времени', 'Полнотекстовый поиск', 'Тёмная/светлая тема', 'Развёртывание через Docker'] } },
  { id: uuidv4(), type: 'heading2', content: { text: 'Начало работы' } },
  { id: uuidv4(), type: 'paragraph', content: { text: 'Нажмите /, чтобы увидеть доступные типы блоков. Используйте Markdown-сокращения: # для заголовков, - для списков.' } },
  { id: uuidv4(), type: 'code', content: { text: '# Пример блока кода\nconsole.log("Привет, Wrath!");', language: 'javascript' } },
]);

const gettingStartedContent = JSON.stringify([
  { id: uuidv4(), type: 'heading1', content: { text: 'Руководство по началу работы' } },
  { id: uuidv4(), type: 'paragraph', content: { text: 'Это руководство поможет вам освоить основы Wrath.' } },
  { id: uuidv4(), type: 'heading2', content: { text: 'Создание страниц' } },
  { id: uuidv4(), type: 'numberedList', content: { items: ['Нажмите кнопку + в боковой панели', 'Или нажмите Ctrl/Cmd + N', 'Выберите шаблон или начните с чистого листа'] } },
  { id: uuidv4(), type: 'heading2', content: { text: 'Типы блоков' } },
  { id: uuidv4(), type: 'paragraph', content: { text: 'Введите /, чтобы увидеть все доступные блоки: заголовки, списки, код, цитаты, выноски, изображения и многое другое.' } },
]);

const featuresContent = JSON.stringify([
  { id: uuidv4(), type: 'heading1', content: { text: 'Обзор возможностей' } },
  { id: uuidv4(), type: 'paragraph', content: { text: 'Wrath включает все необходимые функции для современной базы знаний.' } },
  { id: uuidv4(), type: 'heading3', content: { text: 'Редактор' } },
  { id: uuidv4(), type: 'bulletedList', content: { items: ['Меню слеш-команд', 'Markdown-сокращения', 'Перетаскивание для переупорядочивания', 'Панель форматирования внутри строки'] } },
  { id: uuidv4(), type: 'heading3', content: { text: 'Организация' } },
  { id: uuidv4(), type: 'bulletedList', content: { items: ['Вложенные страницы', 'Теги и свойства', 'Избранное', 'История страниц'] } },
]);

db.prepare(`
  INSERT OR IGNORE INTO pages (id, workspace_id, parent_id, title, content, created_by, last_edited_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(welcomePageId, workspaceId, null, 'Добро пожаловать', welcomeContent, userId, userId, now, now);

db.prepare(`
  INSERT OR IGNORE INTO pages (id, workspace_id, parent_id, title, content, created_by, last_edited_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(gettingStartedId, workspaceId, welcomePageId, 'Начало работы', gettingStartedContent, userId, userId, now + 1000, now + 1000);

db.prepare(`
  INSERT OR IGNORE INTO pages (id, workspace_id, parent_id, title, content, created_by, last_edited_by, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(featuresId, workspaceId, welcomePageId, 'Возможности', featuresContent, userId, userId, now + 2000, now + 2000);

// Add some tags
const tag1Id = uuidv4();
const tag2Id = uuidv4();
const tag3Id = uuidv4();

db.prepare(`
  INSERT OR IGNORE INTO tags (id, workspace_id, name, color, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(tag1Id, workspaceId, 'Начало работы', '#0891B2', now);

db.prepare(`
  INSERT OR IGNORE INTO tags (id, workspace_id, name, color, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(tag2Id, workspaceId, 'Руководство', '#059669', now);

db.prepare(`
  INSERT OR IGNORE INTO tags (id, workspace_id, name, color, created_at)
  VALUES (?, ?, ?, ?, ?)
`).run(tag3Id, workspaceId, 'Возможности', '#D97706', now);

db.prepare(`
  INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)
`).run(gettingStartedId, tag1Id);

db.prepare(`
  INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)
`).run(gettingStartedId, tag2Id);

db.prepare(`
  INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)
`).run(featuresId, tag3Id);

// Add favorites
db.prepare(`
  INSERT OR IGNORE INTO favorites (id, user_id, page_id, created_at)
  VALUES (?, ?, ?, ?)
`).run(uuidv4(), userId, welcomePageId, now);

console.log('Database seeded successfully!');
db.close();