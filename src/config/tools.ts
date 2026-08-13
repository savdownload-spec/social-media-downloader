/**
 * Central tool registry.
 * Each tool page pulls its config, SEO, and rendering from here so we don't
 * duplicate 8 nearly-identical files. Add a new tool by adding an entry.
 */

export type Platform =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'x';

export type Tool = {
  slug: string;
  platform: Platform;
  name: string;
  shortName: string;
  headline: string;
  subheadline: string;
  description: string;
  keywords: string[];
  placeholder: string;
  urlPattern: RegExp;
  outputKind: 'video' | 'image';
  supportedFormats: string[];
  featured: boolean;
  trending: boolean;
  faq: { question: string; answer: string }[];
  howTo: { title: string; body: string }[];
};

export const tools: Tool[] = [
  /* ─────────────────────────────────────────────────────────────────
     1. YouTube Video Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'youtube-video-downloader',
    platform: 'youtube',
    name: 'YouTube Video Downloader',
    shortName: 'YouTube Video',
    headline: 'Save YouTube Videos In Stunning Quality.',
    subheadline: 'Paste any YouTube link. Pick a format. Download in seconds.',
    description:
      'Download YouTube videos in MP4 up to 4K. Fast, private, and free with no watermarks and free daily credits.',
    keywords: ['youtube video downloader', 'youtube mp4', 'download youtube video', 'yt downloader'],
    placeholder: 'https://youtube.com/watch?v=…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 4K', 'MP4 1080p', 'MP4 720p', 'MP3'],
    featured: true,
    trending: true,
    faq: [
      {
        question: 'Is the YouTube video downloader completely free?',
        answer: 'Yes, free to use. Create a free account and you get a daily allowance of SavCredits, which covers everyday downloading with no card required. If you need more, you can top up with a one-time credit pack or move to a paid plan.',
      },
      {
        question: 'What video resolutions can I download from YouTube?',
        answer: 'SavDown supports 360p, 480p, 720p, 1080p Full HD, and 4K (2160p) where available on the source video. If the uploader did not publish a 4K version, the highest available resolution is offered instead.',
      },
      {
        question: 'Can I download a YouTube video as MP3 audio only?',
        answer: 'Yes. Choose the MP3 option to extract the audio track at up to 320 kbps. This is ideal for music, podcasts, interviews, and lectures you want to listen to offline.',
      },
      {
        question: 'Do I need to install any software or browser extension?',
        answer: 'No installation needed. SavDown runs entirely in your browser — desktop, tablet, or mobile. There is nothing to install, no Chrome extension, and no app to download.',
      },
      {
        question: 'Does SavDown add a watermark to downloaded videos?',
        answer: 'Never. The file you save is the original stream from YouTube with no logo, watermark, or overlay added by SavDown at any quality level.',
      },
      {
        question: 'Will the video quality be lower than on YouTube?',
        answer: 'No. SavDown routes the original stream directly to your device. The file you download is bit-for-bit identical to what YouTube serves — no re-encoding, no quality loss.',
      },
      {
        question: 'Can I download a YouTube playlist or multiple videos at once?',
        answer: 'The YouTube Video Downloader processes one link at a time. For playlists, use our dedicated YouTube Playlist Downloader tool to batch-download an entire series in one go.',
      },
      {
        question: 'How do I download a YouTube video on my iPhone or Android phone?',
        answer: 'Open the YouTube video, tap Share, then Copy Link. Open SavDown in your mobile browser, paste the link, pick a format, and tap Download. The file saves directly to your phone\'s storage or Files app — no app install required.',
      },
      {
        question: 'Does downloading YouTube videos work on private or age-restricted videos?',
        answer: 'SavDown works with publicly available videos, including unlisted videos if you have the direct link. Private videos and strictly age-gated content that require a logged-in session are not accessible without authentication.',
      },
      {
        question: 'How long does it take to download a YouTube video?',
        answer: 'Most videos are ready in 3–10 seconds. Processing time depends on video length, chosen resolution, and your internet speed. A 1-hour 1080p video typically takes under 30 seconds to process.',
      },
      {
        question: 'Is it legal to download YouTube videos?',
        answer: 'YouTube\'s Terms of Service restrict downloading outside of their official offline feature. However, downloading videos you own, have explicit permission to use, or that are licensed under Creative Commons is widely considered acceptable. Always respect copyright and the creator\'s rights.',
      },
      {
        question: 'What formats does SavDown support besides MP4?',
        answer: 'Currently SavDown offers MP4 (up to 4K) and MP3 audio extraction. MP4 is the universally compatible format for video; MP3 works on every device and media player for audio-only use.',
      },
      {
        question: 'Can I download YouTube Shorts with this tool?',
        answer: 'Yes, standard YouTube Shorts URLs (youtube.com/shorts/…) are recognised and supported. For a tool specifically optimised for vertical Shorts with aspect-ratio preservation, also try our dedicated YouTube Shorts Downloader.',
      },
      {
        question: 'Does SavDown store or log the videos I download?',
        answer: 'No. SavDown never saves the video file on its servers. The stream is proxied directly to your browser and is discarded immediately after delivery. We do not log which videos you access.',
      },
      {
        question: 'Why is the 4K option missing for some videos?',
        answer: '4K availability depends entirely on what the original YouTube uploader provided. If 4K is absent it means the creator uploaded in a lower resolution. The next-highest available quality is automatically offered.',
      },
    ],
    howTo: [
      { title: 'Copy The YouTube URL', body: 'Open the video on YouTube and copy the link from the address bar or Share menu.' },
      { title: 'Paste It Above', body: 'Paste the URL into SavDown. We\'ll detect the video automatically.' },
      { title: 'Choose Your Format', body: 'Pick MP4 up to 4K or extract MP3 audio.' },
      { title: 'Download', body: 'Your file is ready in seconds, direct to your device.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     2. YouTube Shorts Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'youtube-shorts-downloader',
    platform: 'youtube',
    name: 'YouTube Shorts Downloader',
    shortName: 'YouTube Shorts',
    headline: 'Grab YouTube Shorts, Watermark-Free.',
    subheadline: 'Save vertical Shorts in original quality for offline viewing or archival.',
    description:
      'Download YouTube Shorts in MP4 with original 1080x1920 resolution. Fast, watermark-free, and private.',
    keywords: ['youtube shorts downloader', 'download youtube shorts', 'shorts mp4'],
    placeholder: 'https://youtube.com/shorts/…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/|youtu\.be\/).+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 1080p', 'MP4 720p'],
    featured: true,
    trending: true,
    faq: [
      {
        question: 'Are YouTube Shorts saved in the original vertical (9:16) format?',
        answer: 'Yes. SavDown preserves the full 1080×1920 vertical resolution and 9:16 aspect ratio exactly as published by the creator — no cropping, no black bars, no format conversion.',
      },
      {
        question: 'Does SavDown add a watermark to downloaded YouTube Shorts?',
        answer: 'No. The file you receive is the clean original MP4 with no SavDown logo, no YouTube watermark, and no overlay of any kind.',
      },
      {
        question: 'What is the maximum resolution for a downloaded YouTube Short?',
        answer: 'Most Shorts are published at 1080p (1080×1920). SavDown downloads at the highest resolution the creator uploaded, up to 1080p Full HD.',
      },
      {
        question: 'Can I download YouTube Shorts on my phone without an app?',
        answer: 'Yes. Open the Short, tap Share → Copy link, then open SavDown in your mobile browser, sign in, paste the link, and download. No app and no extension required.',
      },
      {
        question: 'Do I need a YouTube account to download Shorts?',
        answer: 'No YouTube account or SavDown account is required. All public Shorts are accessible by pasting the link directly.',
      },
      {
        question: 'Can I also extract the audio from a YouTube Short as MP3?',
        answer: 'Yes. After pasting the Shorts URL you can choose the MP3 audio option to save just the soundtrack — useful for trending sounds and background music.',
      },
      {
        question: 'What is the difference between a YouTube Short and a regular YouTube video?',
        answer: 'YouTube Shorts are vertical short-form videos (up to 60 seconds) designed for mobile. Regular YouTube videos are landscape-oriented and can be any length. SavDown handles both formats correctly with aspect ratio preserved.',
      },
      {
        question: 'Can I download a YouTube Short using the youtu.be short link?',
        answer: 'Yes. Both youtube.com/shorts/… and youtu.be/… short links are automatically detected and work with this tool.',
      },
      {
        question: 'Is downloading YouTube Shorts free?',
        answer: 'Free with your daily SavCredits, and every plan including the free one can use the Shorts downloader. Heavy users can top up with a credit pack.',
      },
      {
        question: 'Why does the downloaded Short appear as an MP4 rather than a Shorts file?',
        answer: 'MP4 is the universal video container that plays on every device and app, from your phone gallery to professional editing software. There is no special "Shorts format" — YouTube itself stores Shorts as MP4.',
      },
      {
        question: 'Does SavDown store or share the Shorts I download?',
        answer: 'No. SavDown streams the file directly to your browser and does not retain a copy on its servers. Your download activity is never stored or shared.',
      },
      {
        question: 'Can I re-upload a downloaded Short to another platform?',
        answer: 'Technically yes, but you must have the rights to do so. Only re-upload content you created yourself or that is explicitly licensed for redistribution. Re-uploading others\' content without permission may violate copyright law.',
      },
      {
        question: 'What should I do if a Short fails to download?',
        answer: 'First confirm the Short is public and the URL is complete (includes the video ID after /shorts/). If it still fails, try refreshing the page and pasting the link again. Shorts that have been removed or restricted by the creator cannot be downloaded.',
      },
    ],
    howTo: [
      { title: 'Open The Short', body: 'Find the YouTube Short you want to save.' },
      { title: 'Copy Its URL', body: 'Tap Share → Copy Link.' },
      { title: 'Paste And Download', body: 'Paste the link into SavDown and hit Download.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     3. YouTube Thumbnail Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'youtube-thumbnail-downloader',
    platform: 'youtube',
    name: 'YouTube Thumbnail Downloader',
    shortName: 'YouTube Thumbnails',
    headline: 'Download Any YouTube Thumbnail In Max Resolution.',
    subheadline: 'Perfect for creators studying design, or just curating inspiration.',
    description:
      'Grab any YouTube thumbnail in Maximum Resolution (Max-Res), HQ, MQ, and SD. Free and fast.',
    keywords: ['youtube thumbnail downloader', 'youtube thumbnail hd', 'download youtube thumbnail'],
    placeholder: 'https://youtube.com/watch?v=…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    outputKind: 'image',
    supportedFormats: ['MaxRes JPG', 'HQ JPG', 'MQ JPG', 'SD JPG'],
    featured: true,
    trending: false,
    faq: [
      {
        question: 'What thumbnail resolutions does SavDown offer?',
        answer: 'SavDown provides four sizes: MaxRes (1280×720), HQ (480×360), MQ (320×180), and SD (120×90). MaxRes is recommended for design work and study; SD is useful for quick previews.',
      },
      {
        question: 'Does every YouTube video have a MaxRes thumbnail?',
        answer: 'Not always. YouTube generates a MaxRes thumbnail only for videos that have been uploaded in HD. If the creator uploaded a lower-resolution video, MaxRes may not exist and SavDown will offer the next available size.',
      },
      {
        question: 'Do I need to log in to YouTube to download thumbnails?',
        answer: 'No login is required. Any public YouTube video URL — including youtu.be short links and Shorts URLs — works without authentication.',
      },
      {
        question: 'In what file format are YouTube thumbnails saved?',
        answer: 'Thumbnails are saved as JPG files, which is the format YouTube uses natively. JPG is compatible with every image viewer, design tool, and website builder.',
      },
      {
        question: 'Can I download thumbnails from YouTube Shorts?',
        answer: 'Yes. Paste a youtube.com/shorts/… URL and SavDown will extract the thumbnail at all available resolutions just like a regular video.',
      },
      {
        question: 'Why would someone want to download a YouTube thumbnail?',
        answer: 'Creators study competitor thumbnails for design inspiration, A/B testing ideas, and click-through-rate analysis. Designers use saved thumbnails as mood board references. Researchers archive thumbnail sets for media studies.',
      },
      {
        question: 'Is downloading YouTube thumbnails legal?',
        answer: 'Thumbnails are publicly accessible images, but they are the intellectual property of the channel owner. Downloading for personal reference, study, or non-commercial use is generally considered acceptable. Do not reproduce or republish a thumbnail without the creator\'s permission.',
      },
      {
        question: 'Can I use a downloaded thumbnail as my own video thumbnail?',
        answer: 'Only if the thumbnail is your own creation or explicitly licensed for reuse. Using another creator\'s thumbnail without permission is copyright infringement and violates YouTube\'s policies.',
      },
      {
        question: 'How do I find a YouTube video ID so I can get its thumbnail directly?',
        answer: 'The video ID is the string after "v=" in a standard watch URL (e.g., youtube.com/watch?v=dQw4w9WgXcQ → ID is dQw4w9WgXcQ). You can also just paste the full URL into SavDown and we extract the ID automatically.',
      },
      {
        question: 'Does SavDown store the thumbnail images after I download them?',
        answer: 'No. SavDown fetches the image directly from YouTube\'s servers and passes it straight to your browser. No thumbnail is stored on SavDown\'s infrastructure.',
      },
      {
        question: 'Can I download thumbnails in PNG or WebP format?',
        answer: 'YouTube stores thumbnails exclusively as JPG, so that is the only format available. If you need a PNG for transparency, open the JPG in any image editor and export it as PNG.',
      },
      {
        question: 'Does this tool work with private or unlisted YouTube videos?',
        answer: 'Unlisted videos work if you have the direct URL. Private videos are not accessible because YouTube does not serve their thumbnails to unauthenticated requests.',
      },
    ],
    howTo: [
      { title: 'Paste Any YouTube Video URL', body: 'Full video link, Short link, or youtu.be link, all work.' },
      { title: 'Pick Your Resolution', body: 'MaxRes is best for reference or study.' },
      { title: 'Download', body: 'Save the thumbnail directly to your device.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     4. YouTube to MP3 Converter
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'youtube-to-mp3',
    platform: 'youtube',
    name: 'YouTube to MP3 Converter',
    shortName: 'YouTube to MP3',
    headline: 'Turn YouTube Videos Into MP3 Audio.',
    subheadline: 'Extract crisp, high-bitrate audio from any YouTube video in seconds.',
    description:
      'Convert YouTube videos to MP3 audio in high quality. Fast, free, with daily credits included.',
    keywords: ['youtube to mp3', 'youtube mp3 converter', 'download youtube audio', 'yt to mp3'],
    placeholder: 'https://youtube.com/watch?v=…',
    urlPattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP3 320kbps', 'MP3 128kbps', 'M4A'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'What is the maximum MP3 bitrate SavDown can produce?',
        answer: 'SavDown offers up to 320 kbps MP3. This is the highest standard MP3 bitrate and is effectively transparent for most listeners on any playback device or headphones.',
      },
      {
        question: 'Is the YouTube to MP3 converter free to use?',
        answer: 'Yes. Converting YouTube videos to MP3 is covered by your free daily SavCredits, with no credit card required.',
      },
      {
        question: 'Does the audio quality depend on the YouTube video quality?',
        answer: 'Yes. The source audio bitrate in the YouTube video is the ceiling. Most music videos and high-quality uploads contain audio encoded at 128–192 kbps. Requesting 320 kbps from a lower-bitrate source produces a larger file without additional audio detail.',
      },
      {
        question: 'Can I convert a YouTube playlist to MP3?',
        answer: 'The YouTube to MP3 converter processes one URL at a time. Paste each video link individually to extract the MP3. For batch conversion, a Pro feature is coming that handles full playlists in one step.',
      },
      {
        question: 'What is M4A and when should I choose it over MP3?',
        answer: 'M4A (MPEG-4 Audio) is the native container YouTube uses for its audio streams. It preserves the original audio codec (AAC) without re-encoding, which means no generation loss. Choose M4A if audio fidelity is critical and your device or player supports it.',
      },
      {
        question: 'Is it legal to convert YouTube videos to MP3?',
        answer: 'YouTube\'s Terms of Service prohibit downloading content outside their official offline feature. Converting music you already own or that is licensed under Creative Commons is widely practised, but always ensure you have the right to use the audio for your intended purpose.',
      },
      {
        question: 'Will the MP3 include ID3 tags like artist and track title?',
        answer: 'SavDown adds the video title as the track name tag automatically. Full ID3 metadata (artist, album, artwork) can be added manually in any music library app such as iTunes, MusicBrainz Picard, or Mp3tag after download.',
      },
      {
        question: 'How do I convert a YouTube video to MP3 on an iPhone?',
        answer: 'Open the YouTube video in Safari, tap Share → Copy Link, then open SavDown in Safari, paste the link, select MP3, and tap Download. The file saves to your Files app and can be imported into the Music or GarageBand app.',
      },
      {
        question: 'Can I convert a YouTube Live stream to MP3?',
        answer: 'Live streams that are still actively broadcasting cannot be converted. Once a live stream ends and YouTube processes the archived recording (usually within a few hours), the archive URL works with SavDown like any regular video.',
      },
      {
        question: 'Does SavDown re-encode the audio or pass it through directly?',
        answer: 'When you choose M4A, SavDown passes the original AAC audio stream directly with no re-encoding. When you choose MP3, the AAC stream is transcoded to MP3. Choosing 320 kbps minimises any transcoding artefacts.',
      },
      {
        question: 'How large will the MP3 file be?',
        answer: 'Approximate sizes at 320 kbps: a 3-minute song is roughly 7 MB, a 10-minute podcast episode is around 23 MB, and a 1-hour lecture is approximately 138 MB. Choosing 128 kbps cuts these sizes by about 60%.',
      },
      {
        question: 'Can I convert YouTube Music videos to MP3?',
        answer: 'Yes. YouTube Music video URLs (music.youtube.com/…) and standard YouTube watch URLs for music content both work with SavDown. Paste the URL, choose MP3, and download.',
      },
      {
        question: 'Does the converter work on Android?',
        answer: 'Yes. Open Chrome or any browser on Android, paste the YouTube link into SavDown, tap MP3, and the file downloads directly to your Downloads folder. No third-party app needed.',
      },
    ],
    howTo: [
      { title: 'Paste The YouTube Link', body: 'Copy the video URL and drop it into the box above.' },
      { title: 'Pick Your Bitrate', body: 'Choose 320kbps for the best quality or 128kbps to save space.' },
      { title: 'Download The MP3', body: 'Your audio file is ready to save in seconds.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     5. TikTok Video Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'tiktok-video-downloader',
    platform: 'tiktok',
    name: 'TikTok Video Downloader',
    shortName: 'TikTok Video',
    headline: 'Save TikToks Without The Watermark.',
    subheadline: 'Grab any TikTok in HD, no watermark, no login, no fluff.',
    description:
      'Download TikTok videos in MP4 without the watermark. HD quality, works with any public TikTok URL.',
    keywords: ['tiktok downloader', 'tiktok no watermark', 'download tiktok', 'save tiktok'],
    placeholder: 'https://tiktok.com/@user/video/…',
    urlPattern: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD (no watermark)', 'MP4 HD (with watermark)', 'MP3 audio'],
    featured: true,
    trending: true,
    faq: [
      {
        question: 'Can I download TikTok videos without a watermark?',
        answer: 'Yes. SavDown offers a watermark-free MP4 option that removes the TikTok username overlay and logo entirely, giving you a clean video file suitable for editing or archiving.',
      },
      {
        question: 'Do I need the TikTok app or an account to download videos?',
        answer: 'Neither. Just paste the public video URL into SavDown — no TikTok login, no SavDown account, and no app installation required.',
      },
      {
        question: 'What quality does a downloaded TikTok video have?',
        answer: 'SavDown downloads the original HD stream that TikTok serves, typically 1080×1920 for vertical videos or the original resolution for horizontal content. Quality is limited only by what the creator uploaded.',
      },
      {
        question: 'Can I download private TikTok videos?',
        answer: 'Only public videos are accessible. Private TikToks require account authentication that SavDown does not perform. Friend-only and private videos cannot be downloaded.',
      },
      {
        question: 'How do I copy a TikTok link on my phone?',
        answer: 'On the TikTok app, tap the Share icon (arrow pointing right), then tap Copy link. On a desktop browser, copy the URL directly from the address bar. Both formats work in SavDown.',
      },
      {
        question: 'Does SavDown support vm.tiktok.com short links?',
        answer: 'Yes. Short links beginning with vm.tiktok.com or vt.tiktok.com are automatically expanded and processed the same as standard TikTok URLs.',
      },
      {
        question: 'Is downloading TikTok videos legal?',
        answer: 'TikTok\'s Terms of Service prohibit downloading content outside the platform\'s built-in save feature. Downloading for personal archival of your own videos or content you have explicit permission to save is generally acceptable. Never redistribute or monetise someone else\'s content without permission.',
      },
      {
        question: 'Can I also extract just the audio from a TikTok video?',
        answer: 'Yes. Select the MP3 option to extract the audio track from any public TikTok video — ideal for saving trending sounds, voiceovers, or background music.',
      },
      {
        question: 'Why would I want the watermarked version instead of the clean one?',
        answer: 'The watermarked version preserves the original creator attribution. If you are archiving content for research, journalism, or to give proper credit when sharing, the watermarked version clearly identifies the original source.',
      },
      {
        question: 'Does SavDown work with TikTok Duets and Stitch videos?',
        answer: 'Yes. Duets and Stitches are standard TikTok videos from a technical standpoint. Paste the URL of the Duet or Stitch and SavDown downloads it like any other public video.',
      },
      {
        question: 'How long does it take to download a TikTok video?',
        answer: 'Most TikToks are ready within 3–5 seconds. Longer videos (up to 10 minutes) may take up to 15 seconds depending on your connection speed and the file size.',
      },
      {
        question: 'Does SavDown store the TikTok videos I download?',
        answer: 'No. SavDown streams the file directly to your browser and never retains a copy on its servers. Your download history is not logged.',
      },
      {
        question: 'What should I do if my TikTok link does not work?',
        answer: 'Make sure the video is still publicly visible — deleted, private, or region-restricted TikToks cannot be downloaded. Try copying the link again directly from the TikTok app Share menu to ensure the URL is complete.',
      },
      {
        question: 'Can I download TikTok LIVE recordings?',
        answer: 'Live recordings that TikTok saves as replay videos are supported once they appear as standard public posts. Active live streams cannot be captured in real time.',
      },
    ],
    howTo: [
      { title: 'Open The TikTok', body: 'Tap Share → Copy Link on the video you want.' },
      { title: 'Paste Into SavDown', body: 'Drop the URL in the box above.' },
      { title: 'Download HD', body: 'Choose watermark-free or original, then save.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     6. TikTok to MP3 Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'tiktok-to-mp3',
    platform: 'tiktok',
    name: 'TikTok to MP3 Downloader',
    shortName: 'TikTok to MP3',
    headline: 'Save The Sound From Any TikTok.',
    subheadline: 'Grab the original audio or trending sound from a TikTok as a clean MP3.',
    description:
      'Download TikTok audio and trending sounds as MP3. No watermark, free daily credits.',
    keywords: ['tiktok to mp3', 'tiktok audio downloader', 'download tiktok sound', 'tiktok mp3'],
    placeholder: 'https://tiktok.com/@user/video/…',
    urlPattern: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP3 320kbps', 'MP3 128kbps'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'Can I save the audio from any public TikTok as an MP3?',
        answer: 'Yes. Paste the URL of any public TikTok video and SavDown extracts the audio track and saves it as a clean MP3 file — no video, no watermark, just the sound.',
      },
      {
        question: 'Does the MP3 include the TikTok audio watermark?',
        answer: 'No. The extracted MP3 is free of the TikTok audio watermark. You get the raw audio track exactly as it was in the original video.',
      },
      {
        question: 'What bitrate options are available for TikTok MP3 downloads?',
        answer: 'SavDown offers 320 kbps for the best audio quality and 128 kbps for a smaller file size. For music and sounds where quality matters, always choose 320 kbps.',
      },
      {
        question: 'Can I download a trending TikTok sound as an MP3?',
        answer: 'Yes. Find a video that uses the trending sound you want, copy its link, paste it into SavDown, and select MP3. The extracted audio will include the original sound from that specific video.',
      },
      {
        question: 'Is the audio quality limited by the original TikTok video?',
        answer: 'Yes. TikTok typically encodes audio at 128 kbps AAC. Selecting 320 kbps in SavDown will produce a larger file, but the actual audio detail is bounded by the source bitrate.',
      },
      {
        question: 'Can I use a downloaded TikTok sound in my own video edits?',
        answer: 'Only if you have the rights to the audio. Many TikTok sounds are licensed commercial tracks. Using them in your own productions without a music licence may infringe copyright. Always verify the licence before use.',
      },
      {
        question: 'Does SavDown support TikTok short links (vm.tiktok.com) for MP3 downloads?',
        answer: 'Yes. Short links from vm.tiktok.com or vt.tiktok.com are automatically resolved to the full video URL before extraction, so you can paste them directly.',
      },
      {
        question: 'How long does converting a TikTok to MP3 take?',
        answer: 'Audio extraction is typically faster than full video downloads — most TikToks are converted in 2–4 seconds. Longer TikToks (up to 10 minutes) may take up to 10 seconds.',
      },
      {
        question: 'Can I download the original soundtrack from a TikTok Duet?',
        answer: 'Yes. The MP3 extracted from a Duet includes the full mixed audio — both the original creator\'s audio and the duetting creator\'s audio exactly as heard in the video.',
      },
      {
        question: 'Do I need to create an account to convert TikTok to MP3?',
        answer: 'A free account is needed so your credits have somewhere to live, but no payment details are. Signing up takes an email address and nothing else.',
      },
      {
        question: 'Will the MP3 have the video\'s title as its file name?',
        answer: 'SavDown names the file based on the video\'s title or creator handle. You can rename it freely after saving. Adding full ID3 metadata can be done in any music tagging app.',
      },
      {
        question: 'Can I extract MP3 from a TikTok photo slideshow?',
        answer: 'Yes. TikTok photo posts often have background music. SavDown extracts the audio track from the slideshow just like a regular video — paste the link and choose MP3.',
      },
    ],
    howTo: [
      { title: 'Copy The TikTok Link', body: 'Tap Share, then Copy Link on the video.' },
      { title: 'Paste It Above', body: 'Drop the link into SavDown.' },
      { title: 'Download The Audio', body: 'Save the sound as a clean MP3.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     7. TikTok Photo Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'tiktok-photo-downloader',
    platform: 'tiktok',
    name: 'TikTok Photo Downloader',
    shortName: 'TikTok Photos',
    headline: 'Download TikTok Photo Slideshows.',
    subheadline: 'Save every image from a TikTok photo post in full resolution.',
    description:
      'Download TikTok photo slideshows and image posts in original quality. Free and fast.',
    keywords: ['tiktok photo downloader', 'tiktok slideshow downloader', 'download tiktok images'],
    placeholder: 'https://tiktok.com/@user/photo/…',
    urlPattern: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG', 'ZIP (all images)'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'Can I download all the images in a TikTok photo slideshow at once?',
        answer: 'Yes. SavDown offers a ZIP download that bundles every image from the slideshow into a single archive. You can also save individual photos one at a time if you only need specific frames.',
      },
      {
        question: 'What resolution are TikTok photos saved at?',
        answer: 'TikTok stores photo posts at the original resolution the creator uploaded, typically 1080×1920 for portrait photos or the native aspect ratio for landscape images. SavDown downloads them at full original resolution with no compression.',
      },
      {
        question: 'What is a TikTok photo post or slideshow?',
        answer: 'TikTok allows creators to post a series of images as a slideshow, often with background music. These appear like videos in the feed but contain still photos rather than footage. SavDown detects photo posts and extracts the individual images.',
      },
      {
        question: 'Do the downloaded images include any TikTok watermark?',
        answer: 'No. SavDown downloads the original image files from TikTok\'s servers. No username overlay or TikTok branding is added to the saved images.',
      },
      {
        question: 'How do I find the link to a TikTok photo post?',
        answer: 'Open the TikTok photo post in the app, tap the Share icon, then tap Copy link. The URL format is typically tiktok.com/@username/photo/123456789.',
      },
      {
        question: 'Can I download TikTok photo slideshows on iPhone?',
        answer: 'Yes. Open Safari on your iPhone, paste the TikTok photo post link into SavDown, and tap Download. Individual JPGs save to your Photos app; the ZIP file saves to the Files app.',
      },
      {
        question: 'Does the ZIP file preserve the original slideshow order?',
        answer: 'Yes. Images inside the ZIP are numbered sequentially (01.jpg, 02.jpg, etc.) matching the order they appear in the original TikTok slideshow.',
      },
      {
        question: 'Can I also download the background music from a TikTok photo post?',
        answer: 'Yes. Use the TikTok to MP3 tool — paste the same photo post URL and choose MP3 to extract the audio background track separately from the images.',
      },
      {
        question: 'Is there a limit to how many photos I can download from a single slideshow?',
        answer: 'No. SavDown processes the entire slideshow regardless of how many images it contains. TikTok currently supports up to 35 images per post.',
      },
      {
        question: 'Do I need to be logged in to TikTok to download photo posts?',
        answer: 'Sign in with a free account, then paste the URL of any public TikTok photo post to download it.',
      },
      {
        question: 'What file format are TikTok photos saved in?',
        answer: 'Photos are saved as JPG files, which is the format TikTok uses natively. JPG is universally compatible with every device, gallery app, and image editor.',
      },
      {
        question: 'Can I download TikTok photo posts that include both images and video clips?',
        answer: 'Currently SavDown downloads the static image frames from photo posts. If a post mixes still images and short video clips, the image frames are extracted. For full video content, use the TikTok Video Downloader.',
      },
    ],
    howTo: [
      { title: 'Open The Photo Post', body: 'Tap Share, then Copy Link on the TikTok photo post.' },
      { title: 'Paste And Download', body: 'Save the images in full resolution.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     TikTok Thumbnail Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'tiktok-thumbnail-downloader',
    platform: 'tiktok',
    name: 'TikTok Thumbnail Downloader',
    shortName: 'TikTok Thumbnail',
    headline: 'Download The Cover Image From Any TikTok.',
    subheadline: 'Grab the thumbnail/cover frame TikTok generates for a video, in full resolution.',
    description:
      'Download the cover thumbnail image from any public TikTok video. Free, fast, no watermark.',
    keywords: ['tiktok thumbnail downloader', 'tiktok cover image', 'download tiktok thumbnail'],
    placeholder: 'https://tiktok.com/@user/video/…',
    urlPattern: /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'What image does the TikTok Thumbnail Downloader save?',
        answer: 'It saves the cover frame TikTok automatically generates for the video (or the custom cover the creator selected). This is the same image shown on the video\'s tile before it starts playing.',
      },
      {
        question: 'Do I need to log in to TikTok to download a thumbnail?',
        answer: 'No. Paste the public video URL into SavDown and the cover image downloads directly, no TikTok account or login required.',
      },
      {
        question: 'What resolution is the TikTok thumbnail saved at?',
        answer: 'SavDown downloads the original cover image at the resolution TikTok stores it, typically matching the video\'s native resolution (commonly 1080×1920 for portrait videos).',
      },
      {
        question: 'Does SavDown support vm.tiktok.com and vt.tiktok.com short links?',
        answer: 'Yes. Short links are automatically resolved to the full video before the cover image is extracted.',
      },
      {
        question: 'Can I download the thumbnail from a private TikTok video?',
        answer: 'No. Only publicly visible videos can be processed. Private and friend-only videos are not accessible without TikTok account authentication.',
      },
      {
        question: 'What file format is the thumbnail saved in?',
        answer: 'The thumbnail is saved as a JPG file, which is universally compatible with every device and image viewer.',
      },
      {
        question: 'Why would I want to download a TikTok cover image?',
        answer: 'Creators reference cover designs for inspiration, archive cover art for their own videos, or save a cover to reuse as a thumbnail on another platform (with appropriate rights).',
      },
      {
        question: 'Does SavDown store the thumbnail after I download it?',
        answer: 'No. The image is fetched directly from TikTok\'s servers and streamed to your browser. Nothing is retained on SavDown\'s infrastructure.',
      },
    ],
    howTo: [
      { title: 'Copy The TikTok Link', body: 'Tap Share, then Copy Link on the video.' },
      { title: 'Paste It Above', body: 'Drop the link into SavDown.' },
      { title: 'Download The Cover', body: 'Save the thumbnail image to your device.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     8. Instagram Reels Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'instagram-reels-downloader',
    platform: 'instagram',
    name: 'Instagram Reels Downloader',
    shortName: 'Instagram Reels',
    headline: 'Save Instagram Reels In HD.',
    subheadline: 'Reels, posts, and IGTV, all in one clean tool.',
    description:
      'Download Instagram Reels, video posts, and IGTV in HD MP4. No login, no watermark, no ads.',
    keywords: ['instagram reels downloader', 'download instagram reels', 'ig reel downloader'],
    placeholder: 'https://instagram.com/reel/…',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|reels|p|tv)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 1080p', 'MP4 720p'],
    featured: true,
    trending: true,
    faq: [
      {
        question: 'Do I need to log in to Instagram to download Reels?',
        answer: 'No. SavDown downloads public Instagram Reels without any Instagram login or SavDown account. Simply paste the Reel URL and download.',
      },
      {
        question: 'Does SavDown add a watermark to downloaded Instagram Reels?',
        answer: 'No watermark is ever added by SavDown. The MP4 you receive is the clean original video with no logo, username overlay, or branding from SavDown or Instagram.',
      },
      {
        question: 'What resolution can I download Instagram Reels in?',
        answer: 'SavDown offers up to 1080p Full HD, which is the maximum resolution Instagram serves for Reels. A 720p option is also available for smaller file sizes.',
      },
      {
        question: 'Does this tool also work for regular Instagram video posts and IGTV?',
        answer: 'Yes. SavDown handles instagram.com/reel/…, instagram.com/p/… (video posts), and instagram.com/tv/… (IGTV) links with the same tool automatically.',
      },
      {
        question: 'How do I copy the link to an Instagram Reel?',
        answer: 'On mobile: open the Reel, tap the paper-plane share icon, then tap Copy link. On desktop: click the three-dot menu on the Reel, then Copy link. Both formats work in SavDown.',
      },
      {
        question: 'Can I download Instagram Reels on an iPhone without an app?',
        answer: 'Yes. Open Safari on your iPhone, paste the Reel link into SavDown, tap Download, and the MP4 saves to your Files app. From there you can share it to Photos or any other app.',
      },
      {
        question: 'Why can I not download Reels from private Instagram accounts?',
        answer: 'Private accounts restrict their content to approved followers only. SavDown cannot authenticate as a follower, so private Reels are inaccessible. Only publicly posted Reels can be downloaded.',
      },
      {
        question: 'Can I download Instagram Reels on Android?',
        answer: 'Yes. Open Chrome or any browser on Android, paste the Reel URL into SavDown, tap Download, and the file saves to your Downloads folder. No third-party app or APK is needed.',
      },
      {
        question: 'Does SavDown support instagram.com/reels/ explore page links?',
        answer: 'SavDown works with direct links to individual Reels. If you are browsing the Reels explore tab, tap on a specific Reel first to get its unique URL, then copy and paste that link.',
      },
      {
        question: 'How long does it take to download an Instagram Reel?',
        answer: 'Most Reels are processed and ready in under 5 seconds. Longer Reels (up to 90 seconds) or high-traffic periods may take up to 10 seconds.',
      },
      {
        question: 'Can I re-post a downloaded Instagram Reel on another platform?',
        answer: 'Only if you are the original creator or have explicit permission. Re-posting another creator\'s Reel without credit or consent may infringe their copyright and violate platform terms.',
      },
      {
        question: 'Does SavDown store the Reels I download?',
        answer: 'No. Files are streamed directly to your browser and never stored on SavDown servers. No record of which Reels you download is retained.',
      },
      {
        question: 'Can I extract just the audio from an Instagram Reel as MP3?',
        answer: 'The Reels Downloader saves the full video. To extract only the audio, download the MP4 first and then use a free tool like VLC or an online audio converter to strip the audio track.',
      },
      {
        question: 'What should I do if a Reel link returns an error?',
        answer: 'Confirm the Reel is still publicly visible and that you copied the full URL including the unique ID. Reels that have been deleted, archived, or set to private after you found the link will no longer be accessible.',
      },
    ],
    howTo: [
      { title: 'Open The Reel', body: 'Tap the paper airplane icon → Copy Link.' },
      { title: 'Paste It Above', body: 'SavDown detects Reels, posts, and IGTV automatically.' },
      { title: 'Download HD', body: 'Save to your device in seconds.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     9. Instagram Story Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'instagram-story-downloader',
    platform: 'instagram',
    name: 'Instagram Story Downloader',
    shortName: 'Instagram Stories',
    headline: 'Save Instagram Stories Before They Vanish.',
    subheadline: 'Download public Instagram Stories as video or images, anonymously.',
    description:
      'Download public Instagram Stories in HD as video or images. No login, no watermark, free.',
    keywords: ['instagram story downloader', 'download instagram stories', 'ig story saver'],
    placeholder: 'https://instagram.com/stories/username/…',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/(stories|s)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'JPG'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'Will the Instagram account owner know I saved their Story?',
        answer: 'No. SavDown downloads public Stories server-side without interacting with the Instagram app or triggering any in-app notification. The account owner will not receive a screenshot or download alert.',
      },
      {
        question: 'Can I download Stories from private Instagram accounts?',
        answer: 'Only Stories from public accounts are accessible. Private accounts restrict their content to approved followers, so SavDown cannot retrieve those Stories without authentication.',
      },
      {
        question: 'How long do Instagram Stories stay available to download?',
        answer: 'Instagram Stories expire after 24 hours by default. Once expired, they are no longer publicly accessible. Download any Story you want to keep before the 24-hour window closes.',
      },
      {
        question: 'Can I download Story Highlights, or only active Stories?',
        answer: 'Both active Stories and pinned Story Highlights are supported. Highlights have permanent URLs and can be downloaded at any time after the creator pins them.',
      },
      {
        question: 'In what format are Instagram Stories saved?',
        answer: 'Video Stories are saved as MP4 HD files. Image Stories (photos) are saved as JPG. SavDown automatically detects the Story type and serves the correct format.',
      },
      {
        question: 'Can I download all Stories from a profile at once?',
        answer: 'Paste the public profile link or individual Story URL. SavDown lists all currently active Stories for that profile so you can download them individually or all at once.',
      },
      {
        question: 'Do downloaded Instagram Stories include music or stickers?',
        answer: 'Yes. The downloaded file is the fully rendered Story video that Instagram serves — it includes background music, text overlays, stickers, and GIFs exactly as the creator published it.',
      },
      {
        question: 'Does SavDown add a watermark to downloaded Stories?',
        answer: 'No. Downloaded Stories are clean originals with no SavDown logo or Instagram branding added.',
      },
      {
        question: 'Can I download Instagram Stories on a PC or Mac?',
        answer: 'Yes. Open any browser on your computer, navigate to SavDown, paste the Stories URL, and download. MP4 and JPG files save directly to your Downloads folder.',
      },
      {
        question: 'Do I need to install an app or browser extension to download Stories?',
        answer: 'No installation of any kind is required. SavDown runs entirely in your browser on any device.',
      },
      {
        question: 'Can I download Stories that were shared as a re-post from another account?',
        answer: 'Yes. Re-shared Stories are rendered the same way as original Stories from Instagram\'s perspective. The downloaded file will include the re-share frame showing the original post.',
      },
      {
        question: 'What happens if a Story has already expired when I try to download it?',
        answer: 'Expired Stories are no longer served by Instagram, so SavDown will return an error. If the creator has saved it as a Highlight, you can still access it via the Highlight URL.',
      },
      {
        question: 'Is downloading Instagram Stories legal?',
        answer: 'Instagram\'s Terms of Service prohibit scraping or downloading content outside authorised methods. However, saving public content for personal, non-commercial reference is widely practised. Always respect the creator\'s privacy and intellectual property rights.',
      },
    ],
    howTo: [
      { title: 'Copy The Profile Or Story Link', body: 'Grab the link to the public profile or Story.' },
      { title: 'Paste It Above', body: 'SavDown finds the active Stories automatically.' },
      { title: 'Download', body: 'Save each Story as video or image.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     10. Instagram Photo Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'instagram-photo-downloader',
    platform: 'instagram',
    name: 'Instagram Photo Downloader',
    shortName: 'Instagram Photos',
    headline: 'Download Instagram Photos In Full Resolution.',
    subheadline: 'Save single photos and full carousels from any public post.',
    description:
      'Download Instagram photos and carousels in original quality. No login, no watermark, free.',
    keywords: ['instagram photo downloader', 'download instagram photos', 'ig carousel downloader'],
    placeholder: 'https://instagram.com/p/…',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG', 'ZIP (carousel)'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'Can I download an entire Instagram carousel in one click?',
        answer: 'Yes. SavDown detects multi-photo carousel posts and offers a single ZIP download that contains every image in the post at full resolution, in the original order.',
      },
      {
        question: 'What resolution are Instagram photos downloaded at?',
        answer: 'SavDown fetches the highest-resolution version Instagram stores, typically 1080×1350 (portrait), 1080×1080 (square), or 1080×608 (landscape) depending on the original upload. This is the full-size version, not a thumbnail.',
      },
      {
        question: 'Do I need to log in to download Instagram photos?',
        answer: 'No login is required for public posts. Any instagram.com/p/… link from a public profile can be downloaded by pasting the URL directly into SavDown.',
      },
      {
        question: 'Does SavDown compress or alter the photos during download?',
        answer: 'No. SavDown retrieves the file directly from Instagram\'s CDN and passes it to you unaltered. The JPEG quality and dimensions are identical to what Instagram stores on its servers.',
      },
      {
        question: 'Can I download photos from private Instagram accounts?',
        answer: 'Only photos from public accounts are accessible. Private account content requires authentication that SavDown does not perform.',
      },
      {
        question: 'How do I get the link to an Instagram photo post?',
        answer: 'On mobile, tap the three-dot menu on the post, then Copy link. On desktop, click the three dots, then Copy link. The URL will look like instagram.com/p/SHORTCODE.',
      },
      {
        question: 'Can I download Instagram photos on my iPhone without an app?',
        answer: 'Yes. In Safari on iPhone, paste the Instagram post link into SavDown, tap Download, and the JPG saves to your Files app. Move it to Photos from there if needed.',
      },
      {
        question: 'Are the EXIF metadata and original file properties preserved?',
        answer: 'Instagram strips most EXIF metadata (camera model, GPS, etc.) when photos are uploaded. The downloaded JPG will have the same metadata state as what Instagram stores — typically minimal EXIF data.',
      },
      {
        question: 'Does the ZIP file for a carousel maintain the original post order?',
        answer: 'Yes. Images in the ZIP are numbered sequentially (01.jpg, 02.jpg, etc.) matching the left-to-right swipe order of the original carousel post.',
      },
      {
        question: 'Can I download Instagram photos from a tagged post?',
        answer: 'Any public post with a direct instagram.com/p/… URL is downloadable, including posts you are tagged in. Copy the link from the post and paste it into SavDown.',
      },
      {
        question: 'What is the difference between this tool and the Instagram Profile Picture Downloader?',
        answer: 'The Instagram Photo Downloader saves photos from specific posts (feed and carousel posts). The Profile Picture Downloader is for saving a user\'s circular avatar photo at full HD size. Both are separate tools on SavDown.',
      },
      {
        question: 'Does SavDown store the Instagram photos I download?',
        answer: 'No. Files are fetched and streamed directly to your browser. SavDown does not store or cache any Instagram photos on its servers.',
      },
      {
        question: 'Can I download photos from Instagram Reels posts that also contain images?',
        answer: 'If a post URL is instagram.com/p/… it will be treated as a photo or carousel post. If it is instagram.com/reel/… SavDown will download it as a video. Use the appropriate tool for each content type.',
      },
    ],
    howTo: [
      { title: 'Copy The Post Link', body: 'Tap the three dots on the post, then Copy Link.' },
      { title: 'Paste And Download', body: 'Save single photos or full carousels in original quality.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     11. Instagram Profile Picture Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'instagram-profile-picture-downloader',
    platform: 'instagram',
    name: 'Instagram Profile Picture Downloader',
    shortName: 'Instagram DP',
    headline: 'View And Save Instagram Profile Pictures In HD.',
    subheadline: 'Zoom in and download any public profile photo in full size.',
    description:
      'View and download Instagram profile pictures (DP) in HD. Free, no login, no app.',
    keywords: ['instagram profile picture downloader', 'instagram dp downloader', 'view instagram dp'],
    placeholder: 'https://instagram.com/username',
    urlPattern: /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG HD'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'Can I view and download an Instagram profile picture in full size?',
        answer: 'Yes. Instagram crops and shrinks profile photos to a small circle in the app. SavDown retrieves the full-resolution version Instagram stores — typically 320×320 HD — and lets you save it as a JPG.',
      },
      {
        question: 'Do I need to follow the account to download their profile picture?',
        answer: 'No. SavDown downloads public profile pictures without any Instagram login, so there is no need to follow or even have an account.',
      },
      {
        question: 'Does the account owner get notified when I view or download their profile photo?',
        answer: 'No. Profile pictures are publicly accessible metadata on Instagram. SavDown retrieves them server-side without interacting with the Instagram app, so no notification or view is triggered.',
      },
      {
        question: 'Can I download profile pictures from private Instagram accounts?',
        answer: 'Even private accounts have a visible (though small) profile picture accessible publicly. SavDown downloads this public thumbnail at the highest available resolution Instagram exposes without authentication.',
      },
      {
        question: 'What is the maximum resolution for an Instagram profile picture?',
        answer: 'Instagram caps profile photos at 320×320 pixels on its public API. SavDown downloads at this full 320×320 resolution. The circular crop you see in the app is just a display effect — the actual stored image is square.',
      },
      {
        question: 'How do I use this tool — do I enter a username or a URL?',
        answer: 'Both work. You can paste the full profile URL (instagram.com/username) or just type the username handle. SavDown resolves either input to the correct profile.',
      },
      {
        question: 'Why do I want to download a profile picture in full size?',
        answer: 'Common uses include verifying the identity of a contact, reverse image searching for catfishing research, saving a profile photo for a contact card, or archiving a creator\'s branding for design reference.',
      },
      {
        question: 'Does SavDown work for Instagram business and creator account profile pictures?',
        answer: 'Yes. Personal, creator, and business accounts all use the same profile picture system. SavDown treats them identically.',
      },
      {
        question: 'Can I download multiple profile pictures at once?',
        answer: 'The tool processes one profile at a time. Enter each username separately. Batch profile picture downloads are planned for an upcoming Pro feature.',
      },
      {
        question: 'Is downloading someone\'s Instagram profile picture legal?',
        answer: 'Profile pictures on public accounts are intentionally public-facing, but they are the intellectual property of the account owner. Downloading for personal reference or identification is generally accepted. Using someone\'s profile photo commercially or impersonating them is illegal in most jurisdictions.',
      },
      {
        question: 'What format is the downloaded profile picture in?',
        answer: 'Profile pictures are saved as JPG, which is the format Instagram stores them in. The file is saved with a descriptive name based on the username.',
      },
      {
        question: 'Does this work for Instagram accounts that have no posts?',
        answer: 'Yes. As long as the account exists and has set a profile photo, SavDown can retrieve it regardless of whether the account has any posts.',
      },
    ],
    howTo: [
      { title: 'Enter The Username Or Profile Link', body: 'Paste the public profile URL or handle.' },
      { title: 'Download The Picture', body: 'Save the profile photo in full HD.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     12. Facebook Video Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'facebook-video-downloader',
    platform: 'facebook',
    name: 'Facebook Video Downloader',
    shortName: 'Facebook Video',
    headline: 'Download Facebook Videos, HD Or SD.',
    subheadline: 'Public videos, Reels, and Watch, all supported.',
    description:
      'Download Facebook videos in HD or SD. Works with public posts, Reels, Watch, and fb.watch shortlinks.',
    keywords: ['facebook video downloader', 'download facebook video', 'fb video downloader'],
    placeholder: 'https://facebook.com/watch/?v=…',
    urlPattern: /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD'],
    featured: true,
    trending: false,
    faq: [
      {
        question: 'Can I download Facebook videos without logging in?',
        answer: 'Yes. SavDown downloads publicly visible Facebook videos with no Facebook account or SavDown login required. Just paste the video link and download.',
      },
      {
        question: 'Does SavDown support fb.watch short links?',
        answer: 'Yes. Short links starting with fb.watch are automatically expanded to the full Facebook video URL and processed identically to standard facebook.com links.',
      },
      {
        question: 'What is the difference between HD and SD for Facebook videos?',
        answer: 'Facebook encodes most videos at two quality levels. HD is typically 720p or higher with better visual clarity; SD is a lower-bitrate version (usually 360p–480p) that uses less storage and data. Choose HD for quality and SD for smaller file sizes.',
      },
      {
        question: 'Can I download private Facebook videos?',
        answer: 'No. Only publicly viewable videos can be downloaded. Videos shared with Friends only, or restricted to specific groups without public access, require authentication that SavDown does not perform.',
      },
      {
        question: 'How do I get the link to a Facebook video?',
        answer: 'On mobile: tap the three-dot menu on the video post and select Copy link. On desktop: click the timestamp on the post to open the individual post page, then copy the URL from the address bar. Both methods give a valid link for SavDown.',
      },
      {
        question: 'Does this tool work with Facebook Watch videos?',
        answer: 'Yes. Videos found on facebook.com/watch/ are supported. Copy the URL from the Watch player page and paste it into SavDown.',
      },
      {
        question: 'Are Facebook Reels supported by the Facebook Video Downloader?',
        answer: 'Yes. Facebook Reels are treated as standard Facebook videos. For Reels specifically, the dedicated Facebook Reels Downloader tool is also available and optimised for short-form vertical content.',
      },
      {
        question: 'Can I download Facebook Live replays?',
        answer: 'Yes. Once a Facebook Live broadcast ends and the replay is publicly posted, it becomes a standard Facebook video. Paste the replay link into SavDown and download it in HD or SD.',
      },
      {
        question: 'Does SavDown work with facebook.com/video/… and m.facebook.com/… links?',
        answer: 'Yes. SavDown handles all common Facebook video URL formats including desktop (facebook.com), mobile (m.facebook.com), and web app (web.facebook.com) variants.',
      },
      {
        question: 'Will downloading a Facebook video notify the original poster?',
        answer: 'No. SavDown fetches the video server-side without any interaction with the Facebook app or API that would trigger notifications to the post creator.',
      },
      {
        question: 'Does SavDown add a watermark to downloaded Facebook videos?',
        answer: 'No. The MP4 file you receive is the clean original with no SavDown branding, no Facebook watermark, and no username overlay added.',
      },
      {
        question: 'How large are downloaded Facebook video files?',
        answer: 'File size depends on video length and quality. As a rough guide: a 5-minute HD video is typically 50–150 MB; the same video in SD is 10–40 MB. Facebook\'s own compression keeps file sizes lower than raw uncompressed video.',
      },
      {
        question: 'Can I download videos from Facebook Groups?',
        answer: 'Public Facebook Group videos are supported if the post is publicly accessible. Videos in private or secret groups are restricted and cannot be downloaded without authentication.',
      },
      {
        question: 'Is it legal to download Facebook videos?',
        answer: 'Facebook\'s Terms of Service prohibit downloading content without their express permission outside official features. However, downloading your own videos or content you are licensed to use is generally accepted. Always respect copyright and the original creator\'s rights.',
      },
    ],
    howTo: [
      { title: 'Copy The Video URL', body: 'Click the three dots on the video → Copy link.' },
      { title: 'Paste Into SavDown', body: 'Any facebook.com or fb.watch link works.' },
      { title: 'Pick HD Or SD', body: 'Download the quality you need.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     13. Facebook Reels Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'facebook-reels-downloader',
    platform: 'facebook',
    name: 'Facebook Reels Downloader',
    shortName: 'Facebook Reels',
    headline: 'Download Facebook Reels In HD.',
    subheadline: 'Save short-form Facebook Reels without the watermark.',
    description:
      'Download Facebook Reels in HD MP4. No watermark, works with any public Reel.',
    keywords: ['facebook reels downloader', 'download facebook reels', 'fb reels downloader'],
    placeholder: 'https://facebook.com/reel/…',
    urlPattern: /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'Does SavDown add a watermark when downloading Facebook Reels?',
        answer: 'No. The MP4 file you save is the clean original with no SavDown logo, no Facebook watermark, and no creator username burned into the video.',
      },
      {
        question: 'Do I need a Facebook account to download Facebook Reels?',
        answer: 'No Facebook account or SavDown registration is required. Paste the public Reel link and download instantly.',
      },
      {
        question: 'What resolution are Facebook Reels downloaded in?',
        answer: 'SavDown downloads Facebook Reels at the highest resolution Facebook provides for the Reel — typically HD (720p or 1080p for vertical content). An SD option is also available for smaller file sizes.',
      },
      {
        question: 'How do I find the link to a Facebook Reel?',
        answer: 'On mobile: open the Reel, tap the three-dot menu or share icon, then Copy link. On desktop: click the Reel to open it in the player, then copy the URL from the address bar. The URL will contain /reel/ followed by a numeric ID.',
      },
      {
        question: 'What is the difference between the Facebook Reels Downloader and the Facebook Video Downloader?',
        answer: 'Both tools support the same underlying Facebook video infrastructure. The Reels Downloader is optimised for short-form vertical Reels (under 90 seconds) and provides a dedicated entry point. The Video Downloader handles all formats including longer Watch videos and Live replays.',
      },
      {
        question: 'Can I download Reels from Facebook Pages?',
        answer: 'Yes. Public Facebook Page Reels work exactly like personal profile Reels. Copy the Reel link from the Page and paste it into SavDown.',
      },
      {
        question: 'Does SavDown support facebook.com/reel/ and fb.watch/ Reel short links?',
        answer: 'Yes. Both the full facebook.com/reel/ID format and fb.watch short links that point to Reels are automatically detected and supported.',
      },
      {
        question: 'Can I download Facebook Reels on Android or iPhone?',
        answer: 'Yes. Open your mobile browser (Chrome on Android or Safari on iPhone), paste the Reel link into SavDown, select your quality, and the MP4 downloads directly to your device storage.',
      },
      {
        question: 'Are Facebook Reels from Groups downloadable?',
        answer: 'Only Reels from public Groups are accessible. Reels in private or closed Groups require authentication and cannot be downloaded.',
      },
      {
        question: 'Will downloading a Facebook Reel notify the creator?',
        answer: 'No. SavDown fetches the video server-side and does not interact with Facebook in a way that triggers creator notifications.',
      },
      {
        question: 'Can I re-share a downloaded Facebook Reel on another platform?',
        answer: 'You may re-share content you created yourself. Re-sharing another creator\'s Reel requires their permission. Downloading for personal offline viewing is generally acceptable; commercial redistribution is not.',
      },
      {
        question: 'How long does it take to download a Facebook Reel?',
        answer: 'Facebook Reels are short by design (15–90 seconds), so most downloads complete in 2–5 seconds on a standard broadband connection.',
      },
      {
        question: 'Does the Facebook Reels Downloader also extract audio as MP3?',
        answer: 'The Reels Downloader saves the full video as MP4. To extract just the audio, download the MP4 and use a free converter like VLC to strip the audio track as MP3.',
      },
    ],
    howTo: [
      { title: 'Copy The Reel Link', body: 'Open the Reel, tap Share, then Copy link.' },
      { title: 'Paste And Download', body: 'Save the Reel in HD or SD.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     14. Pinterest Video Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'pinterest-video-downloader',
    platform: 'pinterest',
    name: 'Pinterest Video Downloader',
    shortName: 'Pinterest Video',
    headline: 'Save Pinterest Videos And Idea Pins.',
    subheadline: 'From aesthetic reels to recipe videos, save what inspires you.',
    description:
      'Download Pinterest videos and Idea Pins in HD MP4. Works with any pin.it or pinterest.com URL.',
    keywords: ['pinterest video downloader', 'pinterest downloader', 'idea pin downloader'],
    placeholder: 'https://pinterest.com/pin/… or https://pin.it/…',
    urlPattern: /^(https?:\/\/)?(www\.)?(pinterest\.com|pin\.it)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD'],
    featured: true,
    trending: false,
    faq: [
      {
        question: 'Can I download Pinterest videos without a Pinterest account?',
        answer: 'Yes. SavDown downloads public Pinterest videos with no Pinterest login or SavDown registration required. Paste any pinterest.com or pin.it link and download immediately.',
      },
      {
        question: 'Does SavDown support pin.it short links?',
        answer: 'Yes. Short links from pin.it are automatically expanded to the full pinterest.com URL and processed identically. Both link formats work seamlessly.',
      },
      {
        question: 'What video quality can I download from Pinterest?',
        answer: 'SavDown offers HD (the highest resolution Pinterest provides for the pin) and SD (a lower-bitrate version for smaller file sizes). Most Pinterest videos are available in HD at up to 1080p.',
      },
      {
        question: 'Are Pinterest Idea Pins (Story Pins) supported?',
        answer: 'Yes. Most Idea Pins that contain video content are supported. Paste the Idea Pin URL and SavDown will extract the video frames available for download.',
      },
      {
        question: 'How do I get the link to a Pinterest video pin?',
        answer: 'On mobile: tap the share icon on the pin, then Copy link. On desktop: click the pin to open it, then copy the URL from the address bar. Both pinterest.com/pin/ID and pin.it/shortcode formats work.',
      },
      {
        question: 'Does downloading Pinterest videos work on iPhone and Android?',
        answer: 'Yes. Open your mobile browser, paste the Pinterest pin link into SavDown, tap Download, and the MP4 saves to your device storage — no app or extension needed.',
      },
      {
        question: 'Does SavDown add a watermark to downloaded Pinterest videos?',
        answer: 'No. The video file you save is the clean original with no SavDown logo or Pinterest branding overlaid.',
      },
      {
        question: 'Can I download videos from Pinterest boards?',
        answer: 'SavDown processes individual pin URLs. To download multiple pins from a board, open each video pin individually, copy its link, and paste it into SavDown. Batch board downloads are on the Pro feature roadmap.',
      },
      {
        question: 'Why do some Pinterest pins not have a downloadable video?',
        answer: 'Some pins link out to third-party websites (YouTube embeds, Vimeo, external sites) rather than hosting a video directly on Pinterest. For those, use the appropriate platform-specific tool on SavDown instead.',
      },
      {
        question: 'Can I download Pinterest videos for use in my own projects?',
        answer: 'Only if you have the rights to the content. Pinterest videos are owned by their creators or the brands that posted them. Personal offline viewing is generally acceptable; using the video commercially without a licence or the creator\'s consent is not.',
      },
      {
        question: 'Does SavDown work with pinterest.com country-specific domains like pinterest.co.uk?',
        answer: 'Yes. Regional Pinterest domains (pinterest.co.uk, pinterest.de, pinterest.fr, etc.) all resolve to the same content. SavDown handles all regional variants of the Pinterest URL automatically.',
      },
      {
        question: 'How large is a typical downloaded Pinterest video file?',
        answer: 'Pinterest video files are typically compact. A 30-second HD pin is roughly 5–15 MB; a 3-minute how-to video in HD is typically 30–80 MB, depending on the complexity of the content.',
      },
      {
        question: 'Does SavDown store Pinterest video files after download?',
        answer: 'No. SavDown streams the file directly from Pinterest\'s CDN to your browser without retaining a copy on its own servers.',
      },
    ],
    howTo: [
      { title: 'Open The Pin', body: 'Tap Share → Copy Link.' },
      { title: 'Paste And Download', body: 'SavDown supports pinterest.com and pin.it links.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     15. Pinterest Image Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'pinterest-image-downloader',
    platform: 'pinterest',
    name: 'Pinterest Image Downloader',
    shortName: 'Pinterest Images',
    headline: 'Save Pinterest Images In Full Size.',
    subheadline: 'Download any pin image in its original, highest resolution.',
    description:
      'Download Pinterest images and pins in original resolution. Free, fast, no watermarks.',
    keywords: ['pinterest image downloader', 'download pinterest images', 'save pinterest pin'],
    placeholder: 'https://pinterest.com/pin/… or https://pin.it/…',
    urlPattern: /^(https?:\/\/)?(www\.)?(pinterest\.com|pin\.it)\/.+/i,
    outputKind: 'image',
    supportedFormats: ['JPG', 'PNG'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'What resolution will I get when downloading a Pinterest image?',
        answer: 'SavDown fetches the original, highest-resolution version that Pinterest stores for the pin — typically the full image the creator or brand uploaded, which can range from 600px wide up to several thousand pixels depending on the source.',
      },
      {
        question: 'Do I need a Pinterest account to download pin images?',
        answer: 'No. All public pins are downloadable by pasting the URL into SavDown. No Pinterest login and no SavDown account are required.',
      },
      {
        question: 'What image formats does SavDown support for Pinterest downloads?',
        answer: 'Pinterest images are stored as JPG or PNG depending on what the original creator uploaded. SavDown serves whichever format the original pin uses — you get the native file with no format conversion.',
      },
      {
        question: 'How do I copy the link to a Pinterest image pin?',
        answer: 'On mobile: tap the share icon on the pin, then Copy link. On desktop: click the pin to expand it, then copy the URL from your browser\'s address bar. pin.it short links also work.',
      },
      {
        question: 'Can I download images from Pinterest boards?',
        answer: 'SavDown downloads one pin at a time. Open any pin from a board, copy its individual URL, and paste it into SavDown. For bulk board downloads, a Pro batch feature is on the roadmap.',
      },
      {
        question: 'Does SavDown compress or alter the downloaded Pinterest image?',
        answer: 'No. The image is fetched directly from Pinterest\'s CDN and passed to your browser unmodified. File quality, dimensions, and colour profile are identical to the original stored version.',
      },
      {
        question: 'Can I use downloaded Pinterest images commercially?',
        answer: 'Only if the image is licensed for commercial use (e.g. Creative Commons, royalty-free stock). Most pinned images are copyrighted by the original photographer or brand. Always verify the licence before any commercial use.',
      },
      {
        question: 'Does SavDown work with pin.it short links for image pins?',
        answer: 'Yes. Short links from pin.it resolve to the full pinterest.com pin URL automatically. Paste the short link directly — no manual expansion needed.',
      },
      {
        question: 'Can I save Pinterest infographics and tall/long-form pin images at full size?',
        answer: 'Yes. Infographics and tall pins are often the most valuable format for designers and researchers. SavDown downloads them at the full dimensions Pinterest stores, including very tall vertical pins without any cropping.',
      },
      {
        question: 'Does downloading a Pinterest image notify the pin creator?',
        answer: 'No. Pinterest image files are publicly served static assets. SavDown fetches them directly from Pinterest\'s CDN without triggering any notification or view count on the creator\'s account.',
      },
      {
        question: 'What is the difference between the Pinterest Image Downloader and the Pinterest Video Downloader?',
        answer: 'The Image Downloader handles static photo and graphic pins (JPG/PNG). The Video Downloader handles pins that contain video content or Idea Pins with motion. SavDown detects the pin type automatically when you paste a URL.',
      },
      {
        question: 'Can I download GIF images pinned on Pinterest?',
        answer: 'Pinterest converts most uploaded GIFs to MP4 for display. If the original pin is a GIF, SavDown will download the MP4 version Pinterest stores. To convert it back to GIF, use any free MP4-to-GIF tool after downloading.',
      },
      {
        question: 'Does SavDown store Pinterest images after I download them?',
        answer: 'No. The image is streamed directly to your device. SavDown does not retain any copy on its servers after your download is complete.',
      },
    ],
    howTo: [
      { title: 'Open The Pin', body: 'Tap Share, then Copy Link on the pin.' },
      { title: 'Paste And Download', body: 'Save the image in full resolution.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     16. X Video Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'x-video-downloader',
    platform: 'x',
    name: 'X Video Downloader',
    shortName: 'X (Twitter) Video',
    headline: 'Save Videos From X.com, Fast.',
    subheadline: 'Formerly Twitter, same tool, same speed.',
    description:
      'Download videos from X (Twitter) in HD or SD. Works with x.com and twitter.com URLs.',
    keywords: ['x video downloader', 'twitter video downloader', 'download x video'],
    placeholder: 'https://x.com/user/status/…',
    urlPattern: /^(https?:\/\/)?(www\.|mobile\.)?(x\.com|twitter\.com)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['MP4 HD', 'MP4 SD', 'GIF'],
    featured: true,
    trending: true,
    faq: [
      {
        question: 'Does SavDown work with both x.com and twitter.com links?',
        answer: 'Yes. SavDown accepts links from both x.com and the legacy twitter.com domain. Both redirect to the same content and are handled identically — just paste whichever URL you have.',
      },
      {
        question: 'Can I download X (Twitter) videos without an account?',
        answer: 'Yes. No X account or SavDown login is required. Paste any public post URL containing a video and download it immediately.',
      },
      {
        question: 'What video quality options are available for X videos?',
        answer: 'SavDown offers HD (the highest bitrate X provides, typically 1280×720 or 1920×1080) and SD (a lower-bitrate version for smaller files). X encodes most videos at multiple quality levels; SavDown lets you choose.',
      },
      {
        question: 'Can I also download X GIFs as video files?',
        answer: 'Yes. X stores GIFs as MP4 files internally. SavDown can download them as MP4 or convert them back to a true animated GIF file — choose whichever format suits your use case.',
      },
      {
        question: 'How do I get the link to an X post with a video?',
        answer: 'On mobile: tap the share icon on the post (the upload arrow), then Copy link. On desktop: click the three-dot menu on the post, then Copy link. The URL format is x.com/username/status/NUMERIC_ID.',
      },
      {
        question: 'Does downloading an X video notify the account that posted it?',
        answer: 'No. SavDown fetches the video file directly from X\'s CDN without interacting with the X app or API in any way that generates notifications for the original poster.',
      },
      {
        question: 'Does SavDown add a watermark to downloaded X videos?',
        answer: 'No. The MP4 you receive is the clean original stream with no SavDown branding and no X username overlay added.',
      },
      {
        question: 'Can I download videos from X (Twitter) Spaces recordings?',
        answer: 'Recorded X Spaces are audio-only and are hosted differently from standard video posts. They are not currently supported by the video downloader. Standard tweet videos, including videos posted in replies, are fully supported.',
      },
      {
        question: 'Can I download videos from protected (private) X accounts?',
        answer: 'No. Protected X accounts restrict their posts to approved followers. SavDown cannot authenticate as a follower, so protected account videos are inaccessible.',
      },
      {
        question: 'Does SavDown support mobile.x.com and mobile.twitter.com links?',
        answer: 'Yes. Mobile-formatted X/Twitter links are automatically normalised to the standard URL format before processing. All variants — desktop, mobile, and legacy — are supported.',
      },
      {
        question: 'How large are downloaded X video files?',
        answer: 'X compresses videos aggressively. A typical 30-second HD video is 5–20 MB; a 2-minute HD clip is roughly 20–80 MB. SD versions are 50–70% smaller.',
      },
      {
        question: 'Can I download videos from X threads?',
        answer: 'Yes. Each tweet in a thread has its own unique status URL. Copy the link to the specific tweet that contains the video (not the thread root) and paste it into SavDown.',
      },
      {
        question: 'Is it legal to download X videos?',
        answer: 'X\'s Terms of Service prohibit reproducing content outside the platform without authorisation. Downloading for personal archival or research is widely practised. Always respect the creator\'s copyright and do not redistribute downloaded videos commercially without permission.',
      },
      {
        question: 'Does SavDown store X videos after downloading them?',
        answer: 'No. The file is streamed directly from X\'s servers to your browser. SavDown retains no copy and does not log which posts you access.',
      },
    ],
    howTo: [
      { title: 'Copy The Tweet URL', body: 'Click the share icon → Copy link.' },
      { title: 'Paste Into SavDown', body: 'x.com and twitter.com both work.' },
      { title: 'Download', body: 'Grab the video in HD, SD, or as a GIF.' },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
     17. X GIF Downloader
  ───────────────────────────────────────────────────────────────── */
  {
    slug: 'x-gif-downloader',
    platform: 'x',
    name: 'X GIF Downloader',
    shortName: 'X (Twitter) GIF',
    headline: 'Download GIFs From X As GIF Or MP4.',
    subheadline: 'Grab any GIF from X (Twitter) and save it as a true GIF or MP4.',
    description:
      'Download GIFs from X (Twitter) as a real GIF or MP4. Free, fast, no watermarks.',
    keywords: ['x gif downloader', 'twitter gif downloader', 'download twitter gif'],
    placeholder: 'https://x.com/user/status/…',
    urlPattern: /^(https?:\/\/)?(www\.|mobile\.)?(x\.com|twitter\.com)\/.+/i,
    outputKind: 'video',
    supportedFormats: ['GIF', 'MP4'],
    featured: false,
    trending: false,
    faq: [
      {
        question: 'Do I get a real animated GIF file, or just an MP4?',
        answer: 'You get both options. SavDown can convert the clip into a true animated .gif file, or you can keep it as the original MP4 that X stores internally. Choose GIF for maximum compatibility with image platforms and chat apps; choose MP4 for better quality and smaller file size.',
      },
      {
        question: 'Why does X store GIFs as MP4 rather than .gif files?',
        answer: 'X converts uploaded GIFs to MP4 because MP4 with H.264 encoding is 5–10x smaller than an equivalent GIF file and plays smoothly on all devices without the colour limitations of the GIF format. SavDown gives you the choice of which format to save.',
      },
      {
        question: 'Does SavDown work with both x.com and twitter.com GIF links?',
        answer: 'Yes. Both x.com/username/status/ID and twitter.com/username/status/ID formats are supported. Paste whichever link you have and SavDown handles it.',
      },
      {
        question: 'Do I need an X account to download GIFs from X?',
        answer: 'No. SavDown downloads public X GIFs without any authentication. No X account and no SavDown registration are required.',
      },
      {
        question: 'How do I tell if an X post contains a GIF vs. a regular video?',
        answer: 'GIFs on X loop continuously without a play/pause button or progress bar — they behave like animated images. Regular videos show a play button and a progress bar at the bottom. SavDown correctly identifies both types and offers the appropriate download formats.',
      },
      {
        question: 'Will the GIF file be large?',
        answer: 'GIF files are significantly larger than their MP4 equivalents because GIF uses an older, lossier compression algorithm. A 5-second GIF can easily be 3–10 MB, whereas the same clip as MP4 might be under 500 KB. For sharing in places that require GIF format, the file size is the trade-off.',
      },
      {
        question: 'Can I download GIFs from protected (private) X accounts?',
        answer: 'No. GIFs from protected accounts are restricted to approved followers. SavDown only accesses publicly available content.',
      },
      {
        question: 'How do I copy the link to an X post with a GIF?',
        answer: 'Tap the share icon (upload arrow) on the post, then tap Copy link. On desktop, click the three-dot menu on the post and select Copy link. The URL contains the post\'s numeric status ID.',
      },
      {
        question: 'Does downloading a GIF from X notify the account owner?',
        answer: 'No. SavDown fetches the file from X\'s CDN server-side without triggering any in-app notification, view count, or interaction on the original post.',
      },
      {
        question: 'Can I use downloaded X GIFs in my own content or presentations?',
        answer: 'For personal use, yes. For commercial use, you need the rights to the content. GIFs posted on X are still subject to copyright. If the GIF is a meme or reaction clip from a film or TV show, additional licensing applies.',
      },
      {
        question: 'Does the GIF retain its original loop count and speed?',
        answer: 'Yes. The animated GIF SavDown produces loops continuously at the original playback speed, matching how the GIF appeared on X. Frame rate and timing are preserved during conversion.',
      },
      {
        question: 'Can I download multiple GIFs from the same X thread?',
        answer: 'Yes. Each post in a thread has its own unique status URL. Copy the link to each individual post that contains a GIF and paste them into SavDown one at a time.',
      },
      {
        question: 'Does SavDown store GIF files after I download them?',
        answer: 'No. The converted GIF or MP4 is generated on the fly and streamed directly to your browser. SavDown does not retain any copy on its servers.',
      },
    ],
    howTo: [
      { title: 'Copy The Post Link', body: 'Click the share icon on the post, then Copy link.' },
      { title: 'Paste And Download', body: 'Save the GIF as a real GIF or as MP4.' },
    ],
  },
];

export const toolsBySlug = new Map(tools.map((t) => [t.slug, t]));
export const toolsByPlatform = tools.reduce<Record<Platform, Tool[]>>(
  (acc, t) => {
    (acc[t.platform] ||= []).push(t);
    return acc;
  },
  {} as Record<Platform, Tool[]>,
);

export const featuredTools = tools.filter((t) => t.featured);
export const trendingTools = tools.filter((t) => t.trending);
