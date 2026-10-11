/**
 * Centralized synonym and alias system for the SavDown search engine.
 *
 * Every synonym group maps a canonical key to its equivalent terms so the
 * search engine can expand any query token into the full synonym set without
 * scattered if/else conditions.
 */

export const SEARCH_SYNONYMS: Record<string, string[]> = {
  // ── Format synonyms ──────────────────────────────────────────────
  jpg: ['jpeg', 'jfif'],
  jpeg: ['jpg', 'jfif'],
  webp: ['web p', 'webp format'],
  png: ['portable network graphics'],
  heic: ['heif', 'iphone photo', 'apple photo'],
  pdf: ['portable document format', 'document', 'doc'],
  docx: ['word', 'doc', 'microsoft word', 'ms word', 'word document'],
  word: ['docx', 'doc', 'microsoft word', 'ms word'],
  doc: ['docx', 'word', 'microsoft word'],
  mp4: ['mpeg4', 'mpeg-4', 'video file'],
  mp3: ['audio', 'mpeg3', 'mpeg-3', 'music file', 'audio file'],
  gif: ['animated gif', 'animation'],
  m4a: ['aac', 'apple audio'],
  avif: ['av1 image'],

  // ── Action verbs ─────────────────────────────────────────────────
  convert: ['change', 'transform', 'turn', 'export', 'change to', 'turn into'],
  compress: ['shrink', 'reduce size', 'make smaller', 'optimize', 'reduction', 'compressor', 'reduce'],
  merge: ['combine', 'join', 'concatenate', 'merger', 'combiner', 'unite'],
  split: ['separate', 'divide', 'extract pages', 'splitter', 'break apart'],
  download: ['save', 'grab', 'fetch', 'downloader', 'get', 'saving'],
  remove: ['erase', 'delete', 'strip', 'cut out', 'eliminate'],
  resize: ['scale', 'dimensions', 'resizer', 'change size', 'rescale'],
  upscale: ['enlarge', 'enhance resolution', 'super resolution', 'make bigger', 'upscaler'],
  enhance: ['improve', 'sharpen', 'fix', 'restore', 'boost'],
  generate: ['create', 'make', 'produce', 'build'],

  // ── Platform names ───────────────────────────────────────────────
  youtube: ['yt', 'ytb', 'youtube.com'],
  tiktok: ['tt', 'tik tok', 'tiktok.com'],
  instagram: ['ig', 'insta', 'instagram.com'],
  facebook: ['fb', 'facebook.com', 'meta'],
  x: ['twitter', 'tweet', 'twitter.com', 'x.com'],
  pinterest: ['pin', 'pins', 'pinterest.com'],

  // ── Quality terms ────────────────────────────────────────────────
  hd: ['high definition', 'high quality', 'high-definition'],
  '4k': ['2160p', 'ultra hd', 'uhd', 'four k'],
  '1080p': ['full hd', '1080', 'fhd'],
  '720p': ['hd ready', '720'],

  // ── Background removal synonyms ──────────────────────────────────
  background: ['bg', 'backdrop', 'background removal'],

  // ── Pricing / credits synonyms ───────────────────────────────────
  pricing: ['plans', 'cost', 'price', 'subscription', 'credits', 'pro', 'free', 'upgrade', 'payment'],
  credits: ['savcredits', 'credit', 'balance', 'allowance', 'coins'],
};

/**
 * Reverse-lookup: for a given token, return all synonyms (including itself).
 *
 * This is a bidirectional expansion: if "jpg" → ["jpeg"], then searching
 * "jpeg" also expands to "jpg".
 */
export function expandSynonyms(tokens: string[]): string[] {
  const result = new Set<string>(tokens);

  for (const token of tokens) {
    // Direct match: token is a canonical key
    const direct = SEARCH_SYNONYMS[token];
    if (direct) {
      for (const syn of direct) result.add(syn);
    }

    // Reverse match: token appears as a value in some synonym list
    for (const [canonical, aliases] of Object.entries(SEARCH_SYNONYMS)) {
      if (aliases.includes(token)) {
        result.add(canonical);
        // Also add sibling synonyms of that canonical
        for (const sib of aliases) result.add(sib);
      }
    }
  }

  return [...result];
}

/**
 * Generate natural-language aliases for a tool slug.
 *
 * Handles three slug patterns:
 *   - "A-to-B"       → conversion tools (jpg-to-png, pdf-to-word, etc.)
 *   - "format-converter" → generic format converters (webp-converter, image-converter, etc.)
 *   - "action-noun"  → action tools (merge-pdf, compress-pdf, split-pdf, etc.)
 *
 * The generated aliases are expanded through SEARCH_SYNONYMS so that e.g.
 * "jpg" automatically includes "jpeg" variants.
 */

/** Common image formats we generate cross-format aliases for */
const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif', 'bmp', 'tiff'];
/** Common document formats */
const DOC_FORMATS = ['pdf', 'doc', 'docx', 'word'];

