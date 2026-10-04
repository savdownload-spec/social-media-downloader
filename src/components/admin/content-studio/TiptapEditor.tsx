'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, Link as LinkIcon, Unlink, ImageIcon, Table as TableIcon,
  Undo2, Redo2, Minus, Youtube as YoutubeIcon, Type,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Info, AlertTriangle, CheckCircle2, Lightbulb, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Eraser,
  Search, X, ChevronDown, SquareCode, Pencil,
} from 'lucide-react';
import { getBaseExtensions } from '@/lib/content-studio/tiptapExtensions';
import { analyzeContentJson, type TiptapNode } from '@/lib/content-studio/contentText';
import { ContentSearch, type SearchStorage } from '@/lib/content-studio/nodes/searchExtension';
import { CALLOUT_VARIANTS, type CalloutVariant } from '@/lib/content-studio/nodes/calloutNode';
import type { FigureAlign } from '@/lib/content-studio/nodes/figureImageNode';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const CALLOUT_ICONS: Record<CalloutVariant, typeof Info> = {
  info: Info, warning: AlertTriangle, success: CheckCircle2, tip: Lightbulb,
};

const inputCls = 'w-full h-9 rounded-lg border border-border-light bg-white px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';
const labelCls = 'block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5';

// ─── URL helpers ─────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  let value = raw.trim();
  if (!value) return '';
  if (/^#/.test(value) || value.startsWith('/')) return value;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
  return value;
}

function isValidHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith('/') || href.startsWith('#')) return !/\s/.test(href);
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(href)) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isUrlLike(text: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
}

// ─── toolbar primitives ──────────────────────────────────────────────────────

