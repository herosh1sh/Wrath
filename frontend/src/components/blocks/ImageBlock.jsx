import { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Image, X, Download, Maximize2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';
import { Dropdown } from '../ui/Dropdown';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toaster';

export const ImageBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Error', 'Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await api.upload.single(file);
      const url = data.file.url;

      onChange?.({ ...block.content, url, caption: block.content?.caption || '' });
      setPreview(url);
    } catch (error) {
      toast.error('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    onChange?.({ ...block.content, url });
    setPreview(url);
  };

  const handleCaptionChange = (e) => {
    const caption = e.target.innerText;
    onChange?.({ ...block.content, caption });
  };

  const handleRemove = () => {
    onChange?.({ ...block.content, url: '', caption: '' });
    setPreview(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Allow new block after image
    }
    onKeyDown?.(e);
  };

  useEffect(() => {
    if (block.content?.url) {
      setPreview(block.content.url);
    }
  }, [block.content?.url]);

  const imageUrl = block.content?.url || preview;

  return (
    <div className="prose prose-neutral max-w-none my-4">
      <div className="relative group">
        {imageUrl ? (
          <>
            <figure className="relative">
              <img
                ref={imgRef}
                src={imageUrl}
                alt={block.content?.caption || 'Image'}
                className="w-full max-w-3xl h-auto rounded-lg border border-border-light shadow-sm"
                loading="lazy"
              />
              {!readOnly && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip content="Download" position="top">
                    <a
                      href={imageUrl}
                      download
                      className="p-1.5 bg-background-primary/90 backdrop-blur rounded hover:bg-background-hover transition-colors"
                      aria-label="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </Tooltip>
                  <Tooltip content="Open full size" position="top">
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-background-primary/90 backdrop-blur rounded hover:bg-background-hover transition-colors"
                      aria-label="Open full size"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </a>
                  </Tooltip>
                  <Tooltip content="Remove image" position="top">
                    <button
                      onClick={handleRemove}
                      className="p-1.5 bg-background-primary/90 backdrop-blur rounded hover:bg-background-hover transition-colors text-error"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </figure>

            {(block.content?.caption || !readOnly) && (
              <figcaption
                ref={!readOnly && !block.content?.caption ? ref : undefined}
                contentEditable={!readOnly}
                onInput={handleCaptionChange}
                onKeyDown={onKeyDown}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text/plain');
                  document.execCommand('insertText', false, text);
                }}
                className={cn(
                  'mt-2 text-sm text-center text-foreground-secondary min-h-[1.5rem]',
                  'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1 rounded',
                  'prose prose-neutral max-w-none',
                  readOnly ? 'pointer-events-none' : ''
                )}
                data-placeholder="Add caption..."
                spellCheck={true}
                suppressContentEditableWarning
              >
                {block.content?.caption}
              </figcaption>
            )}
          </>
        ) : (
          <div className="border-2 border-dashed border-border-default rounded-lg p-8 text-center hover:border-primary transition-colors">
            <Image className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
            <p className="text-foreground-secondary mb-4">Add an image</p>
            <div className="flex flex-col items-center gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              <Input
                type="url"
                placeholder="Or paste image URL"
                value={block.content?.url || ''}
                onChange={handleUrlChange}
                className="w-64"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
});

ImageBlock.displayName = 'ImageBlock';