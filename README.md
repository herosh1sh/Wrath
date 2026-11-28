# Wrath

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-26-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</div>

<div align="center">
  <h3>A minimalist, self-hosted Notion alternative</h3>
  <p>Built with a soft, eye-friendly design for your thoughts and projects</p>
</div>

---

## ✨ Features

### 📝 **Core Editing**
- **Block-based editor** — Like Notion, everything is a block
- **Slash commands** — Type `/` to add any block type
- **Drag & drop** — Reorder blocks and pages with drag handles
- **Nested pages** — Infinite hierarchy in the sidebar
- **Real-time collaboration** — See other users' cursors and edits live

### 🎨 **Block Types**
| Block | Shortcut | Description |
|-------|----------|-------------|
| Text | — | Regular paragraph |
| Heading 1-3 | `#` `##` `###` | Structured headings |
| Bulleted List | — | Bullet points |
| Numbered List | — | Numbered items |
| To-Do List | — | Checkboxes |
| Code Block | — | Syntax highlighting (20+ languages) |
| Callout | — | Info, Warning, Success, Error |
| Quote | — | Blockquotes |
| Divider | — | Horizontal rule |
| Image | — | Upload or URL with captions |
| Bookmark | — | Link previews with metadata |
| Table | — | Editable tables |

### 🗂️ **Organization**
- **Workspaces** — Separate spaces for teams/projects
- **Tags** — Color-coded tags for filtering
- **Favorites** — Star important pages for quick access
- **Search** — Full-text search across pages
- **Page versions** — Restore previous versions
- **Archive** — Soft-delete with restore option

### 👥 **Collaboration**
- **Workspace members** — Viewer, Member, Admin, Owner roles
- **Comments** — Threaded comments on pages and blocks
- **Real-time presence** — See who's viewing/editing
- **Block locking** — Prevent concurrent edits

### 🔐 **Authentication**
- **Simple username/password** — No email verification needed
- **JWT tokens** — Secure session management
- **Session control** — Logout from all devices

### 🎨 **Design**
- **Minimalist soft tones** — Easy on the eyes
- **Dark mode** — Automatic system preference
- **Responsive** — Works on mobile and desktop
- **Keyboard shortcuts** — Power user friendly

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Domain name (for production)
- SSL certificates (from reg.ru or Let's Encrypt)

### 1. Clone & Configure
```bash
git clone https://github.com/yourusername/wrath.git
cd wrath
cp .env.example .env
# Edit .env with your settings
```

### 2. Add SSL Certificates
Place your reg.ru certificates in `nginx/ssl/`:
```
nginx/ssl/
├── wrath.heroshish.ru.crt
└── wrath.heroshish.ru.key
```

### 3. Deploy
```bash
sudo ./scripts/deploy.sh
```

That's it! Visit `https://wrath.heroshish.ru`

---

## 📋 Requirements

### Server
- **OS**: Ubuntu 22.04+ / Debian 12+ / Any Docker-compatible Linux
- **CPU**: 1+ vCPU
- **RAM**: 1GB+ (2GB recommended)
- **Storage**: 10GB+ for database and uploads
- **Ports**: 80, 443 open

### SSL Certificates
From **reg.ru** (or any provider):
- `wrath.heroshish.ru.crt` — Certificate file
- `wrath.heroshish.ru.key` — Private key

---

## 🛠️ Configuration

### Environment Variables (`.env`)

```bash
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://wrath.heroshish.ru

# JWT Secret (generate: openssl rand -base64 32)
JWT_SECRET=your-32-char-minimum-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# File Uploads
UPLOAD_MAX_SIZE=52428800
```

### Important Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | **Required** — Strong random string for token signing | — |
| `FRONTEND_URL` | Your domain for CORS and webhooks | `https://wrath.heroshish.ru` |
| `PORT` | Backend port (internal) | `3000` |

---

## 🐳 Docker Architecture

```
┌─────────────────────────────────────┐
│           Nginx (Port 80/443)       │
│    SSL Termination • Rate Limit     │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│  Frontend   │ │   Backend   │
│  (Nginx +   │ │  (Node.js   │
│   React)    │ │  + SQLite)  │
│  Port 80    │ │  Port 3000  │
└─────────────┘ └─────────────┘
       │               │
       │         ┌─────┴─────┐
       │         ▼           ▼
       │    ┌─────────┐ ┌─────────┐
       │    │  Data   │ │ Uploads │
       │    │ (SQLite)│ │ (Files) │
       │    └─────────┘ └─────────┘
       │
       ▼
┌─────────────┐
│  Certbot    │
│ (Optional)  │
└─────────────┘
```

### Volumes
- `wrath-data` — SQLite database (`/app/data/wrath.db`)
- `wrath-uploads` — User uploaded files (`/app/uploads`)

---

## 📦 Deployment

### Manual Deployment
```bash
# Pull latest
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:init
```

### Automated Deployment
The `deploy.sh` script handles everything:
```bash
sudo ./scripts/deploy.sh
```

It will:
1. Pull latest code from GitHub
2. Validate configuration
3. Build Docker images
4. Start services with health checks
5. Run database initialization
6. Clean up old images

### Auto-Updates
Install the systemd timer for automatic daily updates:
```bash
sudo cp scripts/wrath-auto-update.service /etc/systemd/system/
sudo cp scripts/wrath-auto-update.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wrath-auto-update.timer
```

Checks for updates daily at 3 AM with random delay.

---

## 🔧 Management Commands

```bash
# View logs
docker-compose logs -f [service]

# Service status
docker-compose ps

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Update only backend
docker-compose build backend && docker-compose up -d backend

# Database backup
./scripts/backup.sh

# Access backend shell
docker-compose exec backend sh

# Access database
docker-compose exec backend sqlite3 /app/data/wrath.db
```

---

## 💾 Backup & Restore

### Automatic Backups
```bash
# Create backup
./scripts/backup.sh

# Backups stored in /opt/wrath/backups/
# Keeps last 30 days automatically
```

### Manual Backup
```bash
# Database only
docker-compose exec backend sqlite3 /app/data/wrath.db .dump > backup.sql

# Uploads only
tar -czf uploads.tar.gz -C /opt/wrath/wrath-uploads .

# Full backup
./scripts/backup.sh
```

### Restore
```bash
# Stop services
docker-compose down

# Restore database
cat backup.sql | docker-compose exec -T backend sqlite3 /app/data/wrath.db

# Restore uploads
tar -xzf uploads.tar.gz -C /opt/wrath/wrath-uploads

# Start services
docker-compose up -d
```

---

## 🔒 Security

### Implemented
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Rate limiting (API + Auth)
- ✅ JWT with secure cookies
- ✅ Password hashing (bcrypt)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React auto-escaping)
- ✅ File upload validation
- ✅ SSL/TLS termination at nginx
- ✅ Security headers (HSTS, CSP, etc.)

