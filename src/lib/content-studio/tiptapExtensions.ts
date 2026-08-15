import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Youtube from '@tiptap/extension-youtube';
import type { AnyExtension } from '@tiptap/core';
import { CalloutNode } from './nodes/calloutNode';
import { FigureImageNode } from './nodes/figureImageNode';

/**
 * Extensions shared between the admin editor and the server-side
 * generateHTML() renderer. Keeping this list identical in both places is
 * what guarantees the public page renders exactly what the editor shows.
 * UI-only concerns (Placeholder, CharacterCount) are added on top of this
 * list in the editor component, not here.
 */
export function getBaseExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      horizontalRule: {},
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Youtube.configure({ nocookie: true, width: 640, height: 360 }),
    CalloutNode,
    FigureImageNode,
  ];
}
