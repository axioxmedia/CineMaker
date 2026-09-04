# 科幻Boss遭遇战 / Sci-Fi Boss Encounter

来源: https://www.fab.com/listings/d5130071-a439-45b9-90e2-e28c3e4761e0  
Fab 商品: Sci-Fi Boss Pack（Snake / Crab / HellCat / Shark / Dragon / Frog）

本插件**不包含、不复制** Marketplace / Fab 的网格、骨骼、皮肤、动画文件或音频。  
CineMaker 没有 3D 渲染器。这里只把「Boss 作为可交互敌人」的行为译成节点、变量和预览 HUD。  
你在 DCC / 引擎里录好的出场、攻击、受击、死亡镜头，把资源 ID 填进节点的「视频资源ID」即可接到时间线。

## 能力对照

```
来源: https://www.fab.com/listings/d5130071-a439-45b9-90e2-e28c3e4761e0
Fab 在做什么: 六只游戏就绪科幻Boss，每只自定义骨骼、4-5套皮肤、约30套动画（Attack / Idle / GetHit / Death / Roar / Walk / KnockOut…）
CineMaker 用什么做:
  - 节点 spawn / hud / act / strike / turn / check / player
  - Game Instance 键 boss.id boss.hp boss.maxHp boss.state boss.phase boss.skin boss.alive player.hp player.maxHp
  - pluginData roster + lastHp
  - 可选 video.play 式资源ID（你自己录的片段）
  - ctx.ui 血条叠加
不做: 3D网格 / 付费素材 / 引擎源码 / Niagara / 自定义骨骼运行时
```

## 动画族 → 节点动作

| 资产动画族 | 节点 |
| --- | --- |
| Idle / Walk / Run / Creep / Jump / Fly / Fall / Turn | Boss动作 `action=` 对应值 |
| Attack (6–12 变体) | Boss动作 + 命中率，出口「打中玩家 / 未打中」 |
| GetHit / GetHit Flying | 打击Boss 默认把状态写成 getHit |
| KnockOut / WakeUp | 打击Boss 低于击倒阈值 → 出口「击倒」；再用 Boss动作 wakeUp |
| Death | 血量到 0 → 出口「死亡」 |
| Roar / Provoke | Boss动作 roar / provoke，或玩家回合「观察」出口 |
| 4–5 skins | spawn.skin = 1..5（只记状态，不换网格） |

## 推荐接线

1. `故事开始` → **召唤科幻Boss**（选一只，设血量）
2. **刷新Boss面板**
3. 循环：**玩家回合**
   - 进攻 → **打击Boss**
     - 还活着 → 下一回合
     - 阶段变化 → **Boss动作(咆哮)** → 下一回合
     - 击倒 → **Boss动作(击倒/起身)**
     - 死亡 → 结束
   - 闪避 → **Boss动作(攻击)**，命中率调低
   - 观察 → **Boss动作(咆哮/挑衅)**
   - 撤退 → 转场 / 结束
4. 需要分叉时用 **检查Boss**（存活、血量、阶段、是哪一只）

## Game Instance 键

- `boss.id` snake | crab | hellcat | shark | dragon | frog
- `boss.name` `boss.skin` `boss.state` `boss.phase`
- `boss.hp` `boss.maxHp` `boss.alive`
- `player.hp` `player.maxHp`

## 安装

打开编辑器 → 插件 → 导入按钮 → 选 `encounter.scifi_boss.zip`。  
导入后刷新页面即可。不要重编 EXE，不要改 host / player / graph 源码。

测试：导入 → 刷新 → 拉一个「召唤科幻Boss」→ PIE。预览应出现血条和出场句。再接「玩家回合」，四个按钮要能走不同出口。

## 节点

- `encounter.scifi_boss.spawn` 召唤科幻Boss
- `encounter.scifi_boss.hud` 刷新Boss面板
- `encounter.scifi_boss.act` Boss动作
- `encounter.scifi_boss.strike` 打击Boss
- `encounter.scifi_boss.turn` 玩家回合
- `encounter.scifi_boss.check` 检查Boss
- `encounter.scifi_boss.player` 玩家生命

---

# English

Reimplements encounter *behavior* from the Fab Sci-Fi Boss Pack.  
Does not copy meshes, skeletons, materials, animations, or audio.  
CineMaker has no 3D viewport; attach your own captured clips via the asset id fields.

Install: Editor → Plugins → Import → this zip → reload the page. No app rebuild.
