import type { ToolLongContent } from './toolContent';
import { toolGuideEndings } from './toolGuideEndings';

export type GuideCard = { title: string; description: string };
export type GuideQuestion = { question: string; answer: string };
export type ToolGuide = ToolLongContent & {
  description: string;
  formats: string[];
  howTo: { title: string; body: string }[];
  faq: GuideQuestion[];
  related: string[];
  trust: GuideCard[];
  featureHeading: string;
  featureIntroduction: string;
  inputHeading: string;
  inputIntroduction: string;
  reassurance: GuideCard[];
  ctaHref: string;
  ctaLabel: string;
};

/** Editorial inputs are required per tool. Presentation and policy are shared;
 * capabilities, advice, questions and use cases are deliberately authored. */
export type GuideSource = {
  description: string;
  introduction: string;
  processing: string;
  inputs: string[];
  formats: string[];
  settings: string;
  limits: string;
  steps: [string, string][];
  features: [string, string][];
  benefits: [string, string][];
  practices: string[];
  uses: [string, string][];
  tips: string[];
  questions: [string, string][];
  related: string[];
  reference: [string, string, string];
  mode: 'download' | 'image' | 'video' | 'pdf' | 'local' | 'background' | 'upscale' | 'ai-text' | 'ai-image' | 'qr' | 'unavailable';
};

