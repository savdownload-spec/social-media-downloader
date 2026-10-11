/**
 * SavDown Support NLP — intent taxonomy, intent/category detection,
 * follow-up signals, and out-of-scope gating.
 *
 * Pure string functions with no imports from the knowledge engine, so
 * both modules stay independently testable. The intent taxonomy is the
 * full support surface: every SavDown product area (tools, pricing,
 * credits, billing, account, auth, workspace, support, policies) has
 * its own intent, and the intent drives retrieval, answer formatting,
 * and escalation.
 */

export const SUPPORT_INTENTS = [
  'greeting',
  'social',
  'thanks',
  'bye',
  'capabilities',
  'tool_discovery',
  'how_to',
  'what_is',
  'feature',
  'supported_formats',
  'supported_platforms',
  'limits',
  'credits',
  'pricing',
  'plans',
  'billing',
  'payment',
  'authentication',
  'account',
  'profile',
  'settings',
  'downloads',
  'activity',
  'files',
  'collections',
  'batch',
  'workspace',
  'troubleshooting',
  'error',
  'security',
  'policy',
  'support_request',
  'maintenance',
  'unknown',
] as const;

export type SupportIntent = (typeof SUPPORT_INTENTS)[number];

/**
 * Ordered intent rules. Order matters: domain intents (authentication,
 * credits, pricing, billing, workspace areas, troubleshooting, format/
 * limit questions) are matched BEFORE the generic how_to / what_is
 * fallbacks so that "How do SavCredits work?" is a credits question,
 * not a how-to, and "Why did my payment fail?" is billing, not
 * troubleshooting.
 */
