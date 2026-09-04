const I18N = {
  zh: {
    graph: "蓝图",
    assets: "资产",
    plugins: "插件",
    save: "保存",
    export: "导出游戏",
    exportAsk: "游戏名称",
    exported: "已导出",
    fit: "适配",
    hint: "滚轮缩放 · 空白拖动画布 · 从节点右侧端口拉线 · Delete 删除",
    mylib: "我的库",
    starred: "星标",
    trash: "回收站",
    up: "上级",
    folder: "新建文件夹",
    upload: "上传",
    node: "节点",
    asset: "资产",
    saved: "已保存",
    enabled: "已启用 · 点击停用",
    disabled: "已停用 · 点击启用",
    empty: "空文件夹",
    preview: "交互预览",
    stop: "停止",
    pie: "PIE 完整试玩",
    tagline: "蓝图 · 插件 · 资产",
    sdk: "下载插件 SDK",
    plugHelp: "只有扩展功能才是插件。蓝图画布和资产库是编辑器本体。",
    close: "关闭",
    output: "输出日志",
    messages: "消息日志",
    loc: "本地化面板",
    console: "控制台",
    comment: "创建注释框",
    loopWarn: "检测到死循环，已停止预览。",
    cat_flow: "蓝图",
    cat_ui: "界面",
    cat_video: "视频",
    cat_media: "媒体",
    cat_misc: "其它",
    exporting: "正在导出",
    packMedia: "收集素材",
    packWrite: "写入游戏包",
    instance: "全局实例",
    mode: "游戏模式",
    library: "函数库",
    copy: "复制",
    paste: "粘贴",
    del: "删除",
    addComment: "添加注释",
    makeFn: "创建函数",
    makeMacro: "创建宏",
    fnName: "函数名称",
    macroName: "宏名称",
    editorSet: "编辑器设定",
    projSet: "项目设定",
    projName: "项目名称",
    packName: "打包程序名称",
    accent: "编辑器主色 HEX",
    searchAsset: "搜索资产",
    libTitle: "自定义库",
    fns: "函数",
    macros: "宏",
    uninstall: "卸载插件",
    sampleDl: "下载案例",
    packedAt: "已打包到",
  },
  en: {
    graph: "Blueprint",
    assets: "Assets",
    plugins: "Plugins",
    save: "Save",
    export: "Export game",
    exportAsk: "Game title",
    exported: "Exported",
    fit: "Fit",
    hint: "Wheel zoom · drag empty canvas · wire from right ports · Delete to remove",
    mylib: "My Library",
    starred: "Starred",
    trash: "Trash",
    up: "Up",
    folder: "New folder",
    upload: "Upload",
    node: "Node",
    asset: "Asset",
    saved: "Saved",
    enabled: "Enabled · click to disable",
    disabled: "Disabled · click to enable",
    empty: "Empty folder",
    preview: "Interactive preview",
    stop: "Stop",
    pie: "PIE play",
    tagline: "graph · plugins · assets",
    sdk: "Download plugin SDK",
    plugHelp: "Only extensions are plugins. The graph canvas and asset library are built in.",
    close: "Close",
    output: "Output Log",
    messages: "Message Log",
    loc: "Localization",
    console: "Console",
    comment: "Create comment",
    loopWarn: "Infinite loop stopped.",
    cat_flow: "Blueprint",
    cat_ui: "Interface",
    cat_video: "Video",
    cat_media: "Media",
    cat_misc: "Misc",
    exporting: "Exporting",
    packMedia: "Collecting media",
    packWrite: "Writing pack",
    instance: "Game Instance",
    mode: "Game Mode",
    library: "Library",
    copy: "Copy",
    paste: "Paste",
    del: "Delete",
    addComment: "Add comment",
    makeFn: "Create function",
    makeMacro: "Create macro",
    fnName: "Function name",
    macroName: "Macro name",
    editorSet: "Editor settings",
    projSet: "Project settings",
    projName: "Project name",
    packName: "Packaged app name",
    accent: "Accent HEX",
    searchAsset: "Search assets",
    libTitle: "Custom library",
    fns: "Functions",
    macros: "Macros",
    uninstall: "Uninstall",
    sampleDl: "Download sample",
    packedAt: "Saved to",
  },
};

const AXIOXMEDIA_BRAND = "Axiox Media";
const AIO_WATERMARK = "axioxmedia";

let lang = localStorage.getItem("cinemaker-lang") || "zh";
let driveParent = null;
let driveView = "folder";
let selectedAsset = null;

function fillLevels() {
  const sel = document.getElementById("levelPick");
  if (!sel || !window.Graph) return;
  sel.innerHTML = "";
  (Graph.state.levels || []).forEach((lv) => {
    const o = document.createElement("option");
    o.value = lv.id;
    o.textContent = lv.name;
    if (lv.id === Graph.state.levelId) o.selected = true;
    sel.appendChild(o);
  });
  fillTabs();
}

function fillTabs() {
  const bar = document.getElementById("workTabs");
  if (!bar || !window.Graph) return;
  const ws = Graph.state.workspace || "scene";
  const tabs = (Graph.state.levels || []).map((lv) => ({
    id: "scene:" + lv.id,
    label: lv.name,
    on: ws === "scene" && lv.id === Graph.state.levelId,
  }));
  tabs.push({ id: "instance", label: t("instance"), on: ws === "instance" });
  tabs.push({ id: "mode", label: t("mode"), on: ws === "mode" });
  bar.innerHTML = tabs.map((tab) => `<button type="button" class="${tab.on ? "on" : ""}" data-tab="${tab.id}">${tab.label}</button>`).join("");
  bar.onclick = (ev) => {
    const b = ev.target.closest("[data-tab]");
    if (!b) return;
    const id = b.dataset.tab;
    if (id === "instance" || id === "mode") Graph.switchSpace(id);
    else {
      Graph.switchSpace("scene");
      Graph.switchLevel(id.slice(6));
    }
    fillTabs();
    setMode("graph");
  };
}

function t(k) {
  return (I18N[lang] || I18N.en)[k] || k;
}

function applyLang() {
  window.uiLang = lang;
  document.documentElement.lang = lang;
  if (document.getElementById("nodeRail")) renderRail();
  if (window.Graph) Graph.draw();
  const titles = {
    modeGraph: "graph",
    modeAssets: "assets",
    modePlugins: "plugins",
    btnSave: "save",
    btnFit: "fit",
    btnExport: "export",
    treeRoot: "mylib",
    treeStar: "starred",
    treeTrash: "trash",
    btnUp: "up",
    btnNewFolder: "folder",
    btnSdk: "sdk",
    btnPreviewPlay: "preview",
    btnPreviewStop: "stop",
    btnPie: "pie",
    btnLogOutput: "output",
    btnLogMsg: "messages",
    btnLogLoc: "loc",
    btnLogConsole: "console",
    btnGameInst: "instance",
    btnGameMode: "mode",
    btnLibrary: "library",
    btnEditorSet: "editorSet",
    btnProjSet: "projSet",
  };
  ["btnLogOutput", "btnLogMsg", "btnLogLoc", "btnLogConsole"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(titles[id]);
  });
  Object.entries(titles).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.title = t(key);
  });
  const hint = document.getElementById("graphHint");
  if (hint) hint.textContent = t("hint");
  document.getElementById("inspTitle").textContent = t("node");
  document.getElementById("assetTitle").textContent = t("asset");
  document.getElementById("playTitle").textContent = t("preview");
  document.getElementById("pluginHelp").textContent = t("plugHelp");
  document.getElementById("pluginModalTitle").textContent = t("plugins");
  document.getElementById("pieTitle").textContent = t("pie");
  const search = document.getElementById("assetSearch");
  if (search) search.placeholder = t("searchAsset");
  fillTabs();
  document.querySelectorAll(".lang button").forEach((b) => {
    b.classList.toggle("on", b.dataset.lang === lang);
  });
}

