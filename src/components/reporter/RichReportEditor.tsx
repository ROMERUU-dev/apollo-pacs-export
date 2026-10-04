import { Fragment, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2 } from 'lucide-react';

const ALLOWED = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'span'],
  ALLOWED_ATTR: [],
};

export function sanitizeReportHtml(html: string): string {
  return DOMPurify.sanitize(html, ALLOWED);
}

/** Flatten the rich report to plain text (block tags -> newlines, list items -> "- "). */
export function htmlToPlainText(html: string): string {
  const withBreaks = sanitizeReportHtml(html)
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const el = document.createElement('div');
  el.innerHTML = withBreaks;
  return (el.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

interface RichReportEditorProps {
  html: string;
  /** Re-seeds the editable DOM when it changes (e.g. the selected study). */
  initKey?: string;
  readOnly?: boolean;
  onChange: (html: string) => void;
}

/**
 * Uncontrolled contenteditable report editor. The DOM is seeded from `html`
 * on mount and whenever `initKey` changes (new study, or re-mount after a
 * collapse/preview toggle); keystrokes flow out via `onChange` but never write
 * back into the node, which keeps the caret stable.
 */
export function RichReportEditor({ html, initKey, readOnly, onChange }: RichReportEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = sanitizeReportHtml(html);
    // Re-seed on mount and on study change only — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey]);

  if (readOnly) {
    return (
      <div
        className="report-doc report-doc--preview"
        dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(html) }}
      />
    );
  }

  function exec(command: string) {
    const node = ref.current;
    if (!node) return;
    node.focus();
    document.execCommand(command, false);
    onChange(node.innerHTML);
  }

  const tools: Array<{ cmd: string; label: string; icon: typeof Bold }> = [
    { cmd: 'undo', label: 'Deshacer', icon: Undo2 },
    { cmd: 'redo', label: 'Rehacer', icon: Redo2 },
    { cmd: 'bold', label: 'Negrita', icon: Bold },
    { cmd: 'italic', label: 'Cursiva', icon: Italic },
    { cmd: 'underline', label: 'Subrayado', icon: Underline },
    { cmd: 'insertUnorderedList', label: 'Lista', icon: List },
    { cmd: 'insertOrderedList', label: 'Lista numerada', icon: ListOrdered },
  ];

  return (
    <div className="report-editor">
      <div className="report-format-toolbar" role="toolbar" aria-label="Formato del reporte">
        {tools.map(({ cmd, label, icon: Icon }) => (
          <Fragment key={cmd}>
            {(cmd === 'bold' || cmd === 'insertUnorderedList') && <span className="fmt-divider" aria-hidden="true" />}
            <button
              type="button"
              className="fmt-btn"
              aria-label={label}
              title={label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => exec(cmd)}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          </Fragment>
        ))}
      </div>
      <div
        ref={ref}
        className="report-doc"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Editor de reporte"
        onInput={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}
