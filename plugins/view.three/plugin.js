/* bundled view.three — uses CineHost.viewport3d */
(function () {
  var PID = "view.three";
  var TYPES = {
    stage: "view.three.stage",
    model: "view.three.model",
    light: "view.three.light",
    material: "view.three.material",
    clip: "view.three.clip",
    camera: "view.three.camera",
    present: "view.three.present",
  };
  var selected = null;
  var dock = null;
  var viewer = null;

  function zh() { return (window.uiLang || "zh") !== "en"; }
  function go(ctx, sock) {
    if (!ctx || !ctx.enter || !ctx.follow) return;
    var nxt = null;
    try { nxt = ctx.follow(sock); if (nxt && typeof nxt === "object") { ctx.enter(nxt); return; } } catch (e1) {}
    try { if (ctx.node) nxt = ctx.follow(ctx.node.id, sock); } catch (e2) {}
    ctx.enter(nxt || null);
  }
  function resolveUrl(data, ctx) {
    data = data || {};
    if (data.assetId) return (ctx && ctx.media) ? ctx.media(data.assetId) : CineHost.assetUrl(data.assetId);
    return String(data.url || "").trim();
  }
  function css(n, s) { n.style.cssText = s; return n; }
  function el(t, s, x) { var n = document.createElement(t); if (s) n.style.cssText = s; if (x != null) n.textContent = x; return n; }
  function inp(type, val) {
    var n = el("input", "background:#10161d;border:1px solid #2a3844;color:#e7eef4;border-radius:6px;padding:5px 7px;font:12px ui-monospace,monospace;width:100%");
    n.type = type || "text"; n.value = val == null ? "" : val; return n;
  }
  function btn(label) {
    var n = el("button", "background:#1d2a33;border:1px solid #355;color:#d9f3ee;border-radius:6px;padding:5px 9px;cursor:pointer;font:12px ui-sans-serif,system-ui");
    n.type = "button"; n.textContent = label; return n;
  }

  function ensureDock() {
    if (CineHost.view3dDock) {
      dock = CineHost.view3dDock.mount();
      viewer = CineHost.view3dDock.viewer();
      if (dock && dock.root) dock.root.style.display = "";
      return dock;
    }
    if (dock && document.body.contains(dock.root)) return dock;
    var root = css(el("section"), "display:flex;flex-direction:column;gap:8px;margin:0 0 10px;padding:10px;border:1px solid #1f3a42;background:#0a1014;border-radius:10px;color:#d7e6e2");
    root.id = "view-three-dock";
    var view = css(el("div"), "height:220px;border-radius:8px;overflow:hidden;background:#07090d;border:1px solid #163038");
    var meta = el("div", "font:11px ui-monospace,monospace;opacity:.8");
    var src = inp("text", "");
    src.placeholder = "https://….glb|.fbx  or asset id";
    var lightsBox = el("div", "display:flex;flex-direction:column;gap:6px");
    var matsBox = el("div", "display:flex;flex-direction:column;gap:6px");
    var clipBox = el("div", "display:flex;flex-wrap:wrap;gap:6px");
    var tools = css(el("div"), "display:flex;flex-wrap:wrap;gap:6px");
    var loadBtn = btn(zh() ? "加载" : "Load");
    var fileBtn = btn(zh() ? "本地 GLB/FBX" : "Local file");
    var file = document.createElement("input");
    file.type = "file"; file.accept = ".glb,.gltf,.fbx"; file.hidden = true;
    tools.appendChild(loadBtn); tools.appendChild(fileBtn); tools.appendChild(btn(zh() ? "框住" : "Frame"));
    root.appendChild(el("strong", "letter-spacing:.08em", zh() ? "三维预览" : "3D PREVIEW"));
    root.appendChild(view); root.appendChild(meta);
    root.appendChild(src); root.appendChild(tools); root.appendChild(file);
    root.appendChild(el("div", "opacity:.7;font:11px ui-sans-serif", zh() ? "棚灯" : "Lights"));
    root.appendChild(lightsBox);
    root.appendChild(el("div", "opacity:.7;font:11px ui-sans-serif", zh() ? "材质" : "Materials"));
    root.appendChild(matsBox);
    root.appendChild(el("div", "opacity:.7;font:11px ui-sans-serif", zh() ? "动画" : "Clips"));
    root.appendChild(clipBox);
    var parent = document.getElementById("inspector") || document.querySelector("[data-pane=inspector]");
    if (parent) parent.insertBefore(root, parent.firstChild);
    else { css(root, root.style.cssText + ";position:fixed;right:12px;top:72px;width:320px;max-height:calc(100vh - 90px);overflow:auto;z-index:40"); document.body.appendChild(root); }
    dock = { root: root, view: view, meta: meta, src: src, lightsBox: lightsBox, matsBox: matsBox, clipBox: clipBox };
    if (CineHost.viewport3d) {
      viewer = CineHost.viewport3d.create(view);
      viewer.onInfo = renderInfo;
      renderLights();
    }
    loadBtn.onclick = function () { applySrc(src.value.trim()); loadNow(src.value.trim()); };
    fileBtn.onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files && file.files[0]; if (!f) return;
      var url = URL.createObjectURL(f);
      src.value = url;
      var ext = (f.name.split(".").pop() || "").toLowerCase();
      loadNow(url, ext);
      if (CineHost.toast) CineHost.toast(zh() ? "本地预览不入库，请导入为 .aioassets" : "Local preview is session-only. Import as .aioassets.");
    };
    tools.lastChild.onclick = function () {
      if (viewer && viewer.model) viewer.setCamera("iso", 40);
    };
    return dock;
  }

  function goldSwitch(on) {
    var sw = el("button");
    sw.type = "button";
    sw.className = "gold-sw" + (on ? " on" : "");
    sw.innerHTML = "<i></i>";
    return sw;
  }

  function renderLights() {
    if (!dock || !viewer) return;
    dock.lightsBox.innerHTML = "";
    (viewer.lightsData || []).forEach(function (L) {
      var card = el("div");
      card.className = "lite-card";
      var head = el("div");
      head.className = "lite-head";
      var sw = goldSwitch(L.enabled !== false);
      var name = el("strong", "", L.id);
      var col = inp("color", L.color || "#ffffff");
      col.className = "lite-col";
      head.appendChild(sw);
      head.appendChild(name);
      head.appendChild(col);
      function row(label, key, min, max, step) {
        var wrap = el("div");
        wrap.className = "lite-row";
        var lab = el("span", "", label);
        var range = document.createElement("input");
        range.type = "range";
        range.min = String(min); range.max = String(max); range.step = String(step);
        range.value = String(L[key] == null ? 0 : L[key]);
        var num = inp("number", L[key] == null ? 0 : L[key]);
        num.step = String(step);
        range.oninput = function () { num.value = range.value; patchLight(L.id, key, Number(range.value)); };
        num.onchange = function () { range.value = num.value; patchLight(L.id, key, Number(num.value)); };
        wrap.appendChild(lab); wrap.appendChild(range); wrap.appendChild(num);
        return wrap;
      }
      card.appendChild(head);
      card.appendChild(row(zh() ? "亮度" : "Lux", "intensity", 0, 4, 0.05));
      card.appendChild(row("X", "x", -12, 12, 0.1));
      card.appendChild(row("Y", "y", -12, 12, 0.1));
      card.appendChild(row("Z", "z", -12, 12, 0.1));
      var rotLab = el("div", "color:#8b8373;font:10px ui-sans-serif", zh() ? "旋转 RX / RY / RZ" : "RX / RY / RZ");
      var rot = el("div");
      rot.className = "lite-rot";
      ["rx","ry","rz"].forEach(function (k) {
        var i = inp("number", L[k] || 0); i.step = "1"; i.title = k;
        i.onchange = function () { patchLight(L.id, keyName(k), Number(i.value)); };
        rot.appendChild(i);
      });
      function keyName(k) { return k; }
      card.appendChild(rotLab);
      card.appendChild(rot);
      sw.onclick = function () {
        var next = !sw.classList.contains("on");
        sw.classList.toggle("on", next);
        patchLight(L.id, "enabled", next);
      };
      col.oninput = function () { patchLight(L.id, "color", col.value); };
      dock.lightsBox.appendChild(card);
    });
  }

  function patchLight(id, key, val) {
    if (!viewer) return;
    var spec = viewer.updateLight(id, (function () { var o = {}; o[key] = val; return o; })());
    writeNode({ lightId: id, lights: viewer.lightsData });
    return spec;
  }

  function renderInfo(info) {
    if (!dock) return;
    info = info || {};
    dock.meta.textContent = info.status === "fail" ? ("失败 " + (info.error || "")) :
      ((info.ext || "") + " · " + (info.mats || []).length + " mats · " + (info.clips || []).length + " clips");
    dock.matsBox.innerHTML = "";
    (info.mats || []).forEach(function (m) {
      var row = css(el("div"), "display:grid;grid-template-columns:1fr 28px 1fr 1fr;gap:4px");
      var name = btn(m.slot);
      var color = inp("color", m.color || "#fff");
      var metal = inp("number", m.metalness != null ? m.metalness : 0.2); metal.step = "0.05";
      var rough = inp("number", m.roughness != null ? m.roughness : 0.5); rough.step = "0.05";
      function apply() {
        var spec = { slot: m.slot, color: color.value, metalness: metal.value, roughness: rough.value };
        if (viewer) viewer.applyMaterial(spec);
        writeNode(spec);
      }
      name.onclick = function () { writeNode({ slot: m.slot }); };
      color.oninput = apply; metal.onchange = apply; rough.onchange = apply;
      row.appendChild(name); row.appendChild(color); row.appendChild(metal); row.appendChild(rough);
      dock.matsBox.appendChild(row);
    });
    dock.clipBox.innerHTML = "";
    (info.clips || []).forEach(function (c) {
      var b = btn(c.name || "clip");
      b.onclick = function () { if (viewer) viewer.playClip(c.name, "loop", 1); writeNode({ clip: c.name }); };
      dock.clipBox.appendChild(b);
    });
  }

  function writeNode(patch) {
    if (!selected) return;
    selected.data = selected.data || {};
    Object.keys(patch).forEach(function (k) { selected.data[k] = patch[k]; });
    if (window.Graph && Graph.state) Graph.state.dirty = true;
  }
  function applySrc(value) {
    if (!selected) return;
    selected.data = selected.data || {};
    if (/^[a-z0-9_-]{6,}$/i.test(value) && value.indexOf("://") < 0 && value.indexOf("blob:") < 0) {
      selected.data.assetId = value; selected.data.url = "";
    } else selected.data.url = value;
  }
  function loadNow(src, ext) {
    ensureDock();
    var url = src || "";
    if (url && url.indexOf("://") < 0 && url.indexOf("blob:") !== 0 && url.charAt(0) !== "/") url = CineHost.assetUrl(url);
    if (!viewer && CineHost.viewport3d) viewer = CineHost.viewport3d.create(dock.view);
    if (!viewer) return;
    viewer.onInfo = renderInfo;
    return viewer.load(url, ext || (CineHost.guessModelExt && CineHost.guessModelExt(url))).then(function () {
      if (selected && selected.data) {
        if (selected.type === TYPES.stage) viewer.setStage(selected.data);
        if (selected.type === TYPES.model) viewer.applyTransform(selected.data);
        if (selected.type === TYPES.material) viewer.applyMaterial(selected.data);
        if (selected.type === TYPES.clip) viewer.playClip(selected.data.clip, selected.data.loop, selected.data.speed);
        if (selected.type === TYPES.light && selected.data.lights) viewer.setLights(selected.data.lights);
        if (selected.type === TYPES.camera) viewer.setCamera(selected.data.preset, selected.data.fov);
        renderLights();
      }
    });
  }

  function onSelect(node) {
    selected = node;
    var is3d = !!(node && String(node.type || "").indexOf("view.three.") === 0);
    if (!is3d) {
      if (dock && dock.root) dock.root.style.display = "none";
      return;
    }
    ensureDock();
    if (dock && dock.root) dock.root.style.display = "";
    var data = node.data || {};
    if (dock) dock.src.value = data.url || data.assetId || "";
    loadNow(data.url || data.assetId || "");
  }

  CineHost.definePlugin({
    id: PID,
    onLoad: function () {
      if (CineHost.on) CineHost.on("graph:select", onSelect);
      if (CineHost.registerAction) {
        CineHost.registerAction({
          id: "view.three.toggle",
          slot: "top-actions",
          label: zh() ? "三维预览" : "3D Preview",
          icon: "fa-cube",
          onClick: function () {
            var d = ensureDock();
            if (d && d.root) d.root.style.display = "";
            if (viewer && viewer._resize) viewer._resize();
          },
        });
      }
      if (CineHost.log) CineHost.log("output", "view.three bundled on viewport3d");
    },
  });

  function node(def) { CineHost.registerNodeType(def); }
  node({
    type: TYPES.stage, title: "三维舞台", title_en: "3D Stage", category: "viewport",
    icon: "fa-border-all", color: "#38bdf8",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "bg", label: "背景色", label_en: "Background", default: "#0b1118" },
      { id: "grid", label: "网格 1/0", label_en: "Grid", default: "1" },
    ],
  });
  node({
    type: TYPES.model, title: "加载三维模型", title_en: "Load 3D Model", category: "viewport",
    icon: "fa-cube", color: "#2dd4bf",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }, { id: "fail", label: "失败", label_en: "Fail", kind: "exec" }],
    fields: [
      { id: "url", label: "GLB/glTF/FBX 地址", label_en: "URL", default: "" },
      { id: "assetId", label: "资源库 ID", label_en: "Asset id", default: "" },
      { id: "x", label: "X", default: 0 }, { id: "y", label: "Y", default: 0 }, { id: "z", label: "Z", default: 0 },
      { id: "rx", label: "旋转X", default: 0 }, { id: "ry", label: "旋转Y", default: 0 }, { id: "rz", label: "旋转Z", default: 0 },
      { id: "scale", label: "缩放", default: 1 },
    ],
    tooltip: "支持 GLB / glTF / FBX。FBX 可带骨骼动画。选中后右侧预览。",
  });
  node({
    type: TYPES.light, title: "三维灯光", title_en: "3D Light", category: "viewport",
    icon: "fa-lightbulb", color: "#fbbf24",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "lightId", label: "灯 key/fill/rim/hemi/ambient", label_en: "Light id", default: "key" },
      { id: "enabled", label: "开启 1/0", default: "1" },
      { id: "intensity", label: "亮度", default: 1.6 },
      { id: "color", label: "颜色", default: "#fff4e5" },
      { id: "x", label: "位置X", default: 4 }, { id: "y", label: "位置Y", default: 8 }, { id: "z", label: "位置Z", default: 3 },
      { id: "rx", label: "旋转X", default: -40 }, { id: "ry", label: "旋转Y", default: 25 }, { id: "rz", label: "旋转Z", default: 0 },
    ],
    tooltip: "预置棚灯：key / fill / rim / hemi / ambient。亮度、位置、旋转都可调。",
    tooltip_en: "Studio lights. Intensity, position and rotation are live.",
  });
  node({
    type: TYPES.material, title: "三维材质", title_en: "3D Material", category: "viewport",
    icon: "fa-fill-drip", color: "#f59e0b",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    fields: [
      { id: "slot", label: "材质槽 *", default: "*" },
      { id: "color", label: "颜色", default: "#2dd4bf" },
      { id: "emissive", label: "自发光", default: "#000000" },
      { id: "metalness", label: "金属度", default: 0.35 },
      { id: "roughness", label: "粗糙度", default: 0.45 },
      { id: "opacity", label: "不透明度", default: 1 },
      { id: "wireframe", label: "线框 0/1", default: "0" },
    ],
  });
  node({
    type: TYPES.clip, title: "播放骨骼动画", title_en: "Play Clip", category: "viewport",
    icon: "fa-film", color: "#a78bfa",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    tooltip: "播放已加载模型上的骨骼动画片段。", tooltip_en: "Play a skeletal clip on the loaded model.",
    fields: [
      { id: "clip", label: "片段名", default: "" },
      { id: "loop", label: "loop/once", default: "loop" },
      { id: "speed", label: "速度", default: 1 },
    ],
  });
  node({
    type: TYPES.camera, title: "三维相机", title_en: "3D Camera", category: "camera",
    icon: "fa-video", color: "#818cf8",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    tooltip: "切换预览相机机位：等轴 / 正面 / 侧面 / 顶视，并设定视角。", tooltip_en: "Switch preview camera: iso, front, side, top.",
    fields: [
      { id: "preset", label: "iso/front/side/top", default: "iso" },
      { id: "fov", label: "FOV", default: 40 },
    ],
  });
  node({
    type: TYPES.present, title: "呈现三维镜头", title_en: "Present 3D Beat", category: "viewport",
    icon: "fa-expand", color: "#fb7185",
    inputs: [{ id: "in", label: "执行", label_en: "Exec", kind: "exec" }],
    outputs: [{ id: "out", label: "然后", label_en: "Then", kind: "exec" }],
    tooltip: "把当前三维镜头呈现到播放层，可附字幕与动画。", tooltip_en: "Present the current 3D beat on the play layer.",
    fields: [
      { id: "url", label: "地址", default: "" },
      { id: "assetId", label: "资源 ID", default: "" },
      { id: "caption", label: "字幕", default: "" },
      { id: "clip", label: "动画", default: "" },
    ],
  });

  CineHost.registerExecutor(TYPES.stage, function (ctx) {
    if (viewer) viewer.setStage(ctx.data || {});
    if (ctx.say) ctx.say(zh() ? "舞台就绪（已开棚灯）" : "Stage ready");
    go(ctx, "out");
  });
  CineHost.registerExecutor(TYPES.model, function (ctx) {
    var url = resolveUrl(ctx.data, ctx);
    ensureDock();
    loadNow(url).then(function () {
      if (viewer) viewer.applyTransform(ctx.data || {});
      if (!url) go(ctx, "fail");
      else if (ctx.waitClick) ctx.waitClick(function () { go(ctx, "out"); });
      else go(ctx, "out");
    });
  });
  CineHost.registerExecutor(TYPES.light, function (ctx) {
    var d = ctx.data || {};
    ensureDock();
    if (viewer) {
      viewer.updateLight(d.lightId || "key", {
        enabled: d.enabled !== "0",
        intensity: Number(d.intensity || 1),
        color: d.color,
        x: Number(d.x || 0), y: Number(d.y || 0), z: Number(d.z || 0),
        rx: Number(d.rx || 0), ry: Number(d.ry || 0), rz: Number(d.rz || 0),
      });
      renderLights();
    }
    if (ctx.say) ctx.say((d.lightId || "key") + "  " + (d.intensity || ""));
    go(ctx, "out");
  });
  CineHost.registerExecutor(TYPES.material, function (ctx) {
    var n = viewer ? viewer.applyMaterial(ctx.data || {}) : 0;
    if (ctx.say) ctx.say("mats x" + n);
    go(ctx, "out");
  });
  CineHost.registerExecutor(TYPES.clip, function (ctx) {
    var d = ctx.data || {};
    var ok = viewer ? viewer.playClip(d.clip, d.loop, d.speed) : false;
    if (ctx.say) ctx.say(ok ? d.clip || "clip" : "no clip");
    if (ctx.waitClick) ctx.waitClick(function () { go(ctx, "out"); });
    else go(ctx, "out");
  });
  CineHost.registerExecutor(TYPES.camera, function (ctx) {
    if (viewer) viewer.setCamera((ctx.data || {}).preset, (ctx.data || {}).fov);
    go(ctx, "out");
  });
  CineHost.registerExecutor(TYPES.present, function (ctx) {
    var data = ctx.data || {};
    var wrap = document.getElementById("view-three-player");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "view-three-player";
      wrap.style.cssText = "position:absolute;inset:0;z-index:5;background:#07090d";
      var hostEl = (ctx.ui && ctx.ui.video && ctx.ui.video.parentElement) || document.body;
      hostEl.appendChild(wrap);
    }
    wrap.innerHTML = "";
    var view = document.createElement("div");
    view.style.cssText = "height:100%";
    wrap.appendChild(view);
    var pv = CineHost.viewport3d.create(view);
    pv.load(resolveUrl(data, ctx)).then(function () {
      if (data.clip) pv.playClip(data.clip, "loop", 1);
      if (ctx.say && data.caption) ctx.say(data.caption);
      if (ctx.waitClick) ctx.waitClick(function () { pv.dispose(); wrap.remove(); go(ctx, "out"); });
      else go(ctx, "out");
    });
  });
})();
