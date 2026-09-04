const Graph = (() => {
  const canvas = () => document.getElementById("graphCanvas");
  const state = {
    nodes: [],
    links: [],
    variables: [],
    cam: { x: 0, y: 0, s: 1 },
    drag: null,
    wire: null,
    selected: null,
    dirty: false,
    past: [],
    future: [],
    levels: [{ id: "lv0", name: "场景 1", nodes: [], links: [], variables: [] }],
    levelId: "lv0",
    picked: [],
    comments: [],
    pluginData: {},
    gameInstance: { variables: [], flags: {} },
    gameMode: { name: "默认模式", startLevelId: "lv0", persist: true },
    library: { functions: [], macros: [] },
    workspace: "scene",
    instanceGraph: { nodes: [], links: [], comments: [], variables: [] },
    modeGraph: { nodes: [], links: [], comments: [], variables: [] },
    clipboard: null,
    localization: { source: "zh", tables: {} },
    box: null,
    rmb: null,
    hover: null,
  };

  const PIN_COLOR = {
    exec: "#f2f2f2",
    bool: "#e74c3c",
    int: "#1abc9c",
    float: "#2ecc71",
    number: "#2ecc71",
    string: "#e84393",
    array: "#3498db",
    object: "#2980b9",
  };

  function pinKind(node, sockId, side) {
    const def = pinsOf(node);
    const list = side === "in" ? def.inputs : def.outputs;
    const s = (list || []).find((x) => x.id === sockId);
    return (s && s.kind) || def.pinKind || "exec";
  }

  function canLink(fromSock, toSock) {
    if (!fromSock || !toSock) return false;
    if (fromSock.side !== "out" || toSock.side !== "in") return false;
    if (fromSock.node.id === toSock.node.id) return false;
    const a = pinKind(fromSock.node, fromSock.sockId, "out");
    const b = pinKind(toSock.node, toSock.sockId, "in");
    if (a === "exec" || b === "exec") return a === b;
    if (a === "number" && (b === "float" || b === "int")) return true;
    if (b === "number" && (a === "float" || a === "int")) return true;
    return a === b;
  }

  function commentAt(p) {
    for (let i = state.comments.length - 1; i >= 0; i--) {
      const c = state.comments[i];
      if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c;
    }
    return null;
  }

  function uid(p) {
    return p + Math.random().toString(36).slice(2, 8);
  }

  function world(ev) {
    const r = canvas().getBoundingClientRect();
    return {
      x: (ev.clientX - r.left - state.cam.x) / state.cam.s,
      y: (ev.clientY - r.top - state.cam.y) / state.cam.s,
    };
  }

  function nodeAt(p) {
    for (let i = state.nodes.length - 1; i >= 0; i--) {
      const n = state.nodes[i];
      if (p.x >= n.x && p.x <= n.x + n.w && p.y >= n.y && p.y <= n.y + n.h) return n;
    }
    return null;
  }

  function pinsOf(node) {
    const def = Object.assign(
      { inputs: [{ id: "in", label: "in" }], outputs: [{ id: "out", label: "out" }] },
      CineHost.getNodeType(node.type) || {}
    );
    if (node.type === "flow.sequence" || (node.data && node.data.pins)) {
      ensurePins(node);
      def.outputs = (node.data.pins || []).map((p) => ({ id: p.id, label: p.label || p.id, kind: p.kind || "exec" }));
    }
    return def;
  }

  function layoutNode(n) {
    const def = pinsOf(n);
    const rows = Math.max((def.inputs || []).length, (def.outputs || []).length, 1);
    n.w = 220;
    n.h = 40 + rows * 22 + 12;
    return def;
  }

  function sockPos(node, sockId, side) {
    const def = pinsOf(node);
    const list = side === "in" ? def.inputs : def.outputs;
    const idx = Math.max(0, list.findIndex((s) => s.id === sockId));
    const y = node.y + 36 + idx * 22;
    const x = side === "in" ? node.x : node.x + node.w;
    return { x, y, sockId, side, node };
  }

  function nearSock(p) {
    const hit = 10;
    for (const n of state.nodes) {
      const def = pinsOf(n);
      for (const s of def.inputs) {
        const q = sockPos(n, s.id, "in");
        if (Math.hypot(p.x - q.x, p.y - q.y) < hit) return q;
      }
      for (const s of def.outputs) {
        const q = sockPos(n, s.id, "out");
        if (Math.hypot(p.x - q.x, p.y - q.y) < hit) return q;
      }
    }
    return null;
  }

  function snapshot() {
    state.past.push(JSON.stringify({ nodes: state.nodes, links: state.links, variables: state.variables }));
    if (state.past.length > 80) state.past.shift();
    state.future = [];
  }
  function undo() {
    if (!state.past.length) return;
    state.future.push(JSON.stringify({ nodes: state.nodes, links: state.links, variables: state.variables }));
    load(JSON.parse(state.past.pop()), true);
  }
  function redo() {
    if (!state.future.length) return;
    state.past.push(JSON.stringify({ nodes: state.nodes, links: state.links, variables: state.variables }));
    load(JSON.parse(state.future.pop()), true);
  }

  function addNode(type, x, y) {
    const def = CineHost.getNodeType(type);
    if (!def) return;
    const node = {
      id: uid("n"),
      type,
      x: x ?? 80 - state.cam.x / state.cam.s,
      y: y ?? 80 - state.cam.y / state.cam.s,
      w: 220,
      h: 88,
      data: {},
    };
    (def.fields || []).forEach((f) => {
      node.data[f.id] = f.default ?? "";
    });
    if (type === "flow.sequence") ensurePins(node);
    layoutNode(node);
    snapshot();
    state.nodes.push(node);
    state.selected = node.id;
    state.picked = [node.id];
    state.dirty = true;
    CineHost.emit("graph:select", node);
    draw();
    return node;
  }

  function removeSelected() {
    const ids = state.picked.length ? state.picked.slice() : (state.selected ? [state.selected] : []);
    if (!ids.length) return;
    snapshot();
    const id = ids[0];
    state.nodes = state.nodes.filter((n) => !ids.includes(n.id));
    state.links = state.links.filter((l) => !ids.includes(l.from) && !ids.includes(l.to));
    state.picked = [];
    state.selected = null;
    state.dirty = true;
    CineHost.emit("graph:select", null);
    draw();
  }

  function currentPack() {
    return { nodes: state.nodes, links: state.links, variables: state.variables, comments: state.comments };
  }
  function applyPack(pack) {
    state.nodes = (pack && pack.nodes) || [];
    state.links = (pack && pack.links) || [];
    state.variables = (pack && pack.variables) || [];
    state.comments = (pack && pack.comments) || [];
    state.selected = null;
    state.picked = [];
  }
  function stashLevel() {
    if (state.workspace === "instance") {
      state.instanceGraph = currentPack();
      return;
    }
    if (state.workspace === "mode") {
      state.modeGraph = currentPack();
      return;
    }
    const cur = state.levels.find((l) => l.id === state.levelId);
    if (cur) {
      cur.nodes = state.nodes;
      cur.links = state.links;
      cur.variables = state.variables;
      cur.comments = state.comments;
    }
  }
  function switchSpace(id) {
    stashLevel();
    state.workspace = id;
    if (id === "instance") applyPack(state.instanceGraph);
    else if (id === "mode") applyPack(state.modeGraph);
    else {
      const cur = state.levels.find((l) => l.id === state.levelId) || state.levels[0];
      applyPack(cur || {});
    }
    draw();
    CineHost.emit("space:changed", id);
  }

  function serialize() {
    stashLevel();
    return {
      version: (window.CineHost && CineHost.SCHEMA) || 2,
      id: "main",
      pluginData: state.pluginData || {},
      levelId: state.levelId,
      levels: state.levels,
      nodes: state.nodes,
      links: state.links,
      variables: state.variables,
      comments: state.comments,
      localization: state.localization || { source: "zh", tables: {} },
      gameInstance: state.gameInstance || { variables: [], flags: {} },
      gameMode: state.gameMode || { name: "默认模式", startLevelId: "lv0", persist: true },
      library: state.library || { functions: [], macros: [] },
      workspace: state.workspace || "scene",
      instanceGraph: state.instanceGraph,
      modeGraph: state.modeGraph,
    };
  }

  function load(g, keepHist) {
    g = (CineHost.migrateGraph && CineHost.migrateGraph(g)) || g;
    state.pluginData = g.pluginData || {};
    state.localization = g.localization || { source: "zh", tables: {} };
    state.gameInstance = g.gameInstance || { variables: [], flags: {} };
    state.gameMode = g.gameMode || { name: "默认模式", startLevelId: state.levelId || "lv0", persist: true };
    state.library = g.library || { functions: [], macros: [] };
    state.instanceGraph = g.instanceGraph || { nodes: [], links: [], comments: [], variables: [] };
    state.modeGraph = g.modeGraph || { nodes: [], links: [], comments: [], variables: [] };
    state.workspace = g.workspace || "scene";
    const levels = g.levels && g.levels.length
      ? g.levels
      : [{ id: "lv0", name: "场景 1", nodes: g.nodes || [], links: g.links || [], variables: g.variables || [] }];
    state.levels = levels;
    state.levelId = g.levelId || levels[0].id;
    const cur = levels.find((l) => l.id === state.levelId) || levels[0];
    state.nodes = cur.nodes || [];
    state.links = cur.links || [];
    state.variables = cur.variables || [];
    state.comments = cur.comments || g.comments || [];
    if (state.workspace === "instance") applyPack(state.instanceGraph);
    if (state.workspace === "mode") applyPack(state.modeGraph);
    state.dirty = false;
    if (!keepHist) {
      state.past = [];
      state.future = [];
    }
    draw();
  }

  function switchLevel(id) {
    stashLevel();
    const lv = state.levels.find((l) => l.id === id);
    if (!lv) return;
    state.workspace = "scene";
    state.levelId = id;
    state.nodes = lv.nodes || [];
    state.links = lv.links || [];
    state.variables = lv.variables || [];
    state.comments = lv.comments || [];
    state.selected = null;
    state.picked = [];
    draw();
    CineHost.emit("level:changed", lv);
  }

  function addLevel(name) {
    stashLevel();
    const lv = { id: uid("lv"), name: name || ("场景 " + (state.levels.length + 1)), nodes: [], links: [], variables: [] };
    state.levels.push(lv);
    switchLevel(lv.id);
    return lv;
  }

  function ensurePins(node) {
    if (!node.data) node.data = {};
    if (Array.isArray(node.data.pins) && node.data.pins.length) return;
    const count = Math.max(2, Number(node.data.pinCount || 4));
    node.data.pins = Array.from({ length: count }, (_, i) => ({ id: "t" + i, label: "然后 " + i, kind: "exec" }));
    node.data.pinCount = node.data.pins.length;
  }
  function addPin(node) {
    if (!node) return;
    snapshot();
    ensurePins(node);
    const i = node.data.pins.length;
    node.data.pins.push({ id: "t" + i + "_" + uid("p").slice(-3), label: "然后 " + i, kind: "exec" });
    node.data.pinCount = node.data.pins.length;
    layoutNode(node);
    state.dirty = true;
    draw();
  }
  function removePin(node, pinId) {
    if (!node) return;
    ensurePins(node);
    if (node.data.pins.length <= 1) return;
    snapshot();
    node.data.pins = node.data.pins.filter((p) => p.id !== pinId);
    node.data.pinCount = node.data.pins.length;
    state.links = state.links.filter((l) => !(l.from === node.id && l.fromSock === pinId) && !(l.to === node.id && l.toSock === pinId));
    layoutNode(node);
    state.dirty = true;
    draw();
  }
  function renamePin(node, pinId, label) {
    ensurePins(node);
    const p = node.data.pins.find((x) => x.id === pinId);
    if (p) p.label = label || p.id;
    state.dirty = true;
    draw();
  }
  function movePin(node, from, to) {
    ensurePins(node);
    const arr = node.data.pins;
    if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
    snapshot();
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    layoutNode(node);
    state.dirty = true;
    draw();
  }

  function fit() {
    if (!state.nodes.length) {
      state.cam = { x: 40, y: 40, s: 1 };
      draw();
      return;
    }
    const minX = Math.min(...state.nodes.map((n) => n.x));
    const minY = Math.min(...state.nodes.map((n) => n.y));
    const maxX = Math.max(...state.nodes.map((n) => n.x + n.w));
    const maxY = Math.max(...state.nodes.map((n) => n.y + n.h));
    const c = canvas();
    const s = Math.min(1.2, 0.9 * Math.min(c.width / (maxX - minX + 160), c.height / (maxY - minY + 160)));
    state.cam.s = s;
    state.cam.x = (c.width - (maxX + minX) * s) / 2;
    state.cam.y = (c.height - (maxY + minY) * s) / 2;
    draw();
  }

  function draw() {
    const c = canvas();
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawDots(ctx, w, h);
    ctx.save();
    ctx.translate(state.cam.x, state.cam.y);
    ctx.scale(state.cam.s, state.cam.s);

    for (const cm of state.comments) {
      ctx.fillStyle = cm.color || "rgba(231,192,122,0.12)";
      ctx.strokeStyle = cm.border || "rgba(231,192,122,0.45)";
      ctx.lineWidth = 1;
      round(ctx, cm.x, cm.y, cm.w, cm.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ece7d8";
      ctx.font = "12px Sora, sans-serif";
      ctx.fillText(cm.title || "注释", cm.x + 10, cm.y + 18);
      ctx.strokeStyle = cm.border || "rgba(231,192,122,0.7)";
      ctx.beginPath();
      ctx.moveTo(cm.x + cm.w - 14, cm.y + cm.h - 4);
      ctx.lineTo(cm.x + cm.w - 4, cm.y + cm.h - 4);
      ctx.lineTo(cm.x + cm.w - 4, cm.y + cm.h - 14);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (const l of state.links) {
      const a = state.nodes.find((n) => n.id === l.from);
      const b = state.nodes.find((n) => n.id === l.to);
      if (!a || !b) continue;
      const p = sockPos(a, l.fromSock, "out");
      const q = sockPos(b, l.toSock, "in");
      ctx.strokeStyle = PIN_COLOR[pinKind(a, l.fromSock, "out")] || "#e7c07a";
      bezier(ctx, p.x, p.y, q.x, q.y);
    }
    if (state.wire) {
      ctx.strokeStyle = PIN_COLOR[pinKind(state.wire.node, state.wire.sockId, state.wire.side)] || "#e7c07a";
      bezier(ctx, state.wire.x, state.wire.y, state.wire.mx, state.wire.my);
    }
    if (state.box) {
      ctx.strokeStyle = "rgba(231,192,122,0.8)";
      ctx.fillStyle = "rgba(231,192,122,0.08)";
      const x = Math.min(state.box.x, state.box.x2);
      const y = Math.min(state.box.y, state.box.y2);
      const bw = Math.abs(state.box.x2 - state.box.x);
      const bh = Math.abs(state.box.y2 - state.box.y);
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeRect(x, y, bw, bh);
    }

    for (const n of state.nodes) {
      const def = pinsOf(n);
      layoutNode(n);
      const on = state.picked.includes(n.id) || n.id === state.selected;
      ctx.fillStyle = "#12141c";
      ctx.strokeStyle = on ? "#e7c07a" : "#2a2e3a";
      ctx.lineWidth = on ? 2 : 1;
      round(ctx, n.x, n.y, n.w, n.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.color || "#e7c07a";
      ctx.fillRect(n.x, n.y, n.w, 22);
      ctx.fillStyle = "#111";
      ctx.font = "12px Sora, sans-serif";
      ctx.fillText((CineHost.nodeLabel && CineHost.nodeLabel(def)) || def.title || n.type, n.x + 10, n.y + 15);
      ctx.fillStyle = "#8b8373";
      ctx.font = "10px Sora, sans-serif";
      for (const s of def.inputs || []) {
        const p = sockPos(n, s.id, "in");
        sock(ctx, p.x, p.y, s.kind || "exec");
        ctx.fillStyle = "#8b8373";
        ctx.fillText(s.label || s.id, n.x + 12, p.y + 3);
      }
      for (const s of def.outputs || []) {
        const p = sockPos(n, s.id, "out");
        sock(ctx, p.x, p.y, s.kind || "exec");
        const label = s.label || s.id;
        ctx.fillStyle = "#8b8373";
        ctx.fillText(label, n.x + n.w - 12 - ctx.measureText(label).width, p.y + 3);
      }
    }
    ctx.restore();
  }

  function drawDots(ctx, w, h) {
    const gap = 22 * state.cam.s;
    const ox = ((state.cam.x % gap) + gap) % gap;
    const oy = ((state.cam.y % gap) + gap) % gap;
    ctx.fillStyle = "#1c2030";
    for (let x = ox; x < w; x += gap) {
      for (let y = oy; y < h; y += gap) {
        ctx.fillRect(x, y, 1.4, 1.4);
      }
    }
  }

  function bezier(ctx, x1, y1, x2, y2) {
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
    ctx.stroke();
  }
  function round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function sock(ctx, x, y, kind) {
    ctx.beginPath();
    ctx.fillStyle = PIN_COLOR[kind || "exec"] || "#e7c07a";
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function bind() {
    const c = canvas();
    const resize = () => draw();
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(c.parentElement || c);
    }
    c.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const s = state.cam.s * (ev.deltaY < 0 ? 1.08 : 0.92);
      state.cam.s = Math.min(2.2, Math.max(0.35, s));
      draw();
    }, { passive: false });
    c.addEventListener("mousedown", (ev) => {
      const p = world(ev);
      if (ev.button === 2) {
        state.rmb = { x: ev.clientX, y: ev.clientY, moved: false, hit: nodeAt(p) };
        state.drag = { pan: true, x: ev.clientX - state.cam.x, y: ev.clientY - state.cam.y };
        return;
      }
      if (ev.button !== 0) return;
      const sockHit = nearSock(p);
      if (sockHit) {
        if (ev.altKey) {
          snapshot();
          state.links = state.links.filter((l) => {
            if (sockHit.side === "out") return !(l.from === sockHit.node.id && l.fromSock === sockHit.sockId);
            return !(l.to === sockHit.node.id && l.toSock === sockHit.sockId);
          });
          state.dirty = true;
          draw();
          return;
        }
        if (ev.ctrlKey || ev.metaKey) {
          const existing = sockHit.side === "in"
            ? state.links.find((l) => l.to === sockHit.node.id && l.toSock === sockHit.sockId)
            : state.links.find((l) => l.from === sockHit.node.id && l.fromSock === sockHit.sockId);
          if (existing) {
            snapshot();
            state.links = state.links.filter((l) => l.id !== existing.id);
            const other = sockHit.side === "in"
              ? { node: state.nodes.find((n) => n.id === existing.from), sockId: existing.fromSock, side: "out" }
              : { node: state.nodes.find((n) => n.id === existing.to), sockId: existing.toSock, side: "in" };
            if (other.node) {
              const pos = sockPos(other.node, other.sockId, other.side);
              state.wire = { ...other, ...pos, mx: p.x, my: p.y };
            }
            draw();
            return;
          }
        }
        if (sockHit.side === "out") {
          state.wire = { ...sockHit, mx: p.x, my: p.y };
          return;
        }
      }
      const n = nodeAt(p);
      const cm = commentAt(p);
      if (n) {
        if (ev.shiftKey) {
          if (!state.picked.includes(n.id)) state.picked.push(n.id);
        } else if (!state.picked.includes(n.id)) {
          state.picked = [n.id];
        }
        state.selected = n.id;
        state.drag = { ids: state.picked.slice(), ox: p.x, oy: p.y, origin: state.picked.map((id) => {
          const nd = state.nodes.find((x) => x.id === id);
          return nd ? { id, x: nd.x, y: nd.y } : null;
        }).filter(Boolean) };
        CineHost.emit("graph:select", n);
      } else if (cm) {
        const onHandle = p.x >= cm.x + cm.w - 18 && p.y >= cm.y + cm.h - 18;
        if (onHandle) {
          state.drag = { resizeComment: cm.id, ox: p.x, oy: p.y, w: cm.w, h: cm.h };
        } else {
          state.drag = {
            comment: cm.id,
            dx: p.x - cm.x,
            dy: p.y - cm.y,
            startX: cm.x,
            startY: cm.y,
            members: (cm.members || []).map((id) => {
              const nd = state.nodes.find((x) => x.id === id);
              return nd ? { id, x: nd.x, y: nd.y } : null;
            }).filter(Boolean),
          };
        }
      } else {
        state.selected = null;
        state.picked = [];
        state.box = { x: p.x, y: p.y, x2: p.x, y2: p.y };
        CineHost.emit("graph:select", null);
      }
      draw();
    });
    window.addEventListener("mousemove", (ev) => {
      const p = world(ev);
      if (state.rmb) {
        if (Math.hypot(ev.clientX - state.rmb.x, ev.clientY - state.rmb.y) > 6) state.rmb.moved = true;
      }
      const over = nodeAt(p);
      if ((over && over.id) !== (state.hover && state.hover.id)) {
        state.hover = over;
        CineHost.emit("graph:hover", over ? { node: over, x: ev.clientX, y: ev.clientY } : null);
      }
      if (state.wire) {
        state.wire.mx = p.x;
        state.wire.my = p.y;
        draw();
      } else if (state.box) {
        state.box.x2 = p.x;
        state.box.y2 = p.y;
        draw();
      } else if (state.drag && state.drag.pan) {
        state.cam.x = ev.clientX - state.drag.x;
        state.cam.y = ev.clientY - state.drag.y;
        draw();
      } else if (state.drag && state.drag.origin) {
        const dx = p.x - state.drag.ox;
        const dy = p.y - state.drag.oy;
        state.drag.origin.forEach((o) => {
          const nd = state.nodes.find((x) => x.id === o.id);
          if (nd) {
            nd.x = o.x + dx;
            nd.y = o.y + dy;
          }
        });
        state.dirty = true;
        draw();
      } else if (state.drag && state.drag.resizeComment) {
        const cm = state.comments.find((x) => x.id === state.drag.resizeComment);
        if (cm) {
          cm.w = Math.max(140, state.drag.w + (p.x - state.drag.ox));
          cm.h = Math.max(70, state.drag.h + (p.y - state.drag.oy));
          state.dirty = true;
          draw();
        }
      } else if (state.drag && state.drag.comment) {
        const cm = state.comments.find((x) => x.id === state.drag.comment);
        if (cm) {
          const nx = p.x - state.drag.dx;
          const ny = p.y - state.drag.dy;
          const dx = nx - state.drag.startX;
          const dy = ny - state.drag.startY;
          cm.x = nx;
          cm.y = ny;
          (state.drag.members || []).forEach((o) => {
            const nd = state.nodes.find((x) => x.id === o.id);
            if (nd) {
              nd.x = o.x + dx;
              nd.y = o.y + dy;
            }
          });
          state.dirty = true;
          draw();
        }
      }
    });
    window.addEventListener("mouseup", (ev) => {
      if (state.wire) {
        const p = world(ev);
        const sockHit = nearSock(p);
        if (sockHit && canLink(state.wire, sockHit)) {
          state.links = state.links.filter((l) => !(l.to === sockHit.node.id && l.toSock === sockHit.sockId));
          snapshot();
          state.links.push({
            id: uid("l"),
            from: state.wire.node.id,
            fromSock: state.wire.sockId,
            to: sockHit.node.id,
            toSock: sockHit.sockId,
            kind: pinKind(state.wire.node, state.wire.sockId, "out"),
          });
          state.dirty = true;
        }
        state.wire = null;
        draw();
      }
      if (state.box) {
        const x1 = Math.min(state.box.x, state.box.x2);
        const y1 = Math.min(state.box.y, state.box.y2);
        const x2 = Math.max(state.box.x, state.box.x2);
        const y2 = Math.max(state.box.y, state.box.y2);
        if (x2 - x1 > 4 && y2 - y1 > 4) {
          state.picked = state.nodes.filter((n) => n.x + n.w > x1 && n.x < x2 && n.y + n.h > y1 && n.y < y2).map((n) => n.id);
          state.selected = state.picked[0] || null;
        }
        state.box = null;
        draw();
      }
      state.drag = null;
    });
    window.addEventListener("keydown", (ev) => {
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) redo();
        else undo();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        redo();
      }
      if (ev.key === "Tab") {
        ev.preventDefault();
        CineHost.emit("graph:palette", {});
      }
      if (ev.key === "Delete" || ev.key === "Backspace") removeSelected();
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "c") {
        ev.preventDefault();
        copySelection();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "v") {
        ev.preventDefault();
        pasteClipboard();
      }
    });
    c.addEventListener("dblclick", (ev) => {
      const p = world(ev);
      const cm = commentAt(p);
      if (cm) {
        CineHost.emit("graph:comment-edit", cm);
        return;
      }
      if (!nodeAt(p)) CineHost.emit("graph:palette", { x: ev.clientX, y: ev.clientY });
    });
    c.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      const rmb = state.rmb;
      state.rmb = null;
      if (rmb && rmb.moved) return;
      const p = world(ev);
      const n = nodeAt(p);
      if (n) {
        if (!state.picked.includes(n.id)) {
          state.picked = [n.id];
          state.selected = n.id;
        }
        CineHost.emit("graph:node-menu", { x: ev.clientX, y: ev.clientY, ids: state.picked.slice(), node: n });
        return;
      }
      CineHost.emit("graph:palette", { x: ev.clientX, y: ev.clientY });
    });
  }

  function wrapComment(ids, title, color) {
    const members = state.nodes.filter((n) => ids.includes(n.id));
    if (!members.length) return;
    const pad = 28;
    const x = Math.min(...members.map((n) => n.x)) - pad;
    const y = Math.min(...members.map((n) => n.y)) - 36;
    const w = Math.max(...members.map((n) => n.x + n.w)) - x + pad;
    const h = Math.max(...members.map((n) => n.y + n.h)) - y + pad;
    snapshot();
    state.comments.push({
      id: uid("c"),
      title: title || "注释",
      color: color || "rgba(46, 80, 120, 0.28)",
      border: "rgba(120, 170, 220, 0.6)",
      x, y, w, h,
      members: ids.slice(),
    });
    draw();
  }

  function captureSelection() {
    const ids = state.picked.length ? state.picked.slice() : (state.selected ? [state.selected] : []);
    const nodes = state.nodes.filter((n) => ids.includes(n.id)).map((n) => JSON.parse(JSON.stringify(n)));
    const links = state.links.filter((l) => ids.includes(l.from) && ids.includes(l.to)).map((l) => JSON.parse(JSON.stringify(l)));
    return { nodes, links };
  }
  function copySelection() {
    const pack = captureSelection();
    if (!pack.nodes.length) return;
    state.clipboard = pack;
    CineHost.log && CineHost.log("output", "copy " + pack.nodes.length);
  }
  function remapPack(pack, dx, dy) {
    const idMap = {};
    const nodes = pack.nodes.map((n) => {
      const id = uid("n");
      idMap[n.id] = id;
      return Object.assign({}, JSON.parse(JSON.stringify(n)), { id, x: n.x + dx, y: n.y + dy });
    });
    const links = pack.links.map((l) => Object.assign({}, l, { id: uid("l"), from: idMap[l.from], to: idMap[l.to] }));
    return { nodes, links };
  }
  function pasteClipboard(dx, dy) {
    if (!state.clipboard || !state.clipboard.nodes.length) return;
    snapshot();
    const pack = remapPack(state.clipboard, dx || 36, dy || 36);
    state.nodes.push(...pack.nodes);
    state.links.push(...pack.links);
    state.picked = pack.nodes.map((n) => n.id);
    state.selected = state.picked[0] || null;
    state.dirty = true;
    draw();
  }
  function saveAsMacro(name) {
    const pack = captureSelection();
    if (!pack.nodes.length) return null;
    state.library = state.library || { functions: [], macros: [] };
    const item = { id: uid("mc"), name: name || "宏", nodes: pack.nodes, links: pack.links };
    state.library.macros.push(item);
    state.dirty = true;
    return item;
  }
  function saveAsFunction(name) {
    const pack = captureSelection();
    if (!pack.nodes.length) return null;
    state.library = state.library || { functions: [], macros: [] };
    const item = { id: uid("fn"), name: name || "函数", nodes: pack.nodes, links: pack.links, entry: pack.nodes[0].id };
    state.library.functions.push(item);
    CineHost.registerNodeType({
      type: "user.function",
      title: name || "函数",
      title_en: name || "Function",
      category: "utility",
      icon: "fa-code",
      fields: [{ id: "ref", label: "函数", default: item.id }],
    });
    snapshot();
    const x = pack.nodes[0].x;
    const y = pack.nodes[0].y;
    addNode("user.function", x, y);
    const call = state.nodes[state.nodes.length - 1];
    if (call) call.data.ref = item.id;
    state.dirty = true;
    return item;
  }
  function placeLibrary(kind, id) {
    const bag = state.library || { functions: [], macros: [] };
    const item = (kind === "fn" ? bag.functions : bag.macros).find((x) => x.id === id);
    if (!item) return;
    if (kind === "fn") {
      addNode("user.function", 80, 80);
      const call = state.nodes[state.nodes.length - 1];
      if (call) {
        call.data.ref = item.id;
        call.data.label = item.name;
      }
      return;
    }
    state.clipboard = { nodes: item.nodes, links: item.links };
    pasteClipboard(40, 40);
  }

  return { state, addNode, load, serialize, draw, bind, fit, removeSelected, undo, redo, addPin, removePin, renamePin, movePin, switchLevel, addLevel, switchSpace, pinsOf, wrapComment, copySelection, pasteClipboard, saveAsMacro, saveAsFunction, placeLibrary };
})();
window.Graph = Graph;
