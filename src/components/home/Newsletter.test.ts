// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/components/layout/Section', () => ({ Section: ({ children }: { children: React.ReactNode }) => createElement('section', null, children) }));
import { Newsletter } from './Newsletter';
let root: Root;
let host: HTMLDivElement;
let fetcher: ReturnType<typeof vi.fn>;
const input = () => host.querySelector<HTMLInputElement>('#newsletter-email')!;
const button = () => host.querySelector<HTMLButtonElement>('button')!;
async function fill(value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input(), value); input().dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() { await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); }
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => { root.render(createElement(Newsletter)); });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
describe('newsletter form interactions', () => {
  it.each(['', 'not-an-email'])('announces invalid input without a request', async (email) => {
    await fill(email); await submit();
    expect(host.querySelector('[role=status]')!.textContent).toContain('valid email');
    expect(fetcher).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input());
  });
  it('keeps input and prevents duplicate requests while loading and after success', async () => {
    let finish!: (response: Response) => void;
    fetcher.mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; }));
    await fill('reader@example.com'); await submit();
    expect(button().disabled).toBe(true); expect(host.querySelector('form')!.getAttribute('aria-busy')).toBe('true');
    await submit(); expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => { finish(new Response('{"ok":true}', { status: 200 })); });
    expect(input().value).toBe('reader@example.com'); expect(host.querySelector('[role=status]')!.textContent).toContain('Thanks!');
    await submit(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('preserves the email and enables retry after API failure', async () => {
    fetcher.mockResolvedValue(new Response('{"ok":false,"error":"secret"}', { status: 503 }));
    await fill('reader@example.com'); await submit();
    expect(input().value).toBe('reader@example.com'); expect(button().disabled).toBe(false);
    expect(host.textContent).toContain("couldn't complete"); expect(host.textContent).not.toContain('secret');
  });
});
