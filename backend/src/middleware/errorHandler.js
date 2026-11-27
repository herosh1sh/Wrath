export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'Ресурс уже существует' });
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({ error: 'Ссылаемый ресурс не найден' });
  }

  const status = err.status || 500;
  const message = err.message || 'Внутренняя ошибка сервера';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}