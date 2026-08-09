type GoogleTranslateTranslateElement = new (options: { pageLanguage: string; autoDisplay: boolean }, id: string) => void;

type GoogleTranslateGlobal = {
  google?: {
    translate?: {
      TranslateElement: GoogleTranslateTranslateElement;
    };
  };
};

const CONTAINER_ID = 'google_translate_element';
const SCRIPT_SRC = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
const POLL_INTERVAL_MS = 300;
const MAX_POLL_DURATION_MS = 20_000; // wall-clock ceiling, not an attempt
// count — Google's own internal script (loaded async, *after* its callback
// fires) has taken a few seconds to become ready in practice; gating on
// Date.now() elapsed time is robust to variance in individual tick timing.

let scriptLoadPromise: Promise<void> | null = null;
let widgetReadyPromise: Promise<void> | null = null;
// Once `new TranslateElement(...)` has been called successfully, it must
// never be called again on the same container — the widget does further
// async work internally *after* construction before .goog-te-combo
// actually appears, and re-constructing into an already-initializing
// container corrupts that in-flight setup. This flag is what separates
// "keep trying to construct" from "already constructed, just wait for it
// to finish rendering".
let constructed = false;

/** Loads Google's translate_a/element.js exactly once per page session. */
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    if (document.querySelector('script[src*="translate_a/element.js"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // fail open — caller polls/gives up gracefully

    (window as unknown as Record<string, unknown>).googleTranslateElementInit = () => resolve();

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Constructs the widget exactly once. Returns true immediately if the
 * dropdown already exists or construction has already been attempted
 * (successfully) — callers should keep polling for .goog-te-combo to
 * appear in that case rather than treating false as "try again".
 */
function constructOnce(): void {
  if (constructed || document.querySelector('.goog-te-combo')) return;

  const gt = window as unknown as GoogleTranslateGlobal;
  if (!gt?.google?.translate?.TranslateElement) return;

  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.setAttribute('aria-hidden', 'true');
    // Google's widget needs a real layout box to initialize into.
    // display:none gives it zero dimensions and it silently fails to ever
    // render its dropdown — pin it off-screen instead so it stays
    // invisible without breaking initialization.
    Object.assign(container.style, {
      position: 'fixed',
      top: '-1000px',
      left: '-1000px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    });
    document.body.appendChild(container);
  }

  try {
    new gt.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, CONTAINER_ID);
    constructed = true;
  } catch {
    // Leave `constructed` false — TranslateElement existing but throwing
    // (rather than just being undefined) is unexpected; allow a retry.
  }
}

/**
 * Ensures the widget is loaded and its dropdown has actually rendered.
 * Google's cb=googleTranslateElementInit callback fires as soon as the
 * outer element.js has loaded, but google.translate.TranslateElement
 * itself is only wired up once a second internal script Google loads
 * asynchronously finishes — observed to take several seconds in practice.
 * Construction itself also completes before .goog-te-combo is actually in
 * the DOM. Both delays are handled by polling for the *outcome*
 * (.goog-te-combo existing) rather than assuming either step is instant.
 */
export function loadGoogleTranslateScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (widgetReadyPromise) return widgetReadyPromise;

  widgetReadyPromise = (async () => {
    await loadScript();
    const deadline = Date.now() + MAX_POLL_DURATION_MS;
    while (Date.now() < deadline) {
      if (document.querySelector('.goog-te-combo')) return;
      constructOnce();
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    // Gave up — translatePage() will find no .goog-te-combo and no-op,
    // leaving the page in its original English content (graceful fallback).
  })();

  return widgetReadyPromise;
}

export async function translatePage(lang: string): Promise<void> {
  try {
    await loadGoogleTranslateScript();

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (select && select.value !== lang) {
      select.value = lang;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch {
    // Translation failed — page remains in English
  }
}

export function getCurrentGoogleLanguage(): string | null {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie.match(/googtrans=([^;]+)/);
  if (!cookie) return null;
  // Format: /en/es or /auto/en
  const parts = cookie[1].replace(/^\//, '').split('/');
  return parts[parts.length - 1] || null;
}
