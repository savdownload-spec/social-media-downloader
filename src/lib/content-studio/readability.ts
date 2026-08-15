import type { ContentAnalysis } from './contentText';
import type { CheckStatus, SeoCheck } from './seoAnalysis';

export type ReadabilityResult = {
  score: number;
  problems: SeoCheck[];
  improvements: SeoCheck[];
  good: SeoCheck[];
  all: SeoCheck[];
};

const TRANSITION_WORDS = [
  'also', 'although', 'as a result', 'because', 'besides', 'consequently',
  'finally', 'first', 'for example', 'for instance', 'furthermore', 'however',
  'in addition', 'in conclusion', 'in fact', 'in other words', 'meanwhile',
  'moreover', 'next', 'nonetheless', 'on the other hand', 'otherwise',
  'similarly', 'since', 'so', 'subsequently', 'then', 'therefore', 'thus',
  'ultimately', 'while',
];

const PASSIVE_RE = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/i;

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const matches = w.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  if (w.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

export function analyzeReadability(content: ContentAnalysis): ReadabilityResult {
  const checks: SeoCheck[] = [];
  const push = (id: string, status: CheckStatus, message: string) => checks.push({ id, status, message });

  const { sentences, paragraphTexts, wordCount, headings } = content;

  if (sentences.length === 0) {
    return { score: 0, problems: [], improvements: [], good: [], all: [] };
  }

  // Sentence length
  const longSentences = sentences.filter((s) => s.split(/\s+/).filter(Boolean).length > 20);
  const longSentenceRatio = longSentences.length / sentences.length;
  if (longSentenceRatio > 0.25) {
    push('sentence-length', 'improvement', `${Math.round(longSentenceRatio * 100)}% of sentences are longer than 20 words, more than the recommended 25%. Try shortening some of them.`);
  } else {
    push('sentence-length', 'good', 'Great! Your sentence lengths are varied and mostly concise.');
  }

  // Paragraph length
  const longParagraphs = paragraphTexts.filter((p) => p.split(/\s+/).filter(Boolean).length > 150);
  if (longParagraphs.length > 0) {
    push('paragraph-length', 'improvement', `${longParagraphs.length} paragraph(s) are longer than 150 words. Break them up for easier reading.`);
  } else {
    push('paragraph-length', 'good', 'None of your paragraphs are too long. Great job!');
  }

  // Passive voice
  const passiveSentences = sentences.filter((s) => PASSIVE_RE.test(s));
  const passiveRatio = passiveSentences.length / sentences.length;
  if (passiveRatio > 0.1) {
    push('passive-voice', 'improvement', `${(passiveRatio * 100).toFixed(1)}% of sentences contain passive voice, more than the recommended 10%. Try active phrasing where you can.`);
  } else {
    push('passive-voice', 'good', 'Passive voice usage is within a healthy range.');
  }

  // Transition words
  const transitionSentences = sentences.filter((s) =>
    TRANSITION_WORDS.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(s)),
  );
  const transitionRatio = transitionSentences.length / sentences.length;
  if (transitionRatio < 0.2) {
    push('transition-words', 'improvement', `Only ${(transitionRatio * 100).toFixed(1)}% of sentences contain a transition word. Use more of them to improve the flow of your writing.`);
  } else {
    push('transition-words', 'good', 'Good use of transition words to connect your ideas.');
  }

  // Complex words
  const words = content.plainText.split(/\s+/).filter(Boolean);
  const complexWords = words.filter((w) => countSyllables(w) >= 4);
  const complexRatio = words.length ? complexWords.length / words.length : 0;
  if (complexRatio > 0.1) {
    push('word-complexity', 'improvement', `${(complexRatio * 100).toFixed(1)}% of words are complex (4+ syllables). Simpler words are usually easier to read.`);
  } else {
    push('word-complexity', 'good', 'You are not using too many complex words, which makes your text easy to read.');
  }

  // Heading distribution
  if (wordCount > 300) {
    const wordsPerHeadingSection = headings.length > 0 ? wordCount / (headings.length + 1) : wordCount;
    if (wordsPerHeadingSection > 350) {
      push('heading-distribution', 'improvement', 'Some sections are quite long between subheadings. Consider adding more subheadings to break up the text.');
    } else {
      push('heading-distribution', 'good', 'Your headings are well distributed throughout the text.');
    }
  }

  // Consecutive sentences (same starting word 3+ times in a row)
  let consecutiveRepeat = false;
  for (let i = 0; i < sentences.length - 2; i++) {
    const firstWords = [sentences[i], sentences[i + 1], sentences[i + 2]].map(
      (s) => s.trim().split(/\s+/)[0]?.toLowerCase(),
    );
    if (firstWords[0] && firstWords[0] === firstWords[1] && firstWords[1] === firstWords[2]) {
      consecutiveRepeat = true;
      break;
    }
  }
  push('consecutive-sentences', consecutiveRepeat ? 'improvement' : 'good',
    consecutiveRepeat
      ? 'Three or more consecutive sentences start with the same word. Vary your sentence openers.'
      : 'There is enough variety in your sentences. That\'s great!');

  const weight = (s: CheckStatus) => (s === 'good' ? 1 : s === 'improvement' ? 0.5 : 0);
  const score = checks.length
    ? Math.round((checks.reduce((sum, c) => sum + weight(c.status), 0) / checks.length) * 100)
    : 0;

  return {
    score,
    problems: checks.filter((c) => c.status === 'problem'),
    improvements: checks.filter((c) => c.status === 'improvement'),
    good: checks.filter((c) => c.status === 'good'),
    all: checks,
  };
}
