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
 *
 * Note this only waits for the bare <select> element to exist — it does
 * NOT guarantee its <option> list is fully populated yet (Google adds
 * those asynchronously afterward). Callers that need a specific language
 * to be selectable must wait for that themselves — see
 * waitForLanguageOption() below, used by translatePage().
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

const OPTION_POLL_INTERVAL_MS = 100;
const OPTION_POLL_MAX_MS = 5_000;

/**
 * Waits for `<option value="lang">` to actually exist in the combo before
 * the caller sets `.value` and dispatches — the bare <select> element
 * appears in the DOM well before Google finishes populating its ~130+
 * <option> elements. Assigning `.value` to a language that isn't a real
 * option yet is silently ignored by the browser (no error, no effect),
 * and — critically — an unselected <select> then reports its *first*
 * option as `.value` on next read. Google's own change handler trusted
 * that read, meaning a premature dispatch didn't just fail to switch
 * language: it made Google actually translate the page into whatever
 * language happens to sort first in its list (observed: Abkhaz), not a
 * silent no-op. Returns true once the option exists, false if it never
 * appeared within the timeout (caller should skip dispatching in that
 * case rather than risk the same failure mode).
 */
async function waitForLanguageOption(select: HTMLSelectElement, lang: string): Promise<boolean> {
  const deadline = Date.now() + OPTION_POLL_MAX_MS;
  while (Date.now() < deadline) {
    if (Array.from(select.options).some((o) => o.value === lang)) return true;
    await new Promise((resolve) => setTimeout(resolve, OPTION_POLL_INTERVAL_MS));
  }
  return false;
}

// The only RTL language in config/languages.ts today — extend this if a
// second one (he, fa, ur, ...) is ever added to the supported list.
const RTL_LANGUAGES = new Set(['ar']);

// How long to keep correcting document.documentElement.lang/dir if Google's
// widget overwrites them again after we set them — see the comment below.
const LANG_GUARD_MS = 6_000;
let activeLangGuard: MutationObserver | null = null;

// translatePage() waits on two async steps (widget ready, target option
// populated) that can together take a few seconds. If the user switches
// languages again before an earlier call's wait finishes, that earlier
// call must not go on to apply its now-outdated language once it finally
// resolves — e.g. the automatic translatePage('en') fired on every mount
// (to preload the widget) can still be waiting when a fresh visitor picks
// Arabic within that window, and was observed silently reverting their
// choice back to English moments later. Only the most recently requested
// language is allowed to actually apply.
let latestRequestedLang: string | null = null;

export async function translatePage(lang: string): Promise<void> {
  latestRequestedLang = lang;
  try {
    await loadGoogleTranslateScript();
    if (latestRequestedLang !== lang) return;

    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    const optionOk = select ? await waitForLanguageOption(select, lang) : false;
    if (select && optionOk && latestRequestedLang === lang) {
      // Always dispatch, even if select.value already equals lang: Google's
      // widget can silently pre-set the dropdown's value from the
      // `googtrans` cookie during its own initialization (a returning
      // visitor who translated before) without actually applying the
      // visible translation — skipping the dispatch in that case left the
      // page stuck in English despite the dropdown "agreeing" with it. The
      // combo's own option list includes 'en' (the page's source
      // language), and dispatching it genuinely reverts the translated DOM
      // back to the original English text — verified directly; this is
      // not a no-op.
      select.value = lang;
      select.dispatchEvent(new Event('change', { bubbles: true }));

      // Don't rely solely on Google's widget to set
      // document.documentElement.lang: it only does so while *actively
      // applying* a non-source translation, and — confirmed via direct
      // tracing — asynchronously overwrites it again shortly after
      // (presumably as part of its own internal processing of the change
      // event), even after we set the correct value first. Reverting to
      // the source language ('en') is hit hardest: Google's own onChange
      // handler clears the combo's selection entirely, and the browser
      // falls back to reporting the first <option> of its (alphabetically
      // sorted) language list — observed leaving `lang` stuck on "ab"
      // (Abkhaz) well after the page had visibly and correctly reverted to
      // English. A short-lived MutationObserver corrects any further
      // change to `lang` for a few seconds, so our value wins the race
      // regardless of exactly when Google's internal write lands.
      document.documentElement.lang = lang;
      document.documentElement.dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';

      // Only one guard active at a time — a rapid second language switch
      // should retarget the correction to the new language, not leave the
      // old observer fighting it back to the previous one.
      activeLangGuard?.disconnect();
      const observer = new MutationObserver(() => {
        if (document.documentElement.lang !== lang) document.documentElement.lang = lang;
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      activeLangGuard = observer;
      setTimeout(() => {
        if (activeLangGuard === observer) activeLangGuard = null;
        observer.disconnect();
      }, LANG_GUARD_MS);
    }
  } catch {
    // Translation failed — page remains in English
  }
}
