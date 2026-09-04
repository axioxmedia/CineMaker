/* encounter.scifi_boss
 * Behavior remap of Fab "Sci-Fi Boss Pack" (6 bosses / animation families).
 * Does not ship meshes, skeletons, skins, or marketplace source.
 */
(function () {
  var PID = "encounter.scifi_boss";

  var BOSSES = {
    snake: {
      id: "snake",
      name: "赛博蝮蛇",
      name_en: "Sci-Fi Snake",
      maxHp: 180,
      attacks: 9,
      flavor: "金属鳞片摩擦，毒液在管道里嘶响。",
      flavor_en: "Metal scales scrape. Venom hisses in the ducts.",
      actions: ["idle", "creep", "look", "attack", "roar", "getHit", "death"],
    },
    crab: {
      id: "crab",
      name: "装甲巨蟹",
      name_en: "Sci-Fi Crab",
      maxHp: 220,
      attacks: 6,
      flavor: "液压钳合拢，甲板随之一沉。",
      flavor_en: "Hydraulic claws lock. The deck drops an inch.",
      actions: ["idle", "walk", "provoke", "attack", "getHit", "knockOut", "wakeUp", "death"],
    },
    hellcat: {
      id: "hellcat",
      name: "地狱猎猫",
      name_en: "Sci-Fi HellCat",
      maxHp: 160,
      attacks: 6,
      flavor: "排气口喷出热浪，瞳孔缩成一条缝。",
      flavor_en: "Heat rolls off the vents. Pupils cut to slits.",
      actions: ["idle", "walk", "run", "turn", "provoke", "attack", "roar", "getHit", "knockOut", "death"],
    },
    shark: {
      id: "shark",
      name: "深海机鲨",
      name_en: "Sci-Fi Shark",
      maxHp: 200,
      attacks: 8,
      flavor: "冷却液像潮水一样涌过甲板。",
      flavor_en: "Coolant washes the deck like a tide.",
      actions: ["idle", "walk", "run", "turn", "provoke", "attack", "roar", "getHit", "knockOut", "death"],
    },
    dragon: {
      id: "dragon",
      name: "轨道巨龙",
      name_en: "Sci-Fi Dragon",
      maxHp: 280,
      attacks: 12,
      flavor: "翼板展开，阴影盖住整条走廊。",
      flavor_en: "Wing plates open. The corridor disappears.",
      actions: ["idle", "walk", "fly", "fall", "turn", "attack", "roar", "getHit", "getHitFly", "knockOut", "death"],
    },
    frog: {
      id: "frog",
      name: "离子蛙卫",
      name_en: "Sci-Fi Frog",
      maxHp: 150,
      attacks: 10,
      flavor: "喉囊充能，地面留下一圈湿痕。",
      flavor_en: "The sac charges. A wet ring marks the floor.",
      actions: ["idle", "walk", "jump", "turn", "provoke", "attack", "roar", "getHit", "knockOut", "death"],
    },
  };

  var ACTION_ZH = {
    idle: "待机",
    creep: "潜行",
    look: "锁定目标",
    walk: "行走",
    run: "奔跑",
    jump: "跳跃",
    fly: "飞行",
    fall: "坠落",
    turn: "转身",
    provoke: "挑衅",
    attack: "攻击",
    roar: "咆哮",
    getHit: "受击",
    getHitFly: "空中受击",
    knockOut: "击倒",
    wakeUp: "起身",
    death: "死亡",
  };

  function catalog() {
    return BOSSES;
  }

  function bag(ctx) {
    ctx.vars = ctx.vars || {};
    return ctx.vars;
  }

  function num(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function truthy(v) {
    return v === true || v === "true" || v === "1" || v === 1;
  }

  function go(ctx, sock) {
    if (!ctx || !ctx.enter || !ctx.follow) return;
    var nxt = null;
    try {
      nxt = ctx.follow(sock);
      if (nxt && typeof nxt === "object") {
        ctx.enter(nxt);
        return;
      }
    } catch (e1) {}
    try {
      if (ctx.node) nxt = ctx.follow(ctx.node.id, sock);
    } catch (e2) {}
    ctx.enter(nxt || null);
  }

  function currentBoss(ctx) {
    var v = bag(ctx);
    var id = String(v["boss.id"] || "snake");
    return BOSSES[id] || BOSSES.snake;
  }

  function writeState(ctx, patch) {
    var v = bag(ctx);
    Object.keys(patch).forEach(function (k) {
      v[k] = patch[k];
    });
    v["boss.alive"] = num(v["boss.hp"], 0) > 0 ? 1 : 0;
    if (num(v["boss.hp"], 0) <= 0) v["boss.state"] = "death";
    persist(ctx, v);
    return v;
  }

  function persist(ctx, v) {
    if (!CineHost.pluginData) return;
    try {
      var store = CineHost.pluginData(PID);
      store.set("lastId", v["boss.id"] || "");
      store.set("lastHp", num(v["boss.hp"], 0));
      store.set("lastState", v["boss.state"] || "");
    } catch (e) {}
  }

  function statusLine(ctx) {
    var v = bag(ctx);
    var b = currentBoss(ctx);
    var hp = num(v["boss.hp"], 0);
    var max = Math.max(1, num(v["boss.maxHp"], b.maxHp));
    var php = num(v["player.hp"], 0);
    var pmax = Math.max(1, num(v["player.maxHp"], 100));
    return (
      b.name +
      "  " +
      hp +
      "/" +
      max +
      "  阶段" +
      num(v["boss.phase"], 1) +
      "  " +
      (ACTION_ZH[v["boss.state"]] || v["boss.state"] || "待机") +
      "  |  你 " +
      php +
      "/" +
      pmax
    );
  }

  function paintHud(ctx, extra) {
    var line = statusLine(ctx);
    if (ctx.say) ctx.say(extra ? extra + "\n" + line : line, currentBoss(ctx).name);
    var host = (ctx.ui && (ctx.ui.choices && ctx.ui.choices.parentElement)) || (typeof document !== "undefined" ? document.body : null);
    if (!host) return;
    var el = document.getElementById("scifi-boss-hud");
    if (!el) {
      el = document.createElement("div");
      el.id = "scifi-boss-hud";
      el.style.cssText =
        "pointer-events:none;margin:8px 0;padding:10px 12px;border:1px solid #2dd4bf55;background:#041016cc;color:#d8fff6;font:12px/1.5 ui-monospace,monospace;border-radius:6px;";
      host.insertBefore(el, host.firstChild);
    }
    var v = bag(ctx);
    var b = currentBoss(ctx);
    var hp = num(v["boss.hp"], 0);
    var max = Math.max(1, num(v["boss.maxHp"], b.maxHp));
    var pct = Math.max(0, Math.min(100, Math.round((hp / max) * 100)));
    var php = num(v["player.hp"], 0);
    var pmax = Math.max(1, num(v["player.maxHp"], 100));
    var ppct = Math.max(0, Math.min(100, Math.round((php / pmax) * 100)));
    el.innerHTML =
      "<div style='opacity:.7;letter-spacing:.12em'>SIGNAL // BOSS</div>" +
      "<div style='font-size:14px;margin:4px 0 6px'>" +
      escapeHtml(b.name) +
      " · " +
      escapeHtml(ACTION_ZH[v["boss.state"]] || "待机") +
      " · P" +
      num(v["boss.phase"], 1) +
      "</div>" +
      bar(pct, "#2dd4bf") +
      "<div style='opacity:.7;margin-top:8px'>YOU</div>" +
      bar(ppct, "#f59e0b");
  }

  function bar(pct, color) {
    return (
      "<div style='height:8px;background:#133;border-radius:99px;overflow:hidden'>" +
      "<div style='height:100%;width:" +
      pct +
      "%;background:" +
      color +
      "'></div></div>" +
      "<div style='opacity:.6;margin-top:2px'>" +
      pct +
      "%</div>"
    );
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function maybeVideo(ctx, assetId, thenSock) {
    if (assetId && ctx.playVideo) {
      ctx.playVideo(assetId, function () {
        go(ctx, thenSock || "out");
      });
      return true;
    }
    return false;
  }

  function phaseForHp(hp, max) {
    var r = hp / Math.max(1, max);
    if (r <= 0) return 0;
    if (r <= 0.33) return 3;
    if (r <= 0.66) return 2;
    return 1;
  }

  if (CineHost.definePlugin) {
    CineHost.definePlugin({
      id: PID,
      onLoad: function () {
        if (CineHost.log) CineHost.log("output", "encounter.scifi_boss loaded — 6 archetypes, no meshes");
        if (CineHost.pluginData) {
          try {
            CineHost.pluginData(PID).set("roster", Object.keys(BOSSES));
          } catch (e) {}
        }
      },
    });
  }

  CineHost.registerNodeType({
    type: "encounter.scifi_boss.spawn",
    title: "召唤科幻Boss",
    title_en: "Spawn Sci-Fi Boss",
    category: "ai",
    icon: "fa-dragon",
    color: "#2dd4bf",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      {
        id: "boss",
        label: "Boss",
        label_en: "Boss",
        kind: "select",
        default: "dragon",
        options: [
          { value: "snake", label: "赛博蝮蛇", label_en: "Snake" },
          { value: "crab", label: "装甲巨蟹", label_en: "Crab" },
          { value: "hellcat", label: "地狱猎猫", label_en: "HellCat" },
          { value: "shark", label: "深海机鲨", label_en: "Shark" },
          { value: "dragon", label: "轨道巨龙", label_en: "Dragon" },
          { value: "frog", label: "离子蛙卫", label_en: "Frog" },
        ],
      },
      { id: "skin", label: "皮肤序号 1-5", label_en: "Skin 1-5", kind: "int", default: 1 },
      { id: "maxHp", label: "Boss最大生命", label_en: "Boss Max HP", kind: "int", default: 0 },
      { id: "playerHp", label: "玩家生命", label_en: "Player HP", kind: "int", default: 100 },
      { id: "intro", label: "出场台词", label_en: "Intro line", kind: "textarea", default: "" },
      { id: "assetId", label: "出场视频资源ID", label_en: "Intro video asset id", kind: "string", default: "" },
    ],
    tooltip: "写入 boss.* 与 player.hp。不加载3D模型，只建立遭遇状态。可把你从资产里录的出场镜头填进视频ID。",
    tooltip_en: "Writes boss.* and player.hp. No 3D mesh. Optional video asset for an intro clip you captured from the pack.",
  });

  CineHost.registerNodeType({
    type: "encounter.scifi_boss.hud",
    title: "刷新Boss面板",
    title_en: "Refresh Boss HUD",
    category: "interface",
    icon: "fa-heart-pulse",
    color: "#14b8a6",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [{ id: "note", label: "附加说明", label_en: "Note", kind: "string", default: "" }],
    tooltip: "在预览层画出Boss/玩家血条。预览必须看得见变化。",
    tooltip_en: "Paints boss/player bars in the preview layer.",
  });

  CineHost.registerNodeType({
    type: "encounter.scifi_boss.act",
    title: "Boss动作",
    title_en: "Boss Action",
    category: "ai",
    icon: "fa-burst",
    color: "#f43f5e",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [
      { id: "out", label: "然后", label_en: "Then", kind: "exec" },
      { id: "hit", label: "打中玩家", label_en: "Hit player", kind: "exec" },
      { id: "miss", label: "未打中", label_en: "Miss", kind: "exec" },
    ],
    fields: [
      {
        id: "action",
        label: "动作族",
        label_en: "Action family",
        kind: "select",
        default: "attack",
        options: [
          { value: "idle", label: "待机" },
          { value: "walk", label: "行走" },
          { value: "run", label: "奔跑" },
          { value: "creep", label: "潜行" },
          { value: "jump", label: "跳跃" },
          { value: "fly", label: "飞行" },
          { value: "fall", label: "坠落" },
          { value: "turn", label: "转身" },
          { value: "look", label: "锁定" },
          { value: "provoke", label: "挑衅" },
          { value: "roar", label: "咆哮" },
          { value: "attack", label: "攻击" },
          { value: "getHit", label: "受击" },
          { value: "getHitFly", label: "空中受击" },
          { value: "knockOut", label: "击倒" },
          { value: "wakeUp", label: "起身" },
          { value: "death", label: "死亡" },
        ],
      },
      { id: "variant", label: "动画变体号", label_en: "Variant index", kind: "int", default: 1 },
      { id: "damage", label: "对玩家伤害", label_en: "Damage to player", kind: "int", default: 18 },
      { id: "hitChance", label: "命中率0-100", label_en: "Hit chance 0-100", kind: "int", default: 70 },
      { id: "line", label: "动作台词", label_en: "Bark", kind: "textarea", default: "" },
      { id: "assetId", label: "动作视频资源ID", label_en: "Action video asset id", kind: "string", default: "" },
    ],
    tooltip: "对应资产里的动画族（Attack/Idle/GetHit/Death/Roar…）。攻击会按命中率伤玩家。可挂你自己录的片段。",
    tooltip_en: "Maps pack animation families. Attack rolls hit chance against player HP. Optional captured clip.",
  });

  CineHost.registerNodeType({
    type: "encounter.scifi_boss.strike",
    title: "打击Boss",
    title_en: "Strike Boss",
    category: "ai",
    icon: "fa-hand-fist",
    color: "#fb7185",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [
      { id: "survived", label: "还活着", label_en: "Survived", kind: "exec" },
      { id: "phase", label: "阶段变化", label_en: "Phase change", kind: "exec" },
      { id: "ko", label: "击倒", label_en: "Knock out", kind: "exec" },
      { id: "dead", label: "死亡", label_en: "Dead", kind: "exec" },
    ],
    fields: [
      { id: "damage", label: "伤害", label_en: "Damage", kind: "int", default: 24 },
      { id: "koHp", label: "击倒阈值", label_en: "KO threshold", kind: "int", default: 20 },
      { id: "line", label: "受击台词", label_en: "Hit bark", kind: "textarea", default: "" },
      { id: "assetId", label: "受击视频资源ID", label_en: "Hit video asset id", kind: "string", default: "" },
    ],
    tooltip: "扣Boss血。低于击倒阈值走击倒，掉到0走死亡，跨过33%/66%走阶段变化。",
    tooltip_en: "Subtract boss HP. KO / death / phase pins fire from thresholds.",
  });

  CineHost.registerNodeType({
    type: "encounter.scifi_boss.turn",
    title: "玩家回合",
    title_en: "Player Turn",
    category: "ai",
    icon: "fa-gamepad",
    color: "#38bdf8",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [
      { id: "attack", label: "进攻", label_en: "Attack", kind: "exec" },
      { id: "dodge", label: "闪避", label_en: "Dodge", kind: "exec" },
      { id: "watch", label: "观察/挑衅", label_en: "Watch", kind: "exec" },
      { id: "flee", label: "撤退", label_en: "Flee", kind: "exec" },
    ],
    fields: [
      { id: "prompt", label: "提示", label_en: "Prompt", kind: "textarea", default: "它盯着你。下一步？" },
      { id: "optAttack", label: "进攻选项", label_en: "Attack label", kind: "string", default: "突击暴露的散热口" },
      { id: "optDodge", label: "闪避选项", label_en: "Dodge label", kind: "string", default: "贴地翻滚，躲开扑击" },
      { id: "optWatch", label: "观察选项", label_en: "Watch label", kind: "string", default: "对峙，逼它先咆哮" },
      { id: "optFlee", label: "撤退选项", label_en: "Flee label", kind: "string", default: "撤进侧舱，切断对峙" },
    ],
    tooltip: "遭遇战的交互核心。四个出口分别接打击、Boss攻击、咆哮、结束/转场。",
    tooltip_en: "Interactive core. Wire the four outs to strike / boss attack / roar / exit.",
  });

  CineHost.registerNodeType({
    type: "encounter.scifi_boss.check",
    title: "检查Boss",
    title_en: "Check Boss",
    category: "blueprint",
    icon: "fa-code-branch",
    color: "#a78bfa",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [
      { id: "yes", label: "成立", label_en: "Yes", kind: "exec" },
      { id: "no", label: "不成立", label_en: "No", kind: "exec" },
    ],
    fields: [
      {
        id: "mode",
        label: "条件",
        label_en: "Condition",
        kind: "select",
        default: "alive",
        options: [
          { value: "alive", label: "Boss存活" },
          { value: "dead", label: "Boss已死" },
          { value: "playerAlive", label: "玩家存活" },
          { value: "hpBelow", label: "Boss血量低于" },
          { value: "phaseIs", label: "阶段等于" },
          { value: "stateIs", label: "状态等于" },
          { value: "bossIs", label: "当前是指定Boss" },
        ],
      },
      { id: "value", label: "比较值", label_en: "Value", kind: "string", default: "" },
    ],
    tooltip: "读 boss.* / player.hp。比较值：血量数字、阶段数字、状态名、boss id。",
    tooltip_en: "Reads boss.* / player.hp. Value is hp, phase, state name, or boss id.",
  });

  CineHost.registerNodeType({
    type: "encounter.scifi_boss.player",
    title: "玩家生命",
    title_en: "Player Vitals",
    category: "character",
    icon: "fa-user",
    color: "#f59e0b",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [
      { id: "out", label: "然后", label_en: "Then", kind: "exec" },
      { id: "down", label: "玩家倒下", label_en: "Player down", kind: "exec" },
    ],
    fields: [
      {
        id: "op",
        label: "操作",
        label_en: "Op",
        kind: "select",
        default: "sub",
        options: [
          { value: "set", label: "设为" },
          { value: "add", label: "增加" },
          { value: "sub", label: "减少" },
        ],
      },
      { id: "amount", label: "数值", label_en: "Amount", kind: "int", default: 10 },
      { id: "line", label: "旁白", label_en: "Line", kind: "string", default: "" },
    ],
    tooltip: "改 player.hp。降到0走「玩家倒下」。",
    tooltip_en: "Mutates player.hp. Pin down when it hits 0.",
  });

  function execSpawn(ctx) {
    var data = ctx.data || {};
    var id = String(data.boss || "dragon").toLowerCase();
    if (!BOSSES[id]) id = "dragon";
    var spec = BOSSES[id];
    var maxHp = num(data.maxHp, 0) > 0 ? num(data.maxHp, spec.maxHp) : spec.maxHp;
    var pHp = num(data.playerHp, 100);
    writeState(ctx, {
      "boss.id": id,
      "boss.name": spec.name,
      "boss.skin": Math.max(1, Math.min(5, num(data.skin, 1))),
      "boss.maxHp": maxHp,
      "boss.hp": maxHp,
      "boss.state": "idle",
      "boss.phase": 1,
      "boss.alive": 1,
      "player.hp": pHp,
      "player.maxHp": pHp,
    });
    var line = data.intro || spec.flavor;
    paintHud(ctx, line);
    if (CineHost.log) CineHost.log("output", "spawn " + spec.name_en + " hp=" + maxHp);
    if (maybeVideo(ctx, data.assetId, "out")) return;
    if (ctx.waitClick) {
      ctx.waitClick(function () {
        go(ctx, "out");
      });
      return;
    }
    go(ctx, "out");
  }

  function execHud(ctx) {
    var data = ctx.data || {};
    paintHud(ctx, data.note || "");
    go(ctx, "out");
  }

  function execAct(ctx) {
    var data = ctx.data || {};
    var action = String(data.action || "idle");
    var v = writeState(ctx, { "boss.state": action });
    var line = data.line || currentBoss(ctx).name + " · " + (ACTION_ZH[action] || action);
    var rolledHit = false;
    if (action === "attack") {
      var chance = Math.max(0, Math.min(100, num(data.hitChance, 70)));
      rolledHit = Math.random() * 100 < chance;
      if (rolledHit) {
        var dmg = Math.max(0, num(data.damage, 18));
        var hp = Math.max(0, num(v["player.hp"], 0) - dmg);
        writeState(ctx, { "player.hp": hp });
        line = (data.line || "扑击命中。") + "  -" + dmg;
      } else {
        line = data.line || "扑击擦空。";
      }
    }
    if (action === "death") writeState(ctx, { "boss.hp": 0, "boss.alive": 0 });
    paintHud(ctx, line + "  #" + num(data.variant, 1));
    var sock = action === "attack" ? (rolledHit ? "hit" : "miss") : "out";
    if (maybeVideo(ctx, data.assetId, sock)) return;
    if (ctx.waitClick) {
      ctx.waitClick(function () {
        go(ctx, sock);
      });
      return;
    }
    go(ctx, sock);
  }

  function execStrike(ctx) {
    var data = ctx.data || {};
    var v = bag(ctx);
    var before = num(v["boss.hp"], 0);
    var max = Math.max(1, num(v["boss.maxHp"], 1));
    var dmg = Math.max(0, num(data.damage, 24));
    var after = Math.max(0, before - dmg);
    var oldPhase = phaseForHp(before, max);
    var newPhase = phaseForHp(after, max);
    var koHp = num(data.koHp, 20);
    var state = after <= 0 ? "death" : after <= koHp ? "knockOut" : "getHit";
    writeState(ctx, {
      "boss.hp": after,
      "boss.state": state,
      "boss.phase": Math.max(1, newPhase || oldPhase),
    });
    var line = data.line || "命中结构缝。-" + dmg;
    paintHud(ctx, line);
    var sock = "survived";
    if (after <= 0) sock = "dead";
    else if (after <= koHp) sock = "ko";
    else if (newPhase !== oldPhase && newPhase > 0) sock = "phase";
    if (maybeVideo(ctx, data.assetId, sock)) return;
    if (ctx.waitClick) {
      ctx.waitClick(function () {
        go(ctx, sock);
      });
      return;
    }
    go(ctx, sock);
  }

  function execTurn(ctx) {
    var data = ctx.data || {};
    paintHud(ctx, data.prompt || "它盯着你。下一步？");
    var opts = [
      ["attack", data.optAttack || "突击暴露的散热口"],
      ["dodge", data.optDodge || "贴地翻滚，躲开扑击"],
      ["watch", data.optWatch || "对峙，逼它先咆哮"],
      ["flee", data.optFlee || "撤进侧舱，切断对峙"],
    ];
    if (ctx.ui && ctx.ui.choices) {
      opts.forEach(function (pair, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = i + 1 + ". " + pair[1];
        b.onclick = function () {
          go(ctx, pair[0]);
        };
        ctx.ui.choices.appendChild(b);
      });
      return;
    }
    if (ctx.waitClick) {
      ctx.waitClick(function () {
        go(ctx, "attack");
      });
      return;
    }
    go(ctx, "attack");
  }

  function execCheck(ctx) {
    var data = ctx.data || {};
    var v = bag(ctx);
    var mode = data.mode || "alive";
    var raw = data.value;
    var ok = false;
    if (mode === "alive") ok = num(v["boss.hp"], 0) > 0;
    else if (mode === "dead") ok = num(v["boss.hp"], 0) <= 0;
    else if (mode === "playerAlive") ok = num(v["player.hp"], 0) > 0;
    else if (mode === "hpBelow") ok = num(v["boss.hp"], 0) < num(raw, 0);
    else if (mode === "phaseIs") ok = num(v["boss.phase"], 1) === num(raw, 1);
    else if (mode === "stateIs") ok = String(v["boss.state"] || "") === String(raw || "");
    else if (mode === "bossIs") ok = String(v["boss.id"] || "") === String(raw || "");
    if (ctx.log) ctx.log("output", "check " + mode + " -> " + ok);
    go(ctx, ok ? "yes" : "no");
  }

  function execPlayer(ctx) {
    var data = ctx.data || {};
    var v = bag(ctx);
    var cur = num(v["player.hp"], 0);
    var amt = num(data.amount, 0);
    var op = data.op || "sub";
    var next = cur;
    if (op === "set") next = amt;
    else if (op === "add") next = cur + amt;
    else next = cur - amt;
    next = Math.max(0, next);
    writeState(ctx, { "player.hp": next });
    paintHud(ctx, data.line || "");
    if (next <= 0) {
      go(ctx, "down");
      return;
    }
    go(ctx, "out");
  }

  if (CineHost.registerExecutor) {
    CineHost.registerExecutor("encounter.scifi_boss.spawn", execSpawn);
    CineHost.registerExecutor("encounter.scifi_boss.hud", execHud);
    CineHost.registerExecutor("encounter.scifi_boss.act", execAct);
    CineHost.registerExecutor("encounter.scifi_boss.strike", execStrike);
    CineHost.registerExecutor("encounter.scifi_boss.turn", execTurn);
    CineHost.registerExecutor("encounter.scifi_boss.check", execCheck);
    CineHost.registerExecutor("encounter.scifi_boss.player", execPlayer);
  }

  catalog();
})();
