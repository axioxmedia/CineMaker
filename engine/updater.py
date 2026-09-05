"""Silent GitHub sync + hidden build, then relaunch CineMaker."""
from __future__ import annotations
import json, os, shutil, subprocess, sys, time, zipfile
from pathlib import Path
import httpx

CREATE_NO_WINDOW = 0x08000000

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
            p = Path(a.split("=", 1)[1])
            if p.exists():
                return p
    env = os.environ.get("CINEMAKER_ROOT")
    if env and Path(env).exists():
        return Path(env)
    here = Path(__file__).resolve().parent if not getattr(sys, "frozen", False) else Path(sys.executable).resolve().parent
    for c in [here, here.parent, Path.cwd(), Path.cwd().parent]:
        if (c / "app.py").exists():
            return c
    return here

def root() -> Path:
    return source_root()

def wait_parent() -> None:
    pid = None
    for a in sys.argv:
        if a.startswith("--parent-pid="):
            try: pid = int(a.split("=", 1)[1])
            except ValueError: pid = None
    if not pid and os.environ.get("CINEMAKER_PARENT"):
        try: pid = int(os.environ["CINEMAKER_PARENT"])
        except ValueError: pid = None
    if not pid: return
    deadline = time.time() + 45
    while time.time() < deadline:
        if os.name == "nt":
            r = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True, creationflags=CREATE_NO_WINDOW)
            out = (r.stdout or "") + (r.stderr or "")
            if str(pid) not in out or "No tasks" in out:
                time.sleep(0.4); return
        else:
            try: os.kill(pid, 0)
            except OSError:
                time.sleep(0.3); return
        time.sleep(0.25)

def load_version() -> dict:
    path = source_root() / "version.json"
    if not path.exists(): path = bundle_root() / "version.json"
    if path.exists():
        try: return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError: pass
    return {"version": "0.0.0", "build": "0", "github": "axioxmedia/CineMaker", "branch": "main", "commit": ""}

def save_version(data: dict) -> None:
    for dest in (source_root() / "version.json", root() / "version.json"):
        try: dest.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except OSError: pass

STATE = {"percent": 2, "message": "准备更新", "done": False, "error": "", "exe": ""}

def set_state(percent: int, message: str) -> None:
    STATE["percent"] = max(0, min(99, int(percent)))
    STATE["message"] = message

def run_hidden(args, cwd: Path, env=None):
    kw = {"cwd": str(cwd), "capture_output": True, "text": True, "env": env or os.environ.copy()}
    if os.name == "nt": kw["creationflags"] = CREATE_NO_WINDOW
    return subprocess.run(args, **kw)

def github_head(meta: dict) -> dict:
    repo = meta.get("github") or "axioxmedia/CineMaker"
    branch = meta.get("branch") or "main"
    with httpx.Client(timeout=20.0, headers={"User-Agent": "CineMaker-Updater"}) as client:
        res = client.get(f"https://api.github.com/repos/{repo}/commits/{branch}")
        res.raise_for_status()
        data = res.json()
    return {"sha": data.get("sha") or "", "message": ((data.get("commit") or {}).get("message") or "")[:120]}

def sync_sources(meta: dict, dest: Path) -> str:
    if (dest / ".git").exists() and shutil.which("git"):
        set_state(18, "git pull")
        try:
            run_hidden(["git", "fetch", "origin", meta.get("branch") or "main"], dest)
            run_hidden(["git", "pull", "--ff-only", "origin", meta.get("branch") or "main"], dest)
            got = run_hidden(["git", "rev-parse", "HEAD"], dest)
            sha = (got.stdout or "").strip()
            if sha: return sha
        except FileNotFoundError:
            set_state(18, "no git, zip fallback")
    set_state(16, "download zip")
    repo = meta.get("github") or "axioxmedia/CineMaker"
    branch = meta.get("branch") or "main"
    raw = httpx.get(f"https://codeload.github.com/{repo}/zip/refs/heads/{branch}", timeout=60.0, follow_redirects=True, headers={"User-Agent": "CineMaker-Updater"})
    raw.raise_for_status()
    tmp = dest / "_update_src.zip"
    tmp.write_bytes(raw.content)
    extract = dest / "_update_extract"
    if extract.exists(): shutil.rmtree(extract, ignore_errors=True)
    extract.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(tmp) as zf: zf.extractall(extract)
    kids = [p for p in extract.iterdir() if p.is_dir()]
    src = kids[0] if kids else extract
    skip = {".venv", "dist", "data", "_update_extract", "_update_src.zip", "CineMakerData"}
    for item in src.iterdir():
        if item.name in skip: continue
        target = dest / item.name
        if item.is_dir():
            if target.exists(): shutil.rmtree(target, ignore_errors=True)
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)
    tmp.unlink(missing_ok=True)
    shutil.rmtree(extract, ignore_errors=True)
    return github_head(meta).get("sha") or ""

