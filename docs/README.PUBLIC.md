<div align="center">
  <h1>CineMaker</h1>
  <p><sub>Packed via Axiox Media · 由安溯媒体打包</sub></p>
  <h3>Interactive cine-game editor — node graph, plugins, assets, 3D preview.</h3>
  <p>互动影游编辑器 · 节点蓝图 · 插件 · 资产库 · 三维预览</p>

  <p>
    <a href="#download">Download</a> ·
    <a href="#install">Install</a> ·
    <a href="#usage">Usage</a> ·
    <a href="#plugins">Plugins</a> ·
    <a href="#download-zh">下载</a> ·
    <a href="#install-zh">安装</a> ·
    <a href="#usage-zh">使用</a> ·
    <a href="#plugins-zh">插件</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/platform-Windows_10%2F11-0b0d12?style=flat-square" alt="Windows" />
    <img src="https://img.shields.io/badge/ui-zh%20%2F%20en-7ee0c6?style=flat-square" alt="Chinese and English UI" />
  </p>
</div>

> [!WARNING]
> **Use GitHub Deploy Desk to fetch the official EXE.** Confirm deploy can start an installer. The EXE is unsigned; Windows SmartScreen may warn on first launch.

---

<a id="download"></a>

## Download

The public package is the Windows EXE. Get it with **GitHub Deploy Desk** so you can read this page before anything is saved.

| Step | Action |
|---|---|
| 1 | Install the deployer once: [axioxmedia/github-deployer](https://github.com/axioxmedia/github-deployer) |
| 2 | Paste the CineMaker repository URL |
| 3 | Click **Inspect repository**. This README opens on the right |
| 4 | Set the folder (`D:\Projects` if D: exists) |
| 5 | Click **Confirm deploy** and choose the `.exe` from the latest Release |

The deployer talks to GitHub only.

<a id="install"></a>

## Install

1. Run `CineMaker.exe`.
2. If SmartScreen appears, choose **Run anyway** only if the file came from the official Release.
3. Projects and imported assets live in `%USERPROFILE%\CineMakerData`.

<a id="usage"></a>

## Usage

1. Add nodes from the left rail (story, viewport, media, …).
2. Wire **Start** to lines, choices, 3D shots, or encounters.
3. **Assets** — import models, video, or images. Copy the asset id into a node field.
4. **3D** — select a 3D node to preview on the right. Adjust light brightness, position, and rotation in the dock.
5. **Play** — the play button runs the graph in the preview window.

<a id="plugins"></a>

## Plugins

Open the puzzle-piece button.

- **Import** a `.zip`, then reload the editor.
- **Disable / Enable** toggles a plugin without deleting it.
- **Uninstall** is the red button that appears after a plugin is disabled. Built-in plugins can only be disabled.
- **Download sample** saves an example zip and shows the folder path.

<a id="features"></a>

## Features

| Area | Included |
|---|---|
| **Inspect first** | Deploy Desk shows this README before the EXE is saved |
| **Node graph** | Story, media, viewport, and encounter nodes |
| **Plugins** | Import, disable, uninstall, sample download |
| **Assets** | Imports stored as `.aioassets` |
| **3D preview** | Models and studio lights in the inspector |
| **Language** | 中文 / English |

<a id="requirements"></a>

## Requirements

| | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10 x64 | Windows 11 |
| **RAM** | 4 GB | 8 GB |
| **Disk** | 200 MB for the app | Extra space for assets |

WebView2 ships with current Windows 10/11. No GPU requirement for the editor chrome.

<a id="faq"></a>

## FAQ

<details>
<summary><strong>Why is the window title prefixed with Axiox Media?</strong></summary>

The packaged build stamps the packer line. The in-app heading stays **CineMaker**.
</details>

<details>
<summary><strong>SmartScreen blocked the EXE.</strong></summary>

Expected for an unsigned Release. Use Run anyway only if you pulled it through Deploy Desk from the official repo.
</details>

<details>
<summary><strong>Where did my project go?</strong></summary>

`%USERPROFILE%\CineMakerData`. Uninstalling the EXE does not always delete that folder.
</details>

---

# 中文

<a id="download-zh"></a>

## 下载

公开提供的是 Windows **EXE**。请用 **GitHub 部署器**，先读本页再保存文件。

1. 先装一次部署器：[axioxmedia/github-deployer](https://github.com/axioxmedia/github-deployer)
2. 把 CineMaker 仓库地址贴进去
3. 点 **解析仓库 / Inspect repository**
4. 选保存路径（有 D: 建议 `D:\Projects`）
5. 点 **确认部署 / Confirm deploy**，选最新 Release 里的 `.exe`

部署器只连 GitHub。

<a id="install-zh"></a>

## 安装

1. 双击 `CineMaker.exe`
2. 若出现 SmartScreen，确认来自官方 Release 后再选「仍要运行」
3. 工程和导入资产在 `%USERPROFILE%\CineMakerData`

<a id="usage-zh"></a>

## 使用

1. 从左侧栏添加节点（剧情、视口、媒体…）
2. 从「开始」连到对白、选项、三维镜头或遭遇
3. **资产**：导入模型 / 视频 / 图片，把资源 ID 填进节点
4. **三维**：点选三维节点，右侧预览；灯光亮度、位置、旋转可调
5. **播放**：顶栏播放按钮预览时间线

<a id="plugins-zh"></a>

## 插件

顶栏拼图按钮。

- **导入** `.zip`，然后刷新编辑器
- **停用 / 启用**只改状态，不删文件
- **卸载**是停用之后才出现的红按钮。随软件附带的插件只能停用
- **下载案例**会保存示例 zip，并显示路径

<a id="license"></a>

## License

See the repository `LICENSE` when one is published. Assets you import keep their original store licenses.

Packed via Axiox Media · [axiox.media](https://axiox.media)
