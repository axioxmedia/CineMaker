<div align="center">

# CineMaker

**Packed via Axiox Media**

Interactive cine-game editor — node graph, plugins, `.aioassets`, built-in 3D viewport.

<p>
  <a href="README-zh.md"><img src="https://img.shields.io/badge/中文说明-README--zh-e7c07a?style=for-the-badge" alt="Chinese README" /></a>
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
  <img src="https://img.shields.io/badge/platform-Windows_10%2F11-0b0d12?style=flat-square" alt="Windows" />
  <img src="https://img.shields.io/badge/python-3.11%2B-e7c07a?style=flat-square" alt="Python" />
  <img src="https://img.shields.io/badge/ui-zh%20%2F%20en-7ee0c6?style=flat-square" alt="i18n" />
  <img src="https://img.shields.io/badge/assets-.aioassets-c9a227?style=flat-square" alt="aioassets" />
</p>

</div>

> [!WARNING]
> Prefer **[GitHub Deploy Desk](https://github.com/axioxmedia/github-deployer)** to fetch a Release EXE. Confirm deploy can launch an installer. An unsigned EXE may trip SmartScreen.

---

<a id="install"></a>

## Install

### Players — official EXE

1. Open [GitHub Deploy Desk](https://github.com/axioxmedia/github-deployer).
2. Paste this repository URL.
3. **Inspect repository**, then **Confirm deploy**.
4. Choose `CineMaker.exe` from the latest Release.
5. Run the EXE. Projects live in `%USERPROFILE%\CineMakerData` next to a packaged build, or `data/` when running from source.

### Authors — build the EXE on Windows

Python 3.11+ on PATH. Close any running `CineMaker.exe`.

```bat
build_exe.bat
```

Output: `dist\CineMaker.exe`. Log on failure: `dist\cinemaker.log`.

### Developers — run from source

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Binds `127.0.0.1` (port from 8765/8787). Desktop window via `pywebview` when installed.

<a id="usage"></a>

## Usage

| Area | What it does |
|---|---|
| **Menubar / topbar** | Project name, editor / project settings, save, fit, export |
| **Work tabs** | Open scenes, **Game Instance**, **Game Mode**, library |
| **Left rail** | Categorized nodes (blueprint, narrative, viewport, …) |
| **Canvas** | Infinite graph — zoom, pan, wires, box select, comments |
| **Inspector** | Node fields + 3D / media preview dock |
| **Asset library** | Folders, upload, star, trash — files stored as `.aioassets` |
| **Bottom dock** | Output, messages, localization, **console** |
| **PIE** | Floating play window for the graph |

Typical flow: Start node → dialogue / choices / 3D beats / encounters → Play.

<a id="plugins"></a>

## Plugins

Plugins are zip files. Import them in the running editor. Do not rebuild the EXE.

```
plugin.json
plugin.js
README.md
```

- **Import** from the plugin window.
- **Disable / Enable** toggles without deleting files.
- **Uninstall** (red) appears only after a **user** plugin is disabled. Bundled plugins cannot be removed.
- **Download sample / SDK** saves a zip and shows the path (also starts a browser download).

### CineHost contract (schema 3)

```js
CineHost.definePlugin({ id, onLoad, onProjectOpen, onProjectClose, onUnload })
CineHost.registerNodeType(def)
CineHost.registerExecutor(type, ctx => {})
CineHost.registerCategory({ id, title, title_en, children })
CineHost.registerInspectorPane({ id, title, match, mount })
CineHost.registerModelLoader({ ext: "fbx", label: "FBX" })
CineHost.assetUrl(assetId)
CineHost.viewport3d.create(element)
```

Pin kinds: `exec | bool | int | float | string | array`. Exec only to exec.  
Player-facing strings must not say Unreal / UE. Every node needs an executor.  
Full notes: [`docs/PLUGIN.md`](docs/PLUGIN.md).

Id pattern: `vendor.feature`.

<a id="assets"></a>

## Assets

Every import is wrapped as **`.aioassets`** (`asset.json` + `payload.*`).  
Playback still uses `/api/drive/file/{id}/raw` (payload unwrapped).  
Kinds: video, image, audio, **model3d** (GLB / glTF / FBX).

<a id="viewport3d"></a>

## 3D viewport

Engine module `static/viewport3d.js` (not a second Three.js in each plugin).

- Loaders: GLB, glTF, **FBX with animation clips**
- Preset studio lights: key / fill / rim / hemi / ambient
- Intensity, position, rotation are editable in the inspector
- Plugins call `CineHost.viewport3d.create(dom)`

Bundled example: `plugins/view.three`.

<a id="architecture"></a>

## Architecture

```text
pywebview (optional)
    │ 127.0.0.1
FastAPI
    ├── /api/plugins    enable · uninstall · import · catalog
    ├── /api/drive      .aioassets wrap / unwrap
    └── /api/graph      scenes + Game Instance + Game Mode
static/ host · framework · viewport3d · graph · player · app
plugins/ bundled zips
```

<a id="faq"></a>

## FAQ

<details>
<summary><strong>Why does Defender / SmartScreen block the EXE?</strong></summary>

Unsigned PyInstaller onefile binaries look like packed software. Sign with Authenticode for public releases. This is not a CineMaker logic bug.
</details>

<details>
<summary><strong>Where is Game Instance?</strong></summary>

Work tabs under the topbar — same row as open scenes and Game Mode.
</details>

<details>
<summary><strong>Can Confirm deploy run pip for me?</strong></summary>

No. Source extract only. You run `build_exe.bat` or `python app.py`.
</details>

## License

See [LICENSE](LICENSE). Imported Fab / store assets keep their original licenses.

Packed via Axiox Media · [axiox.media](https://axiox.media)
