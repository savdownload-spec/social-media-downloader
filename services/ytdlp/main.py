"""
yt-dlp FastAPI sidecar.

Endpoints:
  GET  /health                → { status: "ok" }
  POST /info   { url, tool }  → DownloadResult JSON
"""
import json, asyncio, os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl, field_validator

app = FastAPI(title="yt-dlp sidecar", version="1.0.0")

YTDLP_TIMEOUT = int(os.getenv("YTDLP_TIMEOUT_SEC", "30"))
YTDLP_RETRIES = int(os.getenv("YTDLP_RETRIES", "2"))

AUDIO_TOOLS = {
    "youtube-to-mp3",
    "tiktok-to-mp3",
}

THUMBNAIL_TOOLS = {
    "youtube-thumbnail-downloader",
}

PLAYLIST_TOOLS = {
    "youtube-playlist-downloader",
}


class InfoRequest(BaseModel):
    url: str
    tool: str

    @field_validator("url")
    @classmethod
    def must_be_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("url must start with http:// or https://")
        return v


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/info")
async def get_info(req: InfoRequest):
    tool = req.tool
    url  = req.url

    # Thumbnail: resolve directly from img.youtube.com CDN
    if tool in THUMBNAIL_TOOLS:
        return build_thumbnail_result(url)

    audio_only = tool in AUDIO_TOOLS
    is_playlist = tool in PLAYLIST_TOOLS

    args = [
        "yt-dlp",
        "--dump-json",
        "--no-warnings",
        "--no-call-home",
        "--socket-timeout", "20",
        "--retries", str(YTDLP_RETRIES),
    ]

    if not is_playlist:
        args.append("--no-playlist")

    if audio_only:
        args += ["--format", "bestaudio/best"]

    args += ["--", url]

    for attempt in range(YTDLP_RETRIES + 1):
        try:
            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=YTDLP_TIMEOUT
            )
            break
        except asyncio.TimeoutError:
            if attempt == YTDLP_RETRIES:
                raise HTTPException(status_code=504, detail="yt-dlp timed out")
            await asyncio.sleep(0.5 * (attempt + 1))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    if proc.returncode != 0:
        err = stderr.decode(errors="replace").strip()
        detail = parse_ytdlp_error(err)
        raise HTTPException(status_code=422, detail=detail)

    lines = [l for l in stdout.decode(errors="replace").strip().splitlines() if l]
    if not lines:
        raise HTTPException(status_code=422, detail="No media found at this URL.")

    entry = json.loads(lines[0])
    return build_result(entry, tool, audio_only)


