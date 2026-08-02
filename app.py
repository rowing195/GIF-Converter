import io
import math
import base64
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from PIL import Image, ImageSequence

app = FastAPI(title="GIF Converter")

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


@app.post("/api/decompose-gif")
async def decompose_gif(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.gif', '.webp')):
        raise HTTPException(status_code=400, detail="Only GIF (or WebP animated) files are supported.")
    
    contents = await file.read()
    try:
        gif_img = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to open image: {str(e)}")
    
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
        "total_frames": len(frames),
        "width": gif_img.width,
        "height": gif_img.height,
        "frames": frames
    }


@app.post("/api/u2net-rembg")
async def u2net_rembg(req: RembgRequest):
    try:
        from rembg import remove
        session = get_rembg_session(req.model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"rembg module or u2net model loading failed: {str(e)}")
    
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
                "image": processed_b64
            })
        except Exception as e:
            print(f"Error processing frame {frame.index}: {e}")
            # Fallback to original image on error
            processed_frames.append({
                "index": frame.index,
                "duration": frame.duration,
                "image": frame.image
            })
            
    return {"frames": processed_frames}


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
            
        gif_frames = [img for img in pil_images]
            
        gif_frames[0].save(
            buf,
            format="GIF",
            save_all=True,
            append_images=gif_frames[1:],
            duration=final_durations,
            loop=req.gif_options.loop,
            disposal=2,
            transparency=0
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

# Serve static files for frontend UI
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8080, reload=True)
