<div align="center">

# CineMaker

**Packed via Axiox Media**

Interactive cine-game editor — node graph, plugins, `.aioassets`, built-in 3D viewport.

<p>
  <a href="docs/README-zh.md"><img src="https://img.shields.io/badge/中文说明-README--zh-e7c07a?style=for-the-badge" alt="Chinese README" /></a>
</p>

<p>
  <a href="#install">Install</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#plugins">Plugins</a> ·
  <a href="#assets">Assets</a> ·
  <a href="#viewport3d">3D</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#faq">FAQ</a>
</p>

<p>
  <img src="https://raw.githubusercontent.com/axioxmedia/CineMaker/refs/heads/main/static/cap.png" alt="APPCap" /></a>
</p>

</div>

> Prefer **[GitHub Deploy Desk](https://github.com/axioxmedia/github-deployer)** to fetch a Release EXE.

## Layout

```
CineMaker/
  README.md     you are here
  app.py        editor entry
  start.bat
  engine/       python modules
  static/       UI
  plugins/      bundled plugins
  docs/         PLUGIN + Chinese README
  build/        EXE scripts
```

## Install

### Players

1. Open [GitHub Deploy Desk](https://github.com/axioxmedia/github-deployer).
2. Paste this repository URL.
3. Inspect repository, then Confirm deploy.
4. Run `CineMaker.exe` from the latest Release.

### Authors

```bat
build\\build_exe.bat
```

Output: `dist\\CineMaker.exe`.

### Developers

```bat
pip install -r requirements.txt
python app.py
```

## Usage

Menubar, work tabs (scenes / Game Instance / Game Mode), left rail, canvas, inspector, `.aioassets` library, console, PIE.

Typical flow: Start → dialogue / choices / 3D beats → Play.

## Plugins

Import a zip (`plugin.json` + `plugin.js`) in the running editor. Disable, then Uninstall (red) for user plugins. CineHost schema 3. Full notes: [docs/PLUGIN.md](docs/PLUGIN.md).

## Assets

Every import wraps as `.aioassets`. Playback uses `/api/drive/file/{id}/raw`.

## 3D viewport

Engine files `static/viewport3d.js` and `static/view3d-dock.js`. GLB / glTF / FBX. Studio lights in the inspector.

Plugins: `CineHost.viewport3d.create(dom)` and `CineHost.theme.apply({ "--gold": "#e7c07a" })`.

## Export

Storefront: Windows EXE (default, in-app progress) or H5.

## License

See [LICENSE](LICENSE). Imported store assets keep their original licenses.

Packed via Axiox Media · [axiox.media](https://axiox.media)
