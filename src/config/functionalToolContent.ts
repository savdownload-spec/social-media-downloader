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
  { title: 'Download the result', body: 'Click process and grab your finished PDF — no watermarks, no signup.' },
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
};