const INTENT_RULES: ReadonlyArray<readonly [SupportIntent, readonly RegExp[]]> = [
  ['greeting', [/^[\s,.!]*(hi|hello|hey|howdy|sup|hiya|yo|good morning|good afternoon|good evening|good day|greetings)[\s,.!]*$/i]],
  ['social', [/\bhow are you\b/i, /\bhow r (you|u)\b/i, /\bare (you|u) (ok|there|good|doing)\b/i, /\byou there\b/i, /\bwhats? up\b/i, /\bwho are you\b/i, /\bwhat are you\b/i, /\bare you (a bot|ai|real|human)\b/i, /\bcan you talk\b/i, /\bdo you speak\b/i]],
  ['thanks', [/^[\s,.!]*(thanks|thank you|thank u|ty|thx|cheers)[\s,.!]*$/i, /\bthanks (a lot|so much|very much)\b/i, /\bgreat (thanks|thank you)\b/i, /\bmuch appreciated\b/i]],
  ['bye', [/^[\s,.!]*(bye|goodbye|good ?night|see (you|ya)|later|cya|take care|ttyl)[\s,.!]*$/i]],
  ['capabilities', [/\bwhat can you (do|help|know)\b/i, /\bwhat (topics|questions) (do|can|can you)/i, /\bhelp me with\b/i, /\bwhat do you cover\b/i, /\bare you able\b/i]],

  ['support_request', [/\b(support (request|ticket)|open (a )?ticket|submit (a )?(support )?(request|ticket)|contact (support|the team|a human|someone)|speak to (a )?human|talk to (a )?(human|person|agent)|report (a )?(problem|bug|issue)|get (in )?touch|escalate|live chat)\b/i]],
  ['maintenance', [/\b(maintenance|outage|down (right now|for maintenance)|service (status|is down)|temporarily unavailable|not available (right now|currently))\b/i]],
  ['policy', [/\b(privacy (policy|notice)|terms?( of service| and conditions)?|cookie (policy|consent)|dmca|copyright|gdpr|\blegal\b|refund policy|data (protection|retention|privacy))\b/i]],
  ['security', [/\b(security|encrypted?|encryption|safe (to use|storage)|data (leak|breach)|private (information|data)|two[- ]factor)\b/i]],
  ['authentication', [/\b(sign(s|ing)? (in|up|into)|log ?(in|ing)|logout|sign ?out|forgot (my )?password|reset (my )?password|password (reset|link)|authenticat|account (creation|registration)|create (an )?account|register)\b/i, /\b(google|github) (login|sign|account|auth)\b/i, /\blogin\b/i, /\bsignin\b/i]],
  ['credits', [/\b(savcredits|credits?|credit (balance|pack|packs|cost|price|limit|refill|usage)|coins?|run (out|low) (of )?(sav)?credits)\b/i, /\bhow (many|much).{0,24}(credit|coin|balance)/i]],
  ['pricing', [/\b(pricing|prices?|plans?( are| available| offered)?|subscriptions?|how much (does|do|is|are|cost)|costs?|upgrade|downgrade|pro plan|free plan|lifetime (plan|deal)|payment plan|free trial|billing period)\b/i, /\bis (it|savdown) free\b/i, /\bfor free\b/i, /\bfree\b/i]],
  ['billing', [/\b(billing|invoices?|payments?|payment (method|failed|failure|issue)|refunds?|charged?|charges?|card (declined|failed|error)|checkout|purchase (failed|issue)|receipt)\b/i]],
  ['account', [/\b(my account|account (settings|info|information|page|access)|delete (my )?account|close (my )?account|account deletion)\b/i]],
  ['profile', [/\b(profiles?|change (my )?(name|avatar|email|picture|photo)|update (my )?(name|avatar|email)|edit (my )?(profile|name|avatar))\b/i]],
  ['settings', [/\b(settings|preferences|theme (settings)?|notifications?|notification settings|language (settings|preference)|display (settings|options))\b/i]],
  ['downloads', [/\b(previous|past|old|earlier|my|all|recent) (downloads|files)\b/i, /\bdownload (history|list|log)\b/i, /\bwhere (are|can i (find|see)|do i find|is) my (downloads|files)\b/i, /\bdownloaded (files|videos|media)\b/i]],
  ['activity', [/\bactivity\b/i, /\brecent (activity|history)\b/i, /\bfull history\b/i]],
  ['files', [/\b(my files|saved files|file (manager|storage|browser))\b/i, /\bwhere (are|is) (my|the) (saved )?files\b/i]],
  ['collections', [/\bcollections?\b/i, /\bfolders?\b/i, /\borganize (my )?(downloads|files|content)\b/i, /\bsave (to|into) a collection\b/i, /\bcreate (a )?collection\b/i, /\bgroup (my )?(downloads|files)\b/i]],
  ['batch', [/\bbatch (processing|download|convert|merge|job)?s?\b/i, /\bmultiple (files|videos|links|pdfs?|images?|documents?) (at once|together|in one)\b/i, /\bbulk (processing|download|convert|upload)\b/i, /\bqueue (up )?(multiple|files|links)\b/i]],
  ['workspace', [/\bworkspace\b/i, /\bdashboard\b/i]],

  ['troubleshooting', [/\b(not working|broken|fails?|failed|failing|issue|problem|trouble|stuck|won'?t work|wont work|doesn'?t work|does not work|isn'?t working|is not working|aren'?t working|unable to|cannot|can'?t (do|get|make|download|upload|open|use)|something (went|is) wrong|why (is|does|did|do|doesn'?t|won'?t|can'?t|is|are))\b/i]],
  ['error', [/\b(error (message|code)|see an error|error (screen|page)|e\d{3,})\b/i]],

  ['supported_formats', [/\b(what|which) (file )?formats?\b/i, /\b(formats?|file types?) (are |do |does )?(support|supported)\b/i, /\bsupported (formats?|file types?|inputs?|outputs?)\b/i, /\bwhat (images?|videos?|files?) (can|are) (i |it |they )?(upload|use|convert)\b/i]],
  ['supported_platforms', [/\b(which|what) platforms\b/i, /\bsupported platforms\b/i, /\bplatforms (are |do |does )?(support|supported)\b/i, /\bworks? on (which|what)\b/i, /\bis [a-z]+ supported\b/i, /\bsocial (media )?platforms\b/i]],
  ['limits', [/\bhow many (files|images|videos|pages|pdfs?|items|documents|photos|links|generations?)\b/i, /\b(file|upload|batch|size|page|image|video|daily|monthly|request|usage|generation) (limit|limits|maximum|cap|restriction)\b/i, /\bmax(imum)? (file|size|number|amount|batch|pages|images|videos|generations?)\b/i, /\blargest (file|size)\b/i, /\bsize (limit|restriction)\b/i, /\bper (day|month|request|hour)\b/i, /\bhow much can i\b/i]],

  ['tool_discovery', [/\bwhich (tool|app|feature)\b/i, /\bfind (me )?(a|the|an) (tool|app)\b/i, /\bwhat tools\b/i, /\bbest tool\b/i, /\btool (to|for|that)\b/i, /\bwhat (tool|app) (should|can|do)\b/i, /\brecommend\b/i, /\bdiscover (the )?tools\b/i, /\ball (the )?tools\b/i, /\btools (available|does savdown|do you have)\b/i, /\bwhat can i (use|do) (with|for|on) savdown\b/i, /\bhow (do|can) i (find|choose|pick) (a|the) tool\b/i]],

  ['how_to', [/\bhow (do|does|can|to|should|would) i\b/i, /\bhow to\b/i, /\bsteps (to|for)\b/i, /\bguide me\b/i, /\bhow (do|can) (you|we)\b/i]],
  ['what_is', [/\bwhat (is|'s|are|'re|does|do)\b/i, /\bmeaning of\b/i, /\bdefine\b/i]],
  ['feature', [/\bfeatures?\b/i, /\bdoes it (have|include|support)\b/i, /\bis there (a|an|any)\b/i, /\bcan it (do|handle|process)\b/i, /\bcapabilities?\b/i, /\bwhat (does|do) (it|the tool) (do|support)\b/i]],
];