export function getToolAliases(slug: string): string[] {
  const aliases = new Set<string>();
  const parts = slug.split('-');

  // Detect "A-to-B" pattern: must have 'to' in the middle
  const toIdx = parts.indexOf('to');
  if (toIdx > 0 && toIdx < parts.length - 1) {
    const A = parts.slice(0, toIdx).join(' ');
    const B = parts.slice(toIdx + 1).join(' ');

    aliases.add(`${A} to ${B}`);
    aliases.add(`${A} ${B}`);
    aliases.add(`convert ${A} to ${B}`);
    aliases.add(`turn ${A} into ${B}`);
    aliases.add(`${A} ${B} converter`);
    aliases.add(`${A} ${B} converter online`);
    aliases.add(`${B} from ${A}`);
    aliases.add(`${A} to ${B} online`);
    aliases.add(`${A} to ${B} free`);
    aliases.add(`change ${A} to ${B}`);
    aliases.add(`transform ${A} to ${B}`);
    aliases.add(`${A} converter`);
    aliases.add(`${B} converter`);

    // Expand through synonyms for A and B
    const aSyns = expandSynonyms([A]);
    const bSyns = expandSynonyms([B]);
    for (const aSyn of aSyns) {
      for (const bSyn of bSyns) {
        if (aSyn !== A || bSyn !== B) {
          aliases.add(`${aSyn} to ${bSyn}`);
          aliases.add(`${aSyn} ${bSyn}`);
          aliases.add(`convert ${aSyn} to ${bSyn}`);
        }
      }
    }

    return [...aliases];
  }

  // Detect "format-converter" pattern: slug ends with "converter" and the
  // first part is a known format (webp-converter, image-converter, etc.)
  if (parts.length === 2 && parts[1] === 'converter') {
    const format = parts[0];
    const formatSyns = expandSynonyms([format]);

    // Add "X converter" for the format and all its synonyms
    for (const syn of formatSyns) {
      aliases.add(`${syn} converter`);
      aliases.add(`${syn} converter online`);
      aliases.add(`${syn} converter free`);
    }

    // For specific image formats (e.g. webp-converter, png-converter):
    // generate "X to format" and "format to X" for all other image formats.
    // NOTE: for the generic 'image' converter, we do NOT generate specific
    // "image to webp" aliases — those belong to the specific format converter
    // (webp-converter). This prevents image-converter from claiming webp queries.
    if (IMAGE_FORMATS.includes(format)) {
      // Specific format: generate cross-format aliases (jpg to webp, etc.)
      const targetFormats = [...IMAGE_FORMATS, 'image', 'photo', 'picture'];
      for (const otherFmt of targetFormats) {
        if (otherFmt !== format) {
          // "jpg to webp", "jpeg to webp" etc.
          aliases.add(`${otherFmt} to ${format}`);
          aliases.add(`${otherFmt} ${format}`);
          aliases.add(`convert ${otherFmt} to ${format}`);
          aliases.add(`${format} to ${otherFmt}`);
          aliases.add(`${format} ${otherFmt}`);
          aliases.add(`convert ${format} to ${otherFmt}`);
          // Also expand otherFmt synonyms
          const otherSyns = expandSynonyms([otherFmt]);
          for (const s of otherSyns) {
            if (s !== otherFmt) {
              aliases.add(`${s} to ${format}`);
              aliases.add(`${s} ${format}`);
            }
          }
        }
      }
    } else if (format === 'image') {
      // Generic image converter: only broad phrases, not format-specific ones
      aliases.add('convert image');
      aliases.add('image format converter');
      aliases.add('convert image format');
      aliases.add('image file converter');
      for (const fmt of IMAGE_FORMATS) {
        aliases.add(`${fmt} converter`); // e.g. "jpg converter" as a fallback
      }
    }

    // For document format converters
    if (DOC_FORMATS.includes(format)) {
      for (const otherFmt of DOC_FORMATS) {
        if (otherFmt !== format) {
          aliases.add(`${otherFmt} to ${format}`);
          aliases.add(`${otherFmt} ${format}`);
          aliases.add(`${format} to ${otherFmt}`);
          aliases.add(`convert ${otherFmt} to ${format}`);
        }
      }
    }

    return [...aliases];
  }

  // Detect "action-noun" pattern: first part is an action verb in synonyms
  if (parts.length >= 2) {
    const action = parts[0];
    const noun = parts.slice(1).join(' ');
    const actionSyns = expandSynonyms([action]);

    for (const actionSyn of actionSyns) {
      aliases.add(`${actionSyn} ${noun}`);
    }
    aliases.add(`${noun} ${action}`);
    aliases.add(`${noun} ${action}r`); // e.g. "pdf merger"
    aliases.add(`${action} ${noun} online`);
    aliases.add(`${action} ${noun} free`);

    // Also try noun synonyms
    const nounSyns = expandSynonyms([noun]);
    for (const nounSyn of nounSyns) {
      aliases.add(`${action} ${nounSyn}`);
    }
  }

  // Fallback: add the slug with spaces and common variations
  aliases.add(slug.replace(/-/g, ' '));
  aliases.add(slug);

  return [...aliases];
}
