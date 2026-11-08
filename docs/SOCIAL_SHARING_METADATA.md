# SavDown social sharing metadata

## Implementation

The installed Next.js version is 14.2.18. The root layout and public pages use the server-side Metadata API through `buildMetadata`. Contact and search keep their existing client pages and receive metadata from server layouts. Next.js 14 resolves metadata before streaming the UI, so social crawlers receive it without JavaScript: https://nextjs.org/docs/14/app/building-your-application/optimizing/metadata.

Every public page now uses `og:type=website`, `og:site_name=SavDown`, `og:locale=en_US`, a page-specific title and description, and matching canonical/OG URLs. Social titles include SavDown. Twitter cards use `summary_large_image` and the same title, description, image, and descriptive image alt text. No Twitter site or creator tags are emitted because repository configuration alone does not verify ownership of the existing handle. Existing social navigation links remain unchanged.

The public SEO origin is fixed at `https://getsavdown.com`, independent of auth, localhost, and deployment-preview environment variables. Sitemap, robots host/sitemap declarations, and existing schema URLs already consume this shared origin. Legacy SavDown canonical hosts normalize to the official HTTPS domain. Explicit editorial canonical overrides on blog posts remain supported; valid external overrides are preserved.

## Official image

Updated to the replacement image supplied on November 8, 2026. It includes the "Explore Free Tools" call to action and is under 1 MB. The previous PNG asset was removed; all metadata now references the new JPEG URL.

- Public URL after deployment: https://getsavdown.com/og-image.jpg
- Source: the existing `OG-Tag.jpg` file in Downloads, visually matched to the supplied attachment.
- Original format: JPEG; expected HTTP Content-Type: `image/jpeg`.
- Actual dimensions read from the file: **1200 × 630**.
- Size: **79,658 bytes**.
- Source and public copy SHA-256: `09EBE850FB8C8C629C9FF84A1BCE4D768D7A2E9C416792F5CBEDB66B977A6F2D`.
- Alt text: `SavDown — Download Videos, Images & More. Explore Free Tools, with purple video, image, and audio icons.`

The file was copied byte for byte. No cropping, resizing, compression, regeneration, or UI insertion was performed. OG image metadata includes the absolute URL, identical secure URL, JPEG type, measured width/height, and alt text. Twitter includes the same absolute URL and alt text. Blog cover images and article schema image fields remain unchanged; social cards use the official JPEG.

The image is a normal public static asset. The existing middleware excludes file paths and does not require authentication for it; no image route, redirect, or image optimizer was introduced. Production HTTP status, Content-Type, and external crawler access must be confirmed after deployment.

## Files changed for this task

- `public/og-image.jpg`: unchanged official image.
- `src/config/site.ts`: fixed public origin and official image configuration; removed unverified Twitter metadata handle.
- `src/lib/seo.ts`: complete shared OG/Twitter metadata and canonical normalization.
- `src/app/layout.tsx`: shared default metadata for the homepage and site.
- `src/app/blog/page.tsx`: blog listing title, description, and canonical.
- `src/app/blog/[slug]/page.tsx`: existing post SEO fields with the official sharing image; consistent canonical resolution. Article schema remains in place.
- `src/app/tools/ai-image-generator/page.tsx`: shared complete metadata while retaining the existing SEO title and description.
- `src/app/contact/layout.tsx`: server-rendered contact metadata.
- `src/app/search/layout.tsx`: server-rendered search metadata, without reflecting search queries in public previews.
- `src/app/maintenance/page.tsx`: accurate maintenance metadata while retaining noindex/nofollow/nocache.
- `docs/SOCIAL_SHARING_METADATA.md`: implementation report and deployment checklist.

Unrelated pre-existing changes were preserved. No local tests, build, lint, type-check, dev server, or browser test procedures were run. The initial implementation was committed and pushed as `29de047`. The user also authorized committing and pushing the replacement-image update; production verification remains pending deployment.

## Coverage and metadata sources

These exact static public URLs are covered:

```text
https://getsavdown.com/
https://getsavdown.com/tools
https://getsavdown.com/pricing
https://getsavdown.com/about
https://getsavdown.com/contact
https://getsavdown.com/blog
https://getsavdown.com/faq
https://getsavdown.com/search
https://getsavdown.com/privacy
https://getsavdown.com/terms
https://getsavdown.com/cookies
https://getsavdown.com/dmca
https://getsavdown.com/reviews
https://getsavdown.com/affiliates
```

All valid `/tools/[slug]` pages across downloader, image, video, PDF, AI, SEO, and utility categories use the shared metadata. Existing configured SEO titles, descriptions, keywords, and tool-status badges remain in effect. The dedicated AI image generator route also uses the helper.

