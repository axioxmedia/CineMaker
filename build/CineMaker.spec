# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

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
datas = [("static", "static"), ("plugins", "plugins"), ("engine", "engine"), ("docs", "docs"), ("version.json", "."), ("build/icon.ico", ".")]
datas += collect_data_files("webview")
a = Analysis(["app.py"], pathex=[], binaries=[], datas=datas, hiddenimports=hidden, hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=[], noarchive=False)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, a.binaries, a.datas, [], name="CineMaker", debug=False, bootloader_ignore_signals=False, strip=False, upx=False, console=False, disable_windowed_traceback=False, icon="build/icon.ico" if __import__("os").path.exists("build/icon.ico") else None)
