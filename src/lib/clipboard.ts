/**
 * Copies a string to the clipboard with a graceful fallback for older
 * browsers and insecure contexts where `navigator.clipboard` is unavailable.
 *
 * Returns `true` on success, `false` otherwise. The UI should react
 * (toast, etc.) based on the result — never silently fail.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Preferred modern API — needs a secure context (https / localhost).
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }

  if (typeof document === 'undefined') return false;

  // Legacy fallback using a hidden textarea + execCommand. Works on
  // older browsers and on plain-http origins.
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}
