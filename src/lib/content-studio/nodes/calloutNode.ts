import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutVariant = 'info' | 'warning' | 'success' | 'tip';

export const CALLOUT_VARIANTS: { value: CalloutVariant; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'tip', label: 'Tip' },
  { value: 'warning', label: 'Warning' },
  { value: 'success', label: 'Success' },
];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-variant') || 'info',
        renderHTML: (attributes) => ({ 'data-variant': attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (variant: CalloutVariant = 'info') =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
