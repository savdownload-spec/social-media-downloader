import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Youtube from '@tiptap/extension-youtube';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import type { AnyExtension } from '@tiptap/core';
import { CalloutNode } from './nodes/calloutNode';
import { FigureImageNode } from './nodes/figureImageNode';

/**
 * Extensions shared between the admin editor and the server-side
 * generateHTML() renderer. Keeping this list identical in both places is
 * what guarantees the public page renders exactly what the editor shows.
 * UI-only concerns (Placeholder, CharacterCount, search) are added on top of
 * this list in the editor component, not here.
 *
 * Every attribute these extensions persist must stay renderable by
 * render.ts — schema, alignment, link target/rel and figure alignment all
 * flow through the sanitize whitelist there.
 *
 * Note: StarterKit v3 already bundles link + underline — configure them via
 * StarterKit instead of registering duplicates.
 */
export function getBaseExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      horizontalRule: {},
      link: {
        openOnClick: false,
        autolink: true,
        // Defaults only — the link dialog stores per-link target/rel attrs.
        // External links default to a new tab; internal /… links open inline.
        HTMLAttributes: { rel: 'noopener noreferrer' },
        isAllowedUri: (url, ctx) => {
          // Block script/data URIs even if a dialog slips one through; relative
          // paths and #anchors stay allowed for internal links.
          if (/^\s*(javascript|data|vbscript):/i.test(url)) return false;
          return ctx.defaultValidate(url);
        },
      },
    }),
    Subscript,
    Superscript,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Table.configure({ resizable: true, renderWrapper: true }),
    TableRow,
    TableHeader,
    TableCell,
    Youtube.configure({ nocookie: true, width: 640, height: 360 }),
    CalloutNode,
    FigureImageNode,
  ];
}