def silent_build(dest: Path) -> Path:
    bat = dest / "build" / "build_exe.bat"
    if not bat.exists(): bat = dest / "build_exe.bat"
    if not bat.exists(): raise RuntimeError("missing build/build_exe.bat")
    env = os.environ.copy(); env["CINEMAKER_SILENT"] = "1"
    set_state(40, "silent build")
    kw = {"cwd": str(dest), "env": env, "capture_output": True, "text": True}
    if os.name == "nt":
        kw["creationflags"] = CREATE_NO_WINDOW
        cmd = ["cmd.exe", "/c", str(bat)]
    else:
        cmd = ["bash", str(bat)]
    proc = subprocess.run(cmd, **kw)
    (dest / "cinemaker-update.log").write_text(((proc.stdout or "") + "\n" + (proc.stderr or ""))[-80000:], encoding="utf-8")
    if proc.returncode != 0: raise RuntimeError("build failed, see cinemaker-update.log")
    exe = dest / "dist" / "CineMaker.exe"
    if not exe.exists(): raise RuntimeError("no dist/CineMaker.exe")
    return exe

def launch_app(exe, dest: Path) -> None:
    flags = CREATE_NO_WINDOW if os.name == "nt" else 0
    app = dest / "app.py"
    py = sys.executable
    if py.lower().endswith("python.exe"):
        pyw = Path(py).with_name("pythonw.exe")
        if pyw.exists(): py = str(pyw)
    if app.exists() and (not exe or not getattr(sys, "frozen", False)):
        subprocess.Popen([py, str(app)], cwd=str(dest), creationflags=flags, close_fds=True); return
    if exe and Path(exe).exists():
        subprocess.Popen([str(exe)], cwd=str(Path(exe).parent), creationflags=flags, close_fds=True); return
    raise RuntimeError("nothing to launch")

def run_job() -> None:
    meta = load_version(); dest = source_root()
    try:
        set_state(8, "github head")
        remote = github_head(meta)
        set_state(22, "sync " + (remote.get("sha") or "")[:7])
        sha = sync_sources(meta, dest) or remote.get("sha") or ""
        exe = None
        if (dest / "app.py").exists() and not getattr(sys, "frozen", False):
            set_state(80, "restart editor")
        elif (dest / "build" / "build_exe.bat").exists() or (dest / "build_exe.bat").exists():
            exe = silent_build(dest)
        meta["commit"] = sha; save_version(meta)
        STATE.update({"exe": str(exe or ""), "percent": 100, "message": "done", "done": True})
        time.sleep(0.4); launch_app(exe, dest); time.sleep(0.8); os._exit(0)
    except Exception as exc:
        STATE.update({"error": str(exc), "message": str(exc) + " @ " + str(dest), "done": True, "percent": 100})

def spawn_self() -> None:
    dest = source_root(); rootp = bundle_root()
    env = os.environ.copy()
    env["CINEMAKER_UPDATER"] = "1"
    env["CINEMAKER_ROOT"] = str(dest)
    env["CINEMAKER_PARENT"] = str(os.getpid())
    extra = ["--updater", "--parent-pid=" + str(os.getpid()), "--root=" + str(dest)]
    py = sys.executable
    if os.name == "nt" and py.lower().endswith("python.exe"):
        pyw = Path(py).with_name("pythonw.exe")
        if pyw.exists(): py = str(pyw)
    args = [py, str(rootp / "app.py")] + extra if (rootp / "app.py").exists() else [sys.executable] + extra
    kw = {"cwd": str(dest), "env": env, "close_fds": True}
    if os.name == "nt":
        kw["creationflags"] = CREATE_NO_WINDOW
        kw["stdin"] = subprocess.DEVNULL; kw["stdout"] = subprocess.DEVNULL; kw["stderr"] = subprocess.DEVNULL
    else:
        kw["start_new_session"] = True
    subprocess.Popen(args, **kw)