const policies: Record<GuideSource['mode'], { access: string; privacy: string; recovery: string }> = {
  unavailable: {
    access: 'This catalog route has no registered live processor. It accepts no processing request and promises no launch date, credit cost or future allowance. Related live tools have their own requirements.',
    privacy: 'There is no processing input on this availability page. Normal site privacy and analytics policies still apply. If you follow a related tool, review its own input-handling information before submitting anything.',
    recovery: 'Use one of the related live tools for a supported operation. Repeated submissions cannot enable an unimplemented processor. Consult the availability notice for any later launch.',
  },
  download: {
    access: 'Sign in to resolve links. Metadata lookup does not spend credits; delivery uses SavCredits. Account balance, delivery type and rate limits apply. Review your balance before downloading.',
    privacy: 'SavDown processes the source link on its servers and records source URLs, operation status and credit activity. Resolved metadata may be cached. Media delivery can use temporary server files; cleanup is attempted after delivery. This is not an anonymous or zero-retention service.',
    recovery: 'Reopen the original post, confirm it is accessible and copy its direct HTTPS link again. Resolve a fresh link if a delivery URL has expired. Wait before retrying a platform or rate-limit error; private, deleted or login-restricted posts may remain unavailable.',
  },
  image: {
    access: 'Sign in before processing. A successful image operation uses 1 SavCredit per image. Batch tools also enforce the batch allowance shown for your plan; request and balance limits still apply.',
    privacy: 'The selected image is uploaded to SavDown for server processing. The image service handles file buffers and returns the result, while account operation and credit records are retained. Do not assume that using an online image tool provides an anonymous session or a guaranteed deletion deadline.',
    recovery: 'Check the file type, byte size and decoded dimensions. Try a smaller valid image if decoding fails, sign in again if the session expires, and wait before retrying a rate-limit error. Keep the source file so you can adjust settings without repeatedly editing a compressed result.',
  },
  video: {
    access: 'Sign in to process a video. A successful video operation uses 2 SavCredits. Requests are rate limited and need sufficient balance; a larger upload allowance is not implied by a paid plan.',
    privacy: 'The video is uploaded to SavDown. Processing uses temporary server files and attempts cleanup in a finally block after success or failure. Operation and credit activity are recorded; no guaranteed deletion deadline is advertised.',
    recovery: 'For a timeout, retry with a shorter or smaller source. If the file cannot be read, export a fresh video in a common container. A server dependency or unsupported codec can prevent conversion even when the filename extension is accepted.',
  },
  pdf: {
    access: 'Sign in to process documents. Merge and image-to-PDF each charge 1 SavCredit for a successful combined operation. Other PDF jobs generally charge 1 per successfully processed source file. Batch allowance is shown for your plan. Review the current balance and batch hint before submitting.',
    privacy: 'Documents are uploaded to private temporary storage and read by SavDown for processing. Cleanup is attempted after processing and by the client, but interrupted requests or cleanup failures can leave files behind. Account and credit records are retained; there is no verified retention deadline.',
    recovery: 'Unlock encrypted files in an authorized application and export damaged documents again. Respect the file and batch limits. For unavailable conversion engines, try again after service recovery; repeated uploads will not install a missing server dependency.',
  },
  local: {
    access: 'This interface computes results locally without a processing API or SavCredit charge. Clipboard access depends on browser permission and a secure context. There is no automatic publishing to another application.',
    privacy: 'The tool computation runs in your browser rather than sending the entered content to a processing API. This describes the tool itself; normal site analytics, account features and browser behavior are governed separately by the privacy policy.',
    recovery: 'If copying is blocked, select the displayed result and copy manually. Review the input and generate again if the result is unsuitable. Keep a copy outside the page before refreshing or closing the tab.',
  },
  background: {
    access: 'Background removal runs locally without a SavCredit authorization request or sign-in gate in this interface. The first run must load the model and runtime assets; browser memory and model availability limit processing.',
    privacy: 'This interface processes image pixels in a browser worker and does not upload the selected image to SavDown. Model assets may be cached by the browser. Site analytics and any account activity remain separate from local image processing.',
    recovery: 'Keep the tab open while the model loads. Retry after checking your connection if assets fail to load. On a low-memory device, resize the source first. Inspect fine edges manually because automatic segmentation can miss transparent objects or similar foreground and background colors.',
  },
  upscale: {
    access: 'Sign in and have at least 1 SavCredit available. Authorization and completion receipts go to SavDown; a successful local upscale is charged 1 credit. Device memory and the output pixel cap still apply.',
    privacy: 'Image pixels are processed in a browser worker. The credit endpoint receives operation and generated-output metadata, including dimensions, scale and byte count, rather than the source image. Account operation records are retained.',
    recovery: 'Choose 2× if 4× exceeds the output cap. Resize the source if its dimensions are too large, keep the tab open, and allow the model to finish loading. If credit completion fails, use the offered retry before starting another operation.',
  },
  'ai-text': {
    access: 'Sign in to generate text. A successful generation costs 1 SavCredit. Both account and IP rate limits apply, and the model provider must be configured and available.',
    privacy: 'Your topic and optional context are sent through SavDown to Cloudflare Workers AI. Account operation and credit activity are recorded. Avoid confidential input and consult the provider and SavDown policies; no zero-retention guarantee is made.',
    recovery: 'Use a topic of 2–300 characters and keep context within 300 characters. Retry later after a rate-limit or provider error. Review all output before copying: a language model can invent facts or return an incomplete list.',
  },
  'ai-image': {
    access: 'Sign in before generation. The displayed SavCredit estimate depends on quality and image count. Daily, plan, queue and rate limits are configured by the service; the current controls and error messages take precedence over fixed marketing numbers.',
    privacy: 'Your prompt is sent through SavDown to the configured Cloudflare image model. SavDown stores generation records including prompt, ratio, quality, model and credit usage. Download generated images before leaving; persistent image storage is not promised.',
    recovery: 'Shorten or clarify a rejected prompt, check your balance, or retry later if the provider or queue is unavailable. Reserved credits are released on a failed generation. Avoid repeatedly submitting while a request is active.',
  },
  qr: {
    access: 'Sign in and have SavCredits available. A successful QR API operation costs 1 credit. Generator previews also use the processing API, so changing settings can trigger another charged successful render. Rate limits apply.',
    privacy: 'QR generation sends the encoded text and settings to SavDown; scanning uploads the selected image for server decoding. Account operations and credit activity are recorded. Do not encode or upload secrets on the assumption that QR processing is local.',
    recovery: 'For generation, shorten dense content and restore a clear quiet zone and high contrast. For scanning, use a sharp, uncropped image of one QR code. Wait before retrying rate-limit errors and check your session and balance if processing is refused.',
  },
};

