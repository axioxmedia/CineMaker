"""Wrap imported files as .aioassets containers (Axiox asset package)."""

from __future__ import annotations

import io
import json
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path

MAGIC = "AIOASSETS"
VERSION = 1
SUFFIX = ".aioassets"

KIND_BY_EXT = {
    ".glb": "model3d",
    ".gltf": "model3d",
    ".fbx": "model3d",
    ".obj": "model3d",
    ".vrm": "model3d",
    ".mtl": "material",
    ".mat": "material",
    ".sbsar": "material",
    ".mp4": "video",
    ".webm": "video",
    ".mov": "video",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".webp": "image",
    ".gif": "image",
    ".svg": "image",
    ".mp3": "audio",
    ".wav": "audio",
    ".ogg": "audio",
    ".m4a": "audio",
}

MIME_BY_EXT = {
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".fbx": "application/octet-stream",
    ".obj": "text/plain",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
}


def kind_for(name: str) -> str:
    ext = Path(name).suffix.lower()
    return KIND_BY_EXT.get(ext, "other")


def mime_for(name: str) -> str:
    ext = Path(name).suffix.lower()
    return MIME_BY_EXT.get(ext, "application/octet-stream")


def wrap_bytes(filename: str, raw: bytes) -> bytes:
    source_ext = Path(filename).suffix.lower() or ".bin"
    meta = {
        "magic": MAGIC,
        "version": VERSION,
        "kind": kind_for(filename),
        "name": Path(filename).stem,
        "sourceName": Path(filename).name,
        "sourceExt": source_ext,
        "mime": mime_for(filename),
        "bytes": len(raw),
        "created": datetime.now(timezone.utc).isoformat(),
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("asset.json", json.dumps(meta, ensure_ascii=False, indent=2))
        zf.writestr("payload" + source_ext, raw)
        zf.writestr("AIOASSETS", MAGIC + "\n")
    return buf.getvalue()


def read_package(path: Path) -> tuple[dict, bytes, str]:
    with zipfile.ZipFile(path, "r") as zf:
        names = zf.namelist()
        meta = {"magic": MAGIC, "kind": "other", "name": path.stem, "sourceExt": "", "mime": "application/octet-stream"}
        if "asset.json" in names:
            meta.update(json.loads(zf.read("asset.json").decode("utf-8")))
        payload_name = next((n for n in names if n.startswith("payload")), None)
        if not payload_name:
            raise ValueError("aioassets missing payload")
        return meta, zf.read(payload_name), payload_name


class AssetStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self.index_path = root / "index.json"
        self._index = self._load()

    def _load(self) -> dict:
        if self.index_path.exists():
            try:
                return json.loads(self.index_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                return {"items": []}
        return {"items": []}

    def _save(self) -> None:
        self.index_path.write_text(json.dumps(self._index, ensure_ascii=False, indent=2), encoding="utf-8")

    def list(self) -> list[dict]:
        return list(self._index.get("items") or [])

    def import_file(self, filename: str, raw: bytes) -> dict:
        aid = uuid.uuid4().hex[:12]
        safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in Path(filename).stem)[:40] or "asset"
        stored = f"{safe}-{aid}{SUFFIX}"
        path = self.root / stored
        packed = wrap_bytes(filename, raw)
        if filename.lower().endswith(SUFFIX):
            packed = raw
        path.write_bytes(packed)
        try:
            meta, _, _ = read_package(path)
        except Exception:
            path.write_bytes(wrap_bytes(filename, raw))
            meta, _, _ = read_package(path)
        item = {
            "id": aid,
            "file": stored,
            "name": meta.get("name") or safe,
            "kind": meta.get("kind") or "other",
            "sourceExt": meta.get("sourceExt") or "",
            "mime": meta.get("mime"),
            "bytes": path.stat().st_size,
            "created": meta.get("created"),
        }
        self._index.setdefault("items", []).insert(0, item)
        self._save()
        return item

    def get(self, asset_id: str) -> dict | None:
        for item in self.list():
            if item["id"] == asset_id:
                return item
        return None

    def payload(self, asset_id: str) -> tuple[dict, bytes]:
        item = self.get(asset_id)
        if not item:
            raise FileNotFoundError(asset_id)
        meta, data, _ = read_package(self.root / item["file"])
        return meta, data

    def delete(self, asset_id: str) -> bool:
        item = self.get(asset_id)
        if not item:
            return False
        path = self.root / item["file"]
        if path.exists():
            path.unlink()
        self._index["items"] = [x for x in self.list() if x["id"] != asset_id]
        self._save()
        return True
