import io
import os
import sys
import math
import base64
from typing import List, Optional
import numpy as np
from scipy import ndimage
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from PIL import Image, ImageSequence

# When frozen by PyInstaller the bundled files live under sys._MEIPASS, not the CWD
BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = FastAPI(title="GIF Converter")


@app.middleware("http")
async def revalidate_frontend_files(request, call_next):
    # Without this, browsers heuristically cache the UI files and can pair a new page
    # with an old stylesheet after an upgrade. no-cache still allows 304 revalidation.
    response = await call_next(request)
    if request.url.path == "/" or request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache"
    return response

# Global lazy-loaded rembg sessions dict
rembg_sessions = {}

def get_rembg_session(model_name: str = "u2net"):
    if model_name not in rembg_sessions:
        try:
            from rembg import new_session
            rembg_sessions[model_name] = new_session(model_name)
        except Exception as e:
            print(f"Error initializing rembg session '{model_name}': {e}")
            raise e
    return rembg_sessions[model_name]


def u2net_home() -> str:
    """Where rembg keeps its model files (mirrors rembg/sessions/base.py)."""
    return os.path.expanduser(
        os.getenv("U2NET_HOME", os.path.join(os.getenv("XDG_DATA_HOME", "~"), ".u2net"))
    )


# Substrings that show up when a model download cannot reach the network
NETWORK_ERROR_HINTS = (
    "connection", "network", "timed out", "timeout", "unreachable", "resolve",
    "temporary failure", "max retries", "urlopen", "getaddrinfo", "ssl",
)


def classify_model_error(exc: Exception, model_name: str) -> str:
    """Tell the frontend why a model could not be loaded, so it can offer a way out."""
    text = f"{type(exc).__name__}: {exc}".lower()
    if "no session class found" in text:
        return "unknown_model"
    already_downloaded = os.path.exists(os.path.join(u2net_home(), f"{model_name}.onnx"))
    if not already_downloaded and any(hint in text for hint in NETWORK_ERROR_HINTS):
        return "model_download_failed"
    return "model_load_failed"


class FrameItem(BaseModel):
    index: int
    duration: int  # milliseconds
    image: str  # Data URL or base64 string

class RembgRequest(BaseModel):
    frames: List[FrameItem]
    model: str = "u2net"
    alpha_cutoff: int = 10  # 1-255 threshold
    post_process_mask: bool = True
    alpha_matting: bool = False
    alpha_matting_foreground_threshold: int = 240

class GifOptions(BaseModel):
    fps_override: Optional[float] = None
    loop: int = 0  # 0 means infinite loop

class WebpOptions(BaseModel):
    fps_override: Optional[float] = None
    loop: int = 0  # 0 means infinite loop
    lossless: bool = True
    quality: int = 80

class SpriteSheetOptions(BaseModel):
    columns: int = 5
    padding: int = 2
    transparent_bg: bool = True
    bg_color: str = "#00000000"

class SynthesizeRequest(BaseModel):
    frames: List[FrameItem]
    export_types: List[str] = []  # e.g. ["gif", "webp", "spritesheet"]
    export_type: Optional[str] = None  # Legacy support ("gif", "spritesheet", "both")
    gif_options: GifOptions = GifOptions()
    webp_options: WebpOptions = WebpOptions()
    spritesheet_options: SpriteSheetOptions = SpriteSheetOptions()

class SheetRequest(BaseModel):
    image: str  # Data URL or base64 string

