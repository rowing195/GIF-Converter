# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for GIF Converter (onedir build).

Build with:  pyinstaller gif_converter.spec --noconfirm
Output:      dist/GIFConverter/GIFConverter.exe
"""
import os
import sys

from PyInstaller.utils.hooks import collect_all, collect_submodules

datas = [("static", "static")]
binaries = []
hiddenimports = collect_submodules("uvicorn")

# conda keeps these DLLs in <prefix>/Library/bin, which PyInstaller does not search,
# so stdlib extensions such as pyexpat / _ctypes / _lzma fail to load in the bundle.
CONDA_DLL_DIR = os.path.join(sys.base_prefix, "Library", "bin")
for dll in (
    "libexpat.dll",
    "ffi.dll",
    "libmpdec-4.dll",
    "liblzma.dll",
    "LIBBZ2.dll",
    "sqlite3.dll",
    "zstd.dll",
    "tbb12.dll",
):
    dll_path = os.path.join(CONDA_DLL_DIR, dll)
    if os.path.exists(dll_path):
        binaries.append((dll_path, "."))

# These pull data files / dynamic imports that PyInstaller cannot see statically
for package in ("rembg", "onnxruntime", "pymatting", "pooch"):
    pkg_datas, pkg_binaries, pkg_hidden = collect_all(package)
    datas += pkg_datas
    binaries += pkg_binaries
    hiddenimports += pkg_hidden

# Ship the default u2net weights so the packaged app works offline out of the box.
# Other models are still downloaded on demand into the user's ~/.u2net cache.
BUNDLED_MODEL = os.path.expanduser(os.path.join("~", ".u2net", "u2net.onnx"))
if os.path.exists(BUNDLED_MODEL):
    datas.append((BUNDLED_MODEL, "models"))
else:
    raise SystemExit(
        f"找不到 {BUNDLED_MODEL}\n"
        "請先執行一次 AI 去背讓 rembg 下載 u2net 模型，再重新打包。"
    )

a = Analysis(
    ["launcher.py"],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "pytest", "IPython", "notebook", "jupyter"],
    noarchive=False,
)

# conda ships MSVC runtime 14.27 (VS2019) while onnxruntime 1.28 is built against a much
# newer toolset. PyInstaller picks up conda's stale copies as dependencies, and inside the
# bundle they shadow the system ones, so onnxruntime.dll fails its DLL init routine.
# Swap in the system copies, which are newer and are what onnxruntime expects.
SYSTEM32 = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32")
MSVC_RUNTIME = (
    "msvcp140.dll",
    "msvcp140_1.dll",
    "vcruntime140.dll",
    "vcruntime140_1.dll",
    "vcomp140.dll",
)

patched_binaries = []
for dest, src, kind in a.binaries:
    if os.path.basename(dest).lower() in MSVC_RUNTIME:
        system_copy = os.path.join(SYSTEM32, os.path.basename(dest))
        if os.path.exists(system_copy):
            src = system_copy
    patched_binaries.append((dest, src, kind))
a.binaries = patched_binaries

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    exclude_binaries=True,
    name="GIFConverter",
    debug=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="GIFConverter",
)
