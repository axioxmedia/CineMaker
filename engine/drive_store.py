"""Local BeDrive-shaped asset store. Routes stay on the drive-file-engine contract."""

from __future__ import annotations

import json
import mimetypes
import shutil
import sqlite3
import time
import uuid
from pathlib import Path

VIDEO_EXT = {".mp4", ".webm", ".mov", ".mkv", ".m4v"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
AUDIO_EXT = {".mp3", ".wav", ".ogg", ".flac", ".m4a"}
MODEL_EXT = {".glb", ".gltf", ".fbx", ".obj", ".vrm"}
MATERIAL_EXT = {".mtl", ".mat", ".sbsar", ".sbs"}
AIO_SUFFIX = ".aioassets"


class DriveStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.files = root / "files"
        self.thumbs = root / "thumbs"
        self.files.mkdir(parents=True, exist_ok=True)
        self.thumbs.mkdir(parents=True, exist_ok=True)
        self.db_path = root / "drive.sqlite"
        self._init()

    def _db(self) -> sqlite3.Connection:
        con = sqlite3.connect(self.db_path)
        con.row_factory = sqlite3.Row
        return con

    def _init(self) -> None:
        with self._db() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS file_entries (
                  id TEXT PRIMARY KEY,
                  parent_id TEXT,
                  name TEXT NOT NULL,
                  kind TEXT NOT NULL,
                  mime TEXT,
                  size INTEGER DEFAULT 0,
                  starred INTEGER DEFAULT 0,
                  deleted INTEGER DEFAULT 0,
                  created_at REAL,
                  updated_at REAL
                )
                """
            )

    def _row(self, row: sqlite3.Row | None) -> dict | None:
        if row is None:
            return None
        d = dict(row)
        d["starred"] = bool(d.get("starred"))
        d["deleted"] = bool(d.get("deleted"))
        return d

    def list_entries(self, parent_id: str | None = None, trash: bool = False) -> list[dict]:
        with self._db() as con:
            if trash:
                rows = con.execute(
                    "SELECT * FROM file_entries WHERE deleted=1 ORDER BY name COLLATE NOCASE"
                ).fetchall()
            elif parent_id:
                rows = con.execute(
                    "SELECT * FROM file_entries WHERE deleted=0 AND parent_id=? ORDER BY kind DESC, name COLLATE NOCASE",
                    (parent_id,),
                ).fetchall()
            else:
                rows = con.execute(
                    "SELECT * FROM file_entries WHERE deleted=0 AND parent_id IS NULL ORDER BY kind DESC, name COLLATE NOCASE"
                ).fetchall()
        return [self._row(r) for r in rows]

    def get(self, entry_id: str) -> dict | None:
        with self._db() as con:
            return self._row(con.execute("SELECT * FROM file_entries WHERE id=?", (entry_id,)).fetchone())

    def mkdir(self, name: str, parent_id: str | None = None) -> dict:
        now = time.time()
        entry = {
            "id": uuid.uuid4().hex[:12],
            "parent_id": parent_id,
            "name": name.strip() or "Folder",
            "kind": "folder",
            "mime": "inode/directory",
            "size": 0,
            "starred": 0,
            "deleted": 0,
            "created_at": now,
            "updated_at": now,
        }
        with self._db() as con:
            con.execute(
                "INSERT INTO file_entries (id,parent_id,name,kind,mime,size,starred,deleted,created_at,updated_at) "
                "VALUES (:id,:parent_id,:name,:kind,:mime,:size,:starred,:deleted,:created_at,:updated_at)",
                entry,
            )
        return self.get(entry["id"])

    def save_upload(self, raw: bytes, filename: str, parent_id: str | None = None) -> dict:
        ext = Path(filename).suffix.lower()
        mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        if ext in VIDEO_EXT:
            kind = "video"
        elif ext in IMAGE_EXT:
            kind = "image"
        elif ext in AUDIO_EXT:
            kind = "audio"
        elif ext in MODEL_EXT:
            kind = "model3d"
        elif ext in MATERIAL_EXT:
            kind = "material"
        else:
            kind = "file"
        eid = uuid.uuid4().hex[:12]
        if ext == AIO_SUFFIX:
            dest = self.files / f"{eid}{AIO_SUFFIX}"
            dest.write_bytes(raw)
        else:
            from engine.assets_aio import wrap_bytes
            dest = self.files / f"{eid}{AIO_SUFFIX}"
            dest.write_bytes(wrap_bytes(filename, raw))
        now = time.time()
        entry = {
            "id": eid,
            "parent_id": parent_id,
            "name": filename,
            "kind": kind,
            "mime": mime,
            "size": len(raw),
            "starred": 0,
            "deleted": 0,
            "created_at": now,
            "updated_at": now,
        }
        with self._db() as con:
            con.execute(
                "INSERT INTO file_entries (id,parent_id,name,kind,mime,size,starred,deleted,created_at,updated_at) "
                "VALUES (:id,:parent_id,:name,:kind,:mime,:size,:starred,:deleted,:created_at,:updated_at)",
                entry,
            )
        return self.get(eid)

    def disk_path(self, entry_id: str) -> Path | None:
        item = self.get(entry_id)
        if not item or item["kind"] == "folder":
            return None
        matches = list(self.files.glob(f"{entry_id}.*"))
        return matches[0] if matches else None

    def payload(self, entry_id: str) -> tuple[dict, bytes]:
        path = self.disk_path(entry_id)
        item = self.get(entry_id)
        if not path or not item:
            raise FileNotFoundError(entry_id)
        if path.suffix.lower() == AIO_SUFFIX:
            from engine.assets_aio import read_package
            meta, data, _ = read_package(path)
            return meta, data
        return {"mime": item.get("mime"), "name": item.get("name")}, path.read_bytes()

    def move(self, ids: list[str], parent_id: str | None) -> None:
        with self._db() as con:
            for eid in ids:
                con.execute(
                    "UPDATE file_entries SET parent_id=?, updated_at=? WHERE id=?",
                    (parent_id, time.time(), eid),
                )

    def star(self, ids: list[str], starred: bool = True) -> None:
        with self._db() as con:
            for eid in ids:
                con.execute(
                    "UPDATE file_entries SET starred=?, updated_at=? WHERE id=?",
                    (1 if starred else 0, time.time(), eid),
                )

    def trash(self, ids: list[str]) -> None:
        with self._db() as con:
            for eid in ids:
                con.execute(
                    "UPDATE file_entries SET deleted=1, updated_at=? WHERE id=?",
                    (time.time(), eid),
                )

    def restore(self, ids: list[str]) -> None:
        with self._db() as con:
            for eid in ids:
                con.execute(
                    "UPDATE file_entries SET deleted=0, updated_at=? WHERE id=?",
                    (time.time(), eid),
                )

    def purge(self, ids: list[str]) -> None:
        with self._db() as con:
            for eid in ids:
                for p in self.files.glob(f"{eid}.*"):
                    p.unlink(missing_ok=True)
                con.execute("DELETE FROM file_entries WHERE id=?", (eid,))

    def rename(self, entry_id: str, name: str) -> dict | None:
        with self._db() as con:
            con.execute(
                "UPDATE file_entries SET name=?, updated_at=? WHERE id=?",
                (name.strip(), time.time(), entry_id),
            )
        return self.get(entry_id)

    def space_usage(self) -> dict:
        with self._db() as con:
            row = con.execute("SELECT COALESCE(SUM(size),0) AS used FROM file_entries WHERE deleted=0 AND kind!='folder'").fetchone()
            counts = {
                r["kind"]: r["n"]
                for r in con.execute(
                    "SELECT kind, COUNT(*) AS n FROM file_entries WHERE deleted=0 GROUP BY kind"
                ).fetchall()
            }
        used = int(row["used"] if row else 0)
        try:
            disk = shutil.disk_usage(self.root)
            cap = int(disk.total)
            free = int(disk.free)
        except OSError:
            cap, free = 0, 0
        return {
            "used": used,
            "cap": cap,
            "free": free,
            "unlimited": cap == 0,
            "counts": {
                "video": int(counts.get("video", 0)),
                "image": int(counts.get("image", 0)),
                "audio": int(counts.get("audio", 0)),
                "folder": int(counts.get("folder", 0)),
                "file": int(counts.get("file", 0)),
            },
        }

    def thumb_path(self, entry_id: str) -> Path | None:
        item = self.get(entry_id)
        src = self.disk_path(entry_id)
        if not item or not src:
            return None
        dest = self.thumbs / f"{entry_id}.jpg"
        if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
            return dest
        if item["kind"] == "image":
            try:
                dest.write_bytes(src.read_bytes())
                return dest
            except OSError:
                return src
        if item["kind"] == "video":
            import subprocess
            try:
                subprocess.run(
                    ["ffmpeg", "-y", "-ss", "0.4", "-i", str(src), "-frames:v", "1", "-vf", "scale=320:-2", str(dest)],
                    check=False,
                    capture_output=True,
                    timeout=20,
                )
                if dest.exists():
                    return dest
            except (OSError, subprocess.TimeoutExpired):
                return None
        return None

    def folders(self, parent_id: str | None = None) -> list[dict]:
        with self._db() as con:
            if parent_id:
                rows = con.execute(
                    "SELECT * FROM file_entries WHERE deleted=0 AND kind='folder' AND parent_id=? ORDER BY name COLLATE NOCASE",
                    (parent_id,),
                ).fetchall()
            else:
                rows = con.execute(
                    "SELECT * FROM file_entries WHERE deleted=0 AND kind='folder' AND parent_id IS NULL ORDER BY name COLLATE NOCASE"
                ).fetchall()
        return [self._row(r) for r in rows]

    def starred(self) -> list[dict]:
        with self._db() as con:
            rows = con.execute(
                "SELECT * FROM file_entries WHERE deleted=0 AND starred=1 ORDER BY name COLLATE NOCASE"
            ).fetchall()
        return [self._row(r) for r in rows]
