import { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Copy, ChevronDown } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { Tooltip } from '../ui/Tooltip';
import { useToast } from '../ui/Toaster';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust',
  'php', 'ruby', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss', 'json', 'yaml',
  'sql', 'bash', 'powershell', 'dockerfile', 'markdown', 'plaintext'
];

export const CodeBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const { toast } = useToast();
  const [language, setLanguage] = useState(block.content?.language || 'javascript');
  const [copied, setCopied] = useState(false);
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (block.content?.language) {
      setLanguage(block.content.language);
    }
  }, [block.content?.language]);

  const handleCodeChange = (e) => {
    const code = e.target.value;
    onChange?.({ ...block.content, code, language });
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    onChange?.({ ...block.content, language: lang });
  };

  const handleCopy = async () => {
    const code = block.content?.code || '';
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied', 'Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const code = e.target.value;
      e.target.value = code.substring(0, start) + '  ' + code.substring(end);
      e.target.selectionStart = e.target.selectionEnd = start + 2;
      handleCodeChange(e);
    }
    onKeyDown?.(e);
  };

  return (
    <div className="prose prose-neutral max-w-none">
      <div className="relative group">
        <div className="flex items-center justify-between p-2 bg-neutral-900/50 rounded-t-lg border-b border-neutral-700">
          <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">{language}</span>
          <div className="flex items-center gap-2">
            <Tooltip content="Copy code" position="top">
              <button
                onClick={handleCopy}
                disabled={readOnly}
                className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
                aria-label="Copy code"
              >
                {copied ? (
                  <span className="text-xs font-medium text-success">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </Tooltip>
            <Tooltip content="Change language" position="bottom">
              <Dropdown
                trigger={
                  <button className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1" aria-label="Change language">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                }
                items={LANGUAGES.map(lang => ({
                  label: lang,
                  onClick: () => handleLanguageChange(lang),
                  shortcut: lang === language ? '✓' : ''
                }))}
                align="right"
              />
            </Tooltip>
          </div>
        </div>

        <textarea
          ref={(el) => { textareaRef.current = el; if (el) ref.current = el; }}
          value={block.content?.code || ''}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className={cn(
            'w-full min-h-[120px] p-4 font-mono text-sm bg-neutral-900 text-neutral-100',
            'focus:outline-none resize-y rounded-b-lg',
            'placeholder:text-neutral-500',
            readOnly ? 'pointer-events-none bg-neutral-950' : ''
          )}
          data-placeholder="Write code..."
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', lineHeight: '1.7' }}
        />
      </div>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';