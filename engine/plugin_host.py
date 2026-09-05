"""Load plugin manifests. JS entries are served statically; Python never evals plugin code."""

from __future__ import annotations

import json
import shutil
from pathlib import Path


class PluginHost:
    def __init__(self, bundled: Path, user_dir: Path) -> None:
        self.bundled = bundled
        self.user_dir = user_dir
        self.user_dir.mkdir(parents=True, exist_ok=True)
        self.state_path = user_dir / "enabled.json"
        self._enabled = self._load_enabled()

    def _load_enabled(self) -> dict[str, bool]:
        if self.state_path.exists():
            try:
                return json.loads(self.state_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                return {}
        return {}

    def _save_enabled(self) -> None:
        self.state_path.write_text(json.dumps(self._enabled, indent=2), encoding="utf-8")

    def _scan(self, root: Path, origin: str) -> list[dict]:
        found: list[dict] = []
        if not root.exists():
            return found
        for child in sorted(root.iterdir()):
            manifest = child / "plugin.json"
            if not child.is_dir() or not manifest.exists():
                continue
            try:
                data = json.loads(manifest.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            pid = str(data.get("id") or child.name)
            data["id"] = pid
            data["origin"] = origin
            data["dir"] = child.name
            data["enabled"] = self._enabled.get(pid, True)
            found.append(data)
        return found

    def list_plugins(self) -> list[dict]:
        bundled = {p["id"]: p for p in self._scan(self.bundled, "bundled")}
        user = {p["id"]: p for p in self._scan(self.user_dir, "user")}
        merged = {**bundled, **user}
        return sorted(merged.values(), key=lambda p: (p.get("origin") != "bundled", p["id"]))

    def set_enabled(self, plugin_id: str, enabled: bool) -> dict | None:
        items = {p["id"]: p for p in self.list_plugins()}
        if plugin_id not in items:
            return None
        self._enabled[plugin_id] = bool(enabled)
        self._save_enabled()
        items[plugin_id]["enabled"] = bool(enabled)
        return items[plugin_id]

    def resolve_file(self, plugin_id: str, rel: str) -> Path | None:
        rel_path = Path(rel)
        if rel_path.is_absolute() or ".." in rel_path.parts:
            return None
        for root in (self.user_dir, self.bundled):
            folder = None
            for child in root.iterdir() if root.exists() else []:
                man = child / "plugin.json"
                if not man.exists():
                    continue
                try:
                    data = json.loads(man.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    continue
                if str(data.get("id") or child.name) == plugin_id:
                    folder = child
                    break
            if folder:
                target = (folder / rel_path).resolve()
                if str(target).startswith(str(folder.resolve())) and target.exists():
                    return target
        return None

    def import_zip(self, raw: bytes) -> dict:
        import io
        import re
        import zipfile

        if len(raw) > 20 * 1024 * 1024:
            raise ValueError("zip too large")
        try:
            zf = zipfile.ZipFile(io.BytesIO(raw))
        except zipfile.BadZipFile as exc:
            raise ValueError("not a zip") from exc
        names = [n.replace("\\", "/") for n in zf.namelist() if not n.endswith("/")]
        manifest_name = next((n for n in names if n.endswith("plugin.json")), None)
        if not manifest_name:
            raise ValueError("missing plugin.json")
        prefix = str(Path(manifest_name).parent)
        if prefix == ".":
            prefix = ""
        try:
            meta = json.loads(zf.read(manifest_name).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("bad plugin.json") from exc
        pid = str(meta.get("id") or "").strip()
        if not re.match(r"^[a-z0-9]+([._-][a-z0-9]+)*$", pid):
            raise ValueError("bad plugin id")
        entry = str(meta.get("entry") or "plugin.js")
        entry_zip = f"{prefix}/{entry}" if prefix else entry
        if entry_zip not in names:
            raise ValueError("missing entry script")
        folder = self.user_dir / pid
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True, exist_ok=True)
        allow = {".json", ".js", ".md", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".css"}
        for name in names:
            if ".." in Path(name).parts:
                continue
            rel = name[len(prefix) + 1 :] if prefix and name.startswith(prefix + "/") else (name if not prefix else "")
            if not rel or rel == "enabled.json":
                continue
            if Path(rel).suffix.lower() not in allow:
                continue
            dest = (folder / rel).resolve()
            if not str(dest).startswith(str(folder.resolve())):
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(zf.read(name))
        if not (folder / "plugin.json").exists():
            raise ValueError("extract failed")
        self._enabled[pid] = True
        self._save_enabled()
        meta["id"] = pid
        meta["origin"] = "user"
        meta["dir"] = pid
        meta["enabled"] = True
        return meta


    def can_uninstall(self, plugin_id: str) -> bool:
        items = {p["id"]: p for p in self.list_plugins()}
        item = items.get(plugin_id)
        if not item:
            return False
        if item.get("origin") == "bundled":
            return False
        if item.get("enabled", True):
            return False
        return True

    def uninstall(self, plugin_id: str) -> dict:
        items = {p["id"]: p for p in self.list_plugins()}
        item = items.get(plugin_id)
        if not item:
            raise ValueError("plugin not found")
        if item.get("origin") == "bundled":
            raise ValueError("bundled plugins cannot be uninstalled")
        if item.get("enabled", True):
            raise ValueError("disable the plugin before uninstall")
        folder = self.user_dir / plugin_id
        if folder.exists():
            shutil.rmtree(folder)
        self._enabled.pop(plugin_id, None)
        self._save_enabled()
        return {"ok": True, "id": plugin_id}

    def pack_zip(self, plugin_id: str, dest: Path) -> Path:
        items = {p["id"]: p for p in self.list_plugins()}
        item = items.get(plugin_id)
        if not item:
            raise ValueError("plugin not found")
        folder = None
        for base in (self.user_dir, self.bundled):
            cand = base / item["dir"]
            if (cand / "plugin.json").exists():
                folder = cand
                break
        if folder is None:
            raise ValueError("plugin folder missing")
        dest.parent.mkdir(parents=True, exist_ok=True)
        archive = shutil.make_archive(str(dest.with_suffix("")), "zip", root_dir=folder)
        return Path(archive)

    def catalog(self) -> list[dict]:
        rows = []
        for p in self.list_plugins():
            rows.append({
                "id": p["id"],
                "name": p.get("name_zh") or p.get("name"),
                "name_en": p.get("name"),
                "summary": p.get("summary_zh") or p.get("summary"),
                "origin": p.get("origin"),
                "category": p.get("category"),
                "official": bool(p.get("official")),
                "sample": p.get("origin") == "bundled",
            })
        return rows
