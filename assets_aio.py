"""Wrap imported files as .aioassets containers."""
from __future__ import annotations
import io, json, zipfile
from datetime import datetime, timezone
from pathlib import Path
MAGIC = "AIOASSETS"
SUFFIX = ".aioassets"
def wrap_bytes(filename: str, raw: bytes) -> bytes:
    ext = Path(filename).suffix.lower() or ".bin"
    meta = {"magic": MAGIC, "name": Path(filename).name, "sourceExt": ext, "bytes": len(raw), "created": datetime.now(timezone.utc).isoformat()}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("asset.json", json.dumps(meta))
        zf.writestr("payload" + ext, raw)
    return buf.getvalue()
def read_package(path: Path):
    with zipfile.ZipFile(path) as zf:
        meta = json.loads(zf.read("asset.json"))
        name = next(n for n in zf.namelist() if n.startswith("payload"))
        return meta, zf.read(name), name