class Panel(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    w: int = Field(gt=0)
    h: int = Field(gt=0)

class ImagesRequest(BaseModel):
    images: List[str]  # Data URLs or base64 strings

class SliceRequest(BaseModel):
    image: str
    panels: List[Panel]
    duration: int = Field(default=125, gt=0)  # milliseconds per frame


def base64_to_pil(data_url: str) -> Image.Image:
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    image_bytes = base64.b64decode(data_url)
    return Image.open(io.BytesIO(image_bytes)).convert("RGBA")

def pil_to_base64(img: Image.Image, format: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=format)
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/gif" if format.upper() == "GIF" else "image/png"
    return f"data:{mime};base64,{b64_str}"


GIF_TRANSPARENT_INDEX = 255


def to_gif_frames(images: List[Image.Image]) -> List[Image.Image]:
    """Palette frames for GIF: 255 real colours each, with index 255 kept for see-through pixels.

    Letting Pillow pick the palette and marking an index as transparent afterwards would
    punch holes wherever that index's colour appears in an opaque image. The transparent
    index also gets a colour no frame uses: Pillow crops each later frame to where it differs
    from that colour, so a real colour there (black outlines) would be cut off the edges.
    """
    frames = [img.convert("RGB").quantize(colors=255) for img in images]
    used = set()
    for frame in frames:
        palette = frame.getpalette()
        used.update(zip(palette[0::3], palette[1::3], palette[2::3]))
    unused = next(c for c in ((i >> 16, (i >> 8) & 255, i & 255) for i in range(256 ** 3)) if c not in used)

    for img, frame in zip(images, frames):
        palette = frame.getpalette()[:765]
        palette += [0] * (765 - len(palette))
        frame.putpalette(palette + list(unused))
        see_through = img.getchannel("A").point(lambda a: 255 if a < 128 else 0)
        frame.paste(GIF_TRANSPARENT_INDEX, mask=see_through)
    return frames


@app.post("/api/decompose-gif")
async def decompose_gif(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.gif', '.webp', '.png', '.jpg', '.jpeg', '.bmp')):
        raise HTTPException(status_code=400, detail="Only GIF / animated WebP or PNG / JPG / BMP still images are supported.")
    
    contents = await file.read()
    try:
        gif_img = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to open image: {str(e)}")
    
    is_animated = getattr(gif_img, "is_animated", False)
    frames = []
    index = 0
    
    for frame in ImageSequence.Iterator(gif_img):
        # Extract frame delay (ms), default to 100ms if not specified
        duration = frame.info.get("duration", 100)
        if duration <= 0:
            duration = 100
            
        rgba_frame = frame.convert("RGBA")
        b64_image = pil_to_base64(rgba_frame, format="PNG")
        
        frames.append({
            "index": index,
            "duration": int(duration),
            "image": b64_image,
            "width": rgba_frame.width,
            "height": rgba_frame.height
        })
        index += 1
        
    return {
        "filename": file.filename,
        "is_animated": is_animated,
        "total_frames": len(frames),
        "width": gif_img.width,
        "height": gif_img.height,
        "frames": frames
    }


@app.post("/api/u2net-rembg")
async def u2net_rembg(req: RembgRequest):
    try:
        from rembg import remove
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "code": "rembg_missing",
            "model": req.model,
            "message": f"rembg module could not be loaded: {str(e)}"
        })

    try:
        session = get_rembg_session(req.model)
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "code": classify_model_error(e, req.model),
            "model": req.model,
            "message": str(e)
        })

    failed_count = 0

    processed_frames = []
    
    for frame in req.frames:
        try:
            pil_img = base64_to_pil(frame.image)
            img_byte_arr = io.BytesIO()
            pil_img.save(img_byte_arr, format='PNG')
            input_bytes = img_byte_arr.getvalue()
            
            output_bytes = remove(
                input_bytes,
                session=session,
                post_process_mask=req.post_process_mask,
                alpha_matting=req.alpha_matting,
                alpha_matting_foreground_threshold=req.alpha_matting_foreground_threshold
            )
            output_pil = Image.open(io.BytesIO(output_bytes)).convert("RGBA")

            # Apply custom alpha cutoff threshold if requested
            if req.alpha_cutoff > 0:
                import numpy as np
                r, g, b, a = output_pil.split()
                a_np = np.array(a)
                a_np[a_np < req.alpha_cutoff] = 0
                output_pil.putalpha(Image.fromarray(a_np))
            
            processed_b64 = pil_to_base64(output_pil, format="PNG")
            processed_frames.append({
                "index": frame.index,
                "duration": frame.duration,
                "image": processed_b64,
                "failed": False
            })
        except Exception as e:
            print(f"Error processing frame {frame.index}: {e}")
            # Fall back to the original image, but say so instead of failing silently
            failed_count += 1
            processed_frames.append({
                "index": frame.index,
                "duration": frame.duration,
                "image": frame.image,
                "failed": True,
                "error": str(e)
            })

    return {"frames": processed_frames, "failed_count": failed_count}


