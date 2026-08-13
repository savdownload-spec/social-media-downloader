/**
 * Lightweight How-to + FAQ content for live functional tools (image / PDF /
 * QR / utility). Kept short on purpose — these tools don't need the heavy
 * ~1,000-word SEO block that downloaders get in toolContent.ts.
 *
 * If a slug is omitted here, the layout simply skips the How-to/FAQ sections.
 */
export type FunctionalToolContent = {
  howTo: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
};

const imageHowTo = [
  { title: 'Upload your image', body: 'Drag a JPG, PNG, WEBP, GIF, or HEIC file into the box, or click to browse.' },
  { title: 'Adjust the settings', body: 'Pick the quality, size, or output format you want using the controls.' },
  { title: 'Process & download', body: 'Hit the button — your processed image is ready to download in seconds.' },
];

const pdfHowTo = [
  { title: 'Upload your file(s)', body: 'Drag in one or more PDFs or images. Everything stays in your browser until you process.' },
  { title: 'Choose your options', body: 'Set ranges for splitting or arrange pages in the order you want.' },
  { title: 'Download the result', body: 'Click process and grab your finished PDF — no watermarks, covered by your daily credits.' },
];

const videoHowTo = [
  { title: 'Upload your video', body: 'Drag an MP4, WEBM, MOV, AVI, or MKV file into the box, or click to browse. Up to 100 MB.' },
  { title: 'Adjust the settings', body: 'Pick the output format, compression level, or frame rate you want.' },
  { title: 'Process & download', body: 'Hit the button — your processed file is ready to download in seconds.' },
];

