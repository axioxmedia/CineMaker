"""Build a playable folder: game.json + media + optional player exe."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path


def _safe(name: str) -> str:
    slug = re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", name.strip()) or "Game"
    return slug[:40]


def validate_graph(graph: dict, drive=None) -> dict:
    nodes = graph.get("nodes") or []
    links = graph.get("links") or []
    errors: list[str] = []
    warns: list[str] = []
    if not any(n.get("type") == "story.start" for n in nodes):
        errors.append("missing_start")
    ids = {n.get("id") for n in nodes}
    for l in links:
        if l.get("from") not in ids or l.get("to") not in ids:
            errors.append("broken_link")
            break
    if drive:
        for n in nodes:
            aid = (n.get("data") or {}).get("assetId")
            if aid and not drive.disk_path(aid):
                warns.append(f"missing_media:{aid}")
    if not nodes:
        errors.append("empty_graph")
    return {"ok": not errors, "errors": errors, "warns": warns}


def used_asset_ids(graph: dict) -> list[str]:
    ids: list[str] = []
    for node in graph.get("nodes") or []:
        data = node.get("data") or {}
        aid = data.get("assetId")
        if aid and aid not in ids:
            ids.append(str(aid))
    return ids


def write_pack(
    dest: Path,
    title: str,
    graph: dict,
    drive,
    player_exe: Path | None = None,
    source_root: Path | None = None,
) -> Path:
    dest = Path(dest) / _safe(title)
    if dest.exists():
        shutil.rmtree(dest)
    media_dir = dest / "media"
    media_dir.mkdir(parents=True)
    mapping: dict[str, str] = {}
    for aid in used_asset_ids(graph):
        src = drive.disk_path(aid)
        item = drive.get(aid)
        if not src or not item:
            continue
        name = f"{aid}{src.suffix.lower()}"
        shutil.copy2(src, media_dir / name)
        mapping[aid] = f"media/{name}"
    payload = {
        "title": title,
        "schema": 2,
        "graph": graph,
        "media": mapping,
        "pluginData": graph.get("pluginData") or {},
    }
    (dest / "game.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (dest / "manifest.json").write_text(
        json.dumps({"title": title, "schema": 2, "mediaCount": len(mapping)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if player_exe and player_exe.exists():
        target_exe = dest / f"{_safe(title)}.exe"
        try:
            shutil.copy2(player_exe, target_exe)
        except OSError:
            (dest / "COPY_EXE.txt").write_text(
                f"Copy {player_exe.name} into this folder and rename it to {target_exe.name}.\n",
                encoding="utf-8",
            )
        (dest / "PLAY.txt").write_text(
            "Double-click the EXE. Keep game.json and media/ next to it.\n",
            encoding="utf-8",
        )
    elif source_root:
        bat = (
            "@echo off\r\n"
            "cd /d \"%~dp0\"\r\n"
            "set CINEMAKER_PACK=%cd%\r\n"
            "set CINEMAKER_WEB=1\r\n"
            "py -3 \"%~dp0..\\app.py\" --player\r\n"
            "if errorlevel 1 python \"%~dp0..\\app.py\" --player\r\n"
            "pause\r\n"
        )
        # Standalone play folder still needs the editor tree nearby when not frozen.
        # Copy a launcher that points at sibling source if present.
        (dest / "Play.bat").write_bytes(bat.encode("ascii", "replace"))
        (dest / "PLAY.txt").write_text(
            "This pack has game.json + media.\n"
            "Build the editor EXE once, then export again to include a player EXE.\n"
            "Or set CINEMAKER_PACK to this folder and run: python app.py --player\n",
            encoding="utf-8",
        )
    return dest
