import { Node, mergeAttributes } from '@tiptap/core';

export interface FigureImageAttrs {
  src: string;
  alt: string;
  title: string;
  caption: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureImage: {
      insertFigureImage: (attrs: Partial<FigureImageAttrs> & { src: string }) => ReturnType;
      updateFigureImage: (attrs: Partial<FigureImageAttrs>) => ReturnType;
    };
  }
}

/**
 * A captioned image node (<figure><img/><figcaption/></figure>). Caption/alt/
 * title are node attributes edited via the sidebar Images panel rather than
 * inline contenteditable, so this can stay a simple leaf node and still
 * render identically through generateHTML() on the server.
 */
export const FigureImageNode = Node.create({
  name: 'figureImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      title: { default: '' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-figure-image]',
        getAttrs: (el) => {
          const figure = el as HTMLElement;
          const img = figure.querySelector('img');
          const caption = figure.querySelector('figcaption');
          return {
            src: img?.getAttribute('src') || '',
            alt: img?.getAttribute('alt') || '',
            title: img?.getAttribute('title') || '',
            caption: caption?.textContent || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title, caption } = HTMLAttributes as FigureImageAttrs;
    return [
      'figure',
      mergeAttributes({ 'data-figure-image': '' }),
      ['img', { src, alt, title, loading: 'lazy' }],
      ...(caption ? [['figcaption', {}, caption] as const] : []),
    ];
  },

  addCommands() {
    return {
      insertFigureImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { alt: '', title: '', caption: '', ...attrs },
          }),
      updateFigureImage:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
