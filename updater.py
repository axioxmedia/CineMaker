"""Silent GitHub sync + hidden build_exe.bat, then relaunch CineMaker."""

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


def root() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


def workdir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return root()


def load_version() -> dict:
    path = root() / "version.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"version": "0.0.0", "build": "0", "github": "axioxmedia/CineMaker", "branch": "main", "commit": ""}


def save_version(data: dict) -> None:
    dest = workdir() / "version.json"
    try:
        dest.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except OSError:
        pass
    bundled = root() / "version.json"
    try:
        bundled.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except OSError:
        pass


STATE = {
    "percent": 2,
    "message": "准备更新",
    "done": False,
    "error": "",
    "exe": "",
}


def set_state(percent: int, message: str) -> None:
    STATE["percent"] = max(0, min(99, int(percent)))
    STATE["message"] = message


def github_head(meta: dict) -> dict:
    repo = meta.get("github") or "axioxmedia/CineMaker"
    branch = meta.get("branch") or "main"
    url = f"https://api.github.com/repos/{repo}/commits/{branch}"
    with httpx.Client(timeout=20.0, headers={"User-Agent": "CineMaker-Updater"}) as client:
        res = client.get(url)
        res.raise_for_status()
        data = res.json()
    return {"sha": data.get("sha") or "", "message": ((data.get("commit") or {}).get("message") or "")[:120]}


def sync_sources(meta: dict, dest: Path) -> str:
    git_dir = dest / ".git"
    if git_dir.exists():
        set_state(18, "git pull")
        subprocess.run(["git", "pull", "--ff-only", "origin", meta.get("branch") or "main"], cwd=str(dest), capture_output=True, text=True)
        got = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(dest), capture_output=True, text=True)
        return (got.stdout or "").strip()
    set_state(16, "下载 GitHub 源码包")
    repo = meta.get("github") or "axioxmedia/CineMaker"
    branch = meta.get("branch") or "main"
    zip_url = f"https://codeload.github.com/{repo}/zip/refs/heads/{branch}"
    raw = httpx.get(zip_url, timeout=60.0, follow_redirects=True, headers={"User-Agent": "CineMaker-Updater"})
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
    skip = {".venv", "dist", "build", "data", "_update_extract", "_update_src.zip", "CineMakerData"}
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


def silent_build(dest: Path) -> Path:
    bat = dest / "build_exe.bat"
    if not bat.exists():
        raise RuntimeError("缺少 build_exe.bat")
    env = os.environ.copy()
    env["CINEMAKER_SILENT"] = "1"
    set_state(40, "静默执行 build_exe.bat")
    kw = {"cwd": str(dest), "env": env, "capture_output": True, "text": True}
    if os.name == "nt":
        kw["creationflags"] = CREATE_NO_WINDOW
        cmd = ["cmd.exe", "/c", str(bat)]
    else:
        cmd = ["bash", str(bat)]
    proc = subprocess.run(cmd, **kw)
    (dest / "cinemaker-update.log").write_text(((proc.stdout or "") + "\n" + (proc.stderr or ""))[-80000:], encoding="utf-8")
    if proc.returncode != 0:
        raise RuntimeError("build_exe.bat 失败")
    exe = dest / "dist" / "CineMaker.exe"
    if not exe.exists():
        raise RuntimeError("未生成 dist/CineMaker.exe")
    return exe


def launch_exe(exe: Path) -> None:
    if os.name == "nt":
        subprocess.Popen([str(exe)], cwd=str(exe.parent), creationflags=CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS)
    else:
        subprocess.Popen([str(exe)], cwd=str(exe.parent), start_new_session=True)


def run_job() -> None:
    meta = load_version()
    dest = workdir()
    try:
        set_state(8, "读取 GitHub 最新提交")
        remote = github_head(meta)
        sha = sync_sources(meta, dest) or remote.get("sha") or ""
        exe = silent_build(dest)
        meta["commit"] = sha
        save_version(meta)
        STATE["exe"] = str(exe)
        STATE["percent"] = 100
        STATE["message"] = "完成，正在启动"
        STATE["done"] = True
        time.sleep(0.8)
        launch_exe(exe)
        time.sleep(0.6)
        os._exit(0)
    except Exception as exc:
        STATE["error"] = str(exc)
        STATE["message"] = str(exc)
        STATE["done"] = True
        STATE["percent"] = 100


def spawn_self() -> None:
    dest = workdir()
    env = os.environ.copy()
    env["CINEMAKER_UPDATER"] = "1"
    if getattr(sys, "frozen", False):
        args = [sys.executable, "--updater"]
    else:
        args = [sys.executable, str(root() / "app.py"), "--updater"]
    kw = {"cwd": str(dest), "env": env}
    if os.name == "nt":
        kw["creationflags"] = CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS
        kw["close_fds"] = True
    subprocess.Popen(args, **kw)
