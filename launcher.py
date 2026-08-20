"""Entry point for the packaged GIF Converter executable."""
import os
import shutil
import socket
import sys
import threading
import webbrowser

BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def u2net_home():
    """Mirror rembg's own cache location logic (rembg/sessions/base.py)."""
    return os.path.expanduser(
        os.getenv("U2NET_HOME", os.path.join(os.getenv("XDG_DATA_HOME", "~"), ".u2net"))
    )


def seed_bundled_model():
    """Copy the bundled u2net weights into rembg's cache so the first run needs no network."""
    bundled = os.path.join(BASE_DIR, "models", "u2net.onnx")
    if not os.path.exists(bundled):
        return

    target = os.path.join(u2net_home(), "u2net.onnx")
    if os.path.exists(target):
        return

    os.makedirs(u2net_home(), exist_ok=True)
    print("[GIF Converter] 首次啟動，正在安裝內建 u2net 模型...")
    shutil.copyfile(bundled, target)
    print(f"[GIF Converter] 模型已安裝至 {target}")


def find_free_port(preferred=8080, attempts=20):
    for port in range(preferred, preferred + attempts):
        with socket.socket() as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise SystemExit(f"找不到可用的連接埠（已嘗試 {preferred}-{preferred + attempts - 1}）")


def main():
    seed_bundled_model()
    port = find_free_port()
    url = f"http://127.0.0.1:{port}"

    print("=" * 60)
    print("  GIF Converter")
    print(f"  網址：{url}")
    print("  關閉此視窗即可結束服務")
    print("=" * 60)

    threading.Timer(1.5, lambda: webbrowser.open(url)).start()

    import uvicorn
    from app import app

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
