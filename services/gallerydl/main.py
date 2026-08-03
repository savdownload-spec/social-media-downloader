"""
gallery-dl FastAPI sidecar.

Endpoints:
  GET  /health                → { status: "ok" }
  POST /info   { url, tool }  → DownloadResult JSON
"""
import json, asyncio, os, re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="gallery-dl sidecar", version="1.0.0")

GDL_TIMEOUT = int(os.getenv("GALLERY_DL_TIMEOUT_SEC", "30"))
GDL_RETRIES = int(os.getenv("GALLERY_DL_RETRIES", "2"))


class InfoRequest(BaseModel):
    url: str
    tool: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/info")
async def get_info(req: InfoRequest):
    args = ["gallery-dl", "--dump-json", "--no-mtime"]

    if req.tool == "instagram-profile-picture-downloader":
        args += ["--range", "1"]

    args += ["--", req.url]

    for attempt in range(GDL_RETRIES + 1):
        try:
            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=GDL_TIMEOUT
            )
            break
        except asyncio.TimeoutError:
            if attempt == GDL_RETRIES:
                raise HTTPException(status_code=504, detail="gallery-dl timed out")
            await asyncio.sleep(0.6 * (attempt + 1))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    if proc.returncode not in (0, 1):  # 1 = partial success
        err = stderr.decode(errors="replace").strip()
        if "login" in err.lower() or "private" in err.lower():
            raise HTTPException(status_code=403, detail="This content requires login and cannot be accessed.")
        if "not found" in err.lower() or "404" in err:
            raise HTTPException(status_code=404, detail="Content not found. It may have been deleted.")
        raise HTTPException(status_code=422, detail=err[:200] or "gallery-dl failed")

    lines = [l for l in stdout.decode(errors="replace").strip().splitlines() if l.strip().startswith("[")]
    if not lines:
        raise HTTPException(status_code=422, detail="No media found at this URL.")

    base_url = os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000")
    formats = []
    title = "Download"
    thumbnail = ""
    author = None

    for line in lines[:35]:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        if not isinstance(entry, list) or not entry:
            continue

        meta = entry[0] if isinstance(entry[0], dict) else {}

        if not title or title == "Download":
            title = (
                meta.get("title")
                or (meta.get("description") or "")[:80]
                or meta.get("post_shortcode")
                or meta.get("filename")
                or "Media"
            )
        if not author:
            author = meta.get("uploader") or meta.get("username")
        if not thumbnail:
            thumbnail = meta.get("display_url") or meta.get("thumbnail") or ""

        urls = []
        for key in ("url", "display_url", "video_url"):
            if meta.get(key):
                urls.append(meta[key])
        for item in entry[1:]:
            if isinstance(item, str) and item.startswith("http"):
                urls.append(item)

        for media_url in urls:
            ext = guess_ext(media_url)
            filename = f"{sanitize(title)}-{len(formats) + 1}.{ext}"
            is_video = ext in ("mp4", "webm")
            formats.append({
                "label": f"Video {len(formats)+1}" if is_video else f"Image {len(formats)+1}",
                "quality": ext.upper(),
                "extension": ext,
                "url": f"{base_url}/api/proxy?url={media_url}&filename={filename}",
                "hasAudio": is_video,
                "hasVideo": is_video,
            })
            if len(formats) >= 35:
                break
        if len(formats) >= 35:
            break

    if req.tool == "instagram-profile-picture-downloader" and formats:
        formats[0]["label"] = "Profile Picture HD"

    if not formats:
        raise HTTPException(status_code=422, detail="Could not extract media from this URL.")

    if len(formats) > 1:
        formats.append({
            "label": "⬇ Download All (ZIP)",
            "quality": "ZIP",
            "extension": "zip",
            "url": f"{base_url}/api/tools/gallery-dl/zip?url={req.url}&tool={req.tool}",
            "hasAudio": False,
            "hasVideo": False,
        })

    return {
        "ok": True,
        "title": title,
        "thumbnail": thumbnail,
        "author": author,
        "platform": req.tool,
        "formats": formats,
    }


def guess_ext(url: str) -> str:
    m = re.search(r'\.(jpg|jpeg|png|gif|webp|mp4|mp3)(\?|$)', url, re.I)
    return m.group(1).lower() if m else "jpg"


def sanitize(s: str) -> str:
    return re.sub(r'[/\\?%*:|"<>]', '-', s).replace(' ', '_')[:60]
