# -*- mode: python ; coding: utf-8 -*-
import os
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(SPEC)))

hidden = [
    "uvicorn", "uvicorn.logging", "uvicorn.loops", "uvicorn.loops.auto", "uvicorn.loops.asyncio",
    "uvicorn.protocols", "uvicorn.protocols.http", "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl", "uvicorn.protocols.http.httptools_impl",
    "uvicorn.protocols.websockets", "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan", "uvicorn.lifespan.on",
    "anyio", "anyio._backends._asyncio", "httpx", "httpcore", "h11", "httptools",
    "starlette", "fastapi", "pydantic", "webview",
    "webview.platforms.winforms", "webview.platforms.edgechromium",
    "engine", "engine.axioxmedia", "engine.aio_logo", "engine.drive_store",
    "engine.plugin_host", "engine.export_pack", "engine.project_store",
    "engine.assets_aio", "engine.updater",
]
hidden += collect_submodules("uvicorn")
hidden += collect_submodules("anyio")

def pair(name, dest=None):
    return (os.path.join(ROOT, name), dest or name)

datas = [pair("static"), pair("plugins"), pair("engine"), pair("docs"), pair("version.json", ".")]
icon = os.path.join(ROOT, "build", "icon.ico")
if os.path.exists(icon):
    datas.append((icon, "."))
datas += collect_data_files("webview")

a = Analysis(
    [os.path.join(ROOT, "app.py")],
    pathex=[ROOT],
    binaries=[],
    datas=datas,
    hiddenimports=hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz, a.scripts, a.binaries, a.datas, [],
    name="CineMaker", debug=False, bootloader_ignore_signals=False,
    strip=False, upx=False, console=False, disable_windowed_traceback=False,
    icon=icon if os.path.exists(icon) else None,
)
