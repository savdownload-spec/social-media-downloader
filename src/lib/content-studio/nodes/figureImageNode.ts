import { Node, mergeAttributes } from '@tiptap/core';

export type FigureAlign = '' | 'left' | 'center' | 'right';

export interface FigureImageAttrs {
  src: string;
  alt: string;
  title: string;
  caption: string;
  align: FigureAlign;
  href: string;
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
 * title/align/link are node attributes edited via the image dialog rather
 * than inline contenteditable, so this can stay a simple leaf node and still
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
      align: { default: '' },
      href: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-figure-image]',
        getAttrs: (el) => {
          const figure = el as HTMLElement;
          const img = figure.querySelector('img');
          const link = img?.closest('a');
          const caption = figure.querySelector('figcaption');
          return {
            src: img?.getAttribute('src') || '',
            alt: img?.getAttribute('alt') || '',
            title: img?.getAttribute('title') || '',
            caption: caption?.textContent || '',
            align: figure.getAttribute('data-align') || '',
            href: link?.getAttribute('href') || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title, caption, align, href } = HTMLAttributes as FigureImageAttrs;
    const img = ['img', { src, alt, title, loading: 'lazy' }] as const;
    const linked = href ? ['a', { href }, img] : img;
    return [
      'figure',
      mergeAttributes(
        { 'data-figure-image': '' },
        align ? { 'data-align': align } : {},
      ),
      linked,
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
            attrs: { alt: '', title: '', caption: '', align: '', href: '', ...attrs },
          }),
      updateFigureImage:
        (attrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attrs),
    };
  },
});