function setMode(mode) {
  document.getElementById("viewGraph").hidden = mode !== "graph";
  document.getElementById("viewAssets").hidden = mode !== "assets";
  document.querySelectorAll(".mode").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
  if (mode === "graph") requestAnimationFrame(() => Graph.draw());
  if (mode === "assets") refreshDrive();
}

function openPlugins(on) {
  const m = document.getElementById("pluginModal");
  m.hidden = !on;
  m.classList.toggle("on", on);
  if (on) refreshPlugins();
}

async function loadPlugins() {
  const { plugins } = await CineHost.api("/api/plugins");
  for (const p of plugins) {
    if (!p.enabled || !p.entry) continue;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `/api/plugins/${encodeURIComponent(p.id)}/file/${p.entry}`;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    }).catch(() => CineHost.toast("plugin fail " + p.id));
  }
  renderRail();
}

function renderRail() {
  const rail = document.getElementById("nodeRail");
  if (!rail) return;
  const keep = rail.querySelector("#railSearch") ? rail.querySelector("#railSearch").value : "";
  rail.innerHTML = "";
  const search = document.createElement("input");
  search.id = "railSearch";
  search.placeholder = "搜索节点";
  search.value = keep;
  rail.appendChild(search);
  const map = { flow: "blueprint", ui: "interface", video: "video", media: "media", misc: "utility" };
  const groups = {};
  CineHost.listNodeTypes().forEach((def) => {
    const cat = (window.CATS && CATS.some((c) => c.id === def.category) ? def.category : map[def.category]) || "utility";
    (groups[cat] ||= []).push(def);
  });
  const q = keep.toLowerCase();
  const order = (window.CATS || [{ id: "blueprint", zh: "蓝图", en: "Blueprint" }]);
  order.forEach((cat) => {
    const id = cat.id || cat;
    const list = (groups[id] || []).filter((def) => {
      const label = CineHost.nodeLabel(def);
      return !q || label.toLowerCase().includes(q) || def.type.includes(q);
    });
    if (!list.length) return;
    const wrap = document.createElement("details");
    wrap.open = !!q || id === "blueprint" || id === "narrative";
    wrap.innerHTML = `<summary class="rail-cat">${(lang === "en" ? cat.en : cat.zh) || id} · ${list.length}</summary>`;
    list.forEach((def) => {
      const b = document.createElement("button");
      b.className = "node-row";
      b.innerHTML = `<i class="fa-solid ${def.icon || "fa-cube"}"></i><span>${CineHost.nodeLabel(def)}</span>`;
      b.onclick = () => Graph.addNode(def.type);
      wrap.appendChild(b);
    });
    rail.appendChild(wrap);
  });
  search.oninput = () => renderRail();
}

function setPreviewAsset(id) {
  const video = document.getElementById("gamePreview");
  if (!video) return;
  if (!id) {
    video.removeAttribute("src");
    video.load();
    return;
  }
  video.src = `/api/drive/file/${id}/raw`;
}

function renderInspector(node) {
  const box = document.getElementById("inspBody");
  const video = document.getElementById("gamePreview");
  if (!node) {
    box.textContent = "";
    return;
  }
  const def = CineHost.getNodeType(node.type) || { fields: [] };
  box.innerHTML = "";
  (def.fields || []).forEach((f) => {
    const wrap = document.createElement("label");
    wrap.className = "field";
    wrap.textContent = (window.uiLang === "en" ? (f.label_en || f.label) : (f.label || f.label_en)) || f.id;
    let input;
    if (f.kind === "asset") {
      input = document.createElement("select");
      input.appendChild(new Option("—", ""));
      CineHost.api("/api/drive/entries").then((data) => {
        (data.entries || [])
          .filter((e) => e.kind === "video" || !f.accept || f.accept.includes(e.kind))
          .forEach((e) => input.appendChild(new Option(e.name, e.id)));
        input.value = node.data[f.id] || "";
      });
    } else if (f.kind === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
      input.value = node.data[f.id] || "";
    } else {
      input = document.createElement("input");
      input.value = node.data[f.id] || "";
    }
    input.addEventListener("change", () => {
      node.data[f.id] = input.value;
      Graph.state.dirty = true;
      if (f.kind === "asset" && input.value) setPreviewAsset(input.value);
    });
    wrap.appendChild(input);
    box.appendChild(wrap);
    if (f.kind === "asset" && node.data[f.id]) setPreviewAsset(node.data[f.id]);
  });
  if (node.type === "flow.sequence" || (CineHost.getNodeType(node.type) || {}).addPin) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "soft";
    add.textContent = "添加输出";
    add.onclick = () => {
      Graph.addPin(node);
      renderInspector(node);
    };
    box.appendChild(add);
    const list = document.createElement("div");
    list.className = "pin-list";
    const pins = (node.data && node.data.pins) || [];
    pins.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "pin-row";
      row.draggable = true;
      row.innerHTML = `<i class="fa-solid fa-grip-lines"></i><input value="${p.label || p.id}" /><button type="button" class="icon-btn" title="删除"><i class="fa-solid fa-xmark"></i></button>`;
      row.querySelector("input").onchange = (ev) => Graph.renamePin(node, p.id, ev.target.value);
      row.querySelector("button").onclick = () => {
        Graph.removePin(node, p.id);
        renderInspector(node);
      };
      row.ondragstart = () => { list.dataset.from = String(idx); };
      row.ondragover = (ev) => ev.preventDefault();
      row.ondrop = () => {
        Graph.movePin(node, Number(list.dataset.from), idx);
        renderInspector(node);
      };
      list.appendChild(row);
    });
    box.appendChild(list);
  }
}

async function refreshDrive() {
  const q = driveView === "folder"
    ? `/api/drive/entries?parent=${encodeURIComponent(driveParent || "")}`
    : `/api/drive/entries?view=${driveView}`;
  const data = await CineHost.api(q);
  const grid = document.getElementById("driveGrid");
  grid.innerHTML = "";
  if (!data.entries.length) {
    grid.innerHTML = `<p class="muted">${t("empty")}</p>`;
  }
  const filter = (document.getElementById("assetFilter") || {}).value || "";
  const needle = ((document.getElementById("assetSearch") || {}).value || "").trim().toLowerCase();
  const shown = data.entries.filter((e) => {
    if (filter && e.kind !== filter) return false;
    if (needle && !(e.name || "").toLowerCase().includes(needle)) return false;
    return true;
  });
  shown.forEach((e) => {
    const d = document.createElement("div");
    d.className = "card" + (selectedAsset === e.id ? " on" : "");
    let thumb = "";
    if (e.kind === "image" || e.kind === "video") {
      thumb = `<img class="thumb" src="/api/drive/file/${e.id}/thumb" alt="" />`;
    } else if (e.kind === "audio") {
      thumb = `<div class="thumb audio"><i class="fa-solid fa-music"></i></div>`;
    } else if (e.kind === "folder") {
      thumb = `<div class="thumb folder"><i class="fa-solid fa-folder"></i></div>`;
    }
    d.innerHTML = `${thumb}<div class="kind">${e.kind}${e.starred ? " ★" : ""}</div><div class="name">${e.name}</div>`;
    d.onclick = () => selectAsset(e);
    d.ondblclick = () => {
      if (e.kind === "folder") {
        driveParent = e.id;
        driveView = "folder";
        refreshDrive();
      }
    };
    grid.appendChild(d);
  });
  const space = await CineHost.api("/api/user/space-usage");
  const counts = space.counts || {};
  const countEl = document.getElementById("assetCounts");
  if (countEl) {
    countEl.textContent = `图 ${counts.image || 0} · 视频 ${counts.video || 0} · 音频 ${counts.audio || 0}`;
  }
  const used = space.used || 0;
  const cap = space.cap || 0;
  const label = document.getElementById("spaceLabel");
  if (label) {
    label.textContent = cap
      ? `${(used / 1073741824).toFixed(2)} / ${(cap / 1073741824).toFixed(1)} GB`
      : `${(used / 1048576).toFixed(1)} MB`;
  }
  const bar = document.getElementById("spaceBar");
  if (bar && cap) bar.style.width = Math.min(100, (used / cap) * 100) + "%";
  await fillFolderTree();
}

