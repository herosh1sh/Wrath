# Wrath

**Wrath** — это open-source альтернатива Notion, построенная на React, Node.js и PostgreSQL. Полнофункциональное приложение для заметок с поддержкой блоков, страницами, базами данных, совместной работой в реальном времени и многое другое.

## ✨ Возможности

- **Блочный редактор** — создавайте контент из гибких блоков (текст, заголовки, списки, код, цитаты, изображения, таблицы, закладки, разделители)
- **Страницы и вложенность** — организуйте заметки в иерархию страниц с неограниченной вложенностью
- **Рабочие пространства** — несколько рабочих пространств с изолированными данными
- **Совместная работа в реальном времени** — редактируйте вместе с командой через WebSocket
- **Обложки и иконки страниц** — настраивайте внешний вид страниц
- **Теги и избранное** — организуйте контент тегами и отмечайте важное
- **История версий** — отслеживайте изменения и восстанавливайте предыдущие версии
- **Комментарии** — обсуждайте контент прямо на страницах
- **Экспорт** — PDF, Markdown, HTML
- **Тёмная/светлая тема** — переключение темы с сохранением предпочтений
- **Командная палитра** — быстрый доступ к действиям (⌘K / Ctrl+K)

## 🛠 Технологический стек

### Frontend
- **React 18** + **Vite** — современный стек разработки
- **React Router v6** — маршрутизация
- **Tailwind CSS** — utility-first стилизация
- **Radix UI** (через shadcn/ui) — доступные примитивы UI
- **Lucide React** — иконки
- **Socket.io Client** — реальное время

### Backend
- **Node.js** + **Express** — REST API
- **PostgreSQL** + **pg** — база данных
- **Socket.io** — WebSocket для реального времени
- **JWT** — аутентификация
- **bcryptjs** — хеширование паролей
- **Multer** — загрузка файлов

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Установка

1. **Клонируйте репозиторий**
```bash
git clone https://github.com/herosh1sh/Wrath.git
cd wrath
```

2. **Настройте базу данных**
```bash
# Создайте базу данных PostgreSQL
createdb wrath

# Настройте переменные окружения (см. ниже)
```

3. **Установите зависимости**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

4. **Настройте переменные окружения**

Backend (`backend/.env`):
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/wrath
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

