import { useState } from 'react';
import { Image as ImageIcon, X, Link as LinkIcon, Download, Maximize2 } from 'lucide-react';
import { Button } from './ui/Button';
import { uploadApi } from '../lib/api';
import { Modal, ModalContent, ModalFooter } from './ui/Modal';
import { Input } from './ui/Input';

export function ImageBlock({ content, readOnly, onUpdate }) {
  const [src, setSrc] = useState(content.url || '');
  const [caption, setCaption] = useState(content.caption || '');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('upload'); // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (file) => {
    setLoading(true);
    setUploadProgress(0);
    try {
      const data = await uploadApi.upload(file);
      setSrc(data.file.url);
      onUpdate?.({ content: { ...content, url: data.file.url } });
      setShowModal(false);
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setSrc(urlInput.trim());
      onUpdate?.({ content: { ...content, url: urlInput.trim() } });
      setShowModal(false);
      setUrlInput('');
    }
  };

  const removeImage = () => {
    setSrc('');
    setCaption('');
    onUpdate?.({ content: { ...content, url: '', caption: '' } });
  };

  return (
    <div className="relative">
      {src ? (
        <div className="relative">
          <figure className="relative">
            <img
              src={src}
              alt={caption || 'Изображение'}
              className="max-w-full h-auto rounded-md"
              onClick={() => window.open(src, '_blank')}
            />
            {caption && (
              <figcaption className="mt-2 text-sm text-foreground-muted text-center">
                {caption}
              </figcaption>
            )}
          </figure>
          {!readOnly && (
            <div className="absolute top-2 right-2 flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowModal(true)} aria-label="Сменить изображение">
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={removeImage} aria-label="Удалить изображение">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center border-2 border-dashed border-border rounded-md p-8 text-center">
          {!readOnly ? (
            <Button variant="outline" onClick={() => setShowModal(true)}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Добавить изображение
            </Button>
          ) : (
            <p className="text-foreground-muted">Нет изображения</p>
          )}
        </div>
      )}

      {/* Image modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setUrlInput(''); setUploadProgress(0); }}
        title="Добавить изображение"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-border">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${modalTab === 'upload' ? 'text-accent border-b-2 border-accent' : 'text-foreground-muted hover:text-foreground'}`}
                onClick={() => setModalTab('upload')}
              >
                Загрузка
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${modalTab === 'url' ? 'text-accent border-b-2 border-accent' : 'text-foreground-muted hover:text-foreground'}`}
                onClick={() => setModalTab('url')}
              >
                Ссылка
              </button>
            </div>

            {modalTab === 'upload' && (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed border-border rounded-md p-8 text-center hover:border-accent transition-colors"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('border-accent')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-accent');
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      handleUpload(file);
                    }
                  }}
                >
                  <ImageIcon className="h-10 w-10 mx-auto text-foreground-muted mb-2" />
                  <p className="text-sm text-foreground-muted">Перетащите изображение или нажмите для выбора</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
                  />
                  <label htmlFor="image-upload" className="mt-2 inline-block text-sm text-accent hover:underline cursor-pointer">
                    Выбрать файл
                  </label>
                </div>
                {loading && (
                  <div className="space-y-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-foreground-muted">Загрузка... {uploadProgress}%</p>
                  </div>
                )}
              </div>
            )}

            {modalTab === 'url' && (
              <div className="space-y-3">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  placeholder="https://example.com/image.png"
                  autoFocus
                />
                <Button onClick={handleUrlSubmit} disabled={!urlInput.trim() || loading}>
                  Добавить изображение
                </Button>
              </div>
            )}

            {(src || urlInput) && (
              <div className="pt-4 border-t border-border">
                <label className="block text-sm font-medium mb-2">Подпись (необязательно)</label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Подпись к изображению..."
                />
              </div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setShowModal(false); setUrlInput(''); }}>Отмена</Button>
          <Button onClick={() => { if (caption) onUpdate?.({ content: { ...content, caption } }); setShowModal(false); }}>
            Готово
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}