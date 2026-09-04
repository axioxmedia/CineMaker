/* interface.stage — CineMaker widget stage. Talks only to CineHost. */
(function () {
  var PID = "interface.stage";
  var ROOT_ID = "cf-stage-hud";
  var STYLE_ID = "cf-stage-hud-style";

  function store() {
    return CineHost.pluginData ? CineHost.pluginData(PID) : null;
  }

  function getKey(key, fallback) {
    var s = store();
    if (s && typeof s.get === "function") return s.get(key, fallback);
    return fallback;
  }

  function setKey(key, value) {
    var s = store();
    if (s && typeof s.set === "function") s.set(key, value);
  }

  function hasDoc() {
    return typeof document !== "undefined" && document;
  }

  function injectCss() {
    if (!hasDoc()) return;
    if (document.getElementById(STYLE_ID)) return;
    var css = document.createElement("style");
    css.id = STYLE_ID;
    css.textContent = [
      "#" + ROOT_ID + "{position:fixed;inset:0;pointer-events:none;z-index:12000;font-family:Georgia,'Songti SC','Noto Serif SC',serif;color:#f4efe6;}",
      "#" + ROOT_ID + " .stg-layer{position:absolute;inset:0;}",
      "#" + ROOT_ID + " .stg-fade{background:#000;opacity:0;transition:opacity .4s ease;}",
      "#" + ROOT_ID + " .stg-fade.on{opacity:1;}",
      "#" + ROOT_ID + " .stg-bars{pointer-events:none;}",
      "#" + ROOT_ID + " .stg-bar{position:absolute;left:0;right:0;height:0;background:#050505;transition:height .45s ease;}",
      "#" + ROOT_ID + " .stg-bar.top{top:0;}",
      "#" + ROOT_ID + " .stg-bar.bot{bottom:0;}",
      "#" + ROOT_ID + " .stg-bars.on .stg-bar{height:9vh;}",
      "#" + ROOT_ID + " .stg-title{display:none;align-items:center;justify-content:center;text-align:center;background:rgba(6,6,8,.72);pointer-events:auto;}",
      "#" + ROOT_ID + " .stg-title.on{display:flex;}",
      "#" + ROOT_ID + " .stg-title .box{max-width:720px;padding:28px 36px;}",
      "#" + ROOT_ID + " .stg-kicker{letter-spacing:.28em;font-size:11px;opacity:.62;text-transform:uppercase;margin-bottom:12px;}",
      "#" + ROOT_ID + " .stg-h1{font-size:42px;line-height:1.15;margin:0 0 12px;font-weight:600;}",
      "#" + ROOT_ID + " .stg-sub{font-size:16px;opacity:.82;margin:0 0 28px;line-height:1.5;}",
      "#" + ROOT_ID + " .stg-prompt{font-size:13px;letter-spacing:.16em;opacity:.7;animation:stgPulse 1.6s ease-in-out infinite;}",
      "#" + ROOT_ID + " .stg-banner{position:absolute;left:48px;bottom:11vh;max-width:46%;opacity:0;transform:translateY(10px);transition:all .35s ease;}",
      "#" + ROOT_ID + " .stg-banner.on{opacity:1;transform:none;}",
      "#" + ROOT_ID + " .stg-banner .who{font-size:11px;letter-spacing:.2em;opacity:.6;margin-bottom:6px;}",
      "#" + ROOT_ID + " .stg-banner .line{font-size:22px;border-left:2px solid #c9a86c;padding-left:14px;}",
      "#" + ROOT_ID + " .stg-obj{position:absolute;top:18px;left:50%;transform:translateX(-50%);min-width:240px;text-align:center;background:rgba(0,0,0,.45);padding:8px 18px;border:1px solid rgba(201,168,108,.35);font-size:13px;letter-spacing:.04em;opacity:0;transition:opacity .3s;}",
      "#" + ROOT_ID + " .stg-obj.on{opacity:1;}",
      "#" + ROOT_ID + " .stg-stack{position:absolute;top:16px;right:16px;width:320px;display:flex;flex-direction:column;gap:8px;pointer-events:none;}",
      "#" + ROOT_ID + " .stg-note{background:rgba(8,8,10,.82);border-left:3px solid #c9a86c;padding:10px 12px;font-size:13px;line-height:1.4;opacity:0;transform:translateX(12px);animation:stgIn .35s forwards;}",
      "#" + ROOT_ID + " .stg-note.mission{border-color:#d4b36a;}",
      "#" + ROOT_ID + " .stg-note.update{border-color:#7ec8e3;}",
      "#" + ROOT_ID + " .stg-note.option{border-color:#e7c07a;}",
      "#" + ROOT_ID + " .stg-note.pickup{border-color:#9ad17b;}",
      "#" + ROOT_ID + " .stg-note.progress{border-color:#c9a86c;}",
      "#" + ROOT_ID + " .stg-note.primary{border-color:#f2e6c9;}",
      "#" + ROOT_ID + " .stg-note.tutorial{border-color:#b9a0d8;}",
      "#" + ROOT_ID + " .stg-note .kind{font-size:10px;letter-spacing:.18em;opacity:.55;margin-bottom:4px;text-transform:uppercase;}",
      "#" + ROOT_ID + " .stg-prog{position:absolute;left:18%;right:18%;bottom:7vh;height:6px;background:rgba(255,255,255,.12);opacity:0;}",
      "#" + ROOT_ID + " .stg-prog.on{opacity:1;}",
      "#" + ROOT_ID + " .stg-prog .fill{height:100%;width:0;background:#c9a86c;transition:width .4s ease;}",
      "#" + ROOT_ID + " .stg-prog .plab{position:absolute;left:0;top:-18px;font-size:11px;opacity:.75;}",
      "#" + ROOT_ID + " .stg-fx{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .2s;}",
      "#" + ROOT_ID + " .stg-fx.flash{background:#fff;}",
      "#" + ROOT_ID + " .stg-fx.vignette{box-shadow:inset 0 0 120px 40px #000;background:transparent;}",
      "#" + ROOT_ID + " .stg-fx.damage{background:radial-gradient(ellipse at center,transparent 40%,rgba(140,16,16,.55) 100%);}",
      "#" + ROOT_ID + " .stg-fx.highlight{background:rgba(255,236,170,.18);}",
      "#" + ROOT_ID + " .stg-fx.on{opacity:1;}",
      "#" + ROOT_ID + " .stg-skip{position:absolute;right:24px;bottom:12px;font-size:12px;letter-spacing:.14em;opacity:0;pointer-events:auto;cursor:pointer;}",
      "#" + ROOT_ID + " .stg-skip.on{opacity:.75;}",
      "#" + ROOT_ID + ".mode-hidden{display:none !important;}",
      "#" + ROOT_ID + ".mode-menu .stg-stack,#" + ROOT_ID + ".mode-menu .stg-obj,#" + ROOT_ID + ".mode-menu .stg-prog{display:none;}",
      "@keyframes stgIn{to{opacity:1;transform:none;}}",
      "@keyframes stgPulse{0%,100%{opacity:.35;}50%{opacity:.95;}}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(css);
  }

  function root() {
    if (!hasDoc()) return null;
    injectCss();
    var el = document.getElementById(ROOT_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = ROOT_ID;
    el.innerHTML = [
      '<div class="stg-layer stg-fade" data-role="fade"></div>',
      '<div class="stg-layer stg-fx" data-role="fx"></div>',
      '<div class="stg-layer stg-bars" data-role="bars"><div class="stg-bar top"></div><div class="stg-bar bot"></div></div>',
      '<div class="stg-layer stg-title" data-role="title"><div class="box"><div class="stg-kicker" data-role="kicker"></div><h1 class="stg-h1" data-role="h1"></h1><p class="stg-sub" data-role="sub"></p><div class="stg-prompt" data-role="prompt"></div></div></div>',
      '<div class="stg-banner" data-role="banner"><div class="who" data-role="banner-who"></div><div class="line" data-role="banner-line"></div></div>',
      '<div class="stg-obj" data-role="obj"></div>',
      '<div class="stg-stack" data-role="stack"></div>',
      '<div class="stg-prog" data-role="prog"><div class="plab" data-role="prog-lab"></div><div class="fill" data-role="prog-fill"></div></div>',
      '<div class="stg-skip" data-role="skip">跳过 SKIP</div>'
    ].join("");
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function part(role) {
    var r = root();
    if (!r) return null;
    return r.querySelector('[data-role="' + role + '"]');
  }

  function setMode(mode) {
    mode = mode || "play";
    setKey("mode", mode);
    var r = root();
    if (!r) return;
    r.classList.remove("mode-hidden", "mode-cinematic", "mode-play", "mode-menu");
    r.classList.add("mode-" + mode);
    if (mode === "hidden") r.style.display = "none";
    else r.style.display = "";
  }

  function visibleSay(ctx, text) {
    if (ctx && ctx.say && text) ctx.say(text);
    if (CineHost.toast && text) CineHost.toast(text);
    if (ctx && ctx.log && text) ctx.log("output", text);
  }

  function later(ctx, ms, fn) {
    if (ctx && ctx.time && typeof ctx.time.after === "function") {
      ctx.time.after(ms, fn);
      return;
    }
    if (typeof setTimeout === "function") setTimeout(fn, ms);
    else fn();
  }

  function go(ctx, sock) {
    var n = ctx.node;
    if (ctx.enter && ctx.follow && n) ctx.enter(ctx.follow(n.id, sock || "out"));
  }

  function showTitle(data) {
    var wrap = part("title");
    if (!wrap) return;
    var k = part("kicker");
    var h = part("h1");
    var s = part("sub");
    var p = part("prompt");
    if (k) k.textContent = data.kicker || "";
    if (h) h.textContent = data.title || "";
    if (s) s.textContent = data.subtitle || "";
    if (p) p.textContent = data.prompt || "";
    wrap.classList.add("on");
  }

  function hideTitle() {
    var wrap = part("title");
    if (wrap) wrap.classList.remove("on");
  }

  function pushNote(kind, title, body, ms) {
    var stack = part("stack");
    if (!stack) return;
    var card = document.createElement("div");
    card.className = "stg-note " + (kind || "primary");
    card.innerHTML = '<div class="kind"></div><div class="body"></div>';
    card.querySelector(".kind").textContent = title || kind || "";
    card.querySelector(".body").textContent = body || "";
    stack.appendChild(card);
    var life = Math.max(800, Number(ms) || 3200);
    later(null, life, function () {
      if (card && card.parentNode) card.parentNode.removeChild(card);
    });
  }

  function applyFade(color, on, holdMs) {
    var el = part("fade");
    if (!el) return;
    if (color) el.style.background = color;
    if (on) el.classList.add("on");
    else el.classList.remove("on");
    if (on && holdMs && holdMs > 0) {
      later(null, holdMs, function () {
        el.classList.remove("on");
      });
    }
  }

  var KIND_LABEL = {
    mission: "任务 MISSION",
    update: "更新 UPDATE",
    option: "选项 OPTION",
    pickup: "拾取 PICKUP",
    progress: "进度 PROGRESS",
    primary: "提示 NOTICE",
    tutorial: "指引 TUTORIAL"
  };

  if (CineHost.definePlugin) {
    CineHost.definePlugin({
      id: PID,
      onLoad: function () {
        injectCss();
        root();
        if (CineHost.log) CineHost.log("output", "interface.stage loaded");
      },
      onProjectOpen: function () {
        injectCss();
        root();
      },
      onProjectClose: function () {
        hideTitle();
      },
      onUnload: function () {
        if (!hasDoc()) return;
        var el = document.getElementById(ROOT_ID);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        var st = document.getElementById(STYLE_ID);
        if (st && st.parentNode) st.parentNode.removeChild(st);
      }
    });
  }

  if (CineHost.hook) {
    CineHost.hook("export:injectPlayer", function (payload) {
      payload = payload || {};
      payload.notes = (payload.notes || []).concat([
        "interface.stage overlays inject a #cf-stage-hud layer in the player shell."
      ]);
      return payload;
    });
  }

  CineHost.registerNodeType({
    type: "interface.stage.mode",
    title: "舞台模式",
    title_en: "Stage Mode",
    category: "interface",
    icon: "fa-layer-group",
    color: "#7ec8e3",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      {
        id: "mode",
        label: "模式",
        label_en: "Mode",
        kind: "select",
        default: "play",
        options: [
          { value: "play", label: "播放 HUD", label_en: "Play HUD" },
          { value: "cinematic", label: "过场", label_en: "Cinematic" },
          { value: "menu", label: "菜单 / 片头", label_en: "Menu / Title" },
          { value: "hidden", label: "全隐", label_en: "Hidden" }
        ]
      }
    ],
    tooltip: "切换舞台层：播放 HUD、过场、菜单片头或全部隐藏。",
    tooltip_en: "Switch the widget stage between play HUD, cinematic, menu, or hidden."
  });

  CineHost.registerNodeType({
    type: "interface.stage.title",
    title: "片头画面",
    title_en: "Title Screen",
    category: "interface",
    icon: "fa-clapperboard",
    color: "#c9a86c",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [
      { id: "out", label: "然后", label_en: "Then", kind: "exec" },
      { id: "clicked", label: "点击继续", label_en: "Clicked", kind: "exec" }
    ],
    fields: [
      { id: "kicker", label: "眉题", label_en: "Kicker", kind: "string", default: "CINEFORGE" },
      { id: "title", label: "主标题", label_en: "Title", kind: "string", default: "未命名篇章" },
      { id: "subtitle", label: "副标题", label_en: "Subtitle", kind: "textarea", default: "" },
      { id: "prompt", label: "提示语", label_en: "Prompt", kind: "string", default: "点击继续  ·  CLICK TO START" },
      { id: "waitClick", label: "等待点击", label_en: "Wait for click", kind: "bool", default: true },
      { id: "durationMs", label: "自动继续(毫秒)", label_en: "Auto-continue ms", kind: "int", default: 0 }
    ],
    tooltip: "全屏片头 / 开始画面。可等待点击或按毫秒自动落下。",
    tooltip_en: "Full-screen title / start card. Wait for click or auto-continue."
  });

  CineHost.registerNodeType({
    type: "interface.stage.letterbox",
    title: "过场遮幅",
    title_en: "Letterbox",
    category: "interface",
    icon: "fa-film",
    color: "#8a8a8a",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "on", label: "打开遮幅", label_en: "Enable bars", kind: "bool", default: true }
    ],
    tooltip: "打开或关闭上下黑边，给过场用。",
    tooltip_en: "Toggle cinematic letterbox bars."
  });

  CineHost.registerNodeType({
    type: "interface.stage.fade",
    title: "淡入淡出",
    title_en: "Fade Overlay",
    category: "interface",
    icon: "fa-adjust",
    color: "#4a4a4a",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "action", label: "动作", label_en: "Action", kind: "select", default: "in", options: [
        { value: "in", label: "淡入黑场", label_en: "Fade in (cover)" },
        { value: "out", label: "淡出恢复", label_en: "Fade out (clear)" }
      ]},
      { id: "color", label: "颜色", label_en: "Color", kind: "string", default: "#000000" },
      { id: "holdMs", label: "保持(毫秒)", label_en: "Hold ms", kind: "int", default: 0 },
      { id: "waitMs", label: "再继续(毫秒)", label_en: "Then wait ms", kind: "int", default: 400 }
    ],
    tooltip: "颜色遮罩淡入或淡出。优先走 ctx.fadeTo，同时画舞台层。",
    tooltip_en: "Color overlay fade. Uses ctx.fadeTo when present, plus the stage layer."
  });

  CineHost.registerNodeType({
    type: "interface.stage.notify",
    title: "通知条",
    title_en: "Notification",
    category: "interface",
    icon: "fa-bell",
    color: "#d4b36a",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "kind", label: "类型", label_en: "Kind", kind: "select", default: "primary", options: [
        { value: "mission", label: "任务", label_en: "Mission" },
        { value: "update", label: "更新", label_en: "Update" },
        { value: "option", label: "选项", label_en: "Option" },
        { value: "pickup", label: "拾取", label_en: "Pickup" },
        { value: "progress", label: "进度", label_en: "Progress" },
        { value: "primary", label: "主提示", label_en: "Primary" },
        { value: "tutorial", label: "指引", label_en: "Tutorial" }
      ]},
      { id: "title", label: "标题", label_en: "Title", kind: "string", default: "" },
      { id: "body", label: "正文", label_en: "Body", kind: "textarea", default: "" },
      { id: "durationMs", label: "停留(毫秒)", label_en: "Duration ms", kind: "int", default: 3200 }
    ],
    tooltip: "弹出一条右上角通知。类型对应 Pro HUD 的任务/更新/拾取/指引等，但不使用其贴图。",
    tooltip_en: "Push a corner notification. Kinds mirror Pro HUD message types without copying art."
  });

  CineHost.registerNodeType({
    type: "interface.stage.banner",
    title: "左下角标",
    title_en: "Lower Third",
    category: "interface",
    icon: "fa-closed-captioning",
    color: "#c9a86c",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "who", label: "眉标 / 角色", label_en: "Kicker / name", kind: "string", default: "" },
      { id: "line", label: "文案", label_en: "Line", kind: "textarea", default: "" },
      { id: "show", label: "显示", label_en: "Show", kind: "bool", default: true },
      { id: "durationMs", label: "自动隐藏(毫秒,0=保持)", label_en: "Auto-hide ms (0=keep)", kind: "int", default: 0 }
    ],
    tooltip: "过场左下角标 / 章节卡。",
    tooltip_en: "Cinematic lower-third or chapter card."
  });

  CineHost.registerNodeType({
    type: "interface.stage.progress",
    title: "进度条",
    title_en: "Progress Bar",
    category: "interface",
    icon: "fa-bars-progress",
    color: "#c9a86c",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "label", label: "标签", label_en: "Label", kind: "string", default: "" },
      { id: "percent", label: "百分比 0-100", label_en: "Percent 0-100", kind: "int", default: 0 },
      { id: "show", label: "显示", label_en: "Show", kind: "bool", default: true }
    ],
    tooltip: "底部细进度条，给调查、加载或过场进度用。",
    tooltip_en: "Slim bottom bar for investigation, load, or cutscene progress."
  });

  CineHost.registerNodeType({
    type: "interface.stage.objective",
    title: "目标条",
    title_en: "Objective Rail",
    category: "interface",
    icon: "fa-location-arrow",
    color: "#7ec8e3",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "text", label: "目标文本", label_en: "Objective text", kind: "string", default: "" },
      { id: "show", label: "显示", label_en: "Show", kind: "bool", default: true }
    ],
    tooltip: "顶部目标条。对应 Fab 指南针/任务提示的叙事替代，不是 3D 小地图。",
    tooltip_en: "Top objective rail. Narrative stand-in for compass/mission markers, not a 3D minimap."
  });

  CineHost.registerNodeType({
    type: "interface.stage.skip",
    title: "等待跳过",
    title_en: "Wait or Skip",
    category: "interface",
    icon: "fa-forward",
    color: "#e7c07a",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [
      { id: "out", label: "播完", label_en: "Finished", kind: "exec" },
      { id: "skipped", label: "已跳过", label_en: "Skipped", kind: "exec" }
    ],
    fields: [
      { id: "hint", label: "跳过提示", label_en: "Skip hint", kind: "string", default: "跳过 SKIP" },
      { id: "durationMs", label: "最长等待(毫秒)", label_en: "Max wait ms", kind: "int", default: 4000 },
      { id: "allowSkip", label: "允许跳过", label_en: "Allow skip", kind: "bool", default: true }
    ],
    tooltip: "过场等待：到时走「播完」，点击提示走「已跳过」。",
    tooltip_en: "Cutscene wait. Timeout fires Finished; click fires Skipped."
  });

  CineHost.registerNodeType({
    type: "interface.stage.fx",
    title: "屏幕效果",
    title_en: "Screen FX",
    category: "interface",
    icon: "fa-burst",
    color: "#c45c5c",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "fx", label: "效果", label_en: "Effect", kind: "select", default: "flash", options: [
        { value: "flash", label: "闪光", label_en: "Flash" },
        { value: "vignette", label: "暗角", label_en: "Vignette" },
        { value: "damage", label: "损伤", label_en: "Damage" },
        { value: "highlight", label: "高光", label_en: "Highlight" },
        { value: "off", label: "关闭", label_en: "Off" }
      ]},
      { id: "durationMs", label: "持续(毫秒,0=保持)", label_en: "Duration ms (0=keep)", kind: "int", default: 280 }
    ],
    tooltip: "对应 Pro HUD 的 Black Screen / Highlight / Damage，用 CSS 叠层实现。",
    tooltip_en: "Maps Pro HUD Black Screen / Highlight / Damage to CSS overlays."
  });

  CineHost.registerNodeType({
    type: "interface.stage.clear",
    title: "清空舞台",
    title_en: "Clear Stage",
    category: "interface",
    icon: "fa-eraser",
    color: "#8a8a8a",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "title", label: "关闭片头", label_en: "Close title", kind: "bool", default: true },
      { id: "notes", label: "清通知", label_en: "Clear notes", kind: "bool", default: true },
      { id: "banner", label: "关角标", label_en: "Hide banner", kind: "bool", default: true },
      { id: "fx", label: "关效果", label_en: "Clear FX", kind: "bool", default: true },
      { id: "progress", label: "关进度", label_en: "Hide progress", kind: "bool", default: false },
      { id: "objective", label: "关目标", label_en: "Hide objective", kind: "bool", default: false },
      { id: "letterbox", label: "关遮幅", label_en: "Drop letterbox", kind: "bool", default: false }
    ],
    tooltip: "按勾选项拆掉舞台层，避免叠层残留。",
    tooltip_en: "Tear down selected stage layers so overlays do not linger."
  });

  function execMode(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var mode = data.mode || "play";
    setMode(mode);
    visibleSay(ctx, "舞台模式 · " + mode);
    if (mode === "cinematic") {
      var bars = part("bars");
      if (bars) bars.classList.add("on");
    }
    go(ctx, "out");
  }

  function execTitle(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    setMode("menu");
    showTitle(data);
    visibleSay(ctx, data.title || "片头");
    var done = false;
    function finish(sock) {
      if (done) return;
      done = true;
      hideTitle();
      go(ctx, sock);
    }
    var waitClick = data.waitClick !== false;
    var ms = Number(data.durationMs) || 0;
    if (waitClick && ctx.waitClick) {
      ctx.waitClick(function () { finish("clicked"); });
      if (ms > 0) later(ctx, ms, function () { finish("out"); });
      return;
    }
    var wrap = part("title");
    if (waitClick && wrap && hasDoc()) {
      wrap.style.pointerEvents = "auto";
      wrap.onclick = function () {
        wrap.onclick = null;
        finish("clicked");
      };
    }
    if (ms > 0) later(ctx, ms, function () { finish("out"); });
    else if (!waitClick) finish("out");
  }

  function execLetterbox(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var on = data.on !== false;
    var bars = part("bars");
    if (bars) {
      if (on) bars.classList.add("on");
      else bars.classList.remove("on");
    }
    setKey("letterbox", on);
    visibleSay(ctx, on ? "遮幅开" : "遮幅关");
    go(ctx, "out");
  }

  function execFade(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var cover = (data.action || "in") === "in";
    var color = data.color || "#000000";
    var hold = Number(data.holdMs) || 0;
    applyFade(color, cover, hold);
    if (ctx.fadeTo) {
      try { ctx.fadeTo(cover ? color : "transparent", Number(data.waitMs) || 400); }
      catch (e1) {
        try { ctx.fadeTo(cover ? 1 : 0); } catch (e2) {}
      }
    }
    visibleSay(ctx, cover ? "淡入" : "淡出");
    later(ctx, Number(data.waitMs) || 400, function () { go(ctx, "out"); });
  }

  function execNotify(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var kind = data.kind || "primary";
    var title = data.title || KIND_LABEL[kind] || kind;
    var body = data.body || "";
    pushNote(kind, title, body, Number(data.durationMs) || 3200);
    visibleSay(ctx, (title + " — " + body).trim());
    go(ctx, "out");
  }

  function execBanner(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var el = part("banner");
    var who = part("banner-who");
    var line = part("banner-line");
    if (who) who.textContent = data.who || "";
    if (line) line.textContent = data.line || "";
    if (el) {
      if (data.show !== false) el.classList.add("on");
      else el.classList.remove("on");
    }
    visibleSay(ctx, data.line || data.who || "角标");
    var ms = Number(data.durationMs) || 0;
    if (ms > 0 && el) later(ctx, ms, function () { el.classList.remove("on"); });
    go(ctx, "out");
  }

  function execProgress(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var wrap = part("prog");
    var fill = part("prog-fill");
    var lab = part("prog-lab");
    var pct = Math.max(0, Math.min(100, Number(data.percent) || 0));
    if (lab) lab.textContent = data.label || "";
    if (fill) fill.style.width = pct + "%";
    if (wrap) {
      if (data.show !== false) wrap.classList.add("on");
      else wrap.classList.remove("on");
    }
    setKey("progress", pct);
    visibleSay(ctx, (data.label || "进度") + " " + pct + "%");
    go(ctx, "out");
  }

  function execObjective(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var el = part("obj");
    if (el) {
      el.textContent = data.text || "";
      if (data.show !== false && data.text) el.classList.add("on");
      else el.classList.remove("on");
    }
    setKey("objective", data.text || "");
    visibleSay(ctx, data.text || "目标已关");
    go(ctx, "out");
  }

  function execSkip(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var hint = part("skip");
    var allow = data.allowSkip !== false;
    var ms = Math.max(0, Number(data.durationMs) || 4000);
    var settled = false;
    function finish(sock) {
      if (settled) return;
      settled = true;
      if (hint) {
        hint.classList.remove("on");
        hint.onclick = null;
      }
      go(ctx, sock);
    }
    if (hint) {
      hint.textContent = data.hint || "跳过 SKIP";
      if (allow) hint.classList.add("on");
      hint.onclick = function () {
        if (!allow) return;
        visibleSay(ctx, "已跳过");
        finish("skipped");
      };
    }
    if (allow && ctx.waitClick && ms <= 0) {
      ctx.waitClick(function () { finish("skipped"); });
      return;
    }
    later(ctx, ms, function () { finish("out"); });
  }

  function execFx(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    var fx = data.fx || "flash";
    var el = part("fx");
    if (el) {
      el.className = "stg-layer stg-fx";
      if (fx !== "off") {
        el.classList.add(fx, "on");
        var ms = Number(data.durationMs) || 0;
        if (ms > 0) later(ctx, ms, function () { el.classList.remove("on"); });
      }
    }
    visibleSay(ctx, "屏幕效果 · " + fx);
    go(ctx, "out");
  }

  function execClear(ctx) {
    var data = (ctx.node && ctx.node.data) || {};
    if (data.title !== false) hideTitle();
    if (data.notes !== false) {
      var stack = part("stack");
      if (stack) stack.innerHTML = "";
    }
    if (data.banner !== false) {
      var b = part("banner");
      if (b) b.classList.remove("on");
    }
    if (data.fx !== false) {
      var fx = part("fx");
      if (fx) fx.classList.remove("on");
    }
    if (data.progress) {
      var p = part("prog");
      if (p) p.classList.remove("on");
    }
    if (data.objective) {
      var o = part("obj");
      if (o) o.classList.remove("on");
    }
    if (data.letterbox) {
      var bars = part("bars");
      if (bars) bars.classList.remove("on");
    }
    var skip = part("skip");
    if (skip) skip.classList.remove("on");
    visibleSay(ctx, "舞台已清空");
    go(ctx, "out");
  }

  if (CineHost.registerExecutor) {
    CineHost.registerExecutor("interface.stage.mode", execMode);
    CineHost.registerExecutor("interface.stage.title", execTitle);
    CineHost.registerExecutor("interface.stage.letterbox", execLetterbox);
    CineHost.registerExecutor("interface.stage.fade", execFade);
    CineHost.registerExecutor("interface.stage.notify", execNotify);
    CineHost.registerExecutor("interface.stage.banner", execBanner);
    CineHost.registerExecutor("interface.stage.progress", execProgress);
    CineHost.registerExecutor("interface.stage.objective", execObjective);
    CineHost.registerExecutor("interface.stage.skip", execSkip);
    CineHost.registerExecutor("interface.stage.fx", execFx);
    CineHost.registerExecutor("interface.stage.clear", execClear);
  }
})();
