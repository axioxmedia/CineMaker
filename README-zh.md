<div align="center">

# CineMaker

**由安溯媒体打包**

互动影游编辑器 — 节点蓝图、插件、`.aioassets`、内置三维视口。

<p>
  <a href="README.md"><img src="https://img.shields.io/badge/English-README-7ee0c6?style=for-the-badge" alt="English README" /></a>
</p>

<p>
  <a href="#install">安装</a> ·
  <a href="#usage">使用</a> ·
  <a href="#plugins">插件</a> ·
  <a href="#assets">资产</a> ·
  <a href="#viewport3d">三维</a> ·
  <a href="#architecture">架构</a> ·
  <a href="#faq">问答</a>
</p>

</div>

> [!WARNING]
> 推荐用 **[GitHub 部署器](https://github.com/axioxmedia/github-deployer)** 拉取 Release 里的 EXE。确认部署可能启动安装包。未签名 EXE 可能被 SmartScreen 拦截。

---

<a id="install"></a>

## 安装

### 使用者 — 官方 EXE

1. 打开 [GitHub 部署器](https://github.com/axioxmedia/github-deployer)
2. 粘贴本仓库地址
3. **解析仓库**，再 **确认部署**
4. 选择最新 Release 中的 `CineMaker.exe`
5. 双击运行。打包版数据在 `%USERPROFILE%\CineMakerData`，源码运行则在 `data/`

### 作者 — 在 Windows 上打 EXE

需要 PATH 上的 Python 3.11+。先关掉正在运行的 `CineMaker.exe`。

```bat
build_exe.bat
```

产物：`dist\CineMaker.exe`。失败看 `dist\cinemaker.log`。

### 开发 — 源码运行

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

服务绑在本机回环。

<a id="usage"></a>

## 使用

| 区域 | 作用 |
|---|---|
| **顶栏** | 项目名、编辑器/项目设定、保存、适配、导出 |
| **工作页签** | 打开的场景、**全局实例**、**游戏模式**、函数库 |
| **左侧栏** | 按分类的节点（蓝图、剧情、视口…） |
| **画布** | 无限蓝图：缩放、平移、连线、框选、注释 |
| **检查器** | 节点字段 + 三维/媒体预览 |
| **资产库** | 文件夹、上传、星标、回收站，文件打成 `.aioassets` |
| **底栏** | 输出、消息、本地化、**控制台** |
| **PIE** | 浮动试玩窗 |

常见流程：开始 → 对白 / 选项 / 三维镜头 / 遭遇 → 播放。

<a id="plugins"></a>

## 插件

插件是 zip。在运行中的编辑器里导入，不必重编 EXE。

```
plugin.json
plugin.js
README.md
```

- **导入**在插件窗
- **停用 / 启用**不删文件
- **卸载**（红色）只在**用户插件停用之后**出现。内置插件不能卸
- **下载案例 / SDK**会保存 zip 并显示路径

### CineHost 合同（schema 3）

```js
CineHost.definePlugin({ id, onLoad, onProjectOpen, onProjectClose, onUnload })
CineHost.registerNodeType(def)
CineHost.registerExecutor(type, ctx => {})
CineHost.registerCategory({ id, title, title_en, children })
CineHost.viewport3d.create(element)
CineHost.assetUrl(assetId)
```

引脚：`exec | bool | int | float | string | array`。玩家可见文案不要写 Unreal / UE。  
完整说明：[`docs/PLUGIN.md`](docs/PLUGIN.md)。

<a id="assets"></a>

## 资产

导入一律封装为 **`.aioassets`**。播放仍走 `/api/drive/file/{id}/raw`。  
类型含视频、图片、音频、**model3d**（GLB / glTF / FBX）。

<a id="viewport3d"></a>

## 三维视口

引擎模块 `static/viewport3d.js`。支持 GLB、glTF、**带动画的 FBX**。棚灯 key / fill / rim / hemi / ambient 可调亮度、位置、旋转。插件请调用 `CineHost.viewport3d.create`。

<a id="architecture"></a>

## 架构

FastAPI + 静态界面 + 可选 pywebview。插件 zip 运行时导入。三维与灯光在引擎层。

<a id="faq"></a>

## 问答

<details>
<summary><strong>杀毒为什么拦 EXE？</strong></summary>

未签名的 PyInstaller 单文件包常被启发式误报。公开版需要代码签名。不是业务逻辑写了恶意代码。
</details>

<details>
<summary><strong>全局实例在哪？</strong></summary>

顶栏下面的工作页签，和场景、游戏模式同一排。
</details>

## License

见 [LICENSE](LICENSE)。从商店导入的资产仍受原协议约束。

由安溯媒体打包 · [axiox.media](https://axiox.media)