const cards = (values: [string, string][]): GuideCard[] => values.map(([title, description]) => ({ title, description }));

const summaries: Record<GuideSource['mode'], [string, string]> = {
  download: ['Sign in; delivery uses credits and rate limits apply.', 'Links are resolved on the server; source and account operation records are retained.'],
  image: ['Sign in; successful processing costs 1 credit per image.', 'Images are uploaded for processing; account operation records are retained.'],
  video: ['Sign in; successful processing costs 2 credits.', 'Videos are uploaded; temporary working-file cleanup is attempted after processing.'],
  pdf: ['Sign in; successful jobs use credits and plan batch limits.', 'Documents use private temporary uploads; cleanup is attempted, without a guaranteed deadline.'],
  local: ['Local generation does not call a credit-gated processing API.', 'Tool computation runs in the browser; normal site privacy policies still apply.'],
  background: ['No sign-in or credit gate in this local removal interface.', 'Image pixels stay in the browser processing workflow.'],
  upscale: ['Sign in; a completed local upscale costs 1 credit.', 'Local image inference; account authorization and output receipts go to SavDown.'],
  'ai-text': ['Sign in; successful generation costs 1 credit.', 'Topics and context are sent through SavDown to Cloudflare Workers AI.'],
  'ai-image': ['Sign in; review the displayed quality- and count-based cost.', 'Prompts go to the provider; generation records including prompts are stored.'],
  qr: ['Sign in; successful API renders or scans cost 1 credit, including previews.', 'Generation text or scanning images are sent to the server.'],
  unavailable: ['No live processor is registered for this route.', 'This page takes no processing input; related tools have separate policies.'],
};

export function defineGuide(name: keyof typeof toolGuideEndings, source: GuideSource): ToolGuide {
  const policy = policies[source.mode];
  return {
    description: source.description,
    introduction: source.introduction,
    whatItDoes: source.processing,
    keyFeatures: cards(source.features),
    benefits: cards(source.benefits),
    bestPractices: source.practices,
    supportedPlatforms: source.inputs,
    commonUseCases: cards(source.uses),
    tipsAndTricks: source.tips,
    whyChoose: toolGuideEndings[name][0],
    conclusion: toolGuideEndings[name][1],
    formats: source.formats,
    howTo: source.steps.map(([title, body]) => ({ title, body })),
    faq: [
      ...source.questions.map(([question, answer]) => ({ question, answer })),
      { question: `What access and usage limits apply to ${name}?`, answer: policy.access },
      { question: `How does ${name} handle my input?`, answer: policy.privacy },
      { question: `How can I recover when ${name} fails?`, answer: policy.recovery },
    ],
    related: source.related,
    trust: cards([source.features[0], ['Output choices', source.formats.slice(0, 3).join(' · ')], ['Access and credits', summaries[source.mode][0]]]),
    featureHeading: `${name} Features`,
    featureIntroduction: source.settings,
    inputHeading: source.mode === 'download' ? 'Supported Links and Source Restrictions' : 'Supported Inputs and Compatibility',
    inputIntroduction: source.limits,
    reassurance: cards([['Your controls', source.settings], ['Processing and privacy', summaries[source.mode][1]], ['Usage requirements', summaries[source.mode][0]]),
    ctaHref: source.mode === 'unavailable' ? '#related-tools' : '#tool-interface',
    ctaLabel: source.mode === 'unavailable' ? 'Explore Live Tools' : 'Try It Now',
    resources: {
      introduction: `Use the reference below for the formats, concepts or platform rules relevant to ${name}. The capabilities described on this page are limited to the controls SavDown actually provides.`,
      guides: [],
      officialReferences: [{ label: source.reference[0], href: source.reference[1], description: source.reference[2] }],
      disclosure: 'External documentation describes its own platform or standard and does not imply that SavDown implements every feature it documents. See the SavDown privacy policy and pricing page for account and service details.',
    },
  };
}
