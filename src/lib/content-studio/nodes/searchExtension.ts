import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export type SearchStorage = {
  term: string;
  currentIndex: number;
  total: number;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    contentSearch: {
      /** Highlight all matches of `term` and report the match count. */
      setSearchTerm: (term: string) => ReturnType;
      /** Jump to the next match (wraps around). */
      findNext: () => ReturnType;
      /** Jump to the previous match (wraps around). */
      findPrevious: () => ReturnType;
      /** Remove highlights and reset counters. */
      clearSearch: () => ReturnType;
    };
  }
}

function collectMatches(doc: import('@tiptap/pm/model').Node, term: string) {
  const matches: { from: number; to: number }[] = [];
  const needle = term.trim().toLowerCase();
  if (!needle) return matches;
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const text = node.text ?? '';
    const lower = text.toLowerCase();
    let index = 0;
    while ((index = lower.indexOf(needle, index)) !== -1) {
      matches.push({ from: pos + index, to: pos + index + needle.length });
      index += needle.length;
    }
    return true;
  });
  return matches;
}

/**
 * Minimal in-article find: inline decorations for every match, selection
 * jumps between them. Editor-side only — never part of getBaseExtensions()
 * so the server renderer stays free of plugin-only code.
 */
export const ContentSearch = Extension.create({
  name: 'contentSearch',

  addStorage(): SearchStorage {
    return { term: '', currentIndex: 0, total: 0 };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
          ({ editor, state, dispatch }) => {
            const storage = this.storage as SearchStorage;
            storage.term = term;
            storage.currentIndex = 0;
            storage.total = collectMatches(state.doc, term).length;
            if (dispatch) {
              dispatch(state.tr.setMeta('searchUpdate', true).setMeta('addToHistory', false));
            }
            return true;
          },
      findNext:
        () =>
          ({ editor, state, dispatch }) => {
            const storage = this.storage as SearchStorage;
            const matches = collectMatches(state.doc, storage.term);
            storage.total = matches.length;
            if (!matches.length) return true;
            const current = matches.findIndex((m) => m.from > state.selection.to - 1);
            const next = matches[current === -1 ? 0 : current];
            storage.currentIndex = matches.indexOf(next);
            if (dispatch) {
              const tr = state.tr
                .setMeta('searchUpdate', true)
                .setMeta('addToHistory', false)
                .setSelection(TextSelection.create(state.doc, next.from, next.to));
              dispatch(tr.scrollIntoView());
            }
            return true;
          },
      findPrevious:
        () =>
          ({ editor, state, dispatch }) => {
            const storage = this.storage as SearchStorage;
            const matches = collectMatches(state.doc, storage.term);
            storage.total = matches.length;
            if (!matches.length) return true;
            const current = matches.findIndex((m) => m.from >= state.selection.from);
            const prev = matches[current <= 0 ? matches.length - 1 : current - 1];
            storage.currentIndex = matches.indexOf(prev);
            if (dispatch) {
              const tr = state.tr
                .setMeta('searchUpdate', true)
                .setMeta('addToHistory', false)
                .setSelection(TextSelection.create(state.doc, prev.from, prev.to));
              dispatch(tr.scrollIntoView());
            }
            return true;
          },
      clearSearch:
        () =>
          ({ editor, state, dispatch }) => {
            const storage = this.storage as SearchStorage;
            storage.term = '';
            storage.currentIndex = 0;
            storage.total = 0;
            if (dispatch) {
              dispatch(state.tr.setMeta('searchUpdate', true).setMeta('addToHistory', false));
            }
            return true;
          },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: new PluginKey('contentSearch'),
        props: {
          decorations(state) {
            const storage = extension.storage as SearchStorage;
            if (!storage.term.trim()) return null;
            const matches = collectMatches(state.doc, storage.term);
            storage.total = matches.length;
            if (storage.currentIndex >= matches.length) storage.currentIndex = 0;
            const decorations = matches.map((match, index) =>
              Decoration.inline(match.from, match.to, {
                class: index === storage.currentIndex ? 'search-match-current' : 'search-match',
              }),
            );
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