async function fillFolderTree() {
  const box = document.getElementById("folderList");
  if (!box) return;
  box.innerHTML = "";
  const walk = async (parent, depth) => {
    const data = await CineHost.api(`/api/drive/folders?parent=${encodeURIComponent(parent || "")}`);
    for (const f of data.folders || []) {
      const b = document.createElement("button");
      b.className = "tree" + (driveParent === f.id ? " on" : "");
      b.style.paddingLeft = `${10 + depth * 12}px`;
      b.textContent = "▸ " + f.name;
      b.onclick = () => {
        driveView = "folder";
        driveParent = f.id;
        refreshDrive();
      };
      box.appendChild(b);
      await walk(f.id, depth + 1);
    }
  };
  await walk(null, 0);
}

function selectAsset(e) {
  selectedAsset = e.id;
  document.getElementById("assetMeta").innerHTML = `
    <div class="field">${e.name}</div>
    <div class="muted">${e.kind} · ${e.mime || ""} · ${e.size} B</div>
    <button type="button" id="starBtn">${e.starred ? "Unstar" : "Star"}</button>
    <button type="button" id="trashBtn">Trash</button>`;
  document.getElementById("starBtn").onclick = async () => {
    await CineHost.api("/api/file-entries/star", { method: "POST", body: { ids: [e.id], starred: !e.starred } });
    refreshDrive();
  };
  document.getElementById("trashBtn").onclick = async () => {
    await CineHost.api("/api/drive/trash", { method: "POST", body: { ids: [e.id] } });
    refreshDrive();
  };
  const prev = document.getElementById("assetPreview");
  prev.innerHTML = "";
  if (e.kind === "video" || e.kind === "audio") {
    const v = document.createElement(e.kind === "audio" ? "audio" : "video");
    v.controls = true;
    v.src = `/api/drive/file/${e.id}/raw`;
    prev.appendChild(v);
  } else if (e.kind === "image") {
    const img = document.createElement("img");
    img.src = `/api/drive/file/${e.id}/raw`;
    prev.appendChild(img);
  } else if (e.kind === "model3d" && CineHost.viewport3d) {
    const box = document.createElement("div");
    box.style.height = "220px";
    prev.appendChild(box);
    const view = CineHost.viewport3d.create(box);
    view.load("/api/drive/file/" + e.id + "/raw");
  }
  refreshDrive();
}

window.CATS = [

  { id: "blueprint", zh: "蓝图", en: "Blueprint", kids: [{ id: "flow", zh: "流程", en: "Flow" }, { id: "event", zh: "事件", en: "Event" }, { id: "logic", zh: "逻辑", en: "Logic" }] },
  { id: "interface", zh: "界面", en: "Widget", kids: [{ id: "hud", zh: "HUD", en: "HUD" }, { id: "menu", zh: "菜单", en: "Menu" }] },
  { id: "video", zh: "视频", en: "Video", kids: [{ id: "play", zh: "播放", en: "Playback" }, { id: "cut", zh: "剪辑", en: "Cut" }] },
  { id: "media", zh: "媒体", en: "Media", kids: [{ id: "audio", zh: "音频", en: "Audio" }, { id: "image", zh: "图像", en: "Image" }, { id: "model", zh: "模型", en: "Model" }] },
  { id: "viewport", zh: "视口", en: "Viewport", kids: [{ id: "stage", zh: "舞台", en: "Stage" }, { id: "model", zh: "模型", en: "Model" }, { id: "light", zh: "灯光", en: "Light" }, { id: "material", zh: "材质", en: "Material" }, { id: "clip", zh: "动画", en: "Clip" }] },
  { id: "asset", zh: "资产", en: "Asset", kids: [{ id: "aio", zh: "资产包", en: "Pack" }] },
  { id: "narrative", zh: "剧情", en: "Narrative", kids: [{ id: "dialogue", zh: "对白", en: "Dialogue" }, { id: "choice", zh: "选项", en: "Choice" }] },
  { id: "variable", zh: "变量", en: "Variable", kids: [{ id: "value", zh: "数值", en: "Value" }, { id: "array", zh: "数组", en: "Array" }] },
  { id: "character", zh: "角色", en: "Character", kids: [{ id: "attr", zh: "属性", en: "Stats" }] },
  { id: "save", zh: "存档", en: "Save", kids: [{ id: "slot", zh: "槽位", en: "Slot" }] },
  { id: "input", zh: "输入", en: "Input", kids: [{ id: "key", zh: "按键", en: "Key" }] },
  { id: "camera", zh: "镜头", en: "Camera", kids: [{ id: "shot", zh: "机位", en: "Shot" }] },
  { id: "fx", zh: "特效", en: "Effects", kids: [{ id: "fade", zh: "转场", en: "Fade" }] },
  { id: "loc", zh: "本地化", en: "Localization", kids: [{ id: "text", zh: "文本", en: "Text" }] },
  { id: "ai", zh: "智能", en: "AI", kids: [{ id: "npc", zh: "角色智能", en: "NPC" }] },
  { id: "economy", zh: "经济", en: "Economy", kids: [{ id: "item", zh: "物品", en: "Item" }] },
  { id: "network", zh: "网络", en: "Network", kids: [{ id: "sync", zh: "同步", en: "Sync" }] },
  { id: "analytics", zh: "数据", en: "Analytics", kids: [{ id: "track", zh: "埋点", en: "Track" }] },
  { id: "platform", zh: "平台", en: "Platform", kids: [{ id: "steam", zh: "发行", en: "Store" }] },
  { id: "debug", zh: "调试", en: "Debug", kids: [{ id: "log", zh: "日志", en: "Log" }] },
  { id: "utility", zh: "工具", en: "Utility", kids: [{ id: "sample", zh: "示例", en: "Sample" }] },
  { id: "system", zh: "系统", en: "System", kids: [{ id: "core", zh: "核心", en: "Core" }] },
];
let plugFilter = "";


