# SavDown rich-text editor audit

Implementation and source/diff review only. No local tests, build, typecheck,
browser checks, database writes, commits, pushes, PRs or deployments were run.

## Inline code findings

StarterKit already registers the Code mark exactly once. The existing button
already calls `editor.chain().focus().toggleCode().run()`, consistent with
https://tiptap.dev/docs/editor/extensions/marks/code. Inline code is serialized
as the `code` JSON mark and rendered as `<code>`; code blocks are separate
`codeBlock` nodes rendered as `<pre><code>`.

The confirmed defect is stale toolbar state: the installed Tiptap v3
`useEditor` hook does not rerender on transactions by default. Cursor movement,
keyboard selection, stored marks and history changes could leave indicators
and disabled states stale. Added an explicit `useEditorState` subscription and
command capability checks. Existing mouse-down selection protection and the
native toggle command are retained. Added an explicit monospace font and
semantic theme colors for editor controls. The reported failure to apply the
mark itself cannot be conclusively reproduced without runtime checks; no
missing extension or incorrect command was found in the checked-out source.

## Every available control traced

| Control | Command / persisted representation / review result |
| --- | --- |
| Bold | `toggleBold`, `bold` mark, `<strong>` |
| Italic | `toggleItalic`, `italic` mark, `<em>` |
| Underline | `toggleUnderline`, `underline` mark, `<u>` |
| Strikethrough | `toggleStrike`, `strike` mark, `<s>` |
| Inline code | `toggleCode`, `code` mark, `<code>`; reactive indicator and capability check added |
| Superscript / subscript | `toggleSuperscript` / `toggleSubscript`, matching marks and `<sup>` / `<sub>` |
| Paragraph | `setParagraph`, paragraph node / `<p>`; active state now checks the paragraph node |
| Headings 2–6 | `setHeading`, heading level attribute / matching heading tag; choosing the current level no longer toggles it to a paragraph |
| Legacy H1 | Kept in schema; existing public H1-to-H2 normalization retained |
| Bullet / numbered lists | `toggleBulletList` / `toggleOrderedList`, nested list nodes; sanitizer now preserves ordered-list `start` |
| Blockquote | `toggleBlockquote`, blockquote node / `<blockquote>` |
| Code block | `toggleCodeBlock`, separate codeBlock node / `<pre><code>` |
| Divider | `setHorizontalRule`, horizontalRule node / `<hr>` |
| Left / center / right / justify | `setTextAlign`, paragraph/heading `textAlign`, narrowly allowed inline style; default left indicator corrected |
| Insert / edit link | `setLink` and structured text insertion, link href/target/rel; full existing link text loaded, mapped selection restored, surrounding marks retained for attribute edits |
| Remove link | `extendMarkRange` + `unsetLink`; dialog target restored |
| Image insert / edit / replace / remove | Existing figureImage commands and upload endpoint; mapped selection, URL and advertised alt-text validation; plain imported images now parse into the existing node |
| Table insert | `insertTable`, table/row/cell/header nodes; bounded integer dimensions, saved selection and context checks |
| Table row above / below | `addRowBefore` / `addRowAfter` |
| Table column left / right | `addColumnBefore` / `addColumnAfter` |
| Table header row | `toggleHeaderRow`; indicator checks the whole first row instead of the current cell |
| Delete table row / column / table | `deleteRow` / `deleteColumn` / `deleteTable`; capability checks added |
| Resize table columns | Existing resizable table extension; sanitizer now retains colgroup/col, column widths and narrowly allowed numeric pixel sizing |
| More: Find | Search decorations and next/previous selection commands; transaction subscription refreshes match counts without persisting highlights |
| More: YouTube | `setYoutubeVideo`; saved selection, focus and invalid-URL feedback added; restricted iframe hosts retained |
| More: four callout variants | `setCallout` for insertion; existing callouts now update variant instead of nesting another callout |
| Undo / redo | Existing history commands; availability now refreshes on transactions |
| Clear formatting | Existing `unsetAllMarks` + `clearNodes`, now also resets alignment attributes |
| Keyboard shortcuts | Existing extension shortcuts retained, including Ctrl/Cmd+B, I, U, E, Z and Shift+Z; custom Ctrl/Cmd+K link dialog retained; dropdown arrow navigation and Escape focus added |
| Toolbar UI | Existing design retained; wrapped mobile controls avoid clipping dropdowns, popovers clamp horizontally to viewport, semantic card backgrounds, labels and disabled states |

## Instances and content lifecycle

Repository search found one rich-text implementation: TiptapEditor inside
ContentStudioShell, opened for creation and editing by AdminContentClient.
SeoSidebar inserts internal links through this same editor handle; its metadata
textareas are plain fields, not additional rich-text editors. No parallel editor
or extension system was added.

ContentStudioShell now captures JSON and Markdown together on each document
update. Previously a debounced form's older JSON could be combined with live,
newer Markdown. Manual and automatic saves now serialize their requests and
reuse the new post ID immediately after the first POST. Autosave retains pending
snapshots during an in-flight save, uses the current callback and skips obsolete
snapshots. The existing API stores JSON without stripping its marks/nodes, and
BlogPostBody renders that JSON through the shared extension schema and sanitizer.
Aligned headings now receive the same anchors as unaligned headings.
Sanitization remains enabled with scheme/iframe restrictions and narrow styles.

## Exact files changed

- `src/components/admin/content-studio/TiptapEditor.tsx`
- `src/components/admin/content-studio/ContentStudioShell.tsx`
- `src/components/admin/content-studio/hooks/useAutosave.ts`
- `src/lib/content-studio/nodes/figureImageNode.ts`
- `src/lib/content-studio/render.ts`
- `src/app/globals.css`
- `RICH_TEXT_EDITOR_AUDIT.md`

## Remaining limitations / approval review

All rows above describe source-level tracing, not executed feature tests. The
mouse/keyboard, save/reopen/resave/publish lifecycle, upload endpoint, history,
responsive layout and theme checklist still need runtime verification. Admin is
intentionally pinned to its existing light palette; public code styling uses
the light/dark semantic tokens. Native inline code excludes other marks by
Tiptap design. JSON remains the authoritative rich representation; the existing
HTML-disabled Markdown compatibility export cannot represent every rich mark,
table attribute, embed or custom node. Previously stripped content cannot be
recovered automatically. Changes are uncommitted and awaiting review.
