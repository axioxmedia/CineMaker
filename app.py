"""CineMaker — interactive cine-game editor (graph + plugins + assets)."""

from __future__ import annotations

import json
import os
import shutil
import sys
import traceback
import time
import threading
from pathlib import Path

from engine.export_pack import write_pack, write_h5_pack
from engine.project_store import ProjectStore

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from engine.axioxmedia import apply_hwnd_icon, axiox_window_title, aio_logo_png, aio_watermark
from engine.drive_store import DriveStore
from engine.plugin_host import PluginHost
from engine.updater import load_version, github_head, spawn_self, STATE as UPDATE_STATE, run_job, wait_parent


def app_root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


def data_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent / "CineMakerData"
    return app_root() / "data"


ROOT = app_root()
STATIC = ROOT / "static"
DATA = data_root()
DATA.mkdir(parents=True, exist_ok=True)
LOG_FILE = (Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else ROOT) / "cinemaker.log"

drive = DriveStore(DATA / "drive")
plugins = PluginHost(ROOT / "plugins", DATA / "plugins")
projects = ProjectStore(DATA / "projects")
legacy = DATA / "graph.json"
if legacy.exists() and not projects.load_graph().get("nodes"):
    try:
        projects.save_graph(json.loads(legacy.read_text(encoding="utf-8")))
    except json.JSONDecodeError:
        pass


def discover_pack() -> Path | None:
    env = os.environ.get("CINEMAKER_PACK")
    if env and (Path(env) / "game.json").exists():
        return Path(env)
    here = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else ROOT
    if (here / "game.json").exists():
        return here
    return None


PACK = discover_pack()
PLAYER_MODE = "--player" in sys.argv or PACK is not None

app = FastAPI(title="CineMaker", version="0.1.0")
WINDOW_HOLDER = {}

