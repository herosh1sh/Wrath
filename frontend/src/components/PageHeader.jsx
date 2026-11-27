import { useState, useRef, useEffect } from 'react';
import { Pen, Image as ImageIcon, X, Palette, Trash2, Download, Star, MoreVertical } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dropdown, DropdownItem, DropdownSeparator } from './ui/Dropdown';
import { Modal, ModalContent, ModalFooter } from './ui/Modal';
import Tooltip from './ui/Tooltip';
import { uploadApi } from '../lib/api';

export function PageHeader({
  page,
  workspace,
  user,
  isFavorite,
  saving,
  saveError,
  onTitleChange,
  onIconChange,
  onCoverChange,
  onFavoriteToggle,
  onShowMenu,
}) {
  const [coverUrl, setCoverUrl] = useState(page.coverUrl || '');
  const [coverPosition, setCoverPosition] = useState(page.coverPosition || 0.5);
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef(null);
  const coverImgRef = useRef(null);

  const icons = [
    '⚔️', '📄', '📋', '📚', '📖', '📔', '📕', '📗', '📘', '📙',
    '🗂️', '🗃️', '🗄️', '📁', '📂', '🗒️', '🗓️', '📅', '📆', '📇',
    '🏠', '🏢', '🏭', '🏫', '🏪', '🏬', '🏭', '🏯', '🏰', '💒',
    '⚙️', '🔧', '🔨', '⚡', '🔋', '💡', '🔍', '🔎', '🔑', '🗝️',
    '🎯', '🎨', '🎭', '🎪', '🎫', '🎬', '🎮', '🕹️', '🎲', '♟️',
    '🌟', '⭐', '💫', '✨', '🌙', '☀️', '⭐', '☁️', '⛈️', '🌈',
    '🍎', '🍏', '🍊', '🍋', '🍇', '🍓', '🍒', '🍑', '🥭', '🍍',
    '🚀', '🛸', '🛩️', '✈️', '🛫', '🛬', '🚁', '🚂', '🚀', '⛵',
  ];

  const colors = [
    '#0891B2', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777',
    '#0891B2', '#0D9488', '#CA8A04', '#65A30D', '#2563EB', '#9333EA',
  ];

  // Handle cover image upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Изображение должно быть меньше 5 МБ');
      return;
    }

    setUploadingCover(true);
    try {
      const data = await uploadApi.upload(file);
      const newCoverUrl = data.url;
      setCoverUrl(newCoverUrl);
      onCoverChange(newCoverUrl, coverPosition);
    } catch (err) {
      console.error('Failed to upload cover:', err);
      alert('Не удалось загрузить обложку');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  // Handle cover URL input
  const handleCoverUrlSubmit = (e) => {
    e.preventDefault();
    if (coverUrl.trim()) {
      onCoverChange(coverUrl.trim(), coverPosition);
    }
    setShowCoverInput(false);
  };

  // Handle cover removal
  const handleRemoveCover = () => {
    setCoverUrl('');
    onCoverChange(null, 0.5);
  };

  // Handle cover reposition
  const handleCoverReposition = (e) => {
    if (!coverImgRef.current) return;
    const rect = coverImgRef.current.getBoundingClientRect();
    const newPosition = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCoverPosition(newPosition);
    onCoverChange(coverUrl, newPosition);
  };

  // Handle icon selection
  const handleIconSelect = (icon) => {
    onIconChange(icon, page.iconColor || colors[0]);
    setShowIconPicker(false);
  };

  // Handle icon color selection
  const handleColorSelect = (color) => {
    onIconChange(page.icon || '⚔️', color);
  };

  // Handle drag over for cover reposition
  const handleDragOver = (e) => {
    e.preventDefault();
    handleCoverReposition(e);
  };

  return (
    <header className="relative">
      {/* Cover image */}
      {(coverUrl || showCoverInput) && (
        <div
          className="relative h-48 w-full overflow-hidden"
          onMouseDown={handleDragOver}
          onMouseMove={(e) => e.buttons === 1 && handleCoverReposition(e)}
        >
          {coverUrl && (
            <img
              ref={coverImgRef}
              src={coverUrl}
              alt="Обложка страницы"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-100"
              style={{ transform: `translateY(${coverPosition * 30}%)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

          {/* Cover actions */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Tooltip content="Сменить обложку" position="top">
                <button
                  onClick={() => setShowCoverInput(true)}
                  className="btn-icon bg-surface/80 backdrop-blur-sm text-foreground hover:bg-surface"
                  aria-label="Сменить обложку"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Удалить обложку" position="top">
                <button
                  onClick={handleRemoveCover}
                  className="btn-icon bg-surface/80 backdrop-blur-sm text-foreground hover:bg-surface"
                  aria-label="Удалить обложку"
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Переместить обложку" position="top">
                <button
                  className="btn-icon bg-surface/80 backdrop-blur-sm text-foreground hover:bg-surface cursor-n-resize"
                  aria-label="Переместить обложку"
                >
                  <Palette className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content="Скачать обложку" position="top">
                <a href={coverUrl} download className="btn-icon bg-surface/80 backdrop-blur-sm text-foreground hover:bg-surface">
                  <Download className="h-4 w-4" />
                </a>
              </Tooltip>
            </div>
          </div>
        </div>
      )}

      {/* Cover input modal */}
      {showCoverInput && (
        <Modal
          isOpen={showCoverInput}
          onClose={() => setShowCoverInput(false)}
          title="Сменить обложку"
          description="Загрузите изображение или введите URL изображения"
        >
          <ModalContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Загрузить изображение</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="input"
                disabled={uploadingCover}
              />
              {uploadingCover && <p className="text-sm text-foreground-muted mt-1">Загрузка...</p>}
            </div>
            <DropdownSeparator />
            <form onSubmit={handleCoverUrlSubmit} className="space-y-2">
              <label className="block text-sm font-medium">URL изображения</label>
              <Input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setShowCoverInput(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={!coverUrl.trim() || uploadingCover}>
                  Применить
                </Button>
              </div>
            </form>
          </ModalContent>
        </Modal>
      )}

      {/* Page title area */}
      <div className="px-6 py-4">
        <div className="flex items-start gap-4">
          {/* Icon picker */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowIconPicker(true)}
              className="flex items-center justify-center w-12 h-12 rounded-sm bg-muted text-2xl hover:bg-muted-foreground/10 transition-colors"
              aria-label="Сменить иконку"
            >
              {page.icon || '⚔️'}
            </button>

            {/* Icon picker dropdown */}
            {showIconPicker && (
              <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-surface border border-border rounded-md shadow-xl p-3 animate-in">
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">Цвет иконки</label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className={`w-8 h-8 rounded-sm border-2 transition-colors ${
                          page.iconColor === color ? 'border-accent scale-110' : 'border-transparent hover:border-border'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Цвет ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <DropdownSeparator />
                <div className="grid grid-cols-8 gap-1 max-h-60 overflow-auto">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      onClick={() => handleIconSelect(icon)}
                      className={`p-2 text-2xl rounded-sm transition-colors hover:bg-muted ${
                        page.icon === icon ? 'bg-muted ring-2 ring-accent' : ''
                      }`}
                      aria-label={`Иконка ${icon}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Title input */}
          <div className="flex-1 min-w-0">
            <Input
              value={page.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Без названия"
              className="text-2xl font-semibold bg-transparent border-none focus:ring-0 placeholder:text-foreground-muted"
              style={{ fontFamily: 'inherit' }}
              autoFocus
            />
            <div className="flex items-center gap-3 mt-2 text-sm text-foreground-muted">
              <span>Последний редактор: {page.last_edited_by === user?.id ? 'Вы' : 'Кто-то'} • {new Date(page.updated_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Favorite button */}
          <Tooltip content={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'} position="bottom">
            <button
              onClick={onFavoriteToggle}
              className={`btn-icon p-2 rounded-full transition-colors ${isFavorite ? 'text-warning bg-warning/10' : 'text-foreground-muted hover:bg-muted'}`}
              aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            >
              <Star className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </Tooltip>

          {/* Page menu */}
          <Tooltip content="Параметры страницы" position="bottom">
            <button
              onClick={onShowMenu}
              className="btn-icon p-2 rounded-full text-foreground-muted hover:bg-muted transition-colors"
              aria-label="Параметры страницы"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Save status indicator */}
      {(saving || saveError) && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface border border-border shadow-lg text-sm animate-in">
          {saving && (
            <>
              <div className="h-4 w-4 animate-spin border-2 border-accent border-t-transparent rounded-full" />
              <span>Сохранение...</span>
            </>
          )}
          {saveError && (
            <>
              <span className="text-destructive">Ошибка сохранения: {saveError}</span>
              <button className="btn-icon p-1 text-foreground-muted hover:text-foreground" onClick={() => setSaveError(null)}>
                <X className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}