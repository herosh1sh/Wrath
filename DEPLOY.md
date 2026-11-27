# Руководство по деплою Wrath на сервер с доменом wrath.heroshish.ru

## 📋 Предварительные требования

- **Сервер**: Ubuntu 22.04/24.04 или Debian 12 (минимум 2 ГБ RAM, 2 vCPU)
- **Домен**: должен указывать на IP вашего сервера (A-запись)
- **Доступ**: SSH-доступ к серверу с правами `sudo`
- **Установленные локально**: Docker, Docker Compose, Git

---

## 🚀 Быстрый старт (автоматический скрипт)

### 1. На сервере — запустите bootstrap-скрипт

```bash
# Скачайте и запустите скрипт первоначальной настройки
curl -fsSL https://raw.githubusercontent.com/herosh1sh/Wrath/main/scripts/bootstrap-server.sh | bash
```

> **Что делает скрипт:**
> - Устанавливает Docker, Docker Compose, Nginx, Certbot
> - Настраивает firewall (ufw)
> - Создаёт пользователя `wrath` и директорию `/opt/wrath`
> - Настраивает logrotate для логов контейнеров

---

### 2. Локально — соберите и отправьте образы

```bash
# В корне проекта
cd /path/to/notion-hosted

# 1. Создайте .env с продакшн-настройками
cp .env.example .env
# Отредактируйте .env — обязательно задайте надежный JWT_SECRET (минимум 32 символа)

# 2. Соберите образы
docker compose build

# 3. Запушьте образы в registry (GitHub Container Registry, Docker Hub, или ваш частный)
# Вариант А: Docker Hub
docker tag wrath-backend ваш_пользователь/wrath-backend:latest
docker tag wrath-frontend ваш_пользователь/wrath-frontend:latest
docker push ваш_пользователь/wrath-backend:latest
docker push ваш_пользователь/wrath-frontend:latest

# Вариант Б: GitHub Container Registry (бесплатно, приватно)
docker tag wrath-backend ghcr.io/ваш_пользователь/wrath-backend:latest
docker tag wrath-frontend ghcr.io/ваш_пользователь/wrath-frontend:latest
docker push ghcr.io/ваш_пользователь/wrath-backend:latest
docker push ghcr.io/ваш_пользователь/wrath-frontend:latest
```

---

### 3. На сервере — деплой

```bash
# Переключитесь на пользователя wrath
sudo -u wrath -i

# Клонируйте репозиторий (только для docker-compose.yml и .env)
cd /opt/wrath
git clone https://github.com/herosh1sh/Wrath.git .

# Создайте продакшн .env
cp .env.example .env
# Отредактируйте .env — вставьте тот же JWT_SECRET, что и при сборке

# Подтяните образы
docker compose pull

# Запустите
docker compose up -d

# Проверьте статус
docker compose ps
docker compose logs -f backend
```

---

## 🔧 Ручная настройка (если не используете bootstrap-скрипт)

### 1. Установите Docker и Docker Compose на сервере

```bash
# Обновите пакеты
sudo apt update && sudo apt upgrade -y

# Установите зависимости
sudo apt install -y ca-certificates curl gnupg lsb-release

# Добавьте официальный GPG-ключ Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Добавьте репозиторий
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установите Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Проверьте
docker --version
docker compose version

# Добавьте себя в группу docker (потребуется перезайти в SSH)
sudo usermod -aG docker $USER
```

### 2. Настройте Nginx как reverse proxy

```bash
# Установите Nginx и Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Создайте конфиг для вашего домена
sudo tee /etc/nginx/sites-available/wrath.heroshish.ru > /dev/null <<'EOF'
# HTTP -> HTTPS редирект
server {
    listen 80;
    server_name wrath.heroshish.ru;
    
    # Для ACME challenge (Let's Encrypt)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Всё остальное редирект на HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name wrath.heroshish.ru;

    # SSL сертификаты (будут созданы Certbot'ом)
    ssl_certificate /etc/letsencrypt/live/wrath.heroshish.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wrath.heroshish.ru/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend (React SPA)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Для SPA — отдаём index.html при 404
        proxy_intercept_errors on;
        error_page 404 = @fallback;
    }
    
    location @fallback {
        proxy_pass http://localhost:3000;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты для долгих запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket таймауты
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Загрузки (файлы)
    location /uploads/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Активируйте сайт
sudo ln -sf /etc/nginx/sites-available/wrath.heroshish.ru /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Проверьте конфиг
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx
```

### 3. Настройте SSL (два варианта)

#### Вариант А: Let's Encrypt (бесплатно, автообновление)

```bash
# Установите Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получите сертификат (замените email на свой)
sudo certbot --nginx -d wrath.heroshish.ru --email your-email@example.com --agree-tos --non-interactive --redirect

# Проверьте автообновление
sudo certbot renew --dry-run

# Добавьте в cron для автообновления (уже делает certbot через systemd timer)
systemctl status certbot.timer
```

#### Вариант Б: Ваши сертификаты от reg.ru (или другого провайдера)

Если у вас уже есть сертификаты (файлы `.crt`/`.pem` и `.key`), **не нужен Certbot**.

**1. Подготовьте файлы сертификата**

Обычно от reg.ru приходит архив с файлами:
- `certificate.crt` — ваш сертификат
- `ca_bundle.crt` — промежуточные сертификаты (chain)
- `private.key` — приватный ключ

**Объедините сертификат и chain в один файл (fullchain):**

```bash
# На сервере создайте директорию для SSL
sudo mkdir -p /etc/nginx/ssl/wrath.heroshish.ru

# Загрузите ваши файлы (через scp, sftp или скопируйте содержимое)
# Например, если файлы лежат локально в ./ssl/:
scp ./ssl/certificate.crt ./ssl/ca_bundle.crt ./ssl/private.key user@your-server:/tmp/

# На сервере — объедините в fullchain.pem (порядок важен: сначала ваш сертификат, потом chain)
sudo cat /tmp/certificate.crt /tmp/ca_bundle.crt > /etc/nginx/ssl/wrath.heroshish.ru/fullchain.pem
sudo cp /tmp/private.key /etc/nginx/ssl/wrath.heroshish.ru/privkey.pem

# Права (только root читает ключ)
sudo chmod 644 /etc/nginx/ssl/wrath.heroshish.ru/fullchain.pem
sudo chmod 600 /etc/nginx/ssl/wrath.heroshish.ru/privkey.pem
sudo chown root:root /etc/nginx/ssl/wrath.heroshish.ru/*
```

**2. Обновите Nginx конфиг** — укажите пути к вашим файлам:

В `/etc/nginx/sites-available/wrath.heroshish.ru` замените строки SSL на:

```nginx
# HTTPS
server {
    listen 443 ssl http2;
    server_name wrath.heroshish.ru;

    # ВАШИ сертификаты от reg.ru
    ssl_certificate /etc/nginx/ssl/wrath.heroshish.ru/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/wrath.heroshish.ru/privkey.pem;
    
    # ... остальной конфиг без изменений
}
```

**3. Перезагрузите Nginx**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**4. Настройте автообновление (важно!)**

Сертификаты от reg.ru обычно выдаются на **1 год**. Нужно продлевать вручную:

```bash
# Создайте скрипт напоминания (запускать через cron раз в месяц)
sudo tee /usr/local/bin/ssl-check-wrath.sh > /dev/null <<'EOF'
#!/bin/bash
# Проверяет срок действия сертификата за 30 дней
CERT="/etc/nginx/ssl/wrath.heroshish.ru/fullchain.pem"
DAYS_LEFT=$(( ($(date -d "$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)" +%s) - $(date +%s)) / 86400 ))

if [ "$DAYS_LEFT" -lt 30 ]; then
    echo "⚠️ SSL сертификат wrath.heroshish.ru истекает через $DAYS_LEFT дней!"
    # Можно добавить отправку email/телеграм:
    # curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" -d "chat_id=<CHAT_ID>&text=SSL%20wrath.heroshish.ru%20expires%20in%20$DAYS_LEFT%20days"
fi
EOF

sudo chmod +x /usr/local/bin/ssl-check-wrath.sh

# Добавьте в cron (проверка 1-го числа каждого месяца)
(sudo crontab -l 2>/dev/null; echo "0 9 1 * * /usr/local/bin/ssl-check-wrath.sh") | sudo crontab -
```

**Когда сертификат истечёт:**
1. Купите/продлите сертификат на reg.ru
2. Скачайте новые файлы
3. Повторите шаг 1 (замените файлы в `/etc/nginx/ssl/...`)
4. `sudo systemctl reload nginx`

### 4. Настройте Firewall

```bash
# UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Проверьте
sudo ufw status
```

---

## 📁 Структура на сервере

```
/opt/wrath/
├── docker-compose.yml          # Основной compose-файл
├── .env                        # Переменные окружения (НЕ в git!)
├── data/                       # Автоматически создаётся (volume wrath_data)
│   └── notion-clone.db         # SQLite база (прединициализирована)
└── uploads/                    # Автоматически создаётся (volume wrath_uploads)
```

---

## 🔐 Важные переменные окружения (.env)

```env
# ОБЯЗАТЕЛЬНО: Сгенерируйте надежный секрет (минимум 32 символа)
# openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long

# URL фронтенда (для CORS и генерации ссылок)
FRONTEND_URL=https://wrath.heroshish.ru

# Порт бэкенда (внутри контейнера)
PORT=4000

# Окружение
NODE_ENV=production
```

---

## 🔄 Обновление приложения

### Вариант 1: Через GitHub Actions (рекомендую настроить CI/CD)

См. `.github/workflows/deploy.yml` в репозитории.

### Вариант 2: Вручную

```bash
# На сервере
sudo -u wrath -i
cd /opt/wrath

# Подтяните новые образы
docker compose pull

# Перезапустите с новыми образами (данные в volumes сохранятся)
docker compose up -d --remove-orphans

# Очистите старые образы
docker image prune -f
```

---

## 🗄 Бэкап базы данных

### Автоматический бэкап (cron)

```bash
# Создайте скрипт бэкапа
sudo tee /opt/wrath/backup.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/opt/wrath/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Бэкап SQLite (используем .backup для консистентности)
docker exec wrath-backend sqlite3 /app/data/notion-clone.db ".backup /tmp/backup.db"
docker cp wrath-backend:/tmp/backup.db "$BACKUP_DIR/notion-clone_$DATE.db"

# Сжимаем
gzip "$BACKUP_DIR/notion-clone_$DATE.db"

# Храним последние 30 дней
find "$BACKUP_DIR" -name "notion-clone_*.db.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/notion-clone_$DATE.db.gz"
EOF

chmod +x /opt/wrath/backup.sh

# Добавьте в crontab пользователя wrath (каждый день в 3:00)
sudo -u wrath crontab -e
# Добавьте строку:
# 0 3 * * * /opt/wrath/backup.sh >> /opt/wrath/logs/backup.log 2>&1
```

### Ручной бэкап

```bash
# Быстрый бэкап
docker exec wrath-backend sqlite3 /app/data/notion-clone.db ".backup /tmp/backup.db"
docker cp wrath-backend:/tmp/backup.db ./notion-clone_backup_$(date +%Y%m%d).db
```

### Восстановление

```bash
# Остановите контейнеры
docker compose down

# Восстановите файл базы
cp notion-clone_backup_20240115.db /opt/wrath/data/notion-clone.db

# Запустите
docker compose up -d
```

---

## 📊 Мониторинг и логи

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Только бэкенд
docker compose logs -f backend

# Последние 100 строк
docker compose logs --tail=100 backend
```

### Healthcheck

```bash
# Проверка здоровья бэкенда
curl -f https://wrath.heroshish.ru/api/health

# Должен вернуть: {"status":"ok","timestamp":1234567890}
```

### Метрики (опционально)

Добавьте в `docker-compose.yml` для Prometheus/Grafana:

```yaml
services:
  backend:
    # ...existing config...
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=4000"
      - "prometheus.io/path=/metrics"
```

---

## 🛠 Устранение неполадок

### Контейнер не запускается

```bash
# Проверьте логи
docker compose logs backend

# Частые причины:
# 1. Неправильный JWT_SECRET (должен совпадать с тем, при сборке)
# 2. Порт 4000 занят
# 3. Нет прав на /app/data (проверьте volumes)
```

### База данных повреждена / нужно сбросить

```bash
# ОСТОРОЖНО: УДАЛИТ ВСЕ ДАННЫЕ
docker compose down
docker volume rm wrath_wrath_data wrath_wrath_uploads
docker compose up -d
# База пересоздастся из образа (с демо-данными)
```

### SSL сертификат не обновился

```bash
# Принудительное обновление
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### WebSocket не работает

Проверьте в nginx-конфиге:
- `proxy_http_version 1.1;`
- `proxy_set_header Upgrade $http_upgrade;`
- `proxy_set_header Connection "upgrade";`
- Порт 443 (HTTPS) — браузеры блокируют WS на HTTP

---

## ✅ Чек-лист после деплоя

- [ ] Домен `wrath.heroshish.ru` открывается в браузере
- [ ] HTTPS работает (замочек в адресной строке)
- [ ] Регистрация/вход работают
- [ ] Создание страниц, блоков работает
- [ ] WebSocket подключается (нет ошибок в консоли браузера)
- [ ] Загрузка файлов работает
- [ ] Бэкап настроен и тестово восстановлен
- [ ] `docker compose ps` показывает все контейнеры `Up`
- [ ] `curl -f https://wrath.heroshish.ru/api/health` возвращает `{"status":"ok"}`

---

## 📞 Полезные команды

```bash
# Статус сервисов
docker compose ps

# Ресурсы
docker stats

# Перезапуск одного сервиса
docker compose restart backend

# Пересборка без кэша
docker compose build --no-cache backend

# Войти в контейнер
docker exec -it wrath-backend sh

# SQLite CLI
docker exec -it wrath-backend sqlite3 /app/data/notion-clone.db

# Очистка места
docker system prune -a --volumes
```

---

## 🔗 Полезные ссылки

- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)
- [SQLite Backup API](https://www.sqlite.org/backup.html)

---

**Готово!** 🎉 Ваш Wrath теперь доступен по адресу **https://wrath.heroshish.ru**