async function downloadHref(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function downloadPluginZip(id) {
  try {
    const saved = await CineHost.api("/api/plugins/catalog/" + id + "/save", { method: "POST", body: {} });
    await downloadHref("/api/plugins/catalog/" + id + "/download", id + ".zip");
    const path = (saved && saved.path) || "";
    if (window.CineUI && CineUI.prompt) {
      await CineUI.prompt({ title: t("sampleDl"), text: t("packedAt") + " " + path, value: path, ok: t("close"), cancel: t("close") });
    } else {
      CineUI.toast(t("packedAt") + " " + path);
    }
  } catch (err) {
    CineUI.toast(String(err.message || err));
  }
}

async function refreshPlugins() {
  const { plugins } = await CineHost.api("/api/plugins");
  const nav = document.getElementById("plugNav");
  if (nav && !nav.dataset.ready) {
    nav.innerHTML = `<button type="button" class="on" data-pc="">${lang === "en" ? "All" : "全部"}</button>` +
      CATS.map((c) => `<details open><summary>${lang === "en" ? c.en : c.zh}</summary>${c.kids.map((k) => `<button type="button" data-pc="${c.id}.${k.id}">${lang === "en" ? k.en : k.zh}</button>`).join("")}</details>`).join("");
    nav.dataset.ready = "1";
    nav.onclick = (ev) => {
      const b = ev.target.closest("[data-pc]");
      if (!b) return;
      plugFilter = b.dataset.pc;
      nav.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      refreshPlugins();
    };
  }
  const box = document.getElementById("pluginList");
  box.innerHTML = "";
  plugins.filter((p) => {
    if (!plugFilter) return true;
    const tag = (p.category || "") + "." + (p.subcategory || "");
    return tag === plugFilter || (p.category || "") === plugFilter;
  }).forEach((p) => {
    const official = p.official || p.author === "Axiox Media";
    const author = lang === "zh"
      ? (p.author_zh || (official ? "安溯媒体" : p.author || "—"))
      : (p.author || (official ? "Axiox Media" : "—"));
    const title = lang === "zh" ? (p.name_zh || p.name || p.id) : (p.name || p.id);
    const home = p.homepage || (official ? "https://axiox.media" : "");
    const icon = p.icon
      ? `/api/plugins/${encodeURIComponent(p.id)}/file/${p.icon}`
      : "/brand/logo.png";
    const el = document.createElement("article");
    el.className = "plug";
    el.innerHTML = `
      <img src="${icon}" alt="" />
      <div>
        <h3>${title}</h3>
        <div class="id">${author} · ${p.id} · v${p.version || "0"}</div>
        <p class="muted">${lang === "zh" ? (p.summary_zh || p.summary || "") : (p.summary || p.summary_zh || "")}</p>
        <div class="type-chips">${((p.contributes && p.contributes.nodes) || []).map((n) => `<span class="chip">${n}</span>`).join("")}</div>
        <button type="button" class="soft">${p.enabled ? t("enabled") : t("disabled")}</button>
        ${(!p.enabled && p.origin !== "bundled") ? `<button type="button" class="danger btn-un">${t("uninstall")}</button>` : ""}
        <button type="button" class="soft btn-sample">${t("sampleDl")}</button>
      </div>
      <div>${home ? `<a class="home" href="${home}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}</div>`;
    el.querySelector("button").onclick = async () => {
      await CineHost.api(`/api/plugins/${p.id}/enable`, { method: "POST", body: { enabled: !p.enabled } });
      location.reload();
    };
    const un = el.querySelector(".btn-un");
    if (un) un.onclick = async () => {
      const res = await fetch("/api/plugins/" + p.id, { method: "DELETE" });
      if (!res.ok) { CineUI.toast(await res.text()); return; }
      location.reload();
    };
    el.querySelector(".btn-sample").onclick = () => downloadPluginZip(p.id);
    box.appendChild(el);
  });
}

function bindPieWindow() {
  const win = document.getElementById("pieWin");
  const drag = win.querySelector(".pie-drag");
  const grip = document.getElementById("pieResizer");
  drag.addEventListener("mousedown", (ev) => {
    if (ev.target.closest("button")) return;
    ev.preventDefault();
    const r = win.getBoundingClientRect();
    const ox = ev.clientX - r.left;
    const oy = ev.clientY - r.top;
    const move = (e) => {
      win.style.left = Math.max(8, e.clientX - ox) + "px";
      win.style.top = Math.max(8, e.clientY - oy) + "px";
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  });
  grip.addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const r = win.getBoundingClientRect();
    const move = (e) => {
      win.style.width = Math.max(420, e.clientX - r.left) + "px";
      win.style.height = Math.max(280, e.clientY - r.top) + "px";
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  });
}

function bindSplits() {
  const saved = JSON.parse(localStorage.getItem("cineforge-split") || "{}");
  document.querySelectorAll(".workspace").forEach((ws) => {
    if (saved.left) ws.style.setProperty("--left", saved.left + "px");
    if (saved.right) ws.style.setProperty("--right", saved.right + "px");
  });
  document.querySelectorAll(".split").forEach((el) => {
    el.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      const side = el.dataset.split;
      const ws = el.parentElement;
      const startX = ev.clientX;
      const left0 = parseFloat(getComputedStyle(ws).getPropertyValue("--left")) || 220;
      const right0 = parseFloat(getComputedStyle(ws).getPropertyValue("--right")) || 320;
      const move = (e) => {
        const dx = e.clientX - startX;
        if (side === "left" || side === "aleft") {
          ws.style.setProperty("--left", Math.max(160, Math.min(420, left0 + dx)) + "px");
        } else {
          ws.style.setProperty("--right", Math.max(240, Math.min(520, right0 - dx)) + "px");
        }
        Graph.draw();
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        localStorage.setItem("cineforge-split", JSON.stringify({
          left: parseFloat(getComputedStyle(ws).getPropertyValue("--left")),
          right: parseFloat(getComputedStyle(ws).getPropertyValue("--right")),
        }));
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  });
}

async function saveGraph() {
  await CineHost.api("/api/graph", { method: "PUT", body: Graph.serialize() });
  Graph.state.dirty = false;
  CineHost.toast(t("saved"));
}

async function runWizard() {
  const gate = document.getElementById("bootGate");
  if (!gate) return;
  const st = await CineHost.api("/api/projects/status");
  if (!st.needWizard && !st.moved && !st.needPlugins) return;
  gate.hidden = false;
  const step = (html) => {
    gate.innerHTML = `<div class="modal cine-card">${html}</div>`;
  };
  if (st.needWizard || st.moved) {
    await new Promise((resolve) => {
      step(`
        <h3>${st.moved ? "工程位置丢失" : "新建 / 确认工程"}</h3>
        <p class="muted">设定工程名称与存放路径。移动过工程时在此重新指定。</p>
        <label class="field">
          <span>工程名称</span>
          <input id="wizName" class="field-input" value="${(st.project && st.project.name) || "新工程"}" />
        </label>
        <label class="field">
          <span>存放路径</span>
          <div class="field-row">
            <input id="wizPath" class="field-input" value="${st.folder || ""}" placeholder="选择或输入工程目录" />
            <button type="button" class="icon-btn" id="wizBrowse" title="浏览"><i class="fa-solid fa-folder-open"></i></button>
          </div>
        </label>
        <div class="modal-actions">
          <button type="button" class="primary" id="wizNext">下一步</button>
        </div>`);
      document.getElementById("wizBrowse").onclick = async () => {
        try {
          if (window.pywebview && window.pywebview.api && window.pywebview.api.pick_folder) {
            const dir = await window.pywebview.api.pick_folder();
            if (dir) document.getElementById("wizPath").value = dir;
          }
        } catch (e) {}
      };
      document.getElementById("wizNext").onclick = async () => {
        const name = document.getElementById("wizName").value.trim() || "新工程";
        const path = document.getElementById("wizPath").value.trim();
        if (st.project && st.project.id) {
          await CineHost.api(`/api/projects/${st.project.id}/relocate`, { method: "POST", body: { name, path } });
        } else {
          await CineHost.api("/api/projects", { method: "POST", body: { name, path } });
        }
        resolve();
      };
    });
  }
  const plugs = await CineHost.api("/api/plugins");
  await new Promise((resolve) => {
    const rows = (plugs.plugins || []).map((p) =>
      `<label class="wiz-plug"><input type="checkbox" data-pid="${p.id}" ${p.enabled ? "checked" : ""}/> ${p.name_zh || p.name}</label>`
    ).join("");
    step(`<h3>确认插件</h3><p class="muted">勾选本工程要启用的插件，然后进入编辑器。</p>${rows}
      <div class="modal-actions"><button type="button" class="primary" id="wizGo">进入工程</button></div>`);
    document.getElementById("wizGo").onclick = async () => {
      const ids = [...gate.querySelectorAll("input[data-pid]:checked")].map((i) => i.dataset.pid);
      const st2 = await CineHost.api("/api/projects/status");
      const pid = st2.project && st2.project.id;
      if (pid) await CineHost.api(`/api/projects/${pid}/confirm-plugins`, { method: "POST", body: { name: "", plugins: ids } });
      resolve();
    };
  });
  gate.hidden = true;
}

async function boot() {
  applyLang();
  await runWizard();
  Graph.bind();
  await loadPlugins();
  CineHost.renderActions("top-actions", document.querySelector("[data-slot='top-actions']"));
  CineHost.on("actions:changed", () => CineHost.renderActions("top-actions", document.querySelector("[data-slot='top-actions']")));
  CineHost.on("types:changed", renderRail);
  const g = await CineHost.api("/api/graph");
  Graph.load(g);
  CineHost.notifyProject && CineHost.notifyProject("open", Graph.serialize());
  fillLevels();
  CineHost.on("graph:select", renderInspector);
  CineHost.on("level:changed", fillLevels);
  document.querySelectorAll(".mode").forEach((b) => b.onclick = () => setMode(b.dataset.mode));
  document.getElementById("modePlugins").onclick = () => openPlugins(true);
  document.getElementById("btnClosePlugins").onclick = () => openPlugins(false);
  document.getElementById("pluginModal").addEventListener("click", (ev) => {
    if (ev.target.id === "pluginModal") openPlugins(false);
  });
  document.getElementById("btnSdk").onclick = () => downloadHref("/api/plugins/sdk.zip", "cinemaker-plugin-sdk.zip");
  const zipPick = document.getElementById("plugZip");
  const importBtn = document.getElementById("btnImportPlug");
  if (importBtn && zipPick) {
    importBtn.onclick = () => zipPick.click();
    zipPick.onchange = async () => {
      const file = zipPick.files && zipPick.files[0];
      zipPick.value = "";
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/plugins/import", { method: "POST", body: fd });
        if (!res.ok) throw new Error(await res.text());
        const meta = await res.json();
        CineUI.toast((lang === "en" ? "Imported " : "已导入 ") + (meta.id || file.name));
        location.reload();
      } catch (err) {
        CineUI.toast(String(err.message || err));
      }
    };
  }
  const dockRt = PlayRuntime.create();
  const pieRt = PlayRuntime.create();
  let activeRt = dockRt;
  const dockMount = () => dockRt.mount({
    video: document.getElementById("dockVideo"),
    text: document.getElementById("dockText"),
    speaker: document.getElementById("dockSpeaker"),
    fade: document.getElementById("dockFade"),
    bgm: document.getElementById("dockBgm"),
    sfx: document.getElementById("dockSfx"),
    choices: document.getElementById("dockChoices"),
  });
  document.getElementById("btnPreviewPlay").onclick = () => {
    pieRt.stop();
    dockMount();
    activeRt = dockRt;
    CineHost.log("output", "preview start");
    dockRt.start(Graph.serialize());
  };
  document.getElementById("btnPreviewStop").onclick = () => dockRt.stop();
  window.addEventListener("keydown", (ev) => {
    if (["INPUT", "TEXTAREA"].includes((ev.target && ev.target.tagName) || "")) return;
    CineHost.inputEmit("key", ev);
    if (activeRt) activeRt.input(ev.key);
  });
  bindPieWindow();
  const pieModal = document.getElementById("pieModal");
  function openPie(on) {
    pieModal.hidden = !on;
    pieModal.classList.toggle("on", on);
    if (on) {
      dockRt.stop();
      pieRt.mount({
        video: document.getElementById("pieVideo"),
        text: document.getElementById("pieText"),
        speaker: document.getElementById("pieSpeaker"),
        fade: document.getElementById("pieFade"),
        bgm: document.getElementById("pieBgm"),
        sfx: document.getElementById("pieSfx"),
        choices: document.getElementById("pieChoices"),
      });
      activeRt = pieRt;
      CineHost.log("output", "pie start");
      pieRt.start(Graph.serialize());
    } else {
      pieRt.stop();
      activeRt = dockRt;
    }
  }
  document.getElementById("btnPie").onclick = () => openPie(true);
  document.getElementById("btnClosePie").onclick = () => openPie(false);
  pieModal.addEventListener("click", (ev) => {
    if (ev.target.id === "pieModal") openPie(false);
  });
  bindSplits();
  document.querySelectorAll(".lang button").forEach((b) => {
    b.onclick = () => {
      lang = b.dataset.lang;
      localStorage.setItem("cinemaker-lang", lang);
      applyLang();
    };
  });
  document.getElementById("btnSave").onclick = saveGraph;
  document.getElementById("btnFit").onclick = () => Graph.fit();
  const levelPick = document.getElementById("levelPick");
  if (levelPick) levelPick.onchange = () => Graph.switchLevel(levelPick.value);
  document.getElementById("btnGameInst").onclick = () => {
    Graph.switchSpace("instance");
    fillTabs();
    setMode("graph");
  };
  document.getElementById("btnGameMode").onclick = () => {
    Graph.switchSpace("mode");
    fillTabs();
    setMode("graph");
  };
  CineHost.on("space:changed", fillTabs);
  CineHost.on("graph:comment-edit", async (cm) => {
    const title = await CineUI.prompt({ title: lang === "en" ? "Comment" : "注释文字", value: cm.title || "注释", ok: t("save"), cancel: t("close") });
    if (title === null) return;
    cm.title = title;
    const col = await CineUI.pickColor({ title: lang === "en" ? "Color" : "注释颜色", rgba: cm.color, ok: t("save"), cancel: t("close") });
    if (col) cm.color = col.rgba;
    Graph.state.dirty = true;
    Graph.draw();
  });
  const addLv = document.getElementById("btnAddLevel");
  if (addLv) addLv.onclick = async () => {
    const name = await CineUI.prompt({ title: "新场景", value: "场景 " + ((Graph.state.levels || []).length + 1), ok: "创建", cancel: t("close") });
    if (!name) return;
    Graph.addLevel(name);
    fillLevels();
  };
  async function refreshProjName() {
    const st = await CineHost.api("/api/projects/status");
    window.projectMeta = st.project || {};
    const el = document.getElementById("projName");
    if (el) el.textContent = (st.project && st.project.name) || "未命名";
  }
  refreshProjName();
  document.getElementById("btnEditorSet").onclick = async () => {
    const gold = await CineUI.prompt({ title: t("accent"), value: localStorage.getItem("cine-gold") || "#e7c07a", ok: t("save"), cancel: t("close") });
    if (!gold) return;
    localStorage.setItem("cine-gold", gold);
    applyTheme();
  };
  document.getElementById("btnProjSet").onclick = async () => {
    const st = await CineHost.api("/api/projects/status");
    const p = st.project || {};
    const name = await CineUI.prompt({ title: t("projName"), value: p.name || "", ok: t("save"), cancel: t("close") });
    if (!name) return;
    const pack = await CineUI.prompt({ title: t("packName"), value: p.packName || name, ok: t("save"), cancel: t("close") });
    await CineHost.api(`/api/projects/${p.id || "current"}/meta`, { method: "POST", body: { name, path: p.path || "", packName: pack || name } });
    refreshProjName();
  };
  function applyTheme() {
    const gold = localStorage.getItem("cine-gold");
    if (gold) document.documentElement.style.setProperty("--gold", gold);
  }
  applyTheme();
  const newBtn = document.getElementById("btnNewProj");
  if (newBtn) newBtn.onclick = async () => {
    const name = await CineUI.prompt({ title: t("graph"), text: "工程名", value: "新工程", ok: t("save"), cancel: t("close") });
    if (!name) return;
    await CineHost.api("/api/projects", { method: "POST", body: { name } });
    Graph.load({ nodes: [], links: [], variables: [] });
    CineUI.toast(name);
  };
  const openBtn = document.getElementById("btnOpenProj");
  if (openBtn) openBtn.onclick = async () => {
    const data = await CineHost.api("/api/projects");
    const names = (data.projects || []).map((p) => p.name + " (" + p.id + ")").join("\n");
    const pick = await CineUI.prompt({ title: t("assets"), text: names, value: data.current || "", ok: t("save"), cancel: t("close") });
    if (!pick) return;
    const pid = pick.includes("(") ? pick.replace(/^.*\(/, "").replace(/\)$/, "") : pick;
    const opened = await CineHost.api(`/api/projects/${pid}/open`, { method: "POST", body: {} });
    Graph.load(opened.graph || { nodes: [], links: [] });
  };
  CineHost.on("graph:palette", (pos) => {
    const box = document.getElementById("palette");
    if (!box) return;
    box.hidden = false;
    if (pos && pos.x) {
      box.style.left = pos.x + "px";
      box.style.top = pos.y + "px";
    }
    box.innerHTML = `<input id="palQ" placeholder="搜索节点" />`;
    const drawPal = () => {
      const q = (document.getElementById("palQ").value || "").toLowerCase();
      [...box.querySelectorAll("button")].forEach((b) => b.remove());
      CineHost.listNodeTypes().forEach((def) => {
        const label = CineHost.nodeLabel(def);
        if (q && !label.toLowerCase().includes(q) && !def.type.includes(q)) return;
        const b = document.createElement("button");
        b.innerHTML = `<i class="fa-solid ${def.icon || "fa-cube"}"></i> ${label}`;
        b.onclick = () => {
          Graph.addNode(def.type);
          box.hidden = true;
        };
        box.appendChild(b);
      });
    };
    drawPal();
    document.getElementById("palQ").oninput = drawPal;
    document.getElementById("palQ").focus();
  });
  document.addEventListener("click", (ev) => {
    const box = document.getElementById("palette");
    if (box && !box.hidden && !box.contains(ev.target)) box.hidden = true;
  });
  const TIPS = {
    "story.start": ["游戏从这里开始。后面只能接流程，不要拿来存变量。", "The story starts here. Wire flow out only."],
    "video.play": ["播放资产库里的影片。没有片子时会立刻跳过。", "Plays a library video. Skips if empty."],
    "story.choice": ["弹出最多三个选项。空选项不会显示。", "Shows up to three choices. Blank options hide."],
    "story.setVar": ["改一个变量。类型要和变量面板一致。", "Writes a variable. Keep the type consistent."],
    "story.branch": ["按数值或是否看过某节点分流。", "Branches on a value or a seen node."],
    "story.end": ["结束这一段并写入存档。", "Ends this scene and writes a save."],
    "story.line": ["显示说话人和台词，点继续往后走。", "Shows speaker and line, click to continue."],
    "story.wait": ["等待点击或等待若干秒。", "Wait for click or seconds."],
    "story.fade": ["黑场淡入或淡出。", "Fade the picture in or out."],
    "audio.bgm": ["切换背景音乐。", "Changes background music."],
    "audio.sfx": ["播一次音效。", "Plays a one-shot sound."],
    "story.checkpoint": ["立刻写一个存档槽。", "Writes a save slot now."],
    "meta.comment": ["只是备注，不会执行。", "Note only. Does not run."],
    "meta.reroute": ["把线拐个弯，不改变逻辑。", "Bends a wire. No logic."],
    "flow.sequence": ["同一拍发出多路然后。可添加输出。不要把互斥的影片接到同一拍。", "Fires several Then pins. Do not attach conflicting videos to the same beat."],
    "flow.forLoop": ["按起止下标重复执行循环体。", "Repeats the loop body from first to last."],
    "array.make": ["用逗号创建一个数组变量。", "Builds an array from a comma list."],
    "array.get": ["按下标取出一项。", "Reads one item by index."],
    "array.length": ["把数组长度写入变量。", "Writes array length."],
    "flow.tick": ["按间隔反复触发。间隔不要低于 16ms。", "Repeats on an interval. Do not go below 16ms."],
    "flow.timer": ["到期后发出信号，可循环。", "Fires when time is up. Can loop."],
    "example.hello": ["示例节点，可删。", "Sample node. Safe to delete."],
  };
  const tipEl = document.getElementById("nodeTip");
  CineHost.on("graph:hover", (info) => {
    if (!tipEl) return;
    if (!info || !info.node) {
      tipEl.hidden = true;
      return;
    }
    const pack = TIPS[info.node.type];
    const text = pack ? (lang === "en" ? pack[1] : pack[0]) : "";
    if (!text) {
      tipEl.hidden = true;
      return;
    }
    tipEl.hidden = false;
    tipEl.textContent = text;
    tipEl.style.left = info.x + 14 + "px";
    tipEl.style.top = info.y + 14 + "px";
  });
  const nodeMenu = document.getElementById("nodeMenu");
  function hideNodeMenu() { if (nodeMenu) nodeMenu.hidden = true; }
  CineHost.on("graph:node-menu", (info) => {
    if (!nodeMenu) return;
    nodeMenu.hidden = false;
    nodeMenu.style.left = info.x + "px";
    nodeMenu.style.top = info.y + "px";
    menuStamp = Date.now();
    nodeMenu.innerHTML = `<button type="button" data-act="copy">${t("copy")}</button><button type="button" data-act="paste">${t("paste")}</button><button type="button" data-act="comment">${t("addComment")}</button><button type="button" data-act="fn">${t("makeFn")}</button><button type="button" data-act="macro">${t("makeMacro")}</button><button type="button" data-act="del">${t("del")}</button>`;
    nodeMenu.onclick = async (ev) => {
      const act = ev.target.dataset.act;
      hideNodeMenu();
      if (act === "copy") Graph.copySelection();
      if (act === "paste") Graph.pasteClipboard();
      if (act === "del") Graph.removeSelected();
      if (act === "comment") CineHost.emit("graph:comment-menu", info);
      if (act === "fn") {
        const name = await CineUI.prompt({ title: t("fnName"), value: lang === "en" ? "Function" : "新函数", ok: t("save"), cancel: t("close") });
        if (name) Graph.saveAsFunction(name);
      }
      if (act === "macro") {
        const name = await CineUI.prompt({ title: t("macroName"), value: lang === "en" ? "Macro" : "新宏", ok: t("save"), cancel: t("close") });
        if (name) Graph.saveAsMacro(name);
      }
    };
  });
  let menuStamp = 0;
  document.addEventListener("click", (ev) => {
    if (Date.now() - menuStamp < 280) return;
    if (nodeMenu && !nodeMenu.contains(ev.target)) hideNodeMenu();
  });
  const libBtn = document.getElementById("btnLibrary");
  if (libBtn) libBtn.onclick = () => {
    const modal = document.getElementById("libModal");
    const lib = Graph.state.library || { functions: [], macros: [] };
    const empty = lang === "en" ? "Empty" : "无";
    document.getElementById("libBody").innerHTML =
      "<h4>" + t("fns") + "</h4>" + (lib.functions.map((f) => `<button type="button" data-k="fn" data-id="${f.id}">${f.name}</button>`).join("") || "<p class='muted'>" + empty + "</p>") +
      "<h4>" + t("macros") + "</h4>" + (lib.macros.map((f) => `<button type="button" data-k="mc" data-id="${f.id}">${f.name}</button>`).join("") || "<p class='muted'>" + empty + "</p>");
    const libTitle = document.querySelector("#libModal h3");
    if (libTitle) libTitle.textContent = t("libTitle");
    modal.hidden = false;
    modal.classList.add("on");
    document.getElementById("libBody").onclick = (ev) => {
      const b = ev.target.closest("[data-id]");
      if (!b) return;
      Graph.placeLibrary(b.dataset.k === "fn" ? "fn" : "mc", b.dataset.id);
      modal.hidden = true;
      modal.classList.remove("on");
    };
  };
  const closeLib = document.getElementById("btnCloseLib");
  if (closeLib) closeLib.onclick = () => {
    document.getElementById("libModal").hidden = true;
    document.getElementById("libModal").classList.remove("on");
  };
  CineHost.on("graph:comment-menu", async (info) => {
    const title = await CineUI.prompt({ title: t("comment"), value: "注释", ok: t("save"), cancel: t("close") });
    if (!title) return;
    const picked = await CineUI.pickColor({
      title: lang === "en" ? "Comment color" : "注释颜色",
      rgba: "rgba(42, 90, 140, 0.28)",
      ok: t("save"),
      cancel: t("close"),
    });
    if (!picked) return;
    Graph.wrapComment(info.ids, title, picked.rgba);
  });
  CineHost.on("runtime:loop", () => {
    const pie = document.getElementById("pieModal");
    if (pie && !pie.hidden) {
      pie.hidden = true;
      pie.classList.remove("on");
    }
  });
  const TEXT_KEYS = ["text", "prompt", "label", "title", "speaker", "optA", "optB", "optC", "note", "items"];
  function gatherLoc() {
    const keys = [];
    (Graph.state.nodes || []).forEach((n) => {
      TEXT_KEYS.forEach((k) => {
        const val = (n.data || {})[k];
        if (val && String(val).trim()) keys.push({ key: n.id + "." + k, source: String(val) });
      });
    });
    return keys;
  }
  function locState() {
    Graph.state.localization = Graph.state.localization || { source: "zh", langs: ["zh"], tables: {}, active: "zh" };
    const loc = Graph.state.localization;
    loc.langs = loc.langs && loc.langs.length ? loc.langs : ["zh"];
    loc.tables = loc.tables || {};
    return loc;
  }
  function langLabel(code) {
    const hit = window.cineLangName ? cineLangName(code) : { zh: code, en: code, code };
    return lang === "en" ? `${hit.en}` : `${hit.zh}`;
  }
  function renderLangList() {
    const loc = locState();
    const box = document.getElementById("locLangList");
    box.innerHTML = loc.langs.map((code) => {
      const hit = cineLangName(code);
      return `<div class="lang-card" data-code="${code}"><strong>${lang === "en" ? hit.en : hit.zh}</strong><small>${code}</small></div>`;
    }).join("");
  }
  function fillLangSwitch() {
    const loc = locState();
    const sel = document.getElementById("locLangSwitch");
    sel.innerHTML = loc.langs.map((code) => {
      const hit = cineLangName(code);
      const name = lang === "en" ? hit.en : hit.zh;
      return `<option value="${code}">${name}</option>`;
    }).join("");
    sel.value = loc.active || loc.langs[0];
  }
  function renderLocTable() {
    const loc = locState();
    const langCode = document.getElementById("locLangSwitch").value || loc.active || "zh";
    loc.tables[langCode] = loc.tables[langCode] || {};
    const rows = loc.keys || gatherLoc();
    document.getElementById("locTable").innerHTML = rows.map((r) =>
      `<div class="loc-row"><div class="muted">${r.key}</div><div>${r.source}</div><input data-lkey="${r.key}" class="field-input" value="${(loc.tables[langCode][r.key] || "").replace(/"/g, "&quot;")}" /></div>`
    ).join("") || "<p class='muted'>空</p>";
  }
  function showLocStep(name) {
    document.getElementById("locHome").hidden = name !== "home";
    document.getElementById("locProg").hidden = name !== "prog";
    document.getElementById("locWork").hidden = name !== "work";
  }
  function runBar(label, done) {
    showLocStep("prog");
    const bar = document.getElementById("locBar");
    const lab = document.getElementById("locProgLabel");
    let n = 0;
    const tmr = setInterval(() => {
      n += 8 + Math.random() * 18;
      if (n >= 100) {
        n = 100;
        clearInterval(tmr);
        lab.textContent = label + " 100%";
        bar.style.width = "100%";
        setTimeout(done, 220);
        return;
      }
      bar.style.width = n + "%";
      lab.textContent = label + " " + Math.floor(n) + "%";
    }, 60);
  }
  function openLoc() {
    const modal = document.getElementById("locModal");
    modal.hidden = false;
    modal.classList.add("on");
    showLocStep("home");
    renderLangList();
  }
  const COMMANDS = [
    { id: "help", run: () => CineHost.log("console", "save validate preview pie gather fit") },
    { id: "save", run: () => saveGraph() },
    { id: "validate", run: () => CineHost.api("/api/graph/validate").then((r) => CineHost.log("message", JSON.stringify(r))) },
    { id: "preview", run: () => document.getElementById("btnPreviewPlay").click() },
    { id: "pie", run: () => document.getElementById("btnPie").click() },
    { id: "gather", run: () => openLoc() },
    { id: "fit", run: () => Graph.fit() },
  ];
  function openLog(kind) {
    if (kind === "loc") {
      openLoc();
      return;
    }
    const panel = document.getElementById("logPanel");
    const map = { output: t("output"), message: t("messages"), console: t("console") };
    const bag = CineHost.logs();
    document.getElementById("logTitle").textContent = map[kind] || kind;
    document.getElementById("logBody").textContent = (bag[kind] && bag[kind].length ? bag[kind] : ["(empty)"]).join("\n");
    const row = document.getElementById("consoleRow");
    row.hidden = kind !== "console";
    panel.classList.toggle("is-console", kind === "console");
    panel.hidden = false;
    if (kind === "console") {
      const box = document.getElementById("consoleIn");
      box.disabled = false;
      box.readOnly = false;
      setTimeout(() => box.focus(), 30);
    }
  }
  document.querySelectorAll("#bottomDock [data-log]").forEach((b) => {
    b.onclick = () => openLog(b.dataset.log);
  });
  CineHost.on("log", (ev) => {
    const panel = document.getElementById("logPanel");
    if (!panel || panel.hidden) return;
    const title = document.getElementById("logTitle");
    const want = ev && ev.kind;
    if (title && want && title.textContent && document.getElementById("logBody")) {
      const bag = CineHost.logs();
      if (bag[want]) document.getElementById("logBody").textContent = bag[want].join("\n");
    }
  });
  document.getElementById("btnCloseLog").onclick = () => {
    document.getElementById("logPanel").hidden = true;
  };
  document.getElementById("btnCloseLoc").onclick = () => {
    document.getElementById("locModal").hidden = true;
    document.getElementById("locModal").classList.remove("on");
  };
  document.getElementById("btnLocGather").onclick = () => {
    runBar(lang === "en" ? "Gathering" : "正在搜集", () => {
      const loc = locState();
      loc.keys = gatherLoc();
      CineHost.log("output", "loc gather " + loc.keys.length);
      fillLangSwitch();
      showLocStep("work");
      renderLocTable();
    });
  };
  document.getElementById("locLangSwitch").onchange = () => {
    locState().active = document.getElementById("locLangSwitch").value;
    renderLocTable();
  };
  document.getElementById("btnLocSave").onclick = () => {
    const loc = locState();
    const langCode = document.getElementById("locLangSwitch").value;
    loc.tables[langCode] = loc.tables[langCode] || {};
    document.querySelectorAll("#locTable [data-lkey]").forEach((inp) => {
      loc.tables[langCode][inp.dataset.lkey] = inp.value;
    });
    loc.active = langCode;
    Graph.state.dirty = true;
    runBar(lang === "en" ? "Compiling" : "正在编译", () => {
      CineHost.log("output", "loc compiled " + langCode);
      CineUI.toast(t("saved"));
      showLocStep("work");
    });
  };
  const addSearch = document.getElementById("locAddSearch");
  const addMenu = document.getElementById("locAddMenu");
  addSearch.oninput = () => {
    const q = addSearch.value.trim().toLowerCase();
    const used = new Set(locState().langs);
    const hits = (window.CINE_LANGS || []).filter((row) => {
      if (used.has(row[0])) return false;
      if (!q) return true;
      return row.join(" ").toLowerCase().includes(q);
    }).slice(0, 12);
    if (addMenu.parentElement !== document.body) document.body.appendChild(addMenu);
    const rect = addSearch.getBoundingClientRect();
    addMenu.style.position = "fixed";
    addMenu.style.left = rect.left + "px";
    addMenu.style.top = (rect.bottom + 6) + "px";
    addMenu.style.width = rect.width + "px";
    addMenu.style.zIndex = "120";
    addMenu.hidden = !hits.length;
    addMenu.innerHTML = hits.map((row) =>
      `<button type="button" data-add="${row[0]}"><strong>${lang === "en" ? row[2] : row[1]}</strong><small>${row[0]}</small></button>`
    ).join("");
    addMenu.querySelectorAll("[data-add]").forEach((b) => {
      b.onclick = () => {
        locState().langs.push(b.dataset.add);
        locState().tables[b.dataset.add] = locState().tables[b.dataset.add] || {};
        addSearch.value = "";
        addMenu.hidden = true;
        renderLangList();
      };
    });
  };
  addSearch.onfocus = () => addSearch.dispatchEvent(new Event("input"));
  const hint = document.getElementById("consoleHint");
  const cin = document.getElementById("consoleIn");
  cin.oninput = () => {
    const q = cin.value.trim().toLowerCase();
    const hits = COMMANDS.filter((c) => !q || c.id.startsWith(q));
    hint.hidden = !hits.length || !q;
    hint.innerHTML = hits.map((c) => `<button type="button" data-cmd="${c.id}">${c.id}</button>`).join("");
    hint.querySelectorAll("[data-cmd]").forEach((b) => {
      b.onclick = () => { cin.value = b.dataset.cmd; hint.hidden = true; cin.focus(); };
    });
  };
  cin.onkeydown = (ev) => {
    if (ev.key !== "Enter") return;
    const line = cin.value.trim();
    cin.value = "";
    hint.hidden = true;
    CineHost.log("console", "> " + line);
    const cmd = COMMANDS.find((c) => c.id === line.split(/\s+/)[0]);
    if (!cmd) CineHost.log("message", "unknown command");
    else cmd.run();
    openLog("console");
  };
  document.getElementById("btnExport").onclick = async () => {
    let pack = { title: "Game", graph: Graph.serialize() };
    pack = await CineHost.runHook("export:before", pack);
    pack = await CineHost.runHook("export:collectAssets", pack);
    pack = await CineHost.runHook("export:writeManifest", pack);
    pack = await CineHost.runHook("export:injectPlayer", pack);
    CineHost.log("output", "export hooks done");
    const title = await CineUI.prompt({ title: t("export"), text: t("exportAsk"), value: "Game", ok: t("export"), cancel: t("close") });
    if (!title) return;
    const bar = CineUI.progress({ title: t("exporting") });
    bar.set(8, t("save"));
    await saveGraph().catch(() => {});
    const chk = await CineHost.api("/api/graph/validate");
    if (!chk.ok) {
      bar.close();
      CineUI.toast((chk.errors || []).join(" / "));
      return;
    }
    bar.set(35, t("packMedia"));
    let dest = "";
    try {
      if (window.pywebview && window.pywebview.api && window.pywebview.api.pick_folder) {
        dest = await window.pywebview.api.pick_folder();
      }
    } catch (e) {}
    bar.set(55, t("packWrite"));
    try {
      const res = await CineHost.api("/api/export", { method: "POST", body: { title, dest } });
      bar.set(100, t("exported"));
      setTimeout(() => bar.close(), 280);
      CineUI.toast(t("exported") + " " + res.path);
      try {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.open_folder) {
          await window.pywebview.api.open_folder(res.path);
        }
      } catch (e) {}
    } catch (err) {
      bar.close();
      CineUI.toast(String(err));
    }
  };
  document.querySelectorAll("[data-drive-view]").forEach((b) => {
    b.onclick = () => {
      driveView = b.dataset.driveView === "root" ? "folder" : b.dataset.driveView;
      if (b.dataset.driveView === "root") driveParent = null;
      document.querySelectorAll(".tree").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      refreshDrive();
    };
  });
  document.getElementById("btnNewFolder").onclick = async () => {
    const name = await CineUI.prompt({ title: t("folder"), value: "Folder", ok: t("folder"), cancel: t("close") });
    if (!name) return;
    const fd = new FormData();
    fd.append("name", name);
    if (driveParent) fd.append("parent_id", driveParent);
    await fetch("/api/drive/folders", { method: "POST", body: fd });
    refreshDrive();
  };
  const filterEl = document.getElementById("assetFilter");
  if (filterEl) filterEl.onchange = () => refreshDrive();
  const searchEl = document.getElementById("assetSearch");
  if (searchEl) searchEl.oninput = () => refreshDrive();
  document.getElementById("filePick").onchange = async (ev) => {
    for (const file of ev.target.files) {
      const fd = new FormData();
      fd.append("file", file);
      if (driveParent) fd.append("parent_id", driveParent);
      await fetch("/api/drive/upload", { method: "POST", body: fd });
    }
    ev.target.value = "";
    refreshDrive();
  };
  document.getElementById("btnUp").onclick = () => {
    driveParent = null;
    driveView = "folder";
    refreshDrive();
  };
}

boot().catch((err) => CineHost.toast(String(err)));
window.AXIOXMEDIA_BRAND = AXIOXMEDIA_BRAND;
window.AIO_WATERMARK = AIO_WATERMARK;