Frontend (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

5. **Инициализируйте базу данных**
```bash
cd backend
npm run db:seed
```

6. **Запустите в режиме разработки**

Терминал 1 (Backend):
```bash
cd backend
npm run dev
```

Терминал 2 (Frontend):
```bash
cd frontend
npm run dev
```

7. **Откройте приложение**
```
http://localhost:5173
```

## 📁 Структура проекта

```
wrath/
├── backend/
│   ├── src/
│   │   ├── config/         # Конфигурация БД
│   │   ├── middleware/     # Express middleware (auth, validation)
│   │   ├── routes/         # API маршруты
│   │   ├── services/       # Бизнес-логика
│   │   ├── utils/          # Утилиты
│   │   ├── seed.js         # Начальные данные
│   │   └── index.js        # Точка входа
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   │   ├── ui/         # Базовые UI компоненты (Button, Input, Modal, etc.)
│   │   │   ├── BlockEditor.jsx
│   │   │   ├── BlockRenderer.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   ├── PageSidebar.jsx
│   │   │   ├── SlashMenu.jsx
│   │   │   └── InlineToolbar.jsx
│   │   ├── contexts/       # React Context (Auth, Workspace, Theme, Socket)
│   │   ├── pages/          # Страницы (Login, Register, Settings, Workspace, etc.)
│   │   ├── lib/            # API клиент, утилиты
│   │   ├── hooks/          # Кастомные хуки
│   │   ├── styles/         # Глобальные стили, Tailwind
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## ⌨️ Горячие клавиши

| Действие | Windows/Linux | macOS |
|----------|---------------|-------|
| Командная палитра | `Ctrl+K` | `⌘K` |
| Новая страница | `Ctrl+N` | `⌘N` |
| Поиск | `Ctrl+P` | `⌘P` |
| Жирный | `Ctrl+B` | `⌘B` |
| Курсив | `Ctrl+I` | `⌘I` |
| Подчеркнутый | `Ctrl+U` | `⌘U` |
| Зачеркнутый | `Ctrl+Shift+X` | `⌘⇧X` |
| Моноширинный | `Ctrl+E` | `⌘E` |
| Ссылка | `Ctrl+K` | `⌘K` |
| Заголовок 1 | `# ` (в начале строки) | |
| Заголовок 2 | `## ` | |
| Заголовок 3 | `### ` | |
| Маркированный список | `- ` | |
| Нумерованный список | `1. ` | |
| Список задач | `[] ` | |
| Цитата | `> ` | |
| Блок кода | ``` ` `` | |
| Разделитель | `---` | |

## 🔧 Команды разработки

### Backend
```bash
npm run dev        # Запуск с nodemon
npm run start      # Продакшн запуск
npm run db:seed    # Заполнение БД тестовыми данными
npm run db:reset   # Сброс и повторное заполнение БД
```

### Frontend
```bash
npm run dev        # Vite dev server
npm run build      # Продакшн сборка
npm run preview    # Предпросмотр сборки
npm run lint       # ESLint проверка
```

## 🌐 API Endpoints

### Аутентификация
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход
- `GET /api/auth/me` — текущий пользователь
- `PUT /api/auth/profile` — обновление профиля
- `PUT /api/auth/password` — смена пароля

### Рабочие пространства
- `GET /api/workspaces` — список рабочих пространств
- `POST /api/workspaces` — создание
- `GET /api/workspaces/:id` — получение
- `PUT /api/workspaces/:id` — обновление
- `DELETE /api/workspaces/:id` — удаление
- `POST /api/workspaces/:id/members` — приглашение участника
- `DELETE /api/workspaces/:id/members/:userId` — удаление участника

### Страницы
- `GET /api/pages` — список страниц (с фильтрами)
- `POST /api/pages` — создание страницы
- `GET /api/pages/:id` — получение страницы
- `PUT /api/pages/:id` — обновление страницы
- `DELETE /api/pages/:id` — удаление (в корзину)
- `POST /api/pages/:id/duplicate` — дублирование
- `GET /api/pages/:id/history` — история версий
- `POST /api/pages/:id/restore/:versionId` — восстановление версии

### Блоки
- `GET /api/blocks/page/:pageId` — блоки страницы
- `POST /api/blocks` — создание блока
- `PUT /api/blocks/:id` — обновление блока
- `DELETE /api/blocks/:id` — удаление блока
- `POST /api/blocks/reorder` — переупорядочивание

### Теги
- `GET /api/tags/workspace/:workspaceId` — теги рабочего пространства
- `POST /api/tags` — создание тега
- `PUT /api/tags/:id` — обновление тега
- `DELETE /api/tags/:id` — удаление тега
- `POST /api/tags/pages/:pageId/:tagId` — добавление тега к странице
- `DELETE /api/tags/pages/:pageId/:tagId` — удаление тега со страницы

### Комментарии
- `GET /api/comments/page/:pageId` — комментарии страницы
- `POST /api/comments` — создание комментария
- `PUT /api/comments/:id` — обновление
- `DELETE /api/comments/:id` — удаление
- `POST /api/comments/:id/resolve` — отметить как решено

### Загрузка файлов
- `POST /api/upload` — загрузка файла (multipart/form-data)

## 🗄 Схема базы данных

Основные таблицы:
- `users` — пользователи
- `workspaces` — рабочие пространства
- `workspace_members` — участники рабочих пространств
- `pages` — страницы
- `blocks` — блоки контента
- `tags` — теги
- `page_tags` — связь страниц и тегов
- `comments` — комментарии
- `page_versions` — истории версий страниц
- `favorites` — избранное
- `files` — загруженные файлы

## 🎨 Кастомизация

### Темы
Приложение поддерживает тёмную и светлую темы. Цветовая схема настраивается в `frontend/src/styles/globals.css` через CSS-переменные.

### Иконки страниц
Список доступных иконок находится в `PageHeader.jsx` и `PageSidebar.jsx` (массив `icons`).

## 📦 Деплой

### Docker (рекомендуется)
```bash
# Собрать образы
docker-compose build

# Запустить
docker-compose up -d
```

### Ручной деплой
1. Соберите frontend: `cd frontend && npm run build`
2. Настройте reverse proxy (nginx) для раздачи статики и проксирования API
3. Запустите backend через PM2 или systemd
4. Настройте PostgreSQL и переменные окружения

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте ветку фичи: `git checkout -b feature/amazing-feature`
3. Зафиксируйте изменения: `git commit -m 'Add amazing feature'`
4. Отправьте в ветку: `git push origin feature/amazing-feature`
5. Откройте Pull Request

## 📄 Лицензия

Распространяется под лицензией MIT. См. `LICENSE` для подробностей.

## 🙏 Благодарности

- [Notion](https://notion.so) — за вдохновение
- [shadcn/ui](https://ui.shadcn.com) — за красивые UI компоненты
- [Radix UI](https://radix-ui.com) — за доступные примитивы
- [Lucide](https://lucide.dev) — за иконки
- [Tailwind CSS](https://tailwindcss.com) — за utility-first CSS

---

**Wrath** — создано с ❤️ для сообщества
