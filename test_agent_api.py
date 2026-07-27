import requests
import json
import base64

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("--- 1. Testing GIF Decomposition ---")
    with open("sample.gif", "rb") as f:
        files = {"file": ("sample.gif", f, "image/gif")}
        resp = requests.post(f"{BASE_URL}/api/decompose-gif", files=files)
    
    assert resp.status_code == 200, f"Decompose failed: {resp.text}"
    data = resp.json()
    print(f"[OK] Decomposed successfully. Total frames: {data['total_frames']}, Dimensions: {data['width']}x{data['height']}")
    assert data['total_frames'] == 10
    
    frames = data['frames']
    print(f"Sample frame #0 delay: {frames[0]['duration']} ms, Frame #1 delay: {frames[1]['duration']} ms")
    
    # Keep first 5 frames
    selected_frames = frames[:5]
    print(f"--- 2. Filtered 5 frames: {[f['index'] for f in selected_frames]} ---")

    print("--- 3. Testing Stage 3 Synthesis (without rembg fast test) ---")
    synth_req = {
        "frames": selected_frames,
        "export_type": "both",
        "gif_options": {"fps_override": None, "loop": 0},
        "spritesheet_options": {"columns": 5, "padding": 2, "transparent_bg": True}
    }
    resp_synth = requests.post(f"{BASE_URL}/api/synthesize", json=synth_req)
    assert resp_synth.status_code == 200, f"Synthesis failed: {resp_synth.text}"
    synth_data = resp_synth.json()
    
    assert "gif" in synth_data, "GIF output missing"
    assert "spritesheet" in synth_data, "Sprite Sheet output missing"
    
    print(f"[OK] GIF synthesized. Size: {synth_data['gif']['size_bytes']} bytes")
    print(f"[OK] Sprite Sheet generated. Layout: {synth_data['spritesheet']['columns']} cols x {synth_data['spritesheet']['rows']} rows, total meta items: {len(synth_data['spritesheet']['meta'])}")
    
    print("--- ALL API VERIFICATION TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    test_api()
