"""Multi-project graphs plus player save slots."""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path


def _read(path: Path, fallback):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return fallback
    return fallback


class ProjectStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)
        self.state_path = root / "current.json"
        self.ensure_default()

    def ensure_default(self) -> None:
        if not any(self.root.glob("*/project.json")):
            self.create("默认工程")

    def _dir(self, pid: str) -> Path:
        return self.root / pid

    def current_id(self) -> str:
        data = _read(self.state_path, {})
        cid = data.get("id")
        if cid and (self._dir(cid) / "project.json").exists():
            return cid
        first = next(iter(self.list_projects()), None)
        if first:
            self.set_current(first["id"])
            return first["id"]
        return self.create("默认工程")["id"]

    def set_current(self, pid: str) -> None:
        self.state_path.write_text(json.dumps({"id": pid}, ensure_ascii=False), encoding="utf-8")

    def list_projects(self) -> list[dict]:
        items = []
        for child in sorted(self.root.iterdir()):
            man = child / "project.json"
            if man.exists():
                items.append(_read(man, {"id": child.name, "name": child.name}))
        return items

    def create(self, name: str, path: str | None = None) -> dict:
        pid = uuid.uuid4().hex[:10]
        folder = Path(path).expanduser() if path else self._dir(pid)
        folder.mkdir(parents=True, exist_ok=True)
        meta = {
            "id": pid,
            "name": name.strip() or "未命名",
            "path": str(folder),
            "pluginsConfirmed": False,
            "updated": time.time(),
        }
        (folder / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        if folder != self._dir(pid):
            self._dir(pid).mkdir(parents=True, exist_ok=True)
            (self._dir(pid) / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        (folder / "graph.json").write_text(
            json.dumps({"id": "main", "revision": 1, "nodes": [], "links": [], "variables": []}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self.set_current(pid)
        return meta

    def resolve_dir(self, pid: str | None = None) -> Path:
        pid = pid or self.current_id()
        meta = _read(self._dir(pid) / "project.json", {})
        custom = Path(meta["path"]) if meta.get("path") else self._dir(pid)
        if (custom / "project.json").exists() or (custom / "graph.json").exists():
            return custom
        return self._dir(pid)

    def status(self, pid: str | None = None) -> dict:
        pid = pid or self.current_id()
        meta = _read(self._dir(pid) / "project.json", {"id": pid})
        folder = self.resolve_dir(pid)
        missing = not (folder / "graph.json").exists()
        nameless = not (meta.get("name") or "").strip()
        pathless = not meta.get("path")
        return {
            "project": meta,
            "folder": str(folder),
            "ok": not missing and not nameless,
            "needWizard": missing or nameless or pathless,
            "needPlugins": not meta.get("pluginsConfirmed"),
            "moved": bool(meta.get("path") and not Path(meta["path"]).exists()),
        }

    def confirm_plugins(self, pid: str | None = None, ids: list[str] | None = None) -> dict:
        pid = pid or self.current_id()
        meta = _read(self._dir(pid) / "project.json", {"id": pid})
        meta["pluginsConfirmed"] = True
        meta["pluginIds"] = ids or []
        meta["updated"] = time.time()
        (self._dir(pid) / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        folder = self.resolve_dir(pid)
        (folder / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        return meta

    def relocate(self, pid: str, path: str, name: str | None = None) -> dict:
        meta = _read(self._dir(pid) / "project.json", {"id": pid})
        dest = Path(path).expanduser()
        dest.mkdir(parents=True, exist_ok=True)
        src = self.resolve_dir(pid)
        if src.exists() and src != dest:
            for namef in ("graph.json", "saves.json"):
                if (src / namef).exists() and not (dest / namef).exists():
                    (dest / namef).write_bytes((src / namef).read_bytes())
        meta["path"] = str(dest)
        if name:
            meta["name"] = name
        meta["updated"] = time.time()
        (self._dir(pid) / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        (dest / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        if not (dest / "graph.json").exists():
            (dest / "graph.json").write_text(
                json.dumps({"id": "main", "nodes": [], "links": [], "variables": []}, ensure_ascii=False),
                encoding="utf-8",
            )
        return meta
        (folder / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        (folder / "graph.json").write_text(
            json.dumps({"id": "main", "revision": 1, "nodes": [], "links": [], "variables": []}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self.set_current(pid)
        return meta

    def patch_meta(self, pid: str | None = None, **fields) -> dict:
        pid = pid or self.current_id()
        folder = self._dir(pid)
        meta = _read(folder / "project.json", {"id": pid})
        for key in ("name", "path", "packName"):
            if key in fields and fields[key] is not None:
                meta[key] = fields[key]
        meta["updated"] = time.time()
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            dest = Path(meta.get("path") or folder)
            dest.mkdir(parents=True, exist_ok=True)
            (dest / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            pass
        return meta

    def rename(self, pid: str, name: str) -> dict | None:
        man = self._dir(pid) / "project.json"
        if not man.exists():
            return None
        meta = _read(man, {"id": pid})
        meta["name"] = name.strip() or meta.get("name")
        meta["updated"] = time.time()
        man.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        return meta

    def graph_path(self, pid: str | None = None) -> Path:
        return self.resolve_dir(pid) / "graph.json"

    def load_graph(self, pid: str | None = None) -> dict:
        return _read(self.graph_path(pid), {"id": "main", "nodes": [], "links": [], "variables": []})

    def save_graph(self, payload: dict, pid: str | None = None) -> dict:
        pid = pid or self.current_id()
        payload.setdefault("nodes", [])
        payload.setdefault("links", [])
        payload.setdefault("variables", [])
        payload["revision"] = int(payload.get("revision") or 0) + 1
        self.graph_path(pid).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        meta = _read(self._dir(pid) / "project.json", {"id": pid, "name": pid})
        meta["updated"] = time.time()
        (self._dir(pid) / "project.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        return payload

    def saves_path(self, extra: Path | None = None) -> Path:
        if extra:
            extra.mkdir(parents=True, exist_ok=True)
            return extra / "saves.json"
        return self._dir(self.current_id()) / "saves.json"

    def load_saves(self, extra: Path | None = None) -> dict:
        return _read(self.saves_path(extra), {"slots": {}})

    def write_slot(self, slot: str, payload: dict, extra: Path | None = None) -> dict:
        data = self.load_saves(extra)
        data.setdefault("slots", {})
        data["slots"][slot] = payload
        data["last"] = slot
        self.saves_path(extra).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return data