export const functionalToolContent: Record<string, FunctionalToolContent> = {
  /* ── Image ── */
  'image-compressor': {
    howTo: imageHowTo,
    faq: [
      { question: 'Is there a file size limit?', answer: 'Yes — up to 25 MB per image, which covers virtually any photo from a modern phone or camera.' },
      { question: 'Does compression reduce quality?', answer: 'A little, by design. The quality slider lets you balance file size against visual fidelity. 75–85 is visually lossless for most photos.' },
      { question: 'Are my images uploaded or stored?', answer: 'Your image is sent only for the moment it takes to process it, then discarded. Nothing is stored on our servers.' },
    ],
  },
  'image-resizer': {
    howTo: imageHowTo,
    faq: [
      { question: 'Can I upscale an image?', answer: 'No — to protect quality we never enlarge. Enter a smaller target size and the image scales down without stretching.' },
      { question: 'What happens to the aspect ratio?', answer: 'By default resizing keeps the aspect ratio. Provide both width and height only if you want exact dimensions.' },
      { question: 'Which formats are supported?', answer: 'JPG, PNG, WEBP, and GIF can be resized.' },
    ],
  },
  'image-converter': {
    howTo: imageHowTo,
    faq: [
      { question: 'Which formats can I convert between?', answer: 'JPG, PNG, WEBP, GIF, and AVIF — pick the target from the format dropdown.' },
      { question: 'Is conversion lossless?', answer: 'Converting to PNG or WEBP preserves detail well. Converting to JPG applies light compression to keep the file small.' },
      { question: 'Can I convert multiple images at once?', answer: 'This tool processes one image per request so you keep full control over each output.' },
    ],
  },
  'image-enhancer': {
    howTo: imageHowTo,
    faq: [
      { question: 'What does enhancing actually do?', answer: 'It lifts brightness and saturation slightly and applies a gentle sharpen pass to bring out detail and make the photo pop.' },
      { question: 'Will it fix a blurry photo?', answer: 'Enhance improves apparent sharpness but cannot recover focus that was never there. It works best on already-decent photos.' },
      { question: 'Can I undo the enhancement?', answer: 'No — but you keep your original file, so you can always re-upload and skip the enhancement.' },
    ],
  },
  'jpg-to-png': {
    howTo: imageHowTo,
    faq: [
      { question: 'Why convert JPG to PNG?', answer: 'PNG is lossless and supports transparency, making it ideal for logos, screenshots, and graphics that need crisp edges.' },
      { question: 'Will the file get bigger?', answer: 'Usually yes — PNG is lossless so it preserves every detail. For photos, JPG is often the smaller choice.' },
      { question: 'Is there a quality loss?', answer: 'No. JPG→PNG is lossless, so no further detail is lost beyond what the original JPG already discarded.' },
    ],
  },
  'png-to-jpg': {
    howTo: imageHowTo,
    faq: [
      { question: 'What happens to transparency?', answer: 'Transparency is flattened onto a white background, since JPG does not support alpha channels.' },
      { question: 'How much smaller will the file be?', answer: 'Typically 3–10× smaller than the source PNG, especially for photographic content.' },
      { question: 'Can I keep the quality high?', answer: 'Yes — use the quality slider. 90+ is visually indistinguishable from the original for most uses.' },
    ],
  },
  'webp-converter': {
    howTo: imageHowTo,
    faq: [
      { question: 'Why use WEBP?', answer: 'WEBP delivers smaller files than JPG and PNG at comparable quality, and is now supported by every modern browser.' },
      { question: 'Is it good for photos and graphics?', answer: 'Yes — WEBP handles both photographic and flat-graphic content well, with or without transparency.' },
      { question: 'What quality should I pick?', answer: '80 is a great default. Drop to 70 for smaller files, raise to 90 when quality matters most.' },
    ],
  },
  'heic-to-jpg': {
    howTo: imageHowTo,
    faq: [
      { question: 'What is HEIC?', answer: 'HEIC is the high-efficiency format Apple uses for iPhone photos. Many apps and websites still expect JPG.' },
      { question: 'Will I lose quality converting to JPG?', answer: 'Minimal. JPG applies light compression, but at quality 90 the result is visually identical for everyday use.' },
      { question: 'Can I batch convert?', answer: 'Upload one image at a time here. For batches, repeat the quick process for each photo.' },
    ],
  },

  /* ── Video ── */
  'video-converter': {
    howTo: videoHowTo,
    faq: [
      { question: 'Which formats can I convert between?', answer: 'MP4, WEBM, MOV, AVI, and MKV — pick the target container from the format buttons.' },
      { question: 'Does converting reduce quality?', answer: 'No — the converter re-wraps the video into the new container without re-compressing, so quality is preserved.' },
      { question: 'Is there a file size limit?', answer: 'Yes — up to 100 MB per video, which covers most short clips and social media exports.' },
    ],
  },
  'video-compressor': {
    howTo: videoHowTo,
    faq: [
      { question: 'What does the CRF slider control?', answer: 'CRF (Constant Rate Factor) controls the quality-to-size trade-off. Lower values mean better quality and larger files; higher values shrink the file more aggressively. 26–30 is a good balance for sharing.' },
      { question: 'Will the output always be MP4?', answer: 'Yes — compression re-encodes to MP4 (H.264 video, AAC audio) for maximum compatibility across devices and platforms.' },
      { question: 'How much smaller will my file be?', answer: 'It depends on the source, but a typical phone-recorded video shrinks by 40–70% at the default setting with little visible quality loss.' },
    ],
  },
  'video-to-mp3': {
    howTo: videoHowTo,
    faq: [
      { question: 'What audio bitrates are available?', answer: '128 kbps, 192 kbps, and 320 kbps. 192 kbps is a good default for most listening; choose 320 kbps for music you care about.' },
      { question: 'Does this work with any video format?', answer: 'Yes — MP4, WEBM, MOV, AVI, and MKV files are all supported as input.' },
      { question: 'Is the video file kept afterwards?', answer: 'No — only the extracted MP3 is generated and returned. Your uploaded video is discarded immediately after processing.' },
    ],
  },
  'gif-maker': {
    howTo: videoHowTo,
    faq: [
      { question: 'How long can the GIF be?', answer: 'GIFs are capped at the first 10 seconds of your video to keep file sizes reasonable — animated GIFs get large fast.' },
      { question: 'What does the frame rate slider do?', answer: 'It controls how smooth the animation looks. Lower frame rates (5–10 fps) produce smaller files; higher rates (15–24 fps) look smoother but are larger.' },
      { question: 'Can I use a video from my phone?', answer: 'Yes — any MP4, WEBM, MOV, AVI, or MKV clip works, including phone recordings.' },
    ],
  },
  'mp4-to-gif': {
    howTo: videoHowTo,
    faq: [
      { question: 'Why is my GIF only 10 seconds?', answer: 'GIF is an inefficient format for motion — a 10-second cap keeps file sizes reasonable enough to share. For longer clips, trim your MP4 first.' },
      { question: 'Can I control the GIF quality?', answer: 'Yes — the frame rate slider trades smoothness for file size. Lower is smaller, higher looks smoother.' },
      { question: 'Does the GIF loop automatically?', answer: 'Yes — every GIF produced loops continuously, matching how GIFs are expected to behave everywhere they\'re shared.' },
    ],
  },

  /* ── PDF ── */
  'merge-pdf': {
    howTo: pdfHowTo,
    faq: [
      { question: 'How many PDFs can I merge?', answer: 'As many as you like, up to a combined 150 MB. The files are joined in the order you upload them.' },
      { question: 'Are my PDFs stored?', answer: 'No. Files are processed in memory and discarded immediately after the merged PDF is generated.' },
      { question: 'Does it work on encrypted PDFs?', answer: 'Password-protected PDFs that you can open without a password can be merged; fully encrypted ones are skipped.' },
    ],
  },
  'split-pdf': {
    howTo: pdfHowTo,
    faq: [
      { question: 'How do page ranges work?', answer: 'Use the format "1-3,5,7-9". Each comma-separated part becomes a separate output file. Leave blank to split every page.' },
      { question: 'Is there a page limit?', answer: 'Each PDF can be up to 50 MB. There is no fixed page cap, but very large documents take longer to process.' },
      { question: 'What do I get back?', answer: 'If you split into one range you get a single PDF. Multiple ranges return a list of downloadable files.' },
    ],
  },
  'compress-pdf': {
    howTo: pdfHowTo,
    faq: [
      { question: 'How much smaller will my PDF get?', answer: 'It varies. Re-serialization strips redundant structure, often saving 5–30%. Image-heavy PDFs see the biggest gains.' },
      { question: 'Will it reduce image quality?', answer: 'No — this tool re-saves the PDF structure without re-encoding embedded images, so visual quality is preserved.' },
      { question: 'Why is my file the same size?', answer: 'Already-optimised PDFs have little redundancy to remove. In those cases the output size is close to the input.' },
    ],
  },
  'jpg-to-pdf': {
    howTo: pdfHowTo,
    faq: [
      { question: 'How many images can I include?', answer: 'Up to 50 images per PDF. Each image becomes one A4 page, centred and scaled to fit.' },
      { question: 'Which image formats work?', answer: 'JPG, PNG, WEBP, and GIF. All are normalised to JPG internally for maximum compatibility.' },
      { question: 'Can I reorder the images?', answer: 'Upload them in the order you want them to appear — that becomes the page order in the PDF.' },
    ],
  },
  'pdf-to-jpg': {
    howTo: pdfHowTo,
    faq: [
      { question: 'How many pages can I convert?', answer: 'Up to 10 pages per conversion to keep things fast. For longer PDFs, convert in batches.' },
      { question: 'What resolution are the output images?', answer: 'Pages are rendered at 1200px wide, which is sharp enough for screen viewing and most print uses.' },
      { question: 'Why did I get an error?', answer: 'PDF rendering needs poppler support on the server. If unavailable, try the Docker deployment, which bundles it.' },
    ],
  },

  /* ── QR ── */
  'qr-code-generator': {
    howTo: [
      { title: 'Enter your content', body: 'Type or paste the text, URL, or contact info you want the QR code to encode.' },
      { title: 'Customise the look', body: 'Adjust size, colours, margins, and error-correction level with the live preview.' },
      { title: 'Download', body: 'Export as PNG for images, SVG for print, or a base64 data URL for embedding.' },
    ],
    faq: [
      { question: 'What can I encode?', answer: 'Any text up to 2,048 characters: URLs, email, phone, SMS, WiFi credentials, vCards, calendar events, locations, or plain text.' },
      { question: 'PNG, SVG, or base64?', answer: 'PNG is best for screens and apps. SVG scales perfectly for print and logos. Base64 lets you embed the code inline in HTML or CSS.' },
      { question: 'What is error correction?', answer: 'Higher levels (Q, H) let the code stay scannable even if part of it is covered or damaged, at the cost of density. M is a good default.' },
      { question: 'Is there a limit on scans?', answer: 'No — a QR code is just an image. Once generated it works forever, with no expiry and no tracking.' },
    ],
  },
  'qr-code-scanner': {
    howTo: [
      { title: 'Upload an image', body: 'Drag in a photo or screenshot of a QR code, or click to browse.' },
      { title: 'Scan instantly', body: 'The code is decoded right in your browser — no waiting, no round-trip beyond the upload.' },
      { title: 'Copy the result', body: 'Read the decoded text and detected type, then copy it with one click.' },
    ],
    faq: [
      { question: 'What image formats are supported?', answer: 'JPG, PNG, WEBP, and GIF up to 10 MB. The clearer and higher-contrast the code, the more reliable the scan.' },
      { question: 'Can it scan from my camera?', answer: 'This tool reads from an uploaded image. Camera scanning works best on mobile, where you can photograph the code and upload it.' },
      { question: 'What if it cannot read my code?', answer: 'Make sure the code is in focus, well-lit, and not cropped too tightly. Blurry or skewed codes are the most common cause of failed scans.' },
    ],
  },

  /* ── Utility ── */
  'color-picker': {
    howTo: [
      { title: 'Pick a colour', body: 'Use the screen EyeDropper (Chrome/Edge) or upload an image and click any pixel.' },
      { title: 'Read the values', body: 'See the colour in HEX, RGB, and HSL instantly.' },
      { title: 'Copy', body: 'Click any value to copy it to your clipboard.' },
    ],
    faq: [
      { question: 'Why does not the screen picker work?', answer: 'The EyeDropper API is available in Chrome 95+ and Edge 95+. In other browsers, use the upload-an-image path instead.' },
      { question: 'Are the colours accurate?', answer: 'Yes — colours are sampled directly from the pixel data, so the HEX, RGB, and HSL values are exact.' },
      { question: 'Is anything sent to a server?', answer: 'No. The whole tool runs in your browser; nothing is uploaded.' },
    ],
  },
  'gradient-generator': {
    howTo: [
      { title: 'Choose a type', body: 'Pick linear, radial, or conic, and set the angle.' },
      { title: 'Design your stops', body: 'Add, remove, and reposition colour stops, or start from a preset.' },
      { title: 'Copy the CSS', body: 'Grab the ready-to-paste background declaration.' },
    ],
    faq: [
      { question: 'Can I use these gradients commercially?', answer: 'Yes — the output is plain CSS that you own and can use anywhere, including commercial projects.' },
      { question: 'Does it support radial and conic gradients?', answer: 'Yes. Switch the type selector to render radial or conic gradients, with full angle control.' },
      { question: 'Does it work offline?', answer: 'It runs entirely in your browser, so once the page is loaded it works without a network connection.' },
    ],
  },

  /* ── SEO ── */
  'meta-title-generator': {
    howTo: [
      { title: 'Enter your topic', body: 'Type the page topic or main keyword, and optionally your brand name.' },
      { title: 'Generate variants', body: 'Get several title formats — question style, listicle style, brand-first, and more.' },
      { title: 'Copy your favourite', body: 'Click any title to copy it, ready to paste into your CMS or <title> tag.' },
    ],
    faq: [
      { question: 'What is the ideal meta title length?', answer: 'Aim for 50–60 characters. Titles are automatically trimmed to fit so they don\'t get cut off in search results.' },
      { question: 'Does this pull real search data?', answer: 'No. Titles are generated from proven copywriting templates, not live search volume — this is a drafting tool, not a keyword-research API.' },
      { question: 'Is this tool free to use commercially?', answer: 'Yes. Everything runs locally in your browser and titles you generate are yours to use anywhere, including client and commercial work.' },
    ],
  },
  'meta-description-generator': {
    howTo: [
      { title: 'Enter your topic', body: 'Type the page topic and, if you like, a short call to action.' },
      { title: 'Generate variants', body: 'Get several description drafts, each trimmed to fit Google\'s display limit.' },
      { title: 'Copy your favourite', body: 'Click any description to copy it into your CMS or meta tag.' },
    ],
    faq: [
      { question: 'What is the ideal meta description length?', answer: 'Aim for 150–160 characters. Longer descriptions are automatically trimmed so they don\'t get cut off in search results.' },
      { question: 'Should every page have a unique description?', answer: 'Yes — duplicate descriptions across pages can hurt how search engines differentiate your content. Generate a fresh one per page.' },
      { question: 'Does the call-to-action field do anything special?', answer: 'It\'s appended to the end of each draft so you can test different closing lines without retyping the whole description.' },
    ],
  },
  'youtube-tags-generator': {
    howTo: [
      { title: 'Enter your video title', body: 'Type the exact title you plan to use for the video.' },
      { title: 'Generate tags', body: 'Get a list built from your title\'s keywords, common phrase combinations, and popular modifiers like "tutorial" or "for beginners".' },
      { title: 'Copy and paste', body: 'Copy all tags at once and paste them into YouTube\'s tag field when uploading.' },
    ],
    faq: [
      { question: 'How many tags does YouTube allow?', answer: 'YouTube enforces a 500-character total limit across all tags, not a fixed count. This tool stops adding tags once that budget is used.' },
      { question: 'Do tags still matter for YouTube SEO?', answer: 'Their weight has diminished compared to title, description, and watch time, but they still help YouTube understand context, especially for niche or misspelled search terms.' },
      { question: 'Can I edit the generated tags?', answer: 'Yes — treat this as a starting list. Remove any that don\'t fit and add tags specific to your channel or series.' },
    ],
  },
  'keyword-generator': {
    howTo: [
      { title: 'Enter a seed keyword', body: 'Type the core topic or product you want keyword ideas for.' },
      { title: 'Browse by intent', body: 'Ideas are grouped into Informational, Commercial, Comparison, Transactional, and Long-tail buckets.' },
      { title: 'Copy what fits', body: 'Click any keyword to copy it for use in content briefs, ad groups, or page titles.' },
    ],
    faq: [
      { question: 'Does this show search volume or competition?', answer: 'No. This generates keyword variations from proven modifier patterns (best, how to, vs, near me, etc.) — it does not pull live search-volume data, which typically requires a paid API.' },
      { question: 'Why are keywords grouped by intent?', answer: 'Matching content to search intent (informational vs. transactional, for example) is one of the strongest levers for ranking and conversion — grouping makes it easy to pick the right angle.' },
      { question: 'Can I use these for paid ad campaigns?', answer: 'Yes — the Commercial and Transactional groups in particular are commonly used as a starting point for ad group keyword lists.' },
    ],
  },
  'schema-generator': {
    howTo: [
      { title: 'Choose a schema type', body: 'Pick Article, Product, FAQPage, HowTo, LocalBusiness, or Review.' },
      { title: 'Fill in the fields', body: 'Enter the details relevant to that schema type.' },
      { title: 'Copy the JSON-LD', body: 'Paste the generated code into a <script type="application/ld+json"> tag on your page.' },
    ],
    faq: [
      { question: 'Where do I put the generated code?', answer: 'Paste it inside a <script type="application/ld+json"> tag in your page\'s <head> or body. Most CMSs have a custom-HTML or SEO-plugin field for this.' },
      { question: 'Will this guarantee rich results in Google?', answer: 'No tool can guarantee rich snippets — Google decides when to display them. Valid structured data simply makes your page eligible.' },
      { question: 'How do I check my schema is valid?', answer: 'Paste the generated JSON-LD into Google\'s Rich Results Test or the Schema.org validator to confirm it parses correctly before publishing.' },
    ],
  },
};
