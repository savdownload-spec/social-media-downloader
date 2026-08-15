'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, Link as LinkIcon, ImageIcon, Table as TableIcon,
  Undo2, Redo2, Minus, Youtube as YoutubeIcon, Heading1, Heading2, Heading3, Heading4,
  Info, AlertTriangle, CheckCircle2, Lightbulb, Loader2,
} from 'lucide-react';
import { getBaseExtensions } from '@/lib/content-studio/tiptapExtensions';
import { analyzeContentJson, type TiptapNode } from '@/lib/content-studio/contentText';
import { CALLOUT_VARIANTS, type CalloutVariant } from '@/lib/content-studio/nodes/calloutNode';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const CALLOUT_ICONS: Record<CalloutVariant, typeof Info> = {
  info: Info, warning: AlertTriangle, success: CheckCircle2, tip: Lightbulb,
};

function ToolbarButton({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
        active ? 'bg-primary/[0.12] text-primary' : 'text-text-muted hover:bg-surface hover:text-text',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-border-light mx-1" />;
}

export type EditorStats = {
  wordCount: number;
  charCount: number;
  readingTimeMinutes: number;
  headingCount: number;
  imageCount: number;
  linkCount: number;
};

export type TiptapEditorHandle = {
  appendLink: (url: string, text: string) => void;
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
  const [calloutMenuOpen, setCalloutMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: toastError } = useToast();
  const [pendingImage, setPendingImage] = useState<{ url: string } | null>(null);
  const [altInput, setAltInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');

  const extensions = useMemo(() => [
    ...getBaseExtensions(),
    Placeholder.configure({ placeholder: 'Start writing your article…' }),
    CharacterCount,
    Markdown.configure({ html: false, transformCopiedText: false }),
  ], []);

  const editor = useEditor({
    extensions,
    content: initialContentJson ?? initialMarkdown ?? '',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'prose-elegant max-w-none focus:outline-none min-h-[420px] px-5 py-4' },
      // Strips Word/Google Docs cruft (mso- styles, <o:p>, class noise) on paste.
      transformPastedHTML(html: string) {
        return html
          .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')
          .replace(/class="?Mso[^"]*"?/gi, '')
          .replace(/style="[^"]*mso-[^"]*"/gi, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<xml>[\s\S]*?<\/xml>/gi, '');
      },
    },
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

  async function handleImageSelect(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/content/media', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setAltInput('');
        setCaptionInput('');
        setPendingImage({ url: data.data.url });
      } else {
        toastError('Image upload failed', data?.error || `Server returned ${res.status}. The image was not inserted.`);
      }
    } catch {
      toastError('Image upload failed', 'Could not reach the server. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  function confirmPendingImage() {
    if (!pendingImage) return;
    editor?.chain().focus().insertFigureImage({ src: pendingImage.url, alt: altInput, caption: captionInput }).run();
    setPendingImage(null);
  }

  function insertLink() {
    const url = window.prompt('Link URL');
    if (!url) return;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function insertYoutube() {
    const url = window.prompt('YouTube video URL');
    if (!url) return;
    editor?.commands.setYoutubeVideo({ src: url });
  }

  useImperativeHandle(ref, () => ({
    appendLink(url: string, text: string) {
      if (!editor) return;
      editor.chain().focus('end').insertContent(`<p><a href="${url}">${text}</a></p>`).run();
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

  return (
    // No overflow-hidden here: it would make this the sticky containing
    // block for the toolbar below, which breaks position: sticky against
    // the real page scroll (the toolbar would never appear to "stick").
    // Rounded corners are applied per-edge to the toolbar/content instead.
    <div className="bg-white border border-border-light rounded-xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2.5 py-2 border-b border-border-light bg-white rounded-t-xl sticky top-14 z-[5] shadow-sm">
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Heading 4" active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Link" active={editor.isActive('link')} onClick={insertLink}><LinkIcon className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="Insert image" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        </ToolbarButton>
        <ToolbarButton title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="w-3.5 h-3.5" /></ToolbarButton>
        <ToolbarButton title="YouTube embed" onClick={insertYoutube}><YoutubeIcon className="w-3.5 h-3.5" /></ToolbarButton>
        <Divider />
        <div className="relative">
          <ToolbarButton title="Callout" active={editor.isActive('callout')} onClick={() => setCalloutMenuOpen((v) => !v)}><Info className="w-3.5 h-3.5" /></ToolbarButton>
          {calloutMenuOpen && (
            <div className="absolute top-8 left-0 z-10 bg-white border border-border-light rounded-lg shadow-soft-lg p-1 flex flex-col min-w-[130px]">
              {CALLOUT_VARIANTS.map((v) => {
                const Icon = CALLOUT_ICONS[v.value];
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => { editor.chain().focus().setCallout(v.value).run(); setCalloutMenuOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-text hover:bg-surface text-left"
                  >
                    <Icon className="w-3.5 h-3.5" /> {v.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); e.target.value = ''; }}
        />
      </div>

      <EditorContent editor={editor} />

      <Modal
        open={!!pendingImage}
        onClose={confirmPendingImage}
        title="Image details"
        description="Add alt text for accessibility and SEO, and an optional caption shown under the image."
        size="sm"
        footer={
          <Button variant="primary" size="sm" onClick={confirmPendingImage}>
            Insert image
          </Button>
        }
      >
        {pendingImage && (
          <div className="space-y-3">
            <img src={pendingImage.url} alt="" className="w-full max-h-40 object-cover rounded-lg border border-border-light" />
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Alt text</label>
              <input
                autoFocus
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmPendingImage(); }}
                placeholder="Describe the image…"
                className="w-full h-9 rounded-lg border border-border-light bg-white px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Caption (optional)</label>
              <input
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmPendingImage(); }}
                placeholder="Shown under the image…"
                className="w-full h-9 rounded-lg border border-border-light bg-white px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
});