### Recommended
- Use strong `JWT_SECRET` (32+ chars)
- Keep Docker images updated
- Monitor logs for suspicious activity
- Regular backups
- Firewall: only allow 80/443 + SSH

---

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + K` | Open search |
| `⌘/Ctrl + N` | New page |
| `⌘/Ctrl + B` | Toggle sidebar |
| `⌘/Ctrl + P` | Command palette |
| `/` | Slash menu (at line start) |
| `Tab` | Indent block |
| `Shift + Tab` | Outdent block |
| `Enter` | New block |
| `⌘/Ctrl + Enter` | Toggle todo |
| `⌘/Ctrl + Shift + C` | Code block |

---

## 🗃️ Database Schema

```
users → workspaces → workspace_members
  ↓           ↓
pages ← blocks
  ↓     ↓       ↓
comments tags  page_versions
  ↓
favorites activities
```

SQLite with WAL mode for concurrent reads.

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user
- `PATCH /api/auth/profile` — Update profile
- `POST /api/auth/change-password` — Change password

### Workspaces
- `GET /api/workspaces` — List workspaces
- `POST /api/workspaces` — Create workspace
- `GET /api/workspaces/:id` — Get workspace
- `PATCH /api/workspaces/:id` — Update workspace
- `DELETE /api/workspaces/:id` — Delete workspace
- `GET/POST/PATCH/DELETE /api/workspaces/:id/members` — Member management

### Pages
- `GET /api/pages?workspaceId=` — List pages (tree)
- `POST /api/pages` — Create page
- `GET /api/pages/:id` — Get page
- `PATCH /api/pages/:id` — Update page
- `DELETE /api/pages/:id` — Archive page
- `POST /api/pages/:id/duplicate` — Duplicate
- `POST /api/pages/:id/publish` — Toggle publish
- `GET /api/pages/:id/versions` — Version history

### Blocks
- `GET /api/blocks/page/:pageId` — List blocks
- `POST /api/blocks` — Create block
- `PATCH /api/blocks/:id` — Update block
- `DELETE /api/blocks/:id` — Delete block
- `POST /api/blocks/reorder` — Reorder blocks

### Comments, Tags, Favorites, Search, Upload
- Full CRUD for each

---

## 🌐 WebSocket Events

### Client → Server
- `page:join` / `page:leave` — Page presence
- `block:lock` / `block:unlock` — Block editing locks
- `block:update` — Real-time block edits
- `cursor:move` — Cursor position
- `typing:start` / `typing:stop` — Typing indicators

### Server → Client
- `user:joined` / `user:left` — Presence updates
- `block:locked` / `block:unlocked` — Lock status
- `block:updated` — Remote block changes
- `cursor:moved` — Remote cursors
- `comment:created/updated/deleted` — Comment updates

---

## 🎨 Customization

### Theming
Edit `frontend/tailwind.config.js` for colors:
```js
colors: {
  primary: { DEFAULT: '#65782E' }, // Sage green
  // ... customize accent colors
}
```

### Fonts
Default: Inter (UI) + DM Sans (Headings) + JetBrains Mono (Code)
Change in `tailwind.config.js` and `index.html`

---

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Common issues:
# - Port 80/443 already in use
# - SSL certs missing or invalid
# - JWT_SECRET not set
```

### Database errors
```bash
# Recreate database
docker-compose down
docker volume rm wrath_wrath-data
docker-compose up -d
```

### Permission issues
```bash
# Fix upload permissions
docker-compose exec backend chown -R nodejs:nodejs /app/uploads
```

### WebSocket connection failed
- Check nginx config has WebSocket upgrade headers
- Verify backend port 3000 accessible from frontend container

---

## 📄 License

MIT License — feel free to use for personal or commercial projects.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit PR

---

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: your-email@example.com

---

<div align="center">
  <p>Made with ❤️ for self-hosted productivity</p>
  <p><strong>Wrath</strong> — Your thoughts, your server, your rules</p>
</div>