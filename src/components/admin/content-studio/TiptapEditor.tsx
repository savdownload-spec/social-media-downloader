'use client';

import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import type { SelectionBookmark } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useLayoutEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, Link as LinkIcon, Unlink, ImageIcon, Table as TableIcon,
  Undo2, Redo2, Minus, Youtube as YoutubeIcon, Type,
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

const inputCls = 'w-full h-9 rounded-lg border border-border-light bg-card px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';
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

function usePopoverPosition(open: boolean, rootRef: React.RefObject<HTMLDivElement>, align: 'left' | 'right' = 'left') {
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const root = rootRef.current;
      const popup = root?.querySelector<HTMLElement>('[role="menu"], [role="dialog"]');
      if (!root || !popup) return;
      const rect = root.getBoundingClientRect();
      const left = align === 'right' ? rect.right - popup.offsetWidth : rect.left;
      const clamped = Math.max(8, Math.min(left, window.innerWidth - popup.offsetWidth - 8));
      setOffset(clamped - left);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, rootRef, align]);
  return { transform: `translateX(${offset}px)` };
}

function ToolbarDropdown({ trigger, triggerLabel, triggerActive, items, align = 'left' }: {
  trigger: React.ReactNode;
  triggerLabel: string;
  triggerActive?: boolean;
  items: { key: string; label: string; active?: boolean; disabled?: boolean; icon?: React.ReactNode; onClick: () => void }[];
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupStyle = usePopoverPosition(open, rootRef, align);

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
    <div ref={rootRef} className="relative shrink-0" onKeyDown={(event) => {
      if (!open) return;
      const buttons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        rootRef.current?.querySelector('button')?.focus();
      }
    }}>
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
          style={popupStyle}
          aria-label={triggerLabel}
          className={cn(
            'absolute top-10 z-20 bg-card border border-border-light rounded-lg shadow-soft-lg p-1 flex flex-col min-w-[168px]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { item.onClick(); setOpen(false); }}
              aria-current={item.active || undefined}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-left disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
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

function TableInsert({ onInsert, onOpen, active, disabled }: {
  onInsert: (rows: number, cols: number, withHeaderRow: boolean) => void;
  onOpen: () => void; active?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [header, setHeader] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupStyle = usePopoverPosition(open, rootRef);

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
        title="Insert Table"
        aria-label="Insert Table"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { if (!open) onOpen(); setOpen((v) => !v); }}
        className={cn(
          'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open || active ? 'bg-primary/[0.12] text-primary' : 'text-text-muted hover:bg-surface hover:text-text',
        )}
      >
        <TableIcon className="w-4 h-4" />
      </button>
      {open && (
        <div role="dialog" aria-label="Insert table" style={popupStyle} className="absolute top-10 left-0 z-20 bg-card border border-border-light rounded-lg shadow-soft-lg p-3 w-56 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="table-rows" className={labelCls}>Rows</label>
              <input
                id="table-rows"
                type="number"
                min={1}
                max={30}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(30, Math.floor(Number(e.target.value)) || 1)))}
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
                onChange={(e) => setCols(Math.max(1, Math.min(12, Math.floor(Number(e.target.value)) || 1)))}
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
            Insert Table
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
  onChange: (json: TiptapNode, markdown: string) => void;
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
  const dialogSelection = useRef<SelectionBookmark | null>(null);

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
    onTransaction({ transaction }) {
      // Keep dialog/upload targets attached to their original content while
      // asynchronous work or other document transactions take place.
      if (dialogSelection.current) {
        dialogSelection.current = dialogSelection.current.map(transaction.mapping);
      }
    },
    onUpdate({ editor }) {
      const json = editor.getJSON() as TiptapNode;
      const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
      onChange(json, storage.markdown?.getMarkdown() ?? '');
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

  // v3 useEditor does not subscribe the toolbar to transactions by default.
  // Include selection/stored-mark/history/search-only transactions as well.
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });

  function rememberSelection() {
    if (editor) dialogSelection.current = editor.state.selection.getBookmark();
  }

  function restoreSelection() {
    if (!editor || !dialogSelection.current) return;
    const selection = dialogSelection.current.resolve(editor.state.doc);
    dialogSelection.current = null;
    editor.view.dispatch(editor.state.tr.setSelection(selection));
  }

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
    // Populate the whole link at a caret or partial selection, preserving its
    // destination and surrounding marks when only its attributes are edited.
    if (editor.isActive('link')) editor.commands.extendMarkRange('link');
    rememberSelection();
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
    restoreSelection();
    const otherMarks = editor.state.selection.$from.marks()
      .filter((mark) => mark.type.name !== 'link')
      .map((mark) => mark.toJSON());

    if (linkDialog.editingExisting) {
      const range = getMarkRange(editor.state.selection.$from, editor.schema.marks.link);
      if (range && linkDialog.text && linkDialog.text !== linkDialog.originalText) {
        editor.chain().focus().insertContentAt(
          { from: range.from, to: range.to },
          { type: 'text', text: linkDialog.text, marks: [...otherMarks, linkMark] },
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
          { type: 'text', text: linkDialog.text, marks: [...otherMarks, linkMark] },
        ).run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href, target, rel }).run();
      }
    }
    setLinkDialog(EMPTY_LINK_DIALOG);
  }

  function unlinkSelection() {
    if (!editor) return;
    if (linkDialog.open) restoreSelection();
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
    rememberSelection();
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
    if (!isValidHref(attrs.src) || /^mailto:/i.test(attrs.src)) {
      toastError('Invalid image URL', 'Enter an http(s) or relative image URL.');
      return;
    }
    if (!attrs.alt) {
      toastError('Alt text required', 'Describe the image before saving it.');
      return;
    }
    if (attrs.href && !isValidHref(attrs.href)) {
      toastError('Invalid image link', 'Enter a valid http(s) or relative URL for the image link.');
      return;
    }
    restoreSelection();
    if (imageDialog.editing) {
      editor.chain().focus().updateFigureImage(attrs).run();
    } else {
      editor.chain().focus().insertFigureImage(attrs).run();
    }
    setImageDialog(EMPTY_IMAGE_DIALOG);
  }

  function removeImage() {
    if (!editor) return;
    restoreSelection();
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

  function applyYoutube() {
    if (!editor) return;
    restoreSelection();
    if (!editor.chain().focus().setYoutubeVideo({ src: youtubeUrl.trim() }).run()) {
      toastError('Invalid YouTube URL', 'Enter a supported YouTube video URL.');
      return;
    }
    setYoutubeOpen(false);
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
  const tableDepth = Array.from({ length: editor.state.selection.$from.depth }, (_, i) => i + 1)
    .find((depth) => editor.state.selection.$from.node(depth).type.name === 'table');
  const firstRow = tableDepth ? editor.state.selection.$from.node(tableDepth).firstChild : null;
  const hasHeaderRow = !!firstRow && Array.from({ length: firstRow.childCount }, (_, i) => firstRow.child(i))
    .every((cell) => cell.type.name === 'tableHeader');

  return (
    // No overflow-hidden here: it would make this the sticky containing
    // block for the toolbar below, which breaks position: sticky against
    // the real page scroll (the toolbar would never appear to "stick").
    // Rounded corners are applied per-edge to the toolbar/content instead.
    <div className="bg-card border border-border-light rounded-xl">
      {/* Toolbar */}
      <div className="sticky top-14 z-[5] bg-card rounded-t-xl shadow-sm">
        <div role="group" aria-label="Article formatting" className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-border-light">
          <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Redo (Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-4 h-4" /></ToolbarButton>
          <Divider />
          <ToolbarDropdown
            triggerLabel={`Block Type: ${blockLabel}`}
            triggerActive={!!blockLevel}
            trigger={<span className="inline-flex items-center gap-1.5 text-[12px] font-medium min-w-[7.5rem]"><Type className="w-3.5 h-3.5 opacity-70" />{blockLabel}</span>}
            items={[
              { key: 'p', label: 'Paragraph', active: editor.isActive('paragraph'), disabled: !editor.can().setParagraph(), icon: <Type className="w-3.5 h-3.5" />, onClick: () => editor.chain().focus().setParagraph().run() },
              ...[2, 3, 4, 5, 6].map((level) => ({
                key: `h${level}`,
                label: `Heading ${level}`,
                active: blockLevel === level,
                disabled: !editor.can().setHeading({ level: level as 2 | 3 | 4 | 5 | 6 }),
                icon: <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[9px] font-bold">H{level}</span>,
                onClick: () => editor.chain().focus().setHeading({ level: level as 2 | 3 | 4 | 5 | 6 }).run(),
              })),
            ]}
          />
          <Divider />
          <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} disabled={!editor.can().chain().toggleBold().run()} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} disabled={!editor.can().chain().toggleItalic().run()} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive('underline')} disabled={!editor.can().chain().toggleUnderline().run()} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} disabled={!editor.can().chain().toggleStrike().run()} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Inline Code (Ctrl+E)" active={editor.isActive('code')} disabled={!editor.can().chain().toggleCode().run()} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Superscript" active={editor.isActive('superscript')} disabled={!editor.can().chain().toggleSuperscript().run()} onClick={() => editor.chain().focus().toggleSuperscript().run()}><span className="text-[11px] font-bold leading-none">x²</span></ToolbarButton>
          <ToolbarButton title="Subscript" active={editor.isActive('subscript')} disabled={!editor.can().chain().toggleSubscript().run()} onClick={() => editor.chain().focus().toggleSubscript().run()}><span className="text-[11px] font-bold leading-none">x₂</span></ToolbarButton>
          <Divider />
          <ToolbarButton title="Bullet List" active={editor.isActive('bulletList')} disabled={!editor.can().chain().toggleBulletList().run()} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Numbered List" active={editor.isActive('orderedList')} disabled={!editor.can().chain().toggleOrderedList().run()} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Blockquote" active={editor.isActive('blockquote')} disabled={!editor.can().chain().toggleBlockquote().run()} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Code Block" active={editor.isActive('codeBlock')} disabled={!editor.can().chain().toggleCodeBlock().run()} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><SquareCode className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Horizontal Rule" disabled={!editor.can().chain().setHorizontalRule().run()} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></ToolbarButton>
          <Divider />
          <ToolbarButton title="Align Left" active={editor.isActive({ textAlign: 'left' }) || ((editor.isActive('paragraph') || !!blockLevel) && !editor.getAttributes(blockLevel ? 'heading' : 'paragraph').textAlign)} disabled={!editor.can().chain().setTextAlign('left').run()} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Align Center" active={editor.isActive({ textAlign: 'center' })} disabled={!editor.can().chain().setTextAlign('center').run()} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Align Right" active={editor.isActive({ textAlign: 'right' })} disabled={!editor.can().chain().setTextAlign('right').run()} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Justify" active={editor.isActive({ textAlign: 'justify' })} disabled={!editor.can().chain().setTextAlign('justify').run()} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify className="w-4 h-4" /></ToolbarButton>
          <Divider />
          <ToolbarButton title="Insert / Edit Link (Ctrl+K)" active={inLink} disabled={!editor.can().setLink({ href: 'https://example.com' })} onClick={openLinkDialog}><LinkIcon className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton title="Remove Link" active={false} disabled={!inLink} onClick={unlinkSelection}><Unlink className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton
            title={figureActive ? 'Edit Image' : 'Insert Image'}
            active={figureActive}
            onClick={openImageDialog}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          </ToolbarButton>
          <TableInsert active={inTable} disabled={inTable || !editor.can().insertTable()} onOpen={rememberSelection} onInsert={(r, c, h) => {
            restoreSelection();
            editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: h }).run();
          }} />
          <ToolbarDropdown
            triggerLabel="More Formatting Options"
            trigger={<span className="inline-flex items-center gap-1 text-[12px] font-medium">More</span>}
            align="right"
            items={[
              { key: 'find', label: 'Find In Article…', icon: <Search className="w-3.5 h-3.5" />, onClick: toggleFind },
              { key: 'youtube', label: 'YouTube Embed…', icon: <YoutubeIcon className="w-3.5 h-3.5" />, onClick: () => { rememberSelection(); setYoutubeUrl(''); setYoutubeOpen(true); } },
              ...CALLOUT_VARIANTS.map((v) => ({
                key: `callout-${v.value}`,
                label: `Callout: ${v.label}`,
                active: editor.isActive('callout', { variant: v.value }),
                disabled: !editor.isActive('callout') && !editor.can().setCallout(v.value),
                icon: (() => { const Icon = CALLOUT_ICONS[v.value]; return <Icon className="w-3.5 h-3.5" />; })(),
                onClick: () => editor.isActive('callout')
                  ? editor.chain().focus().updateAttributes('callout', { variant: v.value }).run()
                  : editor.chain().focus().setCallout(v.value).run(),
              })),
            ]}
          />
          <Divider />
          <ToolbarButton
            title="Clear Formatting"
            disabled={!editor.can().chain().unsetAllMarks().clearNodes().run()}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().resetAttributes('paragraph', ['textAlign']).resetAttributes('heading', ['textAlign']).run()}
          >
            <Eraser className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Contextual table controls */}
        {inTable && (
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border-light bg-surface/40">
            <ToolbarButton label="Row Above" disabled={!editor.can().chain().addRowBefore().run()} onClick={() => editor.chain().focus().addRowBefore().run()} />
            <ToolbarButton label="Row Below" disabled={!editor.can().chain().addRowAfter().run()} onClick={() => editor.chain().focus().addRowAfter().run()} />
            <ToolbarButton label="Column Left" disabled={!editor.can().chain().addColumnBefore().run()} onClick={() => editor.chain().focus().addColumnBefore().run()} />
            <ToolbarButton label="Column Right" disabled={!editor.can().chain().addColumnAfter().run()} onClick={() => editor.chain().focus().addColumnAfter().run()} />
            <Divider />
            <ToolbarButton label="Header Row" active={hasHeaderRow} disabled={!editor.can().chain().toggleHeaderRow().run()} onClick={() => editor.chain().focus().toggleHeaderRow().run()} />
            <Divider />
            <ToolbarButton label="Delete Row" disabled={!editor.can().chain().deleteRow().run()} onClick={() => editor.chain().focus().deleteRow().run()} />
            <ToolbarButton label="Delete Column" disabled={!editor.can().chain().deleteColumn().run()} onClick={() => editor.chain().focus().deleteColumn().run()} />
            <ToolbarButton label="Delete Table" disabled={!editor.can().chain().deleteTable().run()} onClick={() => editor.chain().focus().deleteTable().run()} />
          </div>
        )}

        {/* Find bar */}
        {findOpen && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-light bg-surface/40">
            <Search className="w-3.5 h-3.5 text-text-subtle shrink-0" />
            <input
              aria-label="Find in article"
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
              className="flex-1 min-w-0 h-8 rounded-lg border border-border-light bg-card px-3 text-[12.5px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
            <span className="text-[11px] text-text-subtle tabular-nums shrink-0" aria-live="polite">
              {searchStorage?.total ? `${(searchStorage.currentIndex ?? 0) + 1}/${searchStorage.total}` : '0/0'}
            </span>
            <ToolbarButton title="Previous Match (Shift+Enter)" onClick={() => editor.commands.findPrevious()} disabled={!searchStorage?.total}><ChevronDown className="w-4 h-4 rotate-180" /></ToolbarButton>
            <ToolbarButton title="Next Match (Enter)" onClick={() => editor.commands.findNext()} disabled={!searchStorage?.total}><ChevronDown className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton title="Close Find (Esc)" onClick={toggleFind}><X className="w-4 h-4" /></ToolbarButton>
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
        onClose={() => { restoreSelection(); setLinkDialog(EMPTY_LINK_DIALOG); }}
        title={linkDialog.editingExisting ? 'Edit link' : 'Insert link'}
        description={linkDialog.editingExisting ? 'Update the URL, text or behavior of this link.' : 'Add a hyperlink to the selected text, or type the link text to create a new one.'}
        size="sm"
        footer={
          <>
            {linkDialog.editingExisting && (
              <Button variant="ghost" size="sm" onClick={unlinkSelection} className="text-rose-600 hover:bg-rose-50 mr-auto">
                <Unlink className="w-3.5 h-3.5 mr-1" /> Remove Link
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { restoreSelection(); setLinkDialog(EMPTY_LINK_DIALOG); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={applyLinkDialog}>
              {linkDialog.editingExisting ? 'Save Link' : 'Apply Link'}
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
        onClose={() => { restoreSelection(); setImageDialog(EMPTY_IMAGE_DIALOG); }}
        title={imageDialog.editing ? 'Edit image' : 'Insert image'}
        description="Alt text is required for accessibility and SEO. Alignment and an optional link apply to the image."
        size="sm"
        footer={
          <>
            {imageDialog.editing && (
              <Button variant="ghost" size="sm" onClick={removeImage} className="text-rose-600 hover:bg-rose-50 mr-auto">
                Remove Image
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { restoreSelection(); setImageDialog(EMPTY_IMAGE_DIALOG); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={applyImageDialog} disabled={!imageDialog.src.trim() || !imageDialog.alt.trim() || uploading}>
              {imageDialog.editing ? 'Save Changes' : 'Insert Image'}
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
              <Pencil className="w-3.5 h-3.5 mr-1" /> Replace With Uploaded Image…
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
                  <option value="">Full Width</option>
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
        onClose={() => { restoreSelection(); setYoutubeOpen(false); }}
        title="Embed YouTube video"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { restoreSelection(); setYoutubeOpen(false); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={applyYoutube} disabled={!youtubeUrl.trim()}>
              Embed Video
            </Button>
          </>
        }
      >
        <input
          autoFocus
          aria-label="YouTube video URL"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyYoutube(); } }}
          placeholder="https://www.youtube.com/watch?v=…"
          className={inputCls}
        />
      </Modal>
    </div>
  );
});
