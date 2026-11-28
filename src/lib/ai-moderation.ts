const BLOCKED_PATTERNS = [
  /\b(?:child|minor|underage)[\s\S]{0,40}\b(?:sex|sexual|nude|porn)/i,
  /\b(?:porn|pornographic|sexually explicit|explicit sex|bestiality|incest)\b/i,
  /\b(?:kill|murder|attack|hurt)\b[\s\S]{0,40}\b(?:person|people|someone|children|group)\b/i,
  /\b(?:hate speech|racial slurs?|white supremacist|neo-nazi)\b/i,
];

const HARMFUL_CREATION_PATTERN = /\b(?:make|build|create|assemble|write|generate|develop|deploy)\b[\s\S]{0,50}\b(?:bomb|explosive|malware|ransomware|phishing|keylogger)\b/i;
const EDUCATIONAL_CONTEXT_PATTERN = /\b(?:prevention|prevent|awareness|safety|defense|defence|stop|avoid|recovery|documentary|news)\b/i;

export function isAllowedAiText(...values: string[]): boolean {
  const text = values.join('\n');
  if (BLOCKED_PATTERNS.some(pattern => pattern.test(text))) return false;
  return !(HARMFUL_CREATION_PATTERN.test(text) && !EDUCATIONAL_CONTEXT_PATTERN.test(text));
}
