import 'server-only';

export type SupportTranslationStatus = 'PENDING' | 'TRANSLATED' | 'NOT_NEEDED' | 'FAILED';

export type SupportTranslation = {
  detectedLanguage: string;
  translatedMessage: string | null;
  translationStatus: SupportTranslationStatus;
};

const languageHints: Array<[string, string[]]> = [
  ['fr', ['bonjour', 'merci', 'je', 'pas', 'une', 'avec', 'télécharger', 'vidéo', "n'arrive", 'comment']],
  ['es', ['hola', 'gracias', 'puedo', 'puede', 'descargar', 'video', 'mi', 'no puedo', 'cómo']],
  ['de', ['ich', 'kann', 'mein', 'nicht', 'herunterladen', 'bitte', 'danke', 'der', 'die', 'und']],
  ['pt', ['olá', 'obrigado', 'não', 'posso', 'baixar', 'vídeo', 'minha', 'como']],
  ['it', ['ciao', 'grazie', 'posso', 'scaricare', 'video', 'mio', 'non', 'come']],
  ['tr', ['merhaba', 'teşekkür', 'indirmek', 'indiremiyorum', 'video', 'benim', 'nasıl']],
  ['id', ['halo', 'terima kasih', 'saya', 'tidak', 'mengunduh', 'video', 'bisa', 'bagaimana']],
  ['nl', ['hallo', 'bedankt', 'ik', 'kan', 'niet', 'downloaden', 'video', 'mijn']],
  ['ru', ['привет', 'спасибо', 'я', 'не могу', 'скачать', 'видео']],
  ['pl', ['cześć', 'dziękuję', 'nie mogę', 'pobrać', 'wideo']],
];

const englishHints = ['the', 'and', 'can', 'how', 'download', 'video', 'my', 'please', 'what', 'is', 'to', 'from'];

export function detectSupportLanguage(input: string): string {
  const text = input.trim().toLowerCase();
  if (!text) return 'und';
  if (/[\u0600-\u06ff]/.test(text)) return /[\u0679\u0686\u0688\u0691\u0698\u06a9\u06af\u06ba\u06be\u06c1\u06cc\u06d2]/.test(text) ? 'ur' : 'ar';
  if (/[\u0900-\u097f]/.test(text)) return 'hi';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u0370-\u03ff]/.test(text)) return 'el';
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';

  const words = new Set(text.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean));
  const scores = languageHints.map(([code, hints]) => [code, hints.reduce((score, hint) => score + (words.has(hint) || text.includes(hint) ? 1 : 0), 0)] as const);
  const best = scores.sort((a, b) => b[1] - a[1])[0];
  const englishScore = englishHints.reduce((score, hint) => score + (words.has(hint) ? 1 : 0), 0);
  if (best && best[1] >= 2 && best[1] > englishScore) return best[0];
  if (englishScore > 0 || /^[\x00-\x7f\s\d\p{P}]+$/u.test(text)) return 'en';
  return 'und';
}

function translationProviderConfig() {
  const apiKey = process.env.SUPPORT_TRANSLATION_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.SUPPORT_TRANSLATION_API_BASE || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.SUPPORT_TRANSLATION_MODEL || 'gpt-4o-mini',
  };
}

export async function translateSupportMessage(input: string, detectedLanguage = detectSupportLanguage(input)): Promise<SupportTranslation> {
  if (detectedLanguage === 'en') return { detectedLanguage, translatedMessage: null, translationStatus: 'NOT_NEEDED' };
  const config = translationProviderConfig();
  if (!config) return { detectedLanguage, translatedMessage: null, translationStatus: 'FAILED' };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.15,
        max_tokens: 500,
        messages: [
          { role: 'system', content: 'Translate the customer support message into natural, concise English. Preserve meaning, names, URLs, and formatting. Return only the translation.' },
          { role: 'user', content: input },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return { detectedLanguage, translatedMessage: null, translationStatus: 'FAILED' };
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const translatedMessage = json.choices?.[0]?.message?.content?.trim();
    if (!translatedMessage) return { detectedLanguage, translatedMessage: null, translationStatus: 'FAILED' };
    return { detectedLanguage, translatedMessage, translationStatus: 'TRANSLATED' };
  } catch {
    return { detectedLanguage, translatedMessage: null, translationStatus: 'FAILED' };
  }
}
