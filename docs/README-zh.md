<div align="center">

# CineMaker

**由安溯媒体打包**

互动影游编辑器 — 节点蓝图、插件、`.aioassets`、内置三维视口。

<p>
  <a href="../README.md"><img src="https://img.shields.io/badge/English-README-7ee0c6?style=for-the-badge" alt="English README" /></a>
</p>

</div>

推荐用 **[GitHub 部署器](https://github.com/axioxmedia/github-deployer)** 拉取 Release EXE。

## 安装

1. 打开部署器，粘贴本仓库地址，解析后确认部署。
2. 打 EXE：`build\\build_exe.bat`
3. 源码运行：`pip install -r requirements.txt` 然后 `python app.py`

## 使用

顶栏、工作页签（场景 / 全局实例 / 游戏模式）、左侧栏、画布、检查器、资产库、控制台、PIE。

## 插件

运行中导入 zip（`plugin.json` + `plugin.js`）。用户插件先停用再红色卸载。详见 [PLUGIN.md](PLUGIN.md)。

## 资产与三维

导入打成 `.aioassets`。视口在 `static/viewport3d.js`。发行平台：EXE 或 H5。

由安溯媒体打包 · [axiox.media](https://axiox.media)