function ToolbarButton({ onClick, active, disabled, title, label, children, className }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title?: string;
  label?: string; children?: React.ReactNode; className?: string;
}) {
  const accessibleName = title ?? label ?? 'Format';
  return (
    <button
      type="button"
      title={accessibleName}
      aria-label={accessibleName}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-lg transition-colors shrink-0',
        label ? 'h-8 px-2 text-[11.5px] font-medium' : 'w-9 h-9',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'bg-primary/[0.12] text-primary' : 'text-text-muted hover:bg-surface hover:text-text',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
      {label && <span>{label}</span>}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-6 bg-border-light mx-1 shrink-0" aria-hidden="true" />;
}

function ToolbarDropdown({ trigger, triggerLabel, triggerActive, items, align = 'left' }: {
  trigger: React.ReactNode;
  triggerLabel: string;
  triggerActive?: boolean;
  items: { key: string; label: string; active?: boolean; icon?: React.ReactNode; onClick: () => void }[];
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1 h-9 rounded-lg px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          triggerActive || open ? 'bg-primary/[0.12] text-primary' : 'text-text-muted hover:bg-surface hover:text-text',
        )}
      >
        {trigger}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={triggerLabel}
          className={cn(
            'absolute top-10 z-20 bg-white border border-border-light rounded-lg shadow-soft-lg p-1 flex flex-col min-w-[168px]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { item.onClick(); setOpen(false); }}
              aria-current={item.active || undefined}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                item.active ? 'bg-primary/[0.08] text-primary font-medium' : 'text-text hover:bg-surface',
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── table insert ────────────────────────────────────────────────────────────

function TableInsert({ onInsert, active }: { onInsert: (rows: number, cols: number, withHeaderRow: boolean) => void; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [header, setHeader] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        title="Insert table"
        aria-label="Insert table"
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open || active ? 'bg-primary/[0.12] text-primary' : 'text-text-muted hover:bg-surface hover:text-text',
        )}
      >
        <TableIcon className="w-4 h-4" />
      </button>
      {open && (
        <div role="dialog" aria-label="Insert table" className="absolute top-10 left-0 z-20 bg-white border border-border-light rounded-lg shadow-soft-lg p-3 w-56 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="table-rows" className={labelCls}>Rows</label>
              <input
                id="table-rows"
                type="number"
                min={1}
                max={30}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="table-cols" className={labelCls}>Columns</label>
              <input
                id="table-cols"
                type="number"
                min={1}
                max={12}
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className={inputCls}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-text cursor-pointer">
            <input
              type="checkbox"
              checked={header}
              onChange={(e) => setHeader(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30"
            />
            Header row
          </label>
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => {
              onInsert(rows, cols, header);
              setOpen(false);
            }}
          >
            Insert table
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── dialogs state ───────────────────────────────────────────────────────────

type LinkDialogState = {
  open: boolean;
  editingExisting: boolean;
  href: string;
  text: string;
  originalText: string;
  newTab: boolean;
  nofollow: boolean;
  error: string;
};

type ImageDialogState = {
  open: boolean;
  editing: boolean;
  src: string;
  alt: string;
  caption: string;
  title: string;
  align: FigureAlign;
  href: string;
};

const EMPTY_LINK_DIALOG: LinkDialogState = {
  open: false, editingExisting: false, href: '', text: '', originalText: '', newTab: true, nofollow: false, error: '',
};
const EMPTY_IMAGE_DIALOG: ImageDialogState = {
  open: false, editing: false, src: '', alt: '', caption: '', title: '', align: '', href: '',
};

// ─── component ───────────────────────────────────────────────────────────────

export type EditorStats = {
  wordCount: number;
  charCount: number;
  readingTimeMinutes: number;
  headingCount: number;
  imageCount: number;
  linkCount: number;
};

export type TiptapEditorHandle = {
  insertLinkAtCursor: (url: string, text: string) => void;
  getMarkdown: () => string;
};

export const TiptapEditor = forwardRef<TiptapEditorHandle, {
  initialContentJson?: TiptapNode | null;
  initialMarkdown?: string;
  onChange: (json: TiptapNode) => void;
  onStats: (stats: EditorStats) => void;
}>(function TiptapEditor({
  initialContentJson,
  initialMarkdown,
  onChange,
  onStats,
}, ref) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const { error: toastError } = useToast();
  const [imageDialog, setImageDialog] = useState<ImageDialogState>(EMPTY_IMAGE_DIALOG);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>(EMPTY_LINK_DIALOG);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [findOpen, setFindOpen] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const openLinkDialogRef = useRef<() => void>(() => {});

  const extensions = useMemo(() => [
    ...getBaseExtensions(),
    Placeholder.configure({ placeholder: 'Start writing your article…' }),
    CharacterCount,
    Markdown.configure({ html: false, transformCopiedText: false }),
    ContentSearch,
  ], []);

  // Memoize editorProps so its object reference is stable across re-renders.
  // Tiptap v3's useEditor calls editor.setOptions() whenever compareOptions()
  // detects a change. editorProps is compared by reference (it is NOT in the
  // callback-exclusion list), so a new literal on every render would trigger
  // setOptions → view.setProps → view.updateState → ProseMirror transaction →
  // onUpdate → onChange/onStats → React state update → re-render → new
  // editorProps → infinite loop that freezes the browser.
  // openLinkDialogRef is a React ref so its identity is always stable.
  const editorProps = useMemo(() => ({
    attributes: { class: 'prose-elegant max-w-none focus:outline-none min-h-[420px] px-5 py-4' },
    // Strips Word/Google Docs cruft (mso- styles, <o:p>, class noise) on
    // paste. Everything else is already filtered by the schema: only tags
    // and marks the editor knows survive parsing, so pasted fonts, colors
    // and tracking markup never reach the article.
    transformPastedHTML(html: string) {
      return html
        .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')
        .replace(/<xml>[\s\S]*?<\/xml>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\/?(meta|link)[^>]*>/gi, '')
        .replace(/class="?Mso[^"]*"?/gi, '')
        .replace(/style="([^"]*)"/gi, (_match, styles: string) => {
          const kept = styles.split(';').map((s) => s.trim()).filter((s) => /^\s*text-align\s*:/i.test(s));
          return kept.length ? `style="${kept.join(';')}"` : '';
        });
    },
    handleKeyDown(_view: EditorView, event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openLinkDialogRef.current();
        return true;
      }
      return false;
    },
  // openLinkDialogRef.current is mutated in-place; the ref object itself
  // never changes, so this memo has no deps and never rebuilds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const editor = useEditor({
    extensions,
    content: initialContentJson ?? initialMarkdown ?? '',
    immediatelyRender: false,
    editorProps,
    onUpdate({ editor }) {
      const json = editor.getJSON() as TiptapNode;
      onChange(json);
      const analysis = analyzeContentJson(json);
      onStats({
        wordCount: analysis.wordCount,
        charCount: analysis.charCount,
        readingTimeMinutes: analysis.readingTimeMinutes,
        headingCount: analysis.headings.length,
        imageCount: analysis.images.length,
        linkCount: analysis.links.length,
      });
    },
  });

  // ── stats on mount ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!editor) return;
    const json = editor.getJSON() as TiptapNode;
    const analysis = analyzeContentJson(json);
    onStats({
      wordCount: analysis.wordCount,
      charCount: analysis.charCount,
      readingTimeMinutes: analysis.readingTimeMinutes,
      headingCount: analysis.headings.length,
      imageCount: analysis.images.length,
      linkCount: analysis.links.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // ── link dialog ────────────────────────────────────────────────────────────

  function openLinkDialog() {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const existing = editor.getAttributes('link') as { href?: string; target?: string | null; rel?: string | null };
    const editingExisting = !!existing.href;
    const selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ', ' ');
    setLinkDialog({
      open: true,
      editingExisting,
      href: editingExisting ? existing.href ?? '' : isUrlLike(selectedText) ? selectedText : '',
      text: selectedText,
      originalText: selectedText,
      // External links open in a new tab by default; stored attrs win when editing.
      newTab: editingExisting ? existing.target === '_blank' : true,
      nofollow: editingExisting ? (existing.rel ?? '').includes('nofollow') : false,
      error: '',
    });
  }

  useEffect(() => {
    openLinkDialogRef.current = openLinkDialog;
  });

  function applyLinkDialog() {
    if (!editor || !linkDialog.open) return;
    const href = normalizeUrl(linkDialog.href);
    if (!href) {
      setLinkDialog((d) => ({ ...d, error: 'Enter a URL first.' }));
      return;
    }
    if (!isValidHref(href)) {
      setLinkDialog((d) => ({ ...d, error: 'Enter a valid http(s), mailto or relative URL.' }));
      return;
    }
    const rel = linkDialog.nofollow ? 'noopener noreferrer nofollow' : 'noopener noreferrer';
    const target = linkDialog.newTab ? '_blank' : null;
    const linkMark = { type: 'link', attrs: { href, target, rel } };

    if (linkDialog.editingExisting) {
      const range = getMarkRange(editor.state.selection.$from, editor.schema.marks.link);
      if (range && linkDialog.text && linkDialog.text !== linkDialog.originalText) {
        editor.chain().focus().insertContentAt(
          { from: range.from, to: range.to },
          { type: 'text', text: linkDialog.text, marks: [linkMark] },
        ).run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href, target, rel }).run();
      }
    } else {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        const label = linkDialog.text.trim() || href;
        editor.chain().focus().insertContent({ type: 'text', text: label, marks: [linkMark] }).run();
      } else if (linkDialog.text && linkDialog.text !== linkDialog.originalText) {
        editor.chain().focus().insertContentAt(
          { from, to },
          { type: 'text', text: linkDialog.text, marks: [linkMark] },
        ).run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href, target, rel }).run();
      }
    }
    setLinkDialog(EMPTY_LINK_DIALOG);
  }

  function unlinkSelection() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkDialog((d) => (d.open ? EMPTY_LINK_DIALOG : d));
  }

  // ── image dialog ───────────────────────────────────────────────────────────

  async function uploadImage(file: File): Promise<string | null> {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/admin/content/media', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (data?.ok) return data.data.url as string;
      toastError('Image upload failed', data?.error || `Server returned ${res.status}. The image was not saved.`);
      return null;
    } catch {
      toastError('Image upload failed', 'Could not reach the server. Check your connection and try again.');
      return null;
    }
  }

  function openImageDialog() {
    if (!editor) return;
    const attrs = editor.getAttributes('figureImage') as Partial<ImageDialogState>;
    if (attrs.src) {
      setImageDialog({
        open: true, editing: true,
        src: attrs.src ?? '', alt: attrs.alt ?? '', caption: attrs.caption ?? '',
        title: attrs.title ?? '', align: (attrs.align as FigureAlign) ?? '', href: attrs.href ?? '',
      });
    } else {
      fileInputRef.current?.click();
    }
  }

  async function handleImageFile(file: File, mode: 'new' | 'replace') {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      if (!url) return;
      if (mode === 'new') {
        setImageDialog({ ...EMPTY_IMAGE_DIALOG, open: true, editing: false, src: url });
      } else {
        setImageDialog((d) => ({ ...d, src: url }));
      }
    } finally {
      setUploading(false);
    }
  }

  function applyImageDialog() {
    if (!editor || !imageDialog.open) return;
    const attrs = {
      src: imageDialog.src.trim(),
      alt: imageDialog.alt.trim(),
      caption: imageDialog.caption.trim(),
      title: imageDialog.title.trim(),
      align: imageDialog.align,
      href: normalizeUrl(imageDialog.href),
    };
    if (!attrs.src) return;
    if (attrs.href && !isValidHref(attrs.href)) {
      toastError('Invalid image link', 'Enter a valid http(s) or relative URL for the image link.');
      return;
    }
    if (imageDialog.editing) {
      editor.chain().focus().updateFigureImage(attrs).run();
    } else {
      editor.chain().focus().insertFigureImage(attrs).run();
    }
    setImageDialog(EMPTY_IMAGE_DIALOG);
  }

  function removeImage() {
    if (!editor) return;
    editor.chain().focus().deleteNode('figureImage').run();
    setImageDialog(EMPTY_IMAGE_DIALOG);
  }

  // ── find ───────────────────────────────────────────────────────────────────

  function toggleFind() {
    setFindOpen((open) => {
      const next = !open;
      if (!next) {
        editor?.commands.clearSearch();
        setFindTerm('');
        editor?.commands.focus();
      }
      return next;
    });
  }

  function onFindTermChange(term: string) {
    setFindTerm(term);
    editor?.commands.setSearchTerm(term);
  }

  const searchStorage = (editor?.storage as { contentSearch?: SearchStorage } | undefined)?.contentSearch;

  // ── block type helpers ─────────────────────────────────────────────────────

  const blockLevel = [1, 2, 3, 4, 5, 6].find((level) => editor?.isActive('heading', { level }));
  const blockLabel = blockLevel ? `Heading ${blockLevel}` : 'Paragraph';

  useImperativeHandle(ref, () => ({
    insertLinkAtCursor(url: string, text: string) {
      if (!editor) return;
      editor.chain().focus().insertContent({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: { href: url, rel: 'noopener noreferrer' } }],
      }).run();
    },
    getMarkdown() {
      if (!editor) return '';
      const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
      return storage.markdown?.getMarkdown() ?? '';
    },
  }), [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96 text-text-subtle text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading editor…
      </div>
    );
  }

  const inTable = editor.isActive('table');
  const inLink = editor.isActive('link');
  const figureActive = !!editor.getAttributes('figureImage').src;

  return (
    // No overflow-hidden here: it would make this the sticky containing
    // block for the toolbar below, which breaks position: sticky against
    // the real page scroll (the toolbar would never appear to "stick").
    // Rounded corners are applied per-edge to the toolbar/content instead.
    <div className="bg-white border border-border-light rounded-xl">
      {/* Toolbar */}
      <div className="sticky top-14 z-[5] bg-white rounded-t-xl shadow-sm">
        <div className="flex items-center gap-0.5 px-2 py-2 border-b border-border-light overflow-x-auto lg:flex-wrap lg:overflow-visible">
          <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Redo (Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-4 h-4" /></ToolbarButton>
          <Divider />
          <ToolbarDropdown
            triggerLabel={`Block type: ${blockLabel}`}
            triggerActive={!!blockLevel}
            trigger={<span className="inline-flex items-center gap-1.5 text-[12px] font-medium min-w-[7.5rem]"><Type className="w-3.5 h-3.5 opacity-70" />{blockLabel}</span>}
            items={[
              { key: 'p', label: 'Paragraph', active: !blockLevel, icon: <Type className="w-3.5 h-3.5" />, onClick: () => editor.chain().focus().setParagraph().run() },
              ...[1, 2, 3, 4, 5, 6].map((level) => ({
                key: `h${level}`,
                label: `Heading ${level}`,
                active: blockLevel === level,
                icon: <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[9px] font-bold">H{level}</span>,
                onClick: () => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run(),
              })),
            ]}
          />
          <Divider />
          <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Superscript" active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()}><span className="text-[11px] font-bold leading-none">x²</span></ToolbarButton>
          <ToolbarButton title="Subscript" active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()}><span className="text-[11px] font-bold leading-none">x₂</span></ToolbarButton>
          <Divider />
          <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><SquareCode className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></ToolbarButton>
          <Divider />
          <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().toggleTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().toggleTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().toggleTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().toggleTextAlign('justify').run()}><AlignJustify className="w-4 h-4" /></ToolbarButton>
          <Divider />
          <ToolbarButton title="Insert / Edit Link (Ctrl+K)" active={inLink} onClick={openLinkDialog}><LinkIcon className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Remove Link" active={false} disabled={!inLink} onClick={unlinkSelection}><Unlink className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton
            title={figureActive ? 'Edit image' : 'Insert image'}
            active={figureActive}
            onClick={openImageDialog}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          </ToolbarButton>
          <TableInsert active={inTable} onInsert={(r, c, h) => editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: h }).run()} />
          <ToolbarDropdown
            triggerLabel="More formatting options"
            trigger={<span className="inline-flex items-center gap-1 text-[12px] font-medium">More</span>}
            align="right"
            items={[
              { key: 'find', label: 'Find in article…', icon: <Search className="w-3.5 h-3.5" />, onClick: toggleFind },
              { key: 'youtube', label: 'YouTube embed…', icon: <YoutubeIcon className="w-3.5 h-3.5" />, onClick: () => { setYoutubeUrl(''); setYoutubeOpen(true); } },
              ...CALLOUT_VARIANTS.map((v) => ({
                key: `callout-${v.value}`,
                label: `Callout: ${v.label}`,
                active: editor.isActive('callout', { variant: v.value }),
                icon: (() => { const Icon = CALLOUT_ICONS[v.value]; return <Icon className="w-3.5 h-3.5" />; })(),
                onClick: () => editor.chain().focus().setCallout(v.value).run(),
              })),
            ]}
          />
          <Divider />
          <ToolbarButton
            title="Clear formatting"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <Eraser className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Contextual table controls */}
        {inTable && (
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border-light bg-surface/40">
            <ToolbarButton label="Row above" onClick={() => editor.chain().focus().addRowBefore().run()} />
            <ToolbarButton label="Row below" onClick={() => editor.chain().focus().addRowAfter().run()} />
            <ToolbarButton label="Column left" onClick={() => editor.chain().focus().addColumnBefore().run()} />
            <ToolbarButton label="Column right" onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <Divider />
            <ToolbarButton label="Header row" active={editor.isActive('tableHeader')} onClick={() => editor.chain().focus().toggleHeaderRow().run()} />
            <Divider />
            <ToolbarButton label="Delete row" onClick={() => editor.chain().focus().deleteRow().run()} />
            <ToolbarButton label="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()} />
            <ToolbarButton label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()} />
          </div>
        )}

        {/* Find bar */}
        {findOpen && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-light bg-surface/40">
            <Search className="w-3.5 h-3.5 text-text-subtle shrink-0" />
            <input
              autoFocus
              value={findTerm}
              onChange={(e) => onFindTermChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) editor.commands.findPrevious();
                  else editor.commands.findNext();
                } else if (e.key === 'Escape') {
                  toggleFind();
                }
              }}
              placeholder="Find in article…"
              className="flex-1 min-w-0 h-8 rounded-lg border border-border-light bg-white px-3 text-[12.5px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
            <span className="text-[11px] text-text-subtle tabular-nums shrink-0" aria-live="polite">
              {searchStorage?.total ? `${(searchStorage.currentIndex ?? 0) + 1}/${searchStorage.total}` : '0/0'}
            </span>
            <ToolbarButton title="Previous match (Shift+Enter)" onClick={() => editor.commands.findPrevious()} disabled={!searchStorage?.total}><ChevronDown className="w-4 h-4 rotate-180" /></ToolbarButton>
            <ToolbarButton title="Next match (Enter)" onClick={() => editor.commands.findNext()} disabled={!searchStorage?.total}><ChevronDown className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton title="Close find (Esc)" onClick={toggleFind}><X className="w-4 h-4" /></ToolbarButton>
          </div>
        )}
      </div>

      <EditorContent editor={editor} />

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f, 'new'); e.target.value = ''; }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f, 'replace'); e.target.value = ''; }}
      />

      {/* Link dialog */}
      <Modal
        open={linkDialog.open}
        onClose={() => setLinkDialog(EMPTY_LINK_DIALOG)}
        title={linkDialog.editingExisting ? 'Edit link' : 'Insert link'}
        description={linkDialog.editingExisting ? 'Update the URL, text or behavior of this link.' : 'Add a hyperlink to the selected text, or type the link text to create a new one.'}
        size="sm"
        footer={
          <>
            {linkDialog.editingExisting && (
              <Button variant="ghost" size="sm" onClick={unlinkSelection} className="text-rose-600 hover:bg-rose-50 mr-auto">
                <Unlink className="w-3.5 h-3.5 mr-1" /> Remove link
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setLinkDialog(EMPTY_LINK_DIALOG)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={applyLinkDialog}>
              {linkDialog.editingExisting ? 'Save link' : 'Apply link'}
            </Button>
          </>
        }
      >
        {linkDialog.open && (
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="link-url">URL</label>
              <input
                id="link-url"
                autoFocus
                value={linkDialog.href}
                onChange={(e) => setLinkDialog((d) => ({ ...d, href: e.target.value, error: '' }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyLinkDialog(); }}
                placeholder="https://example.com or /tools/youtube-downloader"
                className={inputCls}
              />
              {linkDialog.error && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1" role="alert">
                  <AlertTriangle className="w-3 h-3" /> {linkDialog.error}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls} htmlFor="link-text">Link text</label>
              <input
                id="link-text"
                value={linkDialog.text}
                onChange={(e) => setLinkDialog((d) => ({ ...d, text: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyLinkDialog(); }}
                placeholder={linkDialog.editingExisting ? 'Text of this link' : 'Shown text (defaults to the URL)'}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-[12.5px] text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkDialog.newTab}
                  onChange={(e) => setLinkDialog((d) => ({ ...d, newTab: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30"
                />
                Open in a new tab
              </label>
              <label className="flex items-center gap-2 text-[12.5px] text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkDialog.nofollow}
                  onChange={(e) => setLinkDialog((d) => ({ ...d, nofollow: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30"
                />
                Add <code className="text-[11px] bg-surface px-1 rounded">nofollow</code> (don&apos;t pass link credit)
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* Image dialog */}
      <Modal
        open={imageDialog.open}
        onClose={() => setImageDialog(EMPTY_IMAGE_DIALOG)}
        title={imageDialog.editing ? 'Edit image' : 'Insert image'}
        description="Alt text is required for accessibility and SEO. Alignment and an optional link apply to the image."
        size="sm"
        footer={
          <>
            {imageDialog.editing && (
              <Button variant="ghost" size="sm" onClick={removeImage} className="text-rose-600 hover:bg-rose-50 mr-auto">
                Remove image
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setImageDialog(EMPTY_IMAGE_DIALOG)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={applyImageDialog} disabled={!imageDialog.src.trim()}>
              {imageDialog.editing ? 'Save changes' : 'Insert image'}
            </Button>
          </>
        }
      >
        {imageDialog.open && (
          <div className="space-y-3">
            {imageDialog.src && (
              <img src={imageDialog.src} alt="" className="w-full max-h-40 object-cover rounded-lg border border-border-light" />
            )}
            <div>
              <label className={labelCls} htmlFor="img-src">Image URL</label>
              <input
                id="img-src"
                value={imageDialog.src}
                onChange={(e) => setImageDialog((d) => ({ ...d, src: e.target.value }))}
                placeholder="/images/blog/uploads/…"
                className={inputCls}
              />
            </div>
            <Button variant="outline" size="sm" loading={uploading} onClick={() => replaceInputRef.current?.click()}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Replace with uploaded image…
            </Button>
            <div>
              <label className={labelCls} htmlFor="img-alt">Alt text</label>
              <input
                id="img-alt"
                value={imageDialog.alt}
                onChange={(e) => setImageDialog((d) => ({ ...d, alt: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyImageDialog(); }}
                placeholder="Describe the image…"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="img-caption">Caption (optional)</label>
              <input
                id="img-caption"
                value={imageDialog.caption}
                onChange={(e) => setImageDialog((d) => ({ ...d, caption: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyImageDialog(); }}
                placeholder="Shown under the image…"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="img-align">Alignment</label>
                <select
                  id="img-align"
                  value={imageDialog.align}
                  onChange={(e) => setImageDialog((d) => ({ ...d, align: e.target.value as FigureAlign }))}
                  className={inputCls}
                >
                  <option value="">Full width</option>
                  <option value="left">Left</option>
                  <option value="center">Centered</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="img-link">Link URL (optional)</label>
                <input
                  id="img-link"
                  value={imageDialog.href}
                  onChange={(e) => setImageDialog((d) => ({ ...d, href: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyImageDialog(); }}
                  placeholder="https://…"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* YouTube embed dialog */}
      <Modal
        open={youtubeOpen}
        onClose={() => setYoutubeOpen(false)}
        title="Embed YouTube video"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setYoutubeOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => {
              const url = youtubeUrl.trim();
              if (url) editor?.commands.setYoutubeVideo({ src: url });
              setYoutubeOpen(false);
            }} disabled={!youtubeUrl.trim()}>
              Embed video
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { const url = youtubeUrl.trim(); if (url) editor?.commands.setYoutubeVideo({ src: url }); setYoutubeOpen(false); } }}
          placeholder="https://www.youtube.com/watch?v=…"
          className={inputCls}
        />
      </Modal>
    </div>
  );
});
