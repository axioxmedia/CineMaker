# interface.stage — 舞台 HUD

面向 CineMaker 交互影像的 Widget 舞台层。用节点控制片头、过场遮幅、淡入淡出、通知与跳过，用舞台层节点完成。

## 能力图

```
来源: https://www.fab.com/listings/a19e6209-33de-4091-820a-64f78ec630d5
Fab 产品: Pro HUD Pack（Piontek）
Fab 在做什么:
  客户端 HUD 通信层。V2 含指南针+标记、小地图+标记、世界标记、准星与命中反馈、
  任务/更新/选项/拾取/进度/主提示/指引通知，以及黑场 / 高光 / 损伤屏幕效果。
  作者刻意不含血条与武器栏；纯表现、不替代玩法系统；55 Widgets / 非复制。

CineMaker 用什么做:
  插件 interface.stage
  节点:
    interface.stage.mode       播放 / 过场 / 菜单片头 / 全隐
    interface.stage.title      开始画面（标题、副标题、点击继续）
    interface.stage.letterbox  过场上下遮幅
    interface.stage.fade       颜色遮罩 + 尽量调用 ctx.fadeTo
    interface.stage.notify     七种通知条（对应 Pack 的通知分类）
    interface.stage.banner     左下角标 / 章节卡
    interface.stage.progress   底部进度
    interface.stage.objective  顶部目标条（指南针/任务的叙事替代）
    interface.stage.skip       过场等待或跳过
    interface.stage.fx         flash / vignette / damage / highlight
    interface.stage.clear      按层拆除叠层
  变量 / 持久:
    pluginData("interface.stage") → mode, letterbox, progress, objective
  钩子:
    export:injectPlayer  备注导出播放器需要舞台层
  预览:
    每个执行器都会 ctx.say / toast，并在 DOM 里画 #cf-stage-hud

不做:
  不复制 Marketplace / Fab 源码、舞台层、材质、贴图、音效
  不实现 3D 小地图、世界空间标记、准星命中判定、渲染目标粒子
  不实现血条 / 武器栏（原 Pack 也刻意省略）
  不改 graph.js / player.js / host.js / app.py
```

## 安装

把本文件夹放到工程：

```
cinemaker-desk/plugins/interface.stage/
  plugin.json
  plugin.js
  README.md
```

编辑器里启用插件 → 节点栏「界面 / Widget」下出现舞台节点 → 放入图 → PIE。

## 典型接法

1. 开始画面：`title`（等待点击）→ `clear`（关片头）→ `mode=play` → 第一镜。
2. 过场：`mode=cinematic` → `letterbox` 开 → `banner` 章节卡 → `skip` 等待 → `letterbox` 关 → `mode=play`。
3. 调查：`objective` 设目标 → `notify(kind=mission)` → `progress` 随剧情更新。
4. 转场：`fade` 淡入 → 切视频节点 → `fade` 淡出。

## 测试

- 启用 `interface.stage`。
- 单放 `title`，PIE 应看到全屏标题和提示语，预览日志出现主标题。
- 再接 `letterbox` + `banner`，应出现黑边和左下角标。
- `notify` 每种 kind 各放一次，右上角应排队出现卡片。
- `skip` 点提示走「已跳过」，等到时走「播完」。
- 控制台不应出现 `Missing executor`。

## English

Widget stage for CineMaker interactive film: title cards, cinematic bars, fades, notification stack, objective rail, and skip-wait. Inspired by Piontek Pro HUD Pack communication types, reimplemented as CineHost nodes and a `#cf-stage-hud` overlay.

Not a port. No Fab/Marketplace source, meshes, widgets, or audio were copied. Compass / minimap / world markers have no 3D host here; use `objective` plus `notify` instead. Health and weapon HUDs stay out of scope, matching the original pack’s note that those vary too much by game.

Enable the plugin, drop nodes from Interface / HUD, play in editor.