/**
 * Detects the support intent of a user message. Returns 'unknown' when
 * no rule matches — the route then relies on entity/category resolution
 * and retrieval.
 */
export function detectIntent(message: string): SupportIntent {
  for (const [intent, patterns] of INTENT_RULES) {
    if (patterns.some((p) => p.test(message))) return intent;
  }
  return 'unknown';
}

// ── Category detection ─────────────────────────────────────────────
// Distinctive tokens (platform names, file formats, product nouns)
// weigh more than generic verbs, so "convert a video" leans video
// while "youtube to mp3" leans downloaders.

const DISTINCTIVE = 2;
const GENERIC = 1;

const CATEGORY_SIGNALS: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, number]>]> = [
  ['downloaders', [
    ['download', GENERIC], ['youtube', DISTINCTIVE], ['tiktok', DISTINCTIVE], ['instagram', DISTINCTIVE],
    ['facebook', DISTINCTIVE], ['pinterest', DISTINCTIVE], ['reel', DISTINCTIVE], ['story', DISTINCTIVE],
    ['mp3', DISTINCTIVE], ['thumbnail', DISTINCTIVE], ['playlist', DISTINCTIVE], ['shorts', DISTINCTIVE],
    ['tweet', DISTINCTIVE], ['save', GENERIC],
  ]],
  ['image', [
    ['image', GENERIC], ['photo', GENERIC], ['picture', GENERIC], ['jpg', DISTINCTIVE], ['jpeg', DISTINCTIVE],
    ['png', DISTINCTIVE], ['webp', DISTINCTIVE], ['heic', DISTINCTIVE], ['avif', DISTINCTIVE],
    ['background', GENERIC], ['upscale', GENERIC], ['resize', GENERIC], ['enhancer', GENERIC],
  ]],
  ['video', [
    ['video', DISTINCTIVE], ['mp4', DISTINCTIVE], ['webm', DISTINCTIVE], ['mov', DISTINCTIVE], ['avi', DISTINCTIVE],
    ['mkv', DISTINCTIVE], ['gif', DISTINCTIVE], ['compress', GENERIC], ['converter', GENERIC], ['footage', GENERIC],
  ]],
  ['pdf', [
    ['pdf', DISTINCTIVE], ['docx', DISTINCTIVE], ['document', GENERIC], ['merge', GENERIC], ['split', GENERIC],
  ]],
  ['ai', [
    ['ai', DISTINCTIVE], ['artificial', DISTINCTIVE], ['intelligence', DISTINCTIVE], ['generate', GENERIC],
    ['generator', GENERIC], ['caption', GENERIC], ['hashtag', GENERIC], ['flux', DISTINCTIVE], ['diffusion', DISTINCTIVE],
  ]],
  ['seo', [
    ['seo', DISTINCTIVE], ['meta', DISTINCTIVE], ['keyword', DISTINCTIVE], ['schema', DISTINCTIVE],
    ['rank', GENERIC], ['search', GENERIC], ['structured', DISTINCTIVE], ['json-ld', DISTINCTIVE], ['tags', GENERIC],
  ]],
  ['utility', [
    ['qr', DISTINCTIVE], ['color', GENERIC], ['gradient', GENERIC], ['picker', GENERIC], ['eyedropper', DISTINCTIVE],
  ]],
];