def build_result(entry: dict, tool: str, audio_only: bool) -> dict:
    title = entry.get("title") or entry.get("webpage_url_basename") or "Download"
    thumbnail = entry.get("thumbnail") or ""
    author = entry.get("uploader") or entry.get("channel") or None
    duration = entry.get("duration")
    platform = entry.get("extractor_key") or tool
    base_url = os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")

    raw_formats = entry.get("formats") or []
    formats = []

    def proxy(u: str, filename: str) -> str:
        from urllib.parse import urlencode
        return f"{base_url}/api/proxy?{urlencode({'url': u, 'filename': filename})}"

    def safe_filename(s: str) -> str:
        import re
        return re.sub(r'[/\\?%*:|"<>]', '-', s)[:80]

    def fmt_bytes(b) -> str | None:
        if not b:
            return None
        if b < 1_048_576:
            return f"{b / 1024:.0f} KB"
        return f"{b / 1_048_576:.1f} MB"

    if audio_only:
        audio_fmts = [f for f in raw_formats if f.get("vcodec") == "none" and f.get("acodec") != "none"]
        seen = set()
        for f in reversed(audio_fmts):
            ext = f.get("ext", "mp3")
            if ext not in seen and ext in ("mp3", "m4a", "webm", "ogg"):
                seen.add(ext)
                dl = f.get("url", "")
                formats.append({
                    "label": f"{ext.upper()} audio",
                    "quality": f"{int(f.get('abr') or 0)} kbps" if f.get("abr") else ext.upper(),
                    "extension": ext,
                    "size": fmt_bytes(f.get("filesize")),
                    "url": proxy(dl, f"{safe_filename(title)}.{ext}") if dl else "#",
                    "hasAudio": True,
                    "hasVideo": False,
                })
            if len(formats) >= 3:
                break
    else:
        video_fmts = sorted(
            [f for f in raw_formats if f.get("height") and f.get("acodec") != "none" and f.get("ext") == "mp4"],
            key=lambda f: f.get("height", 0),
            reverse=True,
        )
        seen_h = set()
        for f in video_fmts:
            h = f["height"]
            if h not in seen_h:
                seen_h.add(h)
                dl = f.get("url", "")
                formats.append({
                    "label": f"MP4 {h}p",
                    "quality": f"{h}p",
                    "extension": "mp4",
                    "size": fmt_bytes(f.get("filesize")),
                    "url": proxy(dl, f"{safe_filename(title)}.mp4") if dl else "#",
                    "hasAudio": True,
                    "hasVideo": True,
                })
            if len(formats) >= 4:
                break

        best_audio = sorted(
            [f for f in raw_formats if f.get("vcodec") == "none" and f.get("acodec") != "none"],
            key=lambda f: f.get("abr") or 0,
            reverse=True,
        )
        if best_audio:
            f = best_audio[0]
            dl = f.get("url", "")
            formats.append({
                "label": "MP3 audio",
                "quality": f"{int(f.get('abr') or 0)} kbps" if f.get("abr") else "audio",
                "extension": "mp3",
                "size": fmt_bytes(f.get("filesize")),
                "url": proxy(dl, f"{safe_filename(title)}.mp3") if dl else "#",
                "hasAudio": True,
                "hasVideo": False,
            })

    if not formats and entry.get("url"):
        dl = entry["url"]
        formats = [{
            "label": "Download",
            "quality": "best",
            "extension": "mp4",
            "url": proxy(dl, f"{safe_filename(title)}.mp4"),
            "hasAudio": True,
            "hasVideo": True,
        }]

    return {
        "ok": True,
        "title": title,
        "thumbnail": thumbnail,
        "author": author,
        "duration": duration,
        "platform": platform,
        "formats": formats,
    }


def build_thumbnail_result(url: str) -> dict:
    import re
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",
    ]
    video_id = None
    for p in patterns:
        m = re.search(p, url)
        if m:
            video_id = m.group(1)
            break

    if not video_id:
        raise HTTPException(status_code=422, detail="Could not extract YouTube video ID.")

    base = f"https://img.youtube.com/vi/{video_id}"
    return {
        "ok": True,
        "title": f"YouTube Thumbnail ({video_id})",
        "thumbnail": f"{base}/hqdefault.jpg",
        "platform": "youtube",
        "formats": [
            {"label": "MaxRes JPG", "quality": "1280×720", "extension": "jpg", "url": f"{base}/maxresdefault.jpg", "hasAudio": False, "hasVideo": False},
            {"label": "HQ JPG",    "quality": "480×360",  "extension": "jpg", "url": f"{base}/hqdefault.jpg",     "hasAudio": False, "hasVideo": False},
            {"label": "MQ JPG",    "quality": "320×180",  "extension": "jpg", "url": f"{base}/mqdefault.jpg",     "hasAudio": False, "hasVideo": False},
            {"label": "SD JPG",    "quality": "120×90",   "extension": "jpg", "url": f"{base}/default.jpg",       "hasAudio": False, "hasVideo": False},
        ],
    }


def parse_ytdlp_error(err: str) -> str:
    if "Private video" in err or "private" in err.lower():
        return "This video is private and cannot be downloaded."
    if "not available" in err or "removed" in err.lower():
        return "This media is no longer available."
    if "Unsupported URL" in err:
        return "This URL is not supported."
    if "geo" in err.lower() or "blocked" in err.lower():
        return "This content is geo-blocked or restricted."
    return err[:200] if err else "yt-dlp failed with no output."