All published `/blog/[slug]` posts use their existing SEO title and meta description, falling back to the article title and excerpt. Existing index/follow controls and structured data remain. No known indexable route lacks page-specific metadata after this change. Published database content was not queried or audited; empty editor-supplied fields use the existing content fallbacks.

Login, password reset, and maintenance remain non-indexable. Account, workspace, and admin authentication and existing indexing restrictions remain unchanged. No session identity, email, balances, uploaded files, or account-specific data was introduced into metadata.

## Live verification after deployment

Deploy these changes to the production site serving `getsavdown.com`. No new environment variable or database migration is required. Existing auth environment settings are unaffected. Ensure the production domain serves directly over HTTPS and that hosting protection or firewall rules permit anonymous social crawlers to access public pages and `/og-image.jpg`.

1. Open https://getsavdown.com/og-image.jpg directly. In browser Network tools confirm **HTTP 200**, **Content-Type: image/jpeg**, **no redirect**, and **1200 × 630** dimensions. It must load while signed out.
2. Open the URLs below and use **View Page Source** to inspect the initial HTML. Confirm one canonical link and one consistent set of OG/Twitter fields. The canonical and `og:url` should equal the submitted clean page URL unless an explicit editorial canonical exists.
3. Check https://getsavdown.com/sitemap.xml and https://getsavdown.com/robots.txt for the official HTTPS domain.

Representative URLs and expected metadata (assuming the YouTube tool is LIVE):

| Exact URL / expected canonical and og:url | Expected OG and Twitter title | Expected OG and Twitter description |
| --- | --- | --- |
| https://getsavdown.com/ | Download Videos, Images & More \| SavDown | Fast, free, and easy-to-use tools for downloading content from social media platforms |
| https://getsavdown.com/tools/youtube-video-downloader | YouTube Video Downloader for MP4 up to 4K \| SavDown | Download eligible YouTube videos as MP4, with resolutions up to 4K when available from the source. No SavDown watermark or browser extension. |
| https://getsavdown.com/pricing | Pricing \| SavDown | SavDown is free to use every day. Upgrade when you need more — Pro monthly or yearly, one-time credit packs, or a single Lifetime payment. |
| https://getsavdown.com/about | About SavDown | Learn about SavDown — the free, fast video and file downloader built for creators and everyday users. No ads, no watermarks, built with privacy first. |
| https://getsavdown.com/contact | Contact SavDown | Contact SavDown with questions, feedback, or support requests about our downloaders and online tools. |
| https://getsavdown.com/blog | Blog \| SavDown | Downloader guides, creator workflows, format tips, and practical answers for everyday media tasks from SavDown. |
| https://getsavdown.com/blog/how-to-download-youtube-videos-in-hd-quality | How to Download YouTube Videos in HD Quality (2026) \| SavDown | Learn how to download YouTube videos in HD — what 720p/1080p really means, step-by-step instructions, and fixes for blurry or failed downloads. |

For every row and every platform, the expected image is **https://getsavdown.com/og-image.jpg**. Published editorial changes can update blog text; configured tool-status badges can update tool titles.

Additional category samples:

```text
https://getsavdown.com/tools/image-compressor
https://getsavdown.com/tools/merge-pdf
https://getsavdown.com/tools/ai-image-generator
https://getsavdown.com/tools/qr-code-generator
```

Use each representative URL with these platform checks:

- **Facebook Sharing Debugger:** https://developers.facebook.com/tools/debug/ — paste the page URL, select Debug, then Scrape Again after deployment. Compare the fetched title, description, canonical/OG URL, and JPEG with the table.
- **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/ — paste the same page URL and select Inspect. Compare the reported metadata and image with the same row.
- **X Card Validator, where available:** https://cards-dev.twitter.com/validator — submit the same URL. If it is unavailable or does not provide a visual preview for your account, paste the URL into the X composer and wait for the card. Expect `summary_large_image`, the row's title/description, and the official JPEG. The canonical remains in the page source even if the card does not show it.
- **WhatsApp:** paste a clean page URL into a chat with yourself and wait for the preview before sending. Expect the row's title and official JPEG; compare description where the client displays it. Inspect canonical/OG URL in page source if the client hides it.
- **Telegram:** paste the same clean URL into Saved Messages with link previews enabled and wait for the card. Expect the same metadata and JPEG. If an old preview persists, request a refresh through Telegram's `@WebpageBot` where available and try again.
- **Instagram, Discord, Slack, and other OG consumers:** use the same clean public URLs wherever that product supports link previews. The page supplies the same metadata; the client controls whether it displays a card, description, or cropped thumbnail. Instagram placements do not all display website preview cards.

These are expected results from the implementation, not a claim that production or platform previews have already passed. Platforms may cache old previews and may omit descriptions or crop their displayed thumbnail; the underlying supplied image remains unchanged.