@app.post("/api/synthesize")
async def synthesize(req: SynthesizeRequest):
    if not req.frames:
        raise HTTPException(status_code=400, detail="No frames provided for synthesis.")
    
    export_types = set(req.export_types)
    if not export_types and req.export_type:
        if req.export_type == "gif":
            export_types.add("gif")
        elif req.export_type == "spritesheet":
            export_types.add("spritesheet")
        elif req.export_type == "both":
            export_types.update(["gif", "spritesheet"])

    if not export_types:
        raise HTTPException(status_code=400, detail="No export format selected.")

    result = {}
    pil_images = [base64_to_pil(f.image) for f in req.frames]
    durations = [f.duration for f in req.frames]
    
    # 1. Generate GIF
    if "gif" in export_types:
        buf = io.BytesIO()
        
        # Determine duration array or override
        if req.gif_options.fps_override and req.gif_options.fps_override > 0:
            frame_duration = int(1000 / req.gif_options.fps_override)
            final_durations = [frame_duration] * len(pil_images)
        else:
            final_durations = durations
            
        gif_frames = to_gif_frames(pil_images)

        gif_frames[0].save(
            buf,
            format="GIF",
            save_all=True,
            append_images=gif_frames[1:],
            duration=final_durations,
            loop=req.gif_options.loop,
            disposal=2,
            transparency=GIF_TRANSPARENT_INDEX,
            optimize=False  # optimizing renumbers the palette and would move the transparent index
        )
        gif_b64 = f"data:image/gif;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
        result["gif"] = {
            "data_url": gif_b64,
            "size_bytes": len(buf.getvalue()),
            "total_frames": len(req.frames)
        }

    # 2. Generate Animated WebP
    if "webp" in export_types:
        buf = io.BytesIO()
        
        if req.webp_options.fps_override and req.webp_options.fps_override > 0:
            frame_duration = int(1000 / req.webp_options.fps_override)
            final_durations = [frame_duration] * len(pil_images)
        else:
            final_durations = durations
            
        webp_frames = [img for img in pil_images]
        webp_frames[0].save(
            buf,
            format="WEBP",
            save_all=True,
            append_images=webp_frames[1:],
            duration=final_durations,
            loop=req.webp_options.loop,
            lossless=req.webp_options.lossless,
            quality=req.webp_options.quality,
            method=6
        )
        webp_b64 = f"data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
        result["webp"] = {
            "data_url": webp_b64,
            "size_bytes": len(buf.getvalue()),
            "total_frames": len(req.frames)
        }

    # 3. Generate Sprite Sheet
    if "spritesheet" in export_types:
        num_frames = len(pil_images)
        cols = max(1, req.spritesheet_options.columns)
        rows = math.ceil(num_frames / cols)
        
        frame_w, frame_h = pil_images[0].size
        padding = req.spritesheet_options.padding
        
        sheet_w = cols * frame_w + (cols + 1) * padding
        sheet_h = rows * frame_h + (rows + 1) * padding
        
        # Create sheet background
        if req.spritesheet_options.transparent_bg:
            sheet_img = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
        else:
            sheet_img = Image.new("RGBA", (sheet_w, sheet_h), (255, 255, 255, 255))
            
        meta_frames = []
        for i, img in enumerate(pil_images):
            r = i // cols
            c = i % cols
            x = padding + c * (frame_w + padding)
            y = padding + r * (frame_h + padding)
            
            sheet_img.paste(img, (x, y), img if img.mode == "RGBA" else None)
            
            meta_frames.append({
                "index": req.frames[i].index,
                "x": x,
                "y": y,
                "width": frame_w,
                "height": frame_h,
                "duration": req.frames[i].duration
            })
            
        sheet_b64 = pil_to_base64(sheet_img, format="PNG")
        result["spritesheet"] = {
            "data_url": sheet_b64,
            "width": sheet_w,
            "height": sheet_h,
            "columns": cols,
            "rows": rows,
            "meta": meta_frames
        }

    return result


def background_color(rgba: np.ndarray) -> Optional[tuple]:
    """None when the image already has transparency, else its median border colour."""
    if (rgba[..., 3] < 128).mean() > 0.01:
        return None
    border = np.concatenate([rgba[0], rgba[-1], rgba[:, 0], rgba[:, -1]])[:, :3]
    return tuple(int(v) for v in np.median(border, axis=0))


