import { useEffect, useRef } from 'react';

import { plainToHtml, sanitizeRichText } from '@/lib/richText';

import { Icon, type IconName } from './Icon';
import { cx } from './ui';

type Cmd = { label: string; icon?: IconName; text?: string; run: () => void };

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

/**
 * A small dependency-free rich text editor (contentEditable). Output is a sanitised HTML subset
 * (p, br, strong, em, u, h2, h3, ul, ol, li, blockquote) — see src/lib/richText.ts.
 */
export function RichTextEditor({
  value,
  onChange,
  dir = 'ltr',
  placeholder,
  minHeight = 200,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Enter should create <p> blocks (browsers default to <div>).
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }, []);

  // Push external value changes (loading a record, switching language tab) into the editable area — but only
  // when the value really differs from what the area already shows, so typing never resets the caret.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = value ? sanitizeRichText(value, true) : '';
    if (incoming !== sanitizeRichText(el.innerHTML, true)) el.innerHTML = incoming || (value ? plainToHtml(value) : '');
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    onChange(sanitizeRichText(el.innerHTML, true));
  };

  const commands: (Cmd | 'sep')[] = [
    { label: 'Bold', text: 'B', run: () => exec('bold') },
    { label: 'Italic', text: 'I', run: () => exec('italic') },
    { label: 'Underline', text: 'U', run: () => exec('underline') },
    'sep',
    { label: 'Heading', text: 'H', run: () => exec('formatBlock', 'h2') },
    { label: 'Paragraph', text: '¶', run: () => exec('formatBlock', 'p') },
    { label: 'Quote', text: '“', run: () => exec('formatBlock', 'blockquote') },
    'sep',
    { label: 'Bullet list', text: '•', run: () => exec('insertUnorderedList') },
    { label: 'Numbered list', text: '1.', run: () => exec('insertOrderedList') },
    'sep',
    { label: 'Undo', text: '↶', run: () => exec('undo') },
    { label: 'Redo', text: '↷', run: () => exec('redo') },
    { label: 'Clear formatting', icon: 'close', run: () => exec('removeFormat') },
  ];

  return (
    <div className={cx('rte', disabled && 'rte-disabled')}>
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        {commands.map((c, i) =>
          c === 'sep' ? (
            <span key={`s${i}`} className="rte-sep" />
          ) : (
            <button
              key={c.label}
              type="button"
              className="rte-btn"
              title={c.label}
              aria-label={c.label}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                ref.current?.focus();
                c.run();
                emit();
              }}
            >
              {c.icon ? <Icon name={c.icon} size={14} /> : <span className={c.label === 'Bold' ? 'b' : c.label === 'Italic' ? 'i' : c.label === 'Underline' ? 'u' : undefined}>{c.text}</span>}
            </button>
          )
        )}
      </div>
      <div
        ref={ref}
        className="rte-area"
        contentEditable={!disabled}
        suppressContentEditableWarning
        dir={dir}
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text"
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          exec('insertText', text);
        }}
      />
    </div>
  );
}