export type CategoryDetection = { category: string; confidence: 'high' | 'medium' | null };

/**
 * Best-guess SavDown category for a message, used to bias retrieval
 * when no specific tool/area entity was resolved. Confidence is only
 * set when the signal is unambiguous (a distinctive token, or two or
 * more generic signals pointing at the same category).
 */
export function detectCategory(message: string): CategoryDetection {
  const t = message.toLowerCase();
  const scores = CATEGORY_SIGNALS.map(([category, signals]) => {
    let score = 0;
    let distinctive = 0;
    for (const [token, weight] of signals) {
      if (t.includes(token)) {
        score += weight;
        if (weight === DISTINCTIVE) distinctive += 1;
      }
    }
    return { category, score, distinctive };
  });

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  if (!top || top.score === 0) return { category: '', confidence: null };
  const runnerUp = sorted[1];
  const confident = top.distinctive > 0 || top.score >= 3 || (top.score >= 2 && top.score > runnerUp.score);
  if (!confident) return { category: '', confidence: null };
  return { category: top.category, confidence: top.distinctive > 0 ? 'high' : 'medium' };
}

// ── Follow-up context ──────────────────────────────────────────────

/**
 * Pronouns and ellipsis that indicate the message continues the
 * previous topic ("Does it support 4K?", "What about TikTok?",
 * "How many can I download?"). Only applied when the message itself
 * resolves to no entity, so a new topic always switches context.
 */
export const FOLLOWUP_SIGNALS =
  /\b(it|its|that|those|these|them|they|this|the same|also|too|as well|what about|how about|does it|do they|can it|will it|is it|are they|how many|how much|how long|what formats|what limits)\b/i;

// ── Out-of-scope gating ────────────────────────────────────────────

const OUT_OF_SCOPE_PATTERNS = [
  /^what is the capital/,
  /^who (is|was) the (president|prime minister|king|queen)/,
  /^(tell me about|explain|define|what is) (quantum|physics|math|history|geography|science|biology|chemistry)/,
  /^(write|create|generate|make) (me )?(a|an) (poem|essay|story|code|script|song|joke)/,
  /^(weather|forecast|temperature)/,
  /^(stock|crypto|bitcoin|ethereum) (price|value|market)/,
  /^who (won|is winning|played)/,
  /\b(capital of|population of|square root of)\b/i,
  /^translate .{0,30} to (spanish|french|german|arabic|chinese|japanese)/i,
];

/** Hard out-of-scope: clearly general-knowledge questions. */
export function isOutOfScope(message: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some((p) => p.test(message));
}

/**
 * SavDown signal words. A question with no resolved entity and no
 * SavDown signal (e.g. "What is the capital of France?") is out of
 * scope even when it passes the pattern list above.
 */
const SAVDOWN_SIGNALS =
  /\b(savdown|sav ?down|download|downloads?|video|videos?|tool|tools?|pdf|pdfs?|image|images?|photo|credit|plan|pricing|billing|account|login|sign ?in|password|workspace|collection|batch|seo|qr|thumbnail|reel|tiktok|youtube|instagram|facebook|pinterest|twitter|format|convert|compress|merge|split|resize|upscale|watermark|subscription|support|ticket|install|app|pricing|credits?)\b/i;

export function hasSavDownSignal(message: string): boolean {
  return SAVDOWN_SIGNALS.test(message);
}