def detect_panels(img: Image.Image) -> List[dict]:
    """Find the frames on an irregular sprite sheet, as boxes in no particular order."""
    rgba = np.asarray(img.convert("RGBA"))
    height, width = rgba.shape[:2]
    bg = background_color(rgba)
    if bg is None:
        foreground = rgba[..., 3] > 16
    else:
        foreground = np.abs(rgba[..., :3].astype(np.int16) - np.array(bg)).max(axis=2) > 40

    labels, _ = ndimage.label(foreground, structure=np.ones((3, 3), dtype=bool))
    min_side = max(3, min(width, height) // 100)
    boxes, edge_cover = [], []
    for label, (ys, xs) in enumerate(ndimage.find_objects(labels), start=1):
        if xs.stop - xs.start >= min_side and ys.stop - ys.start >= min_side:
            boxes.append([xs.start, ys.start, xs.stop, ys.stop])
            # Share of the box outline this component touches: near 1 for a panel, low for a sprite
            own = labels[ys, xs] == label
            edge_cover.append(np.concatenate([own[0], own[-1], own[:, 0], own[:, -1]]).mean())
    if not boxes:
        return []

    def area(b):
        return (b[2] - b[0]) * (b[3] - b[1])

    def gap(a, b):
        return max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3], 0)

    def union(a, b):
        return [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]

    def overlap(a, b):
        return max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))

    def split_apart(a, b):
        # Two parts of one panel cut by an outline running wall to wall (a blanket edge):
        # only a line's width apart, clearly closer than panels sit to each other, and as
        # wide (or as tall) as each other
        g = gap(a, b)
        if g > 6 or (gutter is not None and g >= 0.5 * gutter):
            return False
        sides = (a[2] - a[0], a[3] - a[1], b[2] - b[0], b[3] - b[1])
        across = min(a[2], b[2]) - max(a[0], b[0]) >= 0.9 * max(sides[0], sides[2])
        along = min(a[3], b[3]) - max(a[1], b[1]) >= 0.9 * max(sides[1], sides[3])
        return across or along

    def mostly_overlap(a, b):
        return overlap(a, b) >= 0.5 * min(area(a), area(b))

    def merge_frames(should_merge):
        merged = True
        while merged:
            merged = False
            for i in range(len(frames)):
                for j in range(i + 1, len(frames)):
                    if should_merge(frames[i], frames[j]):
                        frames[i] = union(frames[i], frames.pop(j))
                        was_panel = panel.pop(j)
                        panel[i] = panel[i] or was_panel
                        merged = True
                        break
                if merged:
                    break

    largest = max(area(b) for b in boxes)
    major = [i for i, b in enumerate(boxes) if area(b) >= 0.15 * largest]
    frames = [boxes[i] for i in major]
    # A frame that runs along most of its own outline is a panel; whatever sits outside it
    # (a frame number, a caption) is not part of the frame
    panel = [edge_cover[i] >= 0.6 for i in major]

    # Fold boxes inside others (a character outlined within its panel) into them first,
    # so the space between neighbouring frames can be measured
    merge_frames(mostly_overlap)
    nearest_gaps = [min(gap(a, b) for b in frames if b is not a) for a in frames] if len(frames) > 1 else []
    nearest_gaps = [g for g in nearest_gaps if g > 0]
    gutter = float(np.median(nearest_gaps)) if nearest_gaps else None

    # Small detached pieces next to a sprite (a sweat drop, a floating "Z") belong to the
    # nearest frame; anything further away is noise
    for piece in (b for b in boxes if area(b) < 0.15 * largest):
        nearest = min(range(len(frames)), key=lambda i: gap(frames[i], piece))
        f = frames[nearest]
        near = not panel[nearest] and gap(f, piece) <= 0.25 * max(f[2] - f[0], f[3] - f[1])
        if near or split_apart(f, piece):
            frames[nearest] = union(f, piece)

    # Merge again: attached pieces can make boxes overlap, and halves of one panel join up
    merge_frames(lambda a, b: mostly_overlap(a, b) or split_apart(a, b))

    return [{"x": b[0], "y": b[1], "w": b[2] - b[0], "h": b[3] - b[1]} for b in frames]


@app.post("/api/detect-panels")
async def detect_panels_endpoint(req: SheetRequest):
    return {"panels": detect_panels(base64_to_pil(req.image))}


@app.post("/api/slice-sheet")
async def slice_sheet(req: SliceRequest):
    if not req.panels:
        raise HTTPException(status_code=400, detail="No frames to slice.")

    sheet = base64_to_pil(req.image)
    crops = [sheet.crop((p.x, p.y, p.x + p.w, p.y + p.h)) for p in req.panels]

    # Every frame shares the largest crop's size; smaller crops sit bottom-centre so
    # characters standing on the panel floor stay on the same line. The margin takes
    # each crop's own edge colour, so a white panel stays one white frame.
    canvas_w = max(c.width for c in crops)
    canvas_h = max(c.height for c in crops)
    frames = []
    for i, crop in enumerate(crops):
        bg = background_color(np.asarray(crop))
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0) if bg is None else (*bg, 255))
        canvas.paste(crop, ((canvas_w - crop.width) // 2, canvas_h - crop.height))
        frames.append({
            "index": i,
            "duration": req.duration,
            "image": pil_to_base64(canvas, format="PNG"),
            "width": canvas_w,
            "height": canvas_h
        })

    return {"width": canvas_w, "height": canvas_h, "frames": frames}


@app.post("/api/content-boxes")
async def content_boxes(req: ImagesRequest):
    """Where the character sits in each frame, plus the background to fill around it."""
    result = []
    for data in req.images:
        img = base64_to_pil(data)
        boxes = detect_panels(img)
        if boxes:
            x0 = min(b["x"] for b in boxes)
            y0 = min(b["y"] for b in boxes)
            x1 = max(b["x"] + b["w"] for b in boxes)
            y1 = max(b["y"] + b["h"] for b in boxes)
            box = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}
        else:
            box = {"x": 0, "y": 0, "w": img.width, "h": img.height}
        result.append({"box": box, "background": background_color(np.asarray(img))})
    return {"frames": result}

# Serve static files for frontend UI
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8008, reload=True)
