const CineHost = (() => {
  const nodeTypes = {};
  const assetKinds = {};
  const varTypes = {};
  const actions = {};
  const hooks = {};
  const listeners = {};

  function on(ev, fn) {
    (listeners[ev] ||= []).push(fn);
    return () => {
      listeners[ev] = (listeners[ev] || []).filter((x) => x !== fn);
    };
  }
  function emit(ev, data) {
    (listeners[ev] || []).forEach((fn) => fn(data));
  }
  function hook(name, fn) {
    (hooks[name] ||= []).push(fn);
    return () => {
      hooks[name] = (hooks[name] || []).filter((x) => x !== fn);
    };
  }
  async function runHook(name, payload) {
    let acc = payload;
    for (const fn of hooks[name] || []) {
      acc = (await fn(acc)) ?? acc;
    }
    return acc;
  }
  function registerNodeType(def) {
    if (!def || !def.type) return;
    nodeTypes[def.type] = {
      inputs: [{ id: "in", label: "in", kind: "exec" }],
      outputs: [{ id: "out", label: "out", kind: "exec" }],
      color: "#e7c07a",
      fields: [],
      category: "misc",
      pinKind: "exec",
      ...def,
    };
    emit("types:changed", listNodeTypes());
  }
  function registerAssetKind(def) {
    if (def && def.id) assetKinds[def.id] = def;
  }
  function registerVarType(def) {
    if (!def || !def.id) return;
    varTypes[def.id] = {
      coerce: (v) => v,
      compare: (a, b, cmp) => a == b,
      default: null,
      ...def,
    };
    emit("vars:changed", listVarTypes());
  }
  function registerAction(def) {
    if (!def || !def.id) return;
    actions[def.id] = { slot: "top-actions", ...def };
    emit("actions:changed", listActions());
  }
  function listNodeTypes() {
    return Object.values(nodeTypes);
  }
  function getNodeType(type) {
    return nodeTypes[type];
  }
  function listVarTypes() {
    return Object.values(varTypes);
  }
  function getVarType(id) {
    return varTypes[id] || varTypes.number;
  }
  function listActions(slot) {
    return Object.values(actions).filter((a) => !slot || a.slot === slot);
  }
  function nodeLabel(def) {
    if (!def) return "";
    const zh = (window.uiLang || "zh") === "zh";
    return zh ? (def.title || def.title_en || def.type) : (def.title_en || def.title || def.type);
  }
  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== "string") {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, { ...opts, headers });
    if (!res.ok) throw new Error(await res.text());
    const ct = res.headers.get("content-type") || "";
    return ct.includes("json") ? res.json() : res;
  }
  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2200);
  }
  function renderActions(slot, root) {
    if (!root) return;
    root.querySelectorAll("[data-plugin-action]").forEach((n) => n.remove());
    listActions(slot).forEach((act) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "icon-btn";
      b.dataset.pluginAction = act.id;
      b.title = act.label || act.id;
      b.innerHTML = act.icon ? `<i class="fa-solid ${act.icon}"></i>` : act.label || act.id;
      b.onclick = () => act.onClick && act.onClick();
      root.appendChild(b);
    });
  }

  registerAssetKind({ id: "video", label: "Video" });
  registerAssetKind({ id: "image", label: "Image" });
  registerAssetKind({ id: "audio", label: "Audio" });
  registerNodeType({
    type: "user.function",
    title: "函数",
    title_en: "Function",
    category: "utility",
    icon: "fa-code",
    fields: [{ id: "ref", label: "函数 ID" }],
  });
  registerVarType({
    id: "number",
    label: "Number",
    default: 0,
    coerce: (v) => (Number.isFinite(Number(v)) ? Number(v) : 0),
    compare: (a, b, cmp) => {
      const x = Number(a), y = Number(b);
      if (cmp === ">") return x > y;
      if (cmp === "<") return x < y;
      if (cmp === "<=") return x <= y;
      if (cmp === "==") return x === y;
      return x >= y;
    },
  });
  registerVarType({
    id: "bool",
    label: "Bool",
    default: false,
    coerce: (v) => v === true || v === "true" || v === "1",
    compare: (a, b) => Boolean(a) === Boolean(b),
  });
  registerVarType({
    id: "string",
    label: "String",
    default: "",
    coerce: (v) => String(v ?? ""),
    compare: (a, b) => String(a) === String(b),
  });
  registerVarType({
    id: "array",
    label: "Array",
    default: [],
    coerce: (v) => (Array.isArray(v) ? v : String(v || "").split(",").filter(Boolean)),
    compare: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  const SCHEMA = 2;
  const executors = {};
  const pluginLife = {};
  const logBuf = { output: [], message: [], loc: [], console: [] };
  const inputMap = {};

  function registerExecutor(type, fn) {
    if (!type || typeof fn !== "function") return;
    executors[type] = fn;
  }
  function getExecutor(type) {
    return executors[type];
  }
  function definePlugin(spec) {
    if (!spec || !spec.id) return;
    pluginLife[spec.id] = spec;
    try {
      spec.onLoad && spec.onLoad(apiBag());
    } catch (err) {
      log("console", "plugin onLoad fail " + spec.id + " " + err);
    }
  }
  function notifyProject(ev, doc) {
    Object.values(pluginLife).forEach((spec) => {
      try {
        if (ev === "open") spec.onProjectOpen && spec.onProjectOpen(doc);
        if (ev === "close") spec.onProjectClose && spec.onProjectClose(doc);
        if (ev === "unload") spec.onUnload && spec.onUnload();
      } catch (err) {
        log("console", spec.id + " " + ev + " " + err);
      }
    });
  }
  function log(kind, msg) {
    const k = logBuf[kind] ? kind : "console";
    const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
    logBuf[k].push(line);
    if (logBuf[k].length > 500) logBuf[k].shift();
    emit("log", { kind: k, msg: line });
  }
  function logs() {
    return logBuf;
  }
  function inputOn(name, fn) {
    (inputMap[name] ||= []).push(fn);
    return () => {
      inputMap[name] = (inputMap[name] || []).filter((x) => x !== fn);
    };
  }
  function inputEmit(name, ev) {
    (inputMap[name] || []).forEach((fn) => {
      try { fn(ev); } catch (err) { log("console", err); }
    });
  }
  const time = {
    now: () => Date.now(),
    after: (ms, fn) => setTimeout(fn, ms),
  };

  function migrateGraph(raw) {
    const g = raw && typeof raw === "object" ? raw : {};
    g.nodes = Array.isArray(g.nodes) ? g.nodes : [];
    g.links = Array.isArray(g.links) ? g.links : [];
    g.variables = Array.isArray(g.variables) ? g.variables : [];
    g.comments = Array.isArray(g.comments) ? g.comments : [];
    g.pluginData = g.pluginData && typeof g.pluginData === "object" ? g.pluginData : {};
    if (!g.localization || typeof g.localization !== "object") g.localization = { source: "zh", tables: {} };
    if (!Array.isArray(g.levels) || !g.levels.length) {
      g.levels = [{ id: "lv0", name: "场景 1", nodes: g.nodes, links: g.links, variables: g.variables, comments: g.comments }];
    }
    g.levelId = g.levelId || g.levels[0].id;
    const ver = Number(g.version || 1);
    if (ver < 2) {
      g.nodes.forEach((n) => {
        n.data = n.data || {};
      });
      log("output", "migrated graph schema 1 → 2");
    }
    g.version = SCHEMA;
    const ids = new Set(g.nodes.map((n) => n.id));
    const before = g.links.length;
    g.links = g.links.filter((l) => ids.has(l.from) && ids.has(l.to));
    if (g.links.length !== before) log("message", "dropped " + (before - g.links.length) + " broken wires");
    const starts = g.nodes.filter((n) => n.type === "story.start");
    if (starts.length > 1) log("message", "multiple start nodes, first wins");
    if (!starts.length && g.nodes.length) log("message", "missing start node");
    return g;
  }

  function pluginData(id) {
    return {
      get(key, fallback) {
        const bag = (window.Graph && Graph.serialize().pluginData) || {};
        const own = bag[id] || {};
        return key in own ? own[key] : fallback;
      },
      set(key, value) {
        if (!window.Graph) return;
        const doc = Graph.serialize();
        doc.pluginData = doc.pluginData || {};
        doc.pluginData[id] = doc.pluginData[id] || {};
        doc.pluginData[id][key] = value;
        Graph.state.pluginData = doc.pluginData;
      },
    };
  }

  function apiBag() {
    return {
      registerNodeType,
      registerExecutor,
      registerVarType,
      registerAction,
      registerAssetKind,
      hook,
      log,
      time,
      inputOn,
      inputEmit,
      pluginData,
      api,
      toast,
    };
  }


  window.addEventListener("error", (ev) => {
    log("message", "ERROR " + (ev.message || ev.error) + " @ " + (ev.filename || "") + ":" + (ev.lineno || 0));
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev.reason;
    log("message", "UNHANDLED " + (r && r.stack ? r.stack : String(r)));
  });
  const _warn = console.warn.bind(console);
  const _err = console.error.bind(console);
  console.warn = (...args) => { log("message", "WARN " + args.map(String).join(" ")); _warn(...args); };
  console.error = (...args) => { log("message", "ERROR " + args.map(String).join(" ")); _err(...args); };

  log("output", "CineHost ready schema " + SCHEMA);

  function apiBagExport() {
    return apiBag();
  }

  return {
    SCHEMA,
    registerNodeType,
    registerAssetKind,
    registerVarType,
    registerAction,
    registerExecutor,
    getExecutor,
    definePlugin,
    notifyProject,
    listNodeTypes,
    getNodeType,
    listVarTypes,
    getVarType,
    listActions,
    nodeLabel,
    on,
    emit,
    hook,
    runHook,
    api,
    toast,
    renderActions,
    log,
    logs,
    inputOn,
    inputEmit,
    time,
    migrateGraph,
    pluginData,
    assetKinds,
    varTypes,
    actions,
    executors,
  };
})();
window.CineHost = CineHost;
