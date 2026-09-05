"""GitHub sync then relaunch. Never rebuilds EXE during update."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path

import httpx

CREATE_NO_WINDOW = 0x08000000


def _win_path(env: dict) -> dict:
    windir = os.environ.get("WINDIR") or "C:\\Windows"
    extra = os.pathsep.join([
        os.path.join(windir, "System32"),
        os.path.join(windir, "SysWOW64"),
        windir,
    ])
    env["PATH"] = extra + os.pathsep + (env.get("PATH") or "")
    return env


def bundle_root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    here = Path(__file__).resolve().parent
    if here.name == "engine" and (here.parent / "app.py").exists():
        return here.parent
    return here


def source_root() -> Path:
    for a in sys.argv:
        if a.startswith("--root="):
            p = Path(a.split("=", 1)[1].strip().strip('"'))
            if p.exists():
                return p
    env = os.environ.get("CINEMAKER_ROOT")
    if env and Path(env).exists():
        return Path(env)
    exe_dir = Path(sys.executable).resolve().parent
    here = Path(__file__).resolve().parent
    for c in [Path.cwd(), Path.cwd().parent, exe_dir, exe_dir.parent, here, here.parent]:
        if (c / "app.py").exists():
            return c
    return exe_dir if getattr(sys, "frozen", False) else here.parent


def root() -> Path:
    return source_root()


def wait_parent() -> None:
    pid = None
    for a in sys.argv:
        if a.startswith("--parent-pid="):
            try:
                pid = int(a.split("=", 1)[1])
            except ValueError:
                pid = None
    if not pid and os.environ.get("CINEMAKER_PARENT"):
        try:
            pid = int(os.environ["CINEMAKER_PARENT"])
        except ValueError:
            pid = None
    if not pid:
        return
    deadline = time.time() + 40
    while time.time() < deadline:
        alive = False
        if os.name == "nt":
            try:
                import ctypes
                handle = ctypes.windll.kernel32.OpenProcess(0x00100000, False, pid)
                if handle:
                    ctypes.windll.kernel32.CloseHandle(handle)
                    alive = True
            except Exception:
                alive = False
        else:
            try:
                os.kill(pid, 0)
                alive = True
            except OSError:
                alive = False
        if not alive:
            time.sleep(0.4)
            return
        time.sleep(0.2)


def load_version() -> dict:
    for path in (source_root() / "version.json", bundle_root() / "version.json"):
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
    return {"version": "0.0.0", "build": "0", "github": "axioxmedia/CineMaker", "branch": "main", "commit": ""}


def save_version(data: dict) -> None:
    try:
        (source_root() / "version.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    except OSError:
        pass


STATE = {"percent": 0, "message": "准备更新", "done": False, "error": "", "exe": ""}


def set_state(percent: int, message: str) -> None:
    STATE["percent"] = max(0, min(99, int(percent)))
    STATE["message"] = message


def github_head(meta: dict) -> dict:
    repo = meta.get("github") or "axioxmedia/CineMaker"
    branch = meta.get("branch") or "main"
    with httpx.Client(timeout=25.0, headers={"User-Agent": "CineMaker-Updater"}) as client:
        res = client.get(f"https://api.github.com/repos/{repo}/commits/{branch}")
        res.raise_for_status()
        data = res.json()
    return {"sha": data.get("sha") or "", "message": ((data.get("commit") or {}).get("message") or "")[:120]}


def sync_sources(meta: dict, dest: Path) -> str:
    dest.mkdir(parents=True, exist_ok=True)
    git = shutil.which("git")
    if (dest / ".git").exists() and git:
        set_state(18, "git pull")
        try:
            env = _win_path(os.environ.copy())
            kw = {"cwd": str(dest), "env": env, "capture_output": True, "text": True}
            if os.name == "nt":
                kw["creationflags"] = CREATE_NO_WINDOW
            subprocess.run([git, "fetch", "origin", meta.get("branch") or "main"], **kw)
            subprocess.run([git, "pull", "--ff-only", "origin", meta.get("branch") or "main"], **kw)
            got = subprocess.run([git, "rev-parse", "HEAD"], **kw)
            sha = (got.stdout or "").strip()
            if sha:
                return sha
        except FileNotFoundError:
            set_state(18, "git unavailable")
    set_state(16, "download zip")
    repo = meta.get("github") or "axioxmedia/CineMaker"
    branch = meta.get("branch") or "main"
    raw = httpx.get(
        f"https://codeload.github.com/{repo}/zip/refs/heads/{branch}",
        timeout=90.0, follow_redirects=True,
        headers={"User-Agent": "CineMaker-Updater"},
    )
    raw.raise_for_status()
    tmp = dest / "_update_src.zip"
    tmp.write_bytes(raw.content)
    extract = dest / "_update_extract"
    if extract.exists():
        shutil.rmtree(extract, ignore_errors=True)
    extract.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(tmp) as zf:
        zf.extractall(extract)
    kids = [p for p in extract.iterdir() if p.is_dir()]
    src = kids[0] if kids else extract
    skip = {".venv", "dist", "data", "_update_extract", "_update_src.zip", "CineMakerData"}
    for item in src.iterdir():
        if item.name in skip:
            continue
        target = dest / item.name
        if item.is_dir():
            if target.exists():
                shutil.rmtree(target, ignore_errors=True)
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)
    tmp.unlink(missing_ok=True)
    shutil.rmtree(extract, ignore_errors=True)
    return github_head(meta).get("sha") or ""


def find_python():
    if not getattr(sys, "frozen", False):
        if Path(sys.executable).name.lower().startswith("python"):
            return sys.executable
    for cmd in ("py", "python", "python3", "pythonw"):
        hit = shutil.which(cmd)
        if hit:
            return hit
    home = Path.home()
    for g in (
        home / "AppData/Local/Programs/Python/Python312/pythonw.exe",
        home / "AppData/Local/Programs/Python/Python311/pythonw.exe",
        home / "AppData/Local/Programs/Python/Python310/pythonw.exe",
    ):
        if g.exists():
            return str(g)
    return None


def launch_app(dest: Path) -> None:
    flags = CREATE_NO_WINDOW if os.name == "nt" else 0
    env = _win_path(os.environ.copy())
    app = dest / "app.py"
    py = find_python()
    if py and app.exists():
        exe = py
        if os.name == "nt" and exe.lower().endswith("python.exe"):
            pyw = Path(exe).with_name("pythonw.exe")
            if pyw.exists():
                exe = str(pyw)
        subprocess.Popen([exe, str(app)], cwd=str(dest), env=env, creationflags=flags, close_fds=True)
        return
    for cand in (dest / "dist" / "CineMaker.exe", dest / "CineMaker.exe"):
        if cand.exists():
            subprocess.Popen([str(cand)], cwd=str(cand.parent), env=env, creationflags=flags, close_fds=True)
            return
    raise RuntimeError("nothing to launch")


def run_job() -> None:
    meta = load_version()
    dest = source_root()
    try:
        set_state(10, "github")
        remote = github_head(meta)
        set_state(25, "sync " + (remote.get("sha") or "")[:7])
        sha = sync_sources(meta, dest) or remote.get("sha") or ""
        meta["commit"] = sha
        save_version(meta)
        STATE.update({"percent": 100, "message": "done, launching", "done": True})
        time.sleep(0.35)
        launch_app(dest)
        time.sleep(0.6)
        os._exit(0)
    except Exception as exc:
        STATE.update({"error": str(exc), "message": f"{type(exc).__name__}: {exc} @ {dest}", "done": True, "percent": 100})


def spawn_self() -> None:
    dest = source_root()
    env = _win_path(os.environ.copy())
    env["CINEMAKER_UPDATER"] = "1"
    env["CINEMAKER_ROOT"] = str(dest)
    env["CINEMAKER_PARENT"] = str(os.getpid())
    extra = ["--updater", "--parent-pid=" + str(os.getpid()), "--root=" + str(dest)]
    py = find_python()
    app = dest / "app.py"
    if py and app.exists():
        args = [py, str(app)] + extra
    elif getattr(sys, "frozen", False):
        args = [sys.executable] + extra
    else:
        raise RuntimeError("python/app.py missing")
    kw = {"cwd": str(dest), "env": env, "close_fds": True}
    if os.name == "nt":
        kw["creationflags"] = CREATE_NO_WINDOW
        kw["stdin"] = subprocess.DEVNULL
        kw["stdout"] = subprocess.DEVNULL
        kw["stderr"] = subprocess.DEVNULL
    else:
        kw["start_new_session"] = True
    subprocess.Popen(args, **kw)