def hide_editor_window() -> None:
    """Hide main editor so updater can show; do not quit, do not stay on taskbar."""
    w = WINDOW_HOLDER.get("w")
    try:
        if w is not None:
            if hasattr(w, "hide"):
                w.hide()
            elif hasattr(w, "minimize"):
                w.minimize()
    except Exception as exc:
        write_log("hide window: " + str(exc))
    if os.name != "nt":
        return
    try:
        import ctypes
        user32 = ctypes.windll.user32
        hwnd = 0
        try:
            if w is not None and getattr(w, "native", None) is not None:
                hwnd = int(w.native.Handle.ToInt32())
        except Exception:
            hwnd = 0
        if not hwnd:
            hwnd = int(user32.GetForegroundWindow())
        if hwnd:
            GWL_EXSTYLE = -20
            WS_EX_TOOLWINDOW = 0x00000080
            WS_EX_APPWINDOW = 0x00040000
            style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            style = (style | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW
            user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
            user32.ShowWindow(hwnd, 0)  # SW_HIDE
            write_log("editor hidden hwnd=" + str(hwnd))
    except Exception as exc:
        write_log("hide hwnd: " + str(exc))


@app.get("/assets/vendor/three/{rest:path}")
def vendor_three(rest: str):
    path = (STATIC / "vendor" / "three" / rest).resolve()
    root = (STATIC / "vendor" / "three").resolve()
    if not str(path).startswith(str(root)) or not path.is_file():
        raise HTTPException(404, "missing " + rest)
    mime = "text/javascript" if path.suffix == ".js" else "application/octet-stream"
    return FileResponse(path, media_type=mime)


app.mount("/assets", StaticFiles(directory=STATIC), name="assets")



def write_log(msg: str) -> None:
    try:
        with LOG_FILE.open("a", encoding="utf-8") as fh:
            fh.write(msg.rstrip() + "\n")
    except OSError:
        pass


def load_graph() -> dict:
    return projects.load_graph()


def save_graph(payload: dict) -> dict:
    return projects.save_graph(payload)


class GraphBody(BaseModel):
    id: str = "main"
    revision: int = 0
    version: int = 2
    nodes: list[dict] = Field(default_factory=list)
    links: list[dict] = Field(default_factory=list)
    variables: list[dict] = Field(default_factory=list)
    comments: list[dict] = Field(default_factory=list)
    levels: list[dict] = Field(default_factory=list)
    levelId: str = "lv0"
    pluginData: dict = Field(default_factory=dict)
    localization: dict = Field(default_factory=dict)
    gameInstance: dict = Field(default_factory=dict)
    gameMode: dict = Field(default_factory=dict)
    library: dict = Field(default_factory=dict)
    workspace: str = "scene"
    instanceGraph: dict = Field(default_factory=dict)
    modeGraph: dict = Field(default_factory=dict)


class IdsBody(BaseModel):
    ids: list[str]
    parent_id: str | None = None
    starred: bool = True
    name: str | None = None


class PluginToggle(BaseModel):
    enabled: bool




@app.get("/api/version")
def api_version() -> dict:
    meta = load_version()
    return {
        "name": meta.get("name") or "CineMaker",
        "version": meta.get("version") or "0.0.0",
        "build": meta.get("build") or "0",
        "commit": (meta.get("commit") or "")[:12],
        "github": meta.get("github"),
    }


@app.get("/api/update/check")
def api_update_check() -> dict:
    meta = load_version()
    local = (meta.get("commit") or "").strip()
    try:
        remote = github_head(meta)
    except Exception as exc:
        return {
            "ok": False,
            "available": False,
            "build": meta.get("build"),
            "version": meta.get("version"),
            "error": str(exc),
        }
    sha = remote.get("sha") or ""
    remote_build = ""
    remote_ver = ""
    try:
        raw = httpx.get(
            f"https://raw.githubusercontent.com/{meta.get('github') or 'axioxmedia/CineMaker'}/"
            f"{meta.get('branch') or 'main'}/version.json",
            timeout=12.0,
            headers={"User-Agent": "CineMaker"},
        )
        if raw.status_code == 200:
            info = raw.json()
            remote_build = str(info.get("build") or "")
            remote_ver = str(info.get("version") or "")
    except Exception:
        pass
    available = bool(remote_build) and remote_build != str(meta.get("build") or "")
    if not available and sha and local:
        available = sha[:12] != local[:12]
    return {
        "ok": True,
        "available": available,
        "build": meta.get("build"),
        "version": meta.get("version"),
        "remote_build": remote_build,
        "remote_version": remote_ver,
        "local": local[:12],
        "remote": sha[:12],
        "message": remote.get("message") or "",
    }


@app.get("/api/update/status")
def api_update_status() -> dict:
    return UPDATE_STATE


@app.post("/api/update/run")
def api_update_run() -> dict:
    err = ""
    try:
        spawn_self()
    except Exception as exc:
        err = str(exc)
        write_log("update spawn: " + traceback.format_exc())
    def _leave() -> None:
        time.sleep(0.4)
        hide_editor_window()
    threading.Thread(target=_leave, daemon=True).start()
    return {"ok": True, "spawned": True, "error": err}


@app.get("/update")
def update_page() -> FileResponse:
    return FileResponse(STATIC / "update.html")

@app.get("/")
def index() -> FileResponse:
    page = "play.html" if PLAYER_MODE else "index.html"
    return FileResponse(STATIC / page)


@app.get("/play")
def play_page() -> FileResponse:
    return FileResponse(STATIC / "play.html")


@app.get("/api/pack")
def api_pack() -> dict:
    if PACK and (PACK / "game.json").exists():
        return json.loads((PACK / "game.json").read_text(encoding="utf-8"))
    return {"title": "CineMaker", "graph": load_graph(), "media": {}}


@app.get("/pack-media/{name}")
def pack_media(name: str):
    if not PACK:
        raise HTTPException(404)
    path = (PACK / "media" / Path(name).name).resolve()
    if not str(path).startswith(str((PACK / "media").resolve())) or not path.exists():
        raise HTTPException(404)
    return FileResponse(path)


class ExportBody(BaseModel):
    title: str = "Game"
    dest: str = ""
    platform: str = "exe"


@app.post("/api/export")
def api_export(body: ExportBody) -> dict:
    dest = Path(body.dest) if body.dest else (DATA / "exports")
    dest.mkdir(parents=True, exist_ok=True)
    platform = (body.platform or "exe").lower()
    if platform == "h5":
        folder = write_h5_pack(dest, body.title or "Game", load_graph(), drive, STATIC)
        return {"ok": True, "path": str(folder), "platform": "h5"}
    exe = Path(sys.executable) if getattr(sys, "frozen", False) else None
    folder = write_pack(dest, body.title or "Game", load_graph(), drive, exe, ROOT)
    return {"ok": True, "path": str(folder), "platform": "exe"}


@app.get("/brand/logo.png")
def brand_logo() -> Response:
    return Response(content=aio_logo_png(), media_type="image/png")


@app.get("/api/defaults")
def defaults() -> dict:
    return {
        "product": "CineMaker",
        "watermark": aio_watermark(),
        "dataDir": str(DATA),
        "project": projects.current_id(),
        "playerMode": PLAYER_MODE,
        **{k: load_version().get(k) for k in ("version", "build")},
    }


CORE_PLUGIN_HIDE = {"core.graph", "core.assets"}


@app.get("/api/plugins")
def list_plugins() -> dict:
    items = [p for p in plugins.list_plugins() if p["id"] not in CORE_PLUGIN_HIDE]
    return {"plugins": items}


@app.post("/api/plugins/import")
async def import_plugin(file: UploadFile = File(...)) -> dict:
    raw = await file.read()
    try:
        return plugins.import_zip(raw)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


def _sdk_bytes() -> bytes:
    import io
    import zipfile

    buf = io.BytesIO()
    docs = ROOT / "docs" / "PLUGIN.md"
    sample = ROOT / "plugins" / "example.hello"
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        if docs.exists():
            zf.write(docs, "PLUGIN.md")
        else:
            zf.writestr("PLUGIN.md", "# CineMaker plugin SDK\nTalk to CineHost schema 3.\n")
        if sample.exists():
            for p in sample.rglob("*"):
                if p.is_file():
                    zf.write(p, Path("example.hello") / p.relative_to(sample))
        zf.writestr("README.txt", "Import example.hello.zip from the plugin window.\n")
    return buf.getvalue()


@app.get("/api/plugins/sdk.zip")
def plugin_sdk():
    return Response(content=_sdk_bytes(), media_type="application/zip",
                    headers={"Content-Disposition": "attachment; filename=cinemaker-plugin-sdk.zip"})


@app.post("/api/plugins/sdk/save")
def plugin_sdk_save() -> dict:
    downloads = Path.home() / "Downloads"
    downloads.mkdir(parents=True, exist_ok=True)
    dest = downloads / "cinemaker-plugin-sdk.zip"
    dest.write_bytes(_sdk_bytes())
    return {"ok": True, "filename": dest.name, "path": str(dest), "folder": str(dest.parent)}


@app.post("/api/plugins/{plugin_id}/enable")
def enable_plugin(plugin_id: str, body: PluginToggle) -> dict:
    item = plugins.set_enabled(plugin_id, body.enabled)
    if not item:
        raise HTTPException(404, "plugin not found")
    return item


@app.delete("/api/plugins/{plugin_id}")
def uninstall_plugin(plugin_id: str) -> dict:
    try:
        return plugins.uninstall(plugin_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/plugins/catalog")
def plugin_catalog() -> dict:
    return {"plugins": plugins.catalog()}


@app.post("/api/plugins/catalog/{plugin_id}/save")
def save_sample_plugin(plugin_id: str) -> dict:
    downloads = Path.home() / "Downloads"
    downloads.mkdir(parents=True, exist_ok=True)
    dest = downloads / f"{plugin_id}.zip"
    try:
        packed = plugins.pack_zip(plugin_id, dest)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return {"ok": True, "id": plugin_id, "filename": packed.name, "path": str(packed), "folder": str(packed.parent)}


@app.get("/api/plugins/catalog/{plugin_id}/download")
def download_sample_plugin(plugin_id: str):
    dest = DATA / "downloads" / f"{plugin_id}.zip"
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        packed = plugins.pack_zip(plugin_id, dest)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return Response(
        content=packed.read_bytes(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{plugin_id}.zip"'},
    )


@app.get("/api/plugins/{plugin_id}/file/{rel:path}")
def plugin_file(plugin_id: str, rel: str):
    path = plugins.resolve_file(plugin_id, rel)
    if not path:
        raise HTTPException(404, "missing plugin file")
    mime = "application/javascript" if path.suffix == ".js" else "application/json"
    return FileResponse(path, media_type=mime)


@app.get("/api/graph")
def get_graph() -> dict:
    return load_graph()


@app.put("/api/graph")
def put_graph(body: GraphBody) -> dict:
    return save_graph(body.model_dump())


class ProjectBody(BaseModel):
    name: str = "未命名"
    path: str = ""
    packName: str = ""
    plugins: list[str] = Field(default_factory=list)


@app.get("/api/projects")
def list_projects() -> dict:
    return {"projects": projects.list_projects(), "current": projects.current_id(), "status": projects.status()}


@app.get("/api/projects/status")
def project_status() -> dict:
    return projects.status()


@app.post("/api/projects")
def new_project(body: ProjectBody) -> dict:
    return projects.create(body.name, body.path or None)


@app.post("/api/projects/{pid}/meta")
def patch_project(pid: str, body: ProjectBody) -> dict:
    return projects.patch_meta(pid, name=body.name, path=body.path or None, packName=body.packName or None)


@app.post("/api/projects/{pid}/relocate")
def relocate_project(pid: str, body: ProjectBody) -> dict:
    return projects.relocate(pid, body.path, body.name)


@app.post("/api/projects/{pid}/confirm-plugins")
def confirm_plugins(pid: str, body: ProjectBody) -> dict:
    return projects.confirm_plugins(pid, body.plugins)


@app.post("/api/projects/{pid}/open")
def open_project(pid: str) -> dict:
    projects.set_current(pid)
    return {"ok": True, "graph": projects.load_graph(), "project": pid}


class SaveSlotBody(BaseModel):
    slot: str = "1"
    node_id: str = ""
    vars: dict = Field(default_factory=dict)
    seen: list[str] = Field(default_factory=list)


@app.get("/api/saves")
def get_saves() -> dict:
    extra = PACK if PLAYER_MODE and PACK else None
    return projects.load_saves(extra)


@app.post("/api/saves")
def post_save(body: SaveSlotBody) -> dict:
    extra = PACK if PLAYER_MODE and PACK else None
    return projects.write_slot(
        body.slot,
        {"node_id": body.node_id, "vars": body.vars, "seen": body.seen, "ts": time.time()},
        extra,
    )


@app.get("/api/graph/validate")
def validate_graph() -> dict:
    from engine.export_pack import validate_graph as vg

    return vg(load_graph(), drive)


@app.get("/api/node-types")
def node_types() -> dict:
    types: list[str] = []
    for plug in plugins.list_plugins():
        if not plug.get("enabled"):
            continue
        types.extend(plug.get("contributes", {}).get("nodes") or [])
    return {"types": types}


@app.get("/api/drive/folders")
def drive_folders(parent: str | None = None) -> dict:
    return {"folders": drive.folders(parent or None)}


@app.get("/api/drive/entries")
def drive_entries(parent: str | None = None, view: str = "folder") -> dict:
    if view == "trash":
        items = drive.list_entries(trash=True)
    elif view == "starred":
        items = drive.starred()
    else:
        items = drive.list_entries(parent or None)
    return {"entries": items, "parent": parent}


@app.post("/api/drive/folders")
def drive_mkdir(name: str = Form(...), parent_id: str | None = Form(None)) -> dict:
    return drive.mkdir(name, parent_id)


@app.post("/api/drive/upload")
async def drive_upload(file: UploadFile = File(...), parent_id: str | None = Form(None)) -> dict:
    raw = await file.read()
    return drive.save_upload(raw, file.filename or "file.bin", parent_id)


@app.post("/api/drive/move")
def drive_move(body: IdsBody) -> dict:
    drive.move(body.ids, body.parent_id)
    return {"ok": True}


@app.post("/api/file-entries/star")
def drive_star(body: IdsBody) -> dict:
    drive.star(body.ids, body.starred)
    return {"ok": True}


@app.post("/api/drive/trash")
def drive_trash(body: IdsBody) -> dict:
    drive.trash(body.ids)
    return {"ok": True}


@app.post("/api/drive/restore")
def drive_restore(body: IdsBody) -> dict:
    drive.restore(body.ids)
    return {"ok": True}


@app.post("/api/drive/purge")
def drive_purge(body: IdsBody) -> dict:
    drive.purge(body.ids)
    return {"ok": True}


@app.post("/api/drive/rename")
def drive_rename(body: IdsBody) -> dict:
    if not body.ids or not body.name:
        raise HTTPException(400, "name required")
    item = drive.rename(body.ids[0], body.name)
    if not item:
        raise HTTPException(404)
    return item


@app.get("/api/user/space-usage")
def space_usage() -> dict:
    return drive.space_usage()


@app.get("/api/drive/file/{entry_id}/raw")
def drive_raw(entry_id: str):
    item = drive.get(entry_id)
    if not item:
        raise HTTPException(404)
    try:
        meta, data = drive.payload(entry_id)
    except FileNotFoundError:
        raise HTTPException(404) from None
    name = item.get("name") or entry_id
    mime = meta.get("mime") or item.get("mime") or "application/octet-stream"
    return Response(content=data, media_type=mime, headers={"Content-Disposition": f'inline; filename="{name}"'})


@app.get("/api/drive/file/{entry_id}/thumb")
def drive_thumb(entry_id: str):
    path = drive.thumb_path(entry_id)
    if not path:
        raise HTTPException(404)
    return FileResponse(path)


def _free_port(preferred: int = 8787) -> int:
    import socket

    for port in (preferred, 8788, 8789, 8790, 0):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(("127.0.0.1", port))
            chosen = int(sock.getsockname()[1])
        except OSError:
            chosen = -1
        finally:
            sock.close()
        if chosen > 0:
            return chosen
    raise RuntimeError("no local port")


def ensure_stdio() -> None:
    if sys.stdout is None:
        sys.stdout = LOG_FILE.open("a", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = LOG_FILE.open("a", encoding="utf-8")


def run_server(host: str, port: int, reload: bool = False) -> None:
    import uvicorn

    ensure_stdio()
    if reload:
        uvicorn.run(app, host=host, port=port, reload=True, log_level="warning", log_config=None)
        return
    config = uvicorn.Config(
        app,
        host=host,
        port=port,
        log_level="warning",
        log_config=None,
        lifespan="on",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = False
    server.run()


def wait_ready(url: str, server_error: list[str], timeout: float = 30.0) -> None:
    import time

    deadline = time.time() + timeout
    while time.time() < deadline:
        if server_error:
            raise RuntimeError(server_error[0])
        try:
            with httpx.Client(timeout=0.8, trust_env=False) as http:
                if http.get(url).status_code < 500:
                    return
        except httpx.HTTPError:
            time.sleep(0.2)
    extra = f"\n{server_error[0]}" if server_error else ""
    raise RuntimeError(f"server timeout {url}{extra}\nlog={LOG_FILE}")


def run_desktop() -> None:
    import threading
    import webbrowser

    write_log(f"start frozen={getattr(sys, 'frozen', False)}")
    port = _free_port()
    url = f"http://127.0.0.1:{port}"
    server_error: list[str] = []

    def _serve() -> None:
        try:
            run_server("127.0.0.1", port, reload=False)
        except Exception:
            server_error.append(traceback.format_exc())
            write_log(server_error[-1])

    thread = threading.Thread(target=_serve, name="uvicorn", daemon=True)
    thread.start()
    wait_ready(f"{url}/api/defaults", server_error)

    try:
        import webview

        holder = WINDOW_HOLDER
        holder.clear()

        class Bridge:
            def start_update(self) -> str:
                try:
                    spawn_self()
                except Exception as exc:
                    write_log("bridge update: " + str(exc))
                    return str(exc)
                hide_editor_window()
                return "ok"

            def pick_folder(self) -> str:
                w = holder.get("w")
                if not w:
                    return ""
                picked = w.create_file_dialog(webview.FOLDER_DIALOG)
                if picked:
                    return picked[0]
                return ""

            def open_folder(self, path: str) -> bool:
                target = Path(path)
                if target.is_file():
                    target = target.parent
                if not target.exists():
                    return False
                if os.name == "nt":
                    os.startfile(target)  # type: ignore[attr-defined]
                else:
                    import subprocess

                    subprocess.Popen(["xdg-open", str(target)])
                return True

        start_url = f"{url}/play" if PLAYER_MODE else url
        window = webview.create_window(
            title=axiox_window_title(),
            url=start_url,
            width=1280 if PLAYER_MODE else 1600,
            height=800 if PLAYER_MODE else 960,
            min_size=(800, 560),
            background_color="#0b0d12",
            js_api=Bridge(),
        )
        holder["w"] = window

        def paint_chrome(_=None) -> None:
            if os.name != "nt":
                return
            try:
                import ctypes

                hwnd = int(window.native.Handle.ToInt32())
                apply_hwnd_icon(hwnd)
                value = ctypes.c_int(1)
                for attr in (20, 19):
                    ctypes.windll.dwmapi.DwmSetWindowAttribute(
                        hwnd, attr, ctypes.byref(value), ctypes.sizeof(value)
                    )
            except Exception as exc:
                write_log(f"chrome: {exc}")

        try:
            window.events.shown += paint_chrome
        except Exception:
            pass
        webview.start()
    except Exception:
        write_log(traceback.format_exc())
        webbrowser.open(url)
        while thread.is_alive():
            thread.join(timeout=0.5)



def run_updater() -> None:
    import threading
    import webview
    from engine.updater import set_state

    write_log("updater window start")
    set_state(0, "正在更新")
    port = _free_port(8791)
    thread = threading.Thread(target=run_server, args=("127.0.0.1", port, False), daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{port}/update"
    window = webview.create_window(
        title="",
        url=url,
        width=520,
        height=240,
        resizable=False,
        frameless=True,
        easy_drag=True,
        on_top=True,
        background_color="#0b0d12",
    )

    def _work() -> None:
        set_state(2, "开始同步")
        time.sleep(0.4)
        run_job()

    threading.Thread(target=_work, daemon=True).start()

    def block_close():
        return False

    try:
        window.events.closing += block_close
    except Exception:
        pass
    try:
        webview.start()
    except Exception:
        write_log("updater webview: " + traceback.format_exc())
        show_error("updater window failed:\n" + traceback.format_exc())


def show_error(text: str) -> None:
    try:
        if os.name == "nt":
            import ctypes

            ctypes.windll.user32.MessageBoxW(0, text, "CineMaker", 0x10)
    except Exception:
        pass
    write_log(text)


if __name__ == "__main__":
    import multiprocessing

    multiprocessing.freeze_support()
    ensure_stdio()
    try:
        if "--updater" in sys.argv or os.environ.get("CINEMAKER_UPDATER") == "1":
            run_updater()
        else:
            desktop = "--web" not in sys.argv and os.environ.get("CINEMAKER_WEB") != "1"
            if desktop:
                run_desktop()
            else:
                run_server("127.0.0.1", _free_port(8787), reload=not getattr(sys, "frozen", False))
    except Exception:
        show_error("start failed:\n\n" + traceback.format_exc() + f"\n\n{LOG_FILE}")
        raise
