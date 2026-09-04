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

</div>

> [!WARNING]
> Prefer **[GitHub Deploy Desk](https://github.com/axioxmedia/github-deployer)** to fetch a Release EXE.

## Install

1. Open Deploy Desk and paste `https://github.com/axioxmedia/CineMaker`
2. Inspect repository, confirm deploy, pick `CineMaker.exe` from Release
3. Or on Windows from source: `build_exe.bat` → `dist\\CineMaker.exe`
4. Or `pip install -r requirements.txt` then `python app.py`

Data folder next to a packed EXE: `CineMakerData`.

## Usage

Work tabs include scenes, **Game Instance**, **Game Mode**. Left rail is categorized nodes. Bottom dock has output, messages, localization, **console**. Inspector shows 3D / media preview.

## Plugins

Zip: `plugin.json` + `plugin.js` + `README.md`. Import in the editor. Disable first; red **Uninstall** appears for user plugins. API is still **CineHost** (schema 3). See `docs/PLUGIN.md`.

## Assets

Imports wrap as `.aioassets`. 3D viewport loads GLB / glTF / FBX with adjustable studio lights.

## License

See LICENSE. Packed via Axiox Media · https://axiox.media
