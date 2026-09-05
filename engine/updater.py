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
    extra = os.pathsep.join(
        [
            os.path.join(windir, "System32"),
            os.path.join(windir, "SysWOW64"),
            windir,
        ]
    )
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
    candidates = [
        Path.cwd(),
        Path.cwd().parent,
        exe_dir,
        exe_dir.parent,
        here,
        here.parent,
    ]
    for c in candidates:
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
    if not pid:
        raw = os.environ.get("CINEMAKER_PARENT")
        if raw:
            try:
                pid = int(raw)
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
                SYNCHRONIZE = 0x00100000
                handle = ctypes.windll.kernel32.OpenProcess(SYNCHRONIZE, False, pid)
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
            set_state(18, "git 不可用，改下载 zip")
    set_state(16, "下载 GitHub zip")
    repo = meta.get("github") or "axioxmedia/CineMaker"
    branch = meta.get("branch") or "main"
    raw = httpx.get(
        f"https://codeload.github.com/{repo}/zip/refs/heads/{branch}",
        timeout=90.0,
        follow_redirects=True,
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


def _spawn_log(dest: Path, text: str) -> None:
    try:
        p = dest / "cinemaker-updater-spawn.log"
        with p.open("a", encoding="utf-8") as f:
            f.write(time.strftime("%H:%M:%S ") + text + "\n")
    except OSError:
        pass


def find_python() -> str | None:
    dest = source_root()
    for name in ("pythonw.exe", "python.exe"):
        vpy = dest / ".venv" / "Scripts" / name
        if vpy.exists():
            return str(vpy)
    exe = Path(sys.executable)
    name = exe.name.lower()
    if name.startswith("python"):
        return str(exe)
    # resolve Windows py launcher to a real interpreter
    py = shutil.which("py")
    if py:
        try:
            kw = {"capture_output": True, "text": True, "timeout": 8}
            if os.name == "nt":
                kw["creationflags"] = CREATE_NO_WINDOW
            got = subprocess.run([py, "-3", "-c", "import sys; print(sys.executable)"], **kw)
            path = (got.stdout or "").strip()
            if path and Path(path).exists():
                return path
        except Exception:
            pass
    for cmd in ("pythonw", "python", "python3"):
        hit = shutil.which(cmd)
        if hit:
            return hit
    home = Path.home()
    for g in (
        home / "AppData/Local/Programs/Python/Python312/pythonw.exe",
        home / "AppData/Local/Programs/Python/Python311/pythonw.exe",
        home / "AppData/Local/Programs/Python/Python310/pythonw.exe",
        Path(r"C:\Python312\pythonw.exe"),
        Path(r"C:\Python311\pythonw.exe"),
        Path(r"C:\Python310\pythonw.exe"),
    ):
        if g.exists():
            return str(g)
    return None


def _kill_parent() -> None:
    raw = os.environ.get("CINEMAKER_PARENT")
    if not raw:
        for a in sys.argv:
            if a.startswith("--parent-pid="):
                raw = a.split("=", 1)[1]
    try:
        pid = int(raw or "0")
    except ValueError:
        pid = 0
    if not pid or pid == os.getpid():
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True,
                       creationflags=CREATE_NO_WINDOW)
    else:
        try:
            os.kill(pid, 9)
        except OSError:
            pass


def launch_app(dest: Path) -> None:
    env = _win_path(os.environ.copy())
    for k in ("CINEMAKER_UPDATER", "CINEMAKER_PARENT"):
        env.pop(k, None)
    env["CINEMAKER_ROOT"] = str(dest)
    app = dest / "app.py"
    py = find_python()
    if py and py.lower().endswith("pythonw.exe"):
        alt = str(Path(py).with_name("python.exe"))
        if Path(alt).exists():
            py = alt
    flags = 0
    if os.name == "nt":
        flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    if py and app.exists():
        args = [py, str(app)]
        _spawn_log(dest, "launch " + " ".join(args))
        subprocess.Popen(args, cwd=str(dest), env=env, creationflags=flags, close_fds=True)
        return
    for cand in (dest / "dist" / "CineMaker.exe", dest / "CineMaker.exe"):
        if cand.exists():
            _spawn_log(dest, "launch exe " + str(cand))
            subprocess.Popen([str(cand)], cwd=str(cand.parent), env=env, creationflags=flags, close_fds=True)
            return
    raise RuntimeError("没有可启动的程序（需要 python + app.py 或 dist/CineMaker.exe）")


def run_job() -> None:
    meta = load_version()
    dest = source_root()
    try:
        set_state(5, "目标 " + str(dest))
        set_state(10, "读取 GitHub")
        remote = github_head(meta)
        set_state(25, "同步 " + (remote.get("sha") or "")[:7])
        sha = sync_sources(meta, dest) or remote.get("sha") or ""
        fresh = load_version()
        fresh["commit"] = sha
        if remote.get("sha"):
            fresh["commit"] = sha
        save_version(fresh)
        set_state(90, "正在启动编辑器")
        STATE["percent"] = 100
        STATE["message"] = "完成，正在启动"
        STATE["done"] = True
        time.sleep(0.2)
        _kill_parent()
        time.sleep(1.2)
        launch_app(dest)
        time.sleep(0.8)
        os._exit(0)
    except Exception as exc:
        STATE["error"] = str(exc)
        STATE["message"] = f"{type(exc).__name__}: {exc} @ {dest}"
        STATE["done"] = True
        STATE["percent"] = 100


def spawn_self() -> None:
    dest = source_root()
    env = _win_path(os.environ.copy())
    env["CINEMAKER_UPDATER"] = "1"
    env["CINEMAKER_ROOT"] = str(dest)
    env["CINEMAKER_PARENT"] = str(os.getpid())
    extra = ["--updater", "--parent-pid=" + str(os.getpid()), "--root=" + str(dest)]
    py = find_python()
    app = dest / "app.py"
    frozen_exe = Path(sys.executable) if getattr(sys, "frozen", False) else None
    if py and app.exists():
        runner = py
        if os.name == "nt" and runner.lower().endswith("python.exe"):
            pyw = Path(runner).with_name("pythonw.exe")
            if pyw.exists():
                runner = str(pyw)
        args = [runner, str(app)] + extra
    elif frozen_exe and frozen_exe.exists():
        args = [str(frozen_exe)] + extra
    else:
        _spawn_log(dest, "spawn abort py=%s app=%s frozen=%s" % (py, app, frozen_exe))
        raise RuntimeError("找不到 python / app.py / CineMaker.exe")
    _spawn_log(dest, "spawn " + " ".join(args))
    kw = {"cwd": str(dest), "env": env, "close_fds": True}
    if os.name == "nt":
        # Do not use DETACHED+NEW_GROUP. CREATE_NO_WINDOW hides console;
        # pythonw/frozen windowed exe can still show the frameless webview.
        kw["creationflags"] = CREATE_NO_WINDOW
        kw["stdin"] = subprocess.DEVNULL
        kw["stdout"] = subprocess.DEVNULL
        kw["stderr"] = subprocess.DEVNULL
    else:
        kw["start_new_session"] = True
    proc = subprocess.Popen(args, **kw)
    _spawn_log(dest, "pid %s" % proc.pid)
    time.sleep(0.35)
