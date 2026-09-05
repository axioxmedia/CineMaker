const Graph = (() => {
  const state = {
    nodes: [],
    links: [],
    variables: [],
    dirty: false,
    levels: [{ id: "lv0", name: "场景 1", nodes: [], links: [], variables: [] }],
    levelId: "lv0",
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
    past: [],
    future: [],
  };

  const CAT_HUE = {
    blueprint: "#5c81a6",
    narrative: "#a55b80",
    viewport: "#5ba58c",
    camera: "#5b67a5",
    asset: "#745ba5",
    interface: "#5ba55b",
    video: "#a5745b",
    media: "#5b80a5",
    utility: "#995ba5",
    flow: "#5c81a6",
    ui: "#5ba55b",
  };

  let ws = null;
  let registered = false;

  function uid(p) {
    return p + Math.random().toString(36).slice(2, 8);
  }

  function pinsOf(nodeOrType) {
    const type = typeof nodeOrType === "string" ? nodeOrType : nodeOrType.type;
    const def = Object.assign(
      { inputs: [{ id: "in", label: "in" }], outputs: [{ id: "out", label: "out" }] },
      CineHost.getNodeType(type) || {}
    );
    return def;
  }

  function execList(def, side) {
    const list = side === "in" ? def.inputs || [] : def.outputs || [];
    return list.filter((s) => (s.kind || "exec") === "exec");
  }

  function isC(def) {
    const outs = execList(def, "out");
    if (outs.length >= 2) return true;
    return /branch|loop|sequence|timer|if|switch/.test(def.type || "");
  }

  function defineBlocks() {
    if (!window.Blockly) return;
    (CineHost.listNodeTypes() || []).forEach((def) => {
      const type = def.type;
      Blockly.Blocks[type] = {
        init() {
          const color = def.color && /^#/.test(def.color) ? def.color : (CAT_HUE[def.category] || "#5c81a6");
          this.setColour(color);
          const title = (CineHost.nodeLabel && CineHost.nodeLabel(def)) || def.title || type;
          this.appendDummyInput("TITLE").appendField(title);
          (def.fields || []).forEach((f) => {
            const row = this.appendDummyInput("F_" + f.id);
            row.appendField((CineHost.pinLabel && CineHost.pinLabel(f)) || f.label || f.id);
            if (f.type === "bool") {
              row.appendField(new Blockly.FieldCheckbox(f.default ? "TRUE" : "FALSE"), f.id);
            } else if (f.options && f.options.length) {
              row.appendField(new Blockly.FieldDropdown(f.options.map((o) => [String(o.label || o), String(o.value ?? o)])), f.id);
            } else {
              row.appendField(new Blockly.FieldTextInput(String(f.default ?? "")), f.id);
            }
          });
          const ins = execList(def, "in");
          const outs = execList(def, "out");
          if (!ins.length) {
            this.setPreviousStatement(false);
            if (this.setHat) this.setHat("cap");
          } else {
            this.setPreviousStatement(true);
          }
          if (isC(def)) {
            outs.forEach((s) => {
              this.appendStatementInput(s.id).setCheck(null).appendField((CineHost.pinLabel && CineHost.pinLabel(s)) || s.label || s.id);
            });
            this.setNextStatement(true);
          } else {
            this.setNextStatement(outs.length > 0);
          }
          (def.inputs || []).filter((s) => (s.kind || "exec") !== "exec").forEach((s) => {
            this.appendValueInput(s.id).setCheck(null).appendField((CineHost.pinLabel && CineHost.pinLabel(s)) || s.label || s.id);
          });
          (def.outputs || []).filter((s) => (s.kind || "exec") !== "exec").forEach((s) => {
            this.setOutput(true, null);
          });
          const zh = (window.uiLang || "zh") === "zh";
          const tip = zh ? (def.tooltip || def.tooltip_en || title) : (def.tooltip_en || def.tooltip || title);
          this.setTooltip(tip);
          this.setHelpUrl("");
        },
      };
    });
    registered = true;
  }

  function theme() {
    if (Blockly.Themes && Blockly.Themes.Classic && Blockly.Theme && Blockly.Theme.defineTheme) {
      return Blockly.Theme.defineTheme("cinemaker", {
        base: Blockly.Themes.Classic,
        componentStyles: {
          workspaceBackgroundColour: "#0e0f14",
          toolboxBackgroundColour: "#14110c",
          flyoutBackgroundColour: "#14110c",
          scrollbarColour: "#3a3226",
          insertionMarkerColour: "#e7c07a",
          insertionMarkerOpacity: 0.4,
        },
      });
    }
    return Blockly.Themes && Blockly.Themes.Classic;
  }

  function bind() {
    const host = document.getElementById("blocklyDiv") || document.getElementById("graphCanvas");
    if (!host || !window.Blockly) return;
    if (host.tagName === "CANVAS") return;
    defineBlocks();
    if (ws) {
      try { ws.dispose(); } catch (e) {}
      ws = null;
    }
    ws = Blockly.inject(host, {
      toolbox: false,
      media: "/assets/vendor/blockly/media/",
      sounds: true,
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { controls: true, wheel: true, startScale: 1, maxScale: 2.2, minScale: 0.3 },
      grid: { spacing: 20, length: 2, colour: "#2a2418", snap: true },
      theme: theme(),
      renderer: "geras",
    });
    ws.addChangeListener((ev) => {
      if (!ev || ev.isUiEvent) return;
      state.dirty = true;
      if (ev.type === Blockly.Events.SELECTED || ev.type === "selected") {
        const id = ev.newElementId || ev.newValue;
        const block = id && ws.getBlockById(id);
        if (block) {
          CineHost.emit("graph:select", blockToNode(block));
        }
      }
    });
    window.addEventListener("resize", () => {
      if (ws) Blockly.svgResize(ws);
    });
  }

  function blockToNode(b) {
    const def = pinsOf(b.type);
    const xy = b.getRelativeToSurfaceXY();
    const data = {};
    (def.fields || []).forEach((f) => {
      try {
        const v = b.getFieldValue(f.id);
        data[f.id] = v === "TRUE" ? true : v === "FALSE" ? false : v;
      } catch (e) {}
    });
    return { id: b.id, type: b.type, x: xy.x, y: xy.y, w: 220, h: 80, data };
  }

  function pullFromWorkspace() {
    if (!ws) return;
    const nodes = [];
    const links = [];
    ws.getAllBlocks(false).forEach((b) => {
      nodes.push(blockToNode(b));
      const def = pinsOf(b.type);
      const outs = execList(def, "out");
      const next = b.getNextBlock();
      if (next && !isC(def) && outs[0]) {
        const childDef = pinsOf(next.type);
        const inn = execList(childDef, "in")[0];
        links.push({ id: uid("l"), from: b.id, fromSock: outs[0].id, to: next.id, toSock: inn ? inn.id : "in", kind: "exec" });
      }
      b.inputList.forEach((inp) => {
        if (!inp.connection || !inp.name) return;
        const target = inp.connection.targetBlock && inp.connection.targetBlock();
        if (!target) return;
        try {
          const ct = inp.connection.type;
          const isValue = ct === 1 || ct === (Blockly.INPUT_VALUE) ||
            (Blockly.connectionTypes && ct === Blockly.connectionTypes.INPUT_VALUE);
          if (isValue) {
            links.push({ id: uid("l"), from: target.id, fromSock: "out", to: b.id, toSock: inp.name, kind: "value" });
            return;
          }
        } catch (e) {}
        const isStmt = inp.connection.type === (Blockly.NEXT_STATEMENT || 3) ||
          (Blockly.connectionTypes && inp.connection.type === Blockly.connectionTypes.NEXT_STATEMENT) ||
          String(inp.name).length > 0 && target.getPreviousBlock && target.getParent && target.getParent() === b && !b.getNextBlock || false;
        if (target.getParent && target.getParent() === b && target !== next) {
          const childDef = pinsOf(target.type);
          const inn = execList(childDef, "in")[0];
          links.push({ id: uid("l"), from: b.id, fromSock: inp.name, to: target.id, toSock: inn ? inn.id : "in", kind: "exec" });
        }
      });
    });
    state.nodes = nodes;
    state.links = links;
  }

  function pushToWorkspace(pack) {
    if (!ws) return;
    defineBlocks();
    const nodes = (pack && pack.nodes) || [];
    const links = (pack && pack.links) || [];
    Blockly.Events.disable();
    try {
      ws.clear();
      const created = {};
      nodes.forEach((n) => {
        if (!Blockly.Blocks[n.type]) defineBlocks();
        if (!Blockly.Blocks[n.type]) return;
        const b = ws.newBlock(n.type, n.id);
        b.initSvg();
        (pinsOf(n).fields || []).forEach((f) => {
          if (n.data && n.data[f.id] != null && b.getField(f.id)) {
            const v = n.data[f.id];
            try { b.setFieldValue(typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v), f.id); } catch (e) {}
          }
        });
        b.render();
        b.moveBy(n.x || 40, n.y || 40);
        created[n.id] = b;
      });
      links.forEach((l) => {
        if ((l.kind || "exec") !== "exec") return;
        const a = created[l.from];
        const b = created[l.to];
        if (!a || !b || !b.previousConnection) return;
        const def = pinsOf(a.type);
        if (isC(def)) {
          const inp = a.getInput(l.fromSock);
          if (inp && inp.connection) {
            try { inp.connection.connect(b.previousConnection); } catch (e) {}
            return;
          }
        }
        if (a.nextConnection) {
          try { a.nextConnection.connect(b.previousConnection); } catch (e) {}
        }
      });
    } finally {
      Blockly.Events.enable();
    }
    if (ws) Blockly.svgResize(ws);
  }

  function serialize() {
    pullFromWorkspace();
    return {
      nodes: state.nodes,
      links: state.links,
      variables: state.variables,
      comments: state.comments,
      levels: state.levels,
      levelId: state.levelId,
      gameInstance: state.gameInstance,
      gameMode: state.gameMode,
      library: state.library,
      workspace: state.workspace,
      instanceGraph: state.instanceGraph,
      modeGraph: state.modeGraph,
      localization: state.localization,
      pluginData: state.pluginData,
    };
  }

  function load(pack, skipSnap) {
    pack = pack || {};
    state.nodes = pack.nodes || [];
    state.links = pack.links || [];
    state.variables = pack.variables || [];
    state.comments = pack.comments || [];
    if (pack.levels) state.levels = pack.levels;
    if (pack.levelId) state.levelId = pack.levelId;
    if (pack.gameInstance) state.gameInstance = pack.gameInstance;
    if (pack.gameMode) state.gameMode = pack.gameMode;
    if (pack.library) state.library = pack.library;
    if (pack.workspace) state.workspace = pack.workspace;
    if (pack.instanceGraph) state.instanceGraph = pack.instanceGraph;
    if (pack.modeGraph) state.modeGraph = pack.modeGraph;
    if (pack.localization) state.localization = pack.localization;
    if (pack.pluginData) state.pluginData = pack.pluginData;
    pushToWorkspace(pack);
    state.dirty = false;
  }

  function viewAnchor() {
    try {
      const v = ws.getMetricsManager().getViewMetrics(true);
      return { x: v.left + 56, y: v.top + 56 };
    } catch (e) {}
    const m = (ws.getMetrics && ws.getMetrics()) || {};
    const s = ws.scale || 1;
    return { x: ((m.viewLeft || 0) / s) + 56, y: ((m.viewTop || 0) / s) + 56 };
  }
  function addNode(type, x, y) {
    defineBlocks();
    if (!ws || !Blockly.Blocks[type]) return null;
    const b = ws.newBlock(type);
    b.initSvg();
    b.render();
    const at = viewAnchor();
    const px = x ?? at.x;
    const py = y ?? at.y;
    const cur = b.getRelativeToSurfaceXY();
    b.moveBy(px - cur.x, py - cur.y);
    state.dirty = true;
    CineHost.emit("graph:select", blockToNode(b));
    return blockToNode(b);
  }

  function draw() {
    if (ws) Blockly.svgResize(ws);
  }
  function fit() {
    if (!ws) return;
    if (ws.zoomToFit) ws.zoomToFit();
    else if (ws.scrollCenter) ws.scrollCenter();
  }
  function removeSelected() {
    if (!ws) return;
    const sel = Blockly.getSelected && Blockly.getSelected();
    if (sel) sel.dispose(true, true);
    state.dirty = true;
  }
  function undo() { if (ws) ws.undo(false); }
  function redo() { if (ws) ws.undo(true); }
  function addPin() {}
  function removePin() {}
  function renamePin() {}
  function movePin() {}
  function flushCurrent() {
    pullFromWorkspace();
    const bag = { nodes: state.nodes, links: state.links, variables: state.variables, comments: state.comments };
    if (state.workspace === "instance") state.instanceGraph = bag;
    else if (state.workspace === "mode") state.modeGraph = bag;
    else {
      const lv = state.levels.find((x) => x.id === state.levelId);
      if (lv) Object.assign(lv, bag);
    }
  }
  function switchLevel(id) {
    flushCurrent();
    const lv = state.levels.find((x) => x.id === id);
    if (!lv) return;
    state.levelId = id;
    state.workspace = "scene";
    pushToWorkspace(lv);
  }
  function addLevel(name) {
    flushCurrent();
    const lv = { id: uid("lv"), name: name || "场景", nodes: [], links: [], variables: [] };
    state.levels.push(lv);
    state.levelId = lv.id;
    state.workspace = "scene";
    pushToWorkspace(lv);
    state.dirty = true;
  }
  function switchSpace(kind) {
    flushCurrent();
    state.workspace = kind;
    if (kind === "instance") pushToWorkspace(state.instanceGraph);
    else if (kind === "mode") pushToWorkspace(state.modeGraph);
    else {
      const lv = state.levels.find((x) => x.id === state.levelId) || state.levels[0];
      pushToWorkspace(lv || { nodes: [], links: [] });
    }
  }
  function wrapComment() {}
  function copySelection() {
    document.execCommand && document.execCommand("copy");
  }
  function pasteClipboard() {
    if (ws && Blockly.clipboard && Blockly.clipboard.paste) Blockly.clipboard.paste();
  }
  function saveAsMacro() { return null; }
  function saveAsFunction() { return null; }
  function placeLibrary() {}
  function refreshLang() {
    if (!ws) return;
    const pack = serialize();
    registered = false;
    defineBlocks();
    if (window.CineToolbox && ws.updateToolbox) ws.updateToolbox(CineToolbox());
    pushToWorkspace(pack);
  }

  return { state, addNode, load, serialize, draw, bind, fit, removeSelected, undo, redo, addPin, removePin, renamePin, movePin, switchLevel, addLevel, switchSpace, pinsOf, wrapComment, copySelection, pasteClipboard, saveAsMacro, saveAsFunction, placeLibrary, refreshLang };
})();
window.Graph = Graph;
