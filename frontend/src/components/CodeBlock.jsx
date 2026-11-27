import { useState, useRef, useEffect } from 'react';
import { Copy, X, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Dropdown, DropdownItem } from './ui/Dropdown';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss', 'json', 'yaml',
  'xml', 'sql', 'bash', 'powershell', 'markdown', 'dockerfile', 'nginx', 'graphql',
];

export function CodeBlock({ content, readOnly, onUpdate }) {
  const [code, setCode] = useState(content.code || '');
  const [language, setLanguage] = useState(content.language || 'javascript');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setCode(content.code || '');
    setLanguage(content.language || 'javascript');
  }, [content.code, content.language]);

  const handleChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    onUpdate?.({ content: { ...content, code: newCode, language } });
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    onUpdate?.({ content: { ...content, code, language: lang } });
    setShowLanguageMenu(false);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
  };

  return (
    <div className="relative rounded-md bg-muted overflow-hidden font-mono">
      <div className="flex items-center justify-between border-b border-border p-2 bg-muted/50">
        <Dropdown
          trigger={({ open, onClick }) => (
            <button
              onClick={onClick}
              className="flex items-center gap-1 px-2 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Выбрать язык"
              aria-expanded={open}
            >
              <span className="capitalize">{language}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        >
          {LANGUAGES.map(lang => (
            <DropdownItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={language === lang ? 'bg-accent/10' : ''}
            >
              {lang}
            </DropdownItem>
          ))}
        </Dropdown>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={copyCode}
            aria-label="Копировать код"
            disabled={!code}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleChange}
        readOnly={readOnly}
        className="w-full min-h-[120px] p-4 bg-transparent border-none resize-none outline-none text-code"
        spellCheck={false}
        placeholder="Напишите код..."
      />
    </div>
  );
}