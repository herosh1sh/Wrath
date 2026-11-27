import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const dbPath = join(DATA_DIR, 'notion-clone.db');
const db = new Database(dbPath, { readonly: true });

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется аутентификация' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, name, avatar_url FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Срок действия токена истёк' });
    }
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export { JWT_SECRET };