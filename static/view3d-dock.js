/* Engine-owned 3D details dock. Not loaded from user plugins. */
(function () {
  var STYLE = `
  #v3dDock{font:12px/1.4 ui-sans-serif,system-ui;color:#d8d0c4;background:#12110e;border:1px solid #3a3220;border-radius:10px;margin:0 0 10px;overflow:hidden}
  #v3dDock *{box-sizing:border-box}
  #v3dDock .hd{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:linear-gradient(180deg,#1b1710,#12100c);border-bottom:1px solid #3a3220;color:#e7c07a;letter-spacing:.08em;font-size:11px;font-weight:700}
  #v3dDock .stage{position:relative;width:100%;padding-top:62.5%;background:#07090d}
  #v3dDock .stage-in{position:absolute;inset:0;overflow:hidden}
  #v3dDock .stage-in canvas{display:block}
  #v3dDock .meta{padding:4px 10px;color:#8b8373;font:11px ui-monospace,monospace;border-bottom:1px solid #2a2418}
  #v3dDock .tools{display:flex;gap:6px;padding:8px 10px;flex-wrap:wrap;border-bottom:1px solid #2a2418}
  #v3dDock .tools input[type=text]{flex:1;min-width:120px;background:#0b0a08;border:1px solid #3a3220;color:#ece7d8;border-radius:6px;padding:6px 8px}
  #v3dDock .gb{background:#1a1610;border:1px solid #c9a227;color:#e7c07a;border-radius:6px;padding:5px 9px;cursor:pointer;font:11px ui-sans-serif}
  #v3dDock .gb:hover{background:#2a2214}
  #v3dDock .sec{border-bottom:1px solid #2a2418}
  #v3dDock .sec > b{display:block;padding:7px 10px;background:#18140f;color:#c9a227;font-size:10px;letter-spacing:.1em}
  #v3dDock .actor{border-top:1px solid #2a2418}
  #v3dDock .actor-h{display:grid;grid-template-columns:22px 1fr 28px;gap:8px;align-items:center;padding:6px 10px;cursor:pointer}
  #v3dDock .actor-h:hover{background:#1a1610}
  #v3dDock .box{width:16px;height:16px;border:1px solid #c9a227;border-radius:3px;background:#0b0a08;display:grid;place-items:center;color:#e7c07a;font-size:11px;line-height:1}
  #v3dDock .box.on{background:#3a2e14}
  #v3dDock .sw{width:28px;height:16px;padding:0;border:1px solid #c9a227;background:none;border-radius:3px}
  #v3dDock .prop{display:grid;grid-template-columns:64px 1fr 48px;gap:6px;align-items:center;padding:3px 10px 3px 32px;color:#8b8373}
  #v3dDock .prop input[type=range]{accent-color:#e7c07a;width:100%}
  #v3dDock .prop input[type=number]{width:48px;background:#0b0a08;border:1px solid #3a3220;color:#ece7d8;border-radius:4px;padding:3px 4px;font:11px ui-monospace,monospace}
  #v3dDock .xyz{display:grid;grid-template-columns:64px repeat(3,1fr);gap:4px;padding:3px 10px 8px 32px}
  #v3dDock .xyz input{background:#0b0a08;border:1px solid #3a3220;color:#ece7d8;border-radius:4px;padding:4px;font:11px ui-monospace,monospace;width:100%}
  `;

  var dock = null;
  var viewer = null;
  var openId = "key";

  function zh() { return (window.uiLang || "zh") !== "en"; }

  function mount(parent) {
    if (dock && document.body.contains(dock.root)) {
      dock.root.style.display = "";
      if (viewer && viewer._resize) viewer._resize();
      return dock;
    }
    if (!document.getElementById("v3dDockCss")) {
      var st = document.createElement("style");
      st.id = "v3dDockCss";
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    var root = document.createElement("section");
    root.id = "v3dDock";
    root.innerHTML =
      '<div class="hd"><span>' + (zh() ? "三维预览" : "3D PREVIEW") + '</span></div>' +
      '<div class="stage"><div class="stage-in" id="v3dStage"></div></div>' +
      '<div class="meta" id="v3dMeta">—</div>' +
      '<div class="tools">' +
        '<input id="v3dSrc" type="text" placeholder="https://…glb / fbx  or asset id" />' +
        '<button type="button" class="gb" id="v3dLoad">' + (zh() ? "加载" : "Load") + '</button>' +
        '<button type="button" class="gb" id="v3dFile">' + (zh() ? "本地" : "File") + '</button>' +
        '<button type="button" class="gb" id="v3dFrame">' + (zh() ? "框住" : "Frame") + '</button>' +
        '<input id="v3dPick" type="file" accept=".glb,.gltf,.fbx" hidden />' +
      '</div>' +
      '<div class="sec"><b>' + (zh() ? "细节 · 棚灯" : "DETAILS · LIGHTS") + '</b><div id="v3dLights"></div></div>' +
      '<div class="sec"><b>' + (zh() ? "材质" : "MATERIALS") + '</b><div id="v3dMats"></div></div>' +
      '<div class="sec"><b>' + (zh() ? "动画" : "CLIPS") + '</b><div id="v3dClips"></div></div>';

    parent = parent || document.getElementById("inspector") || document.querySelector("[data-pane=inspector]");
    if (parent) parent.insertBefore(root, parent.firstChild);
    else document.body.appendChild(root);

    var view = root.querySelector("#v3dStage");
    dock = {
      root: root,
      view: view,
      meta: root.querySelector("#v3dMeta"),
      src: root.querySelector("#v3dSrc"),
      lightsBox: root.querySelector("#v3dLights"),
      matsBox: root.querySelector("#v3dMats"),
      clipBox: root.querySelector("#v3dClips"),
    };
    if (CineHost.viewport3d) {
      viewer = CineHost.viewport3d.create(view);
      viewer.onInfo = renderInfo;
    }
    root.querySelector("#v3dLoad").onclick = function () {
      var v = dock.src.value.trim();
      if (viewer) viewer.load(v);
    };
    root.querySelector("#v3dFile").onclick = function () { root.querySelector("#v3dPick").click(); };
    root.querySelector("#v3dPick").onchange = function () {
      var f = this.files && this.files[0];
      if (!f || !viewer) return;
      var url = URL.createObjectURL(f);
      dock.src.value = url;
      viewer.load(url, (f.name.split(".").pop() || "").toLowerCase());
    };
    root.querySelector("#v3dFrame").onclick = function () {
      if (viewer) viewer.setCamera("iso", 40);
    };
    renderLights();
    return dock;
  }

  function renderLights() {
    if (!dock || !viewer) return;
    var box = dock.lightsBox;
    box.innerHTML = "";
    (viewer.lightsData || []).forEach(function (L) {
      var actor = document.createElement("div");
      actor.className = "actor";
      var head = document.createElement("div");
      head.className = "actor-h";
      var ck = document.createElement("button");
      ck.type = "button";
      ck.className = "box" + (L.enabled !== false ? " on" : "");
      ck.textContent = L.enabled !== false ? "✓" : "";
      var name = document.createElement("span");
      name.textContent = L.id;
      name.style.color = "#ece7d8";
      var col = document.createElement("input");
      col.type = "color";
      col.className = "sw";
      col.value = L.color || "#ffffff";
      head.appendChild(ck);
      head.appendChild(name);
      head.appendChild(col);
      actor.appendChild(head);
      var body = document.createElement("div");
      body.style.display = openId === L.id ? "block" : "none";
      function prop(label, key, min, max, step) {
        var row = document.createElement("label");
        row.className = "prop";
        row.appendChild(document.createTextNode(label));
        var range = document.createElement("input");
        range.type = "range";
        range.min = min; range.max = max; range.step = step;
        range.value = L[key] == null ? 0 : L[key];
        var num = document.createElement("input");
        num.type = "number";
        num.step = step;
        num.value = L[key] == null ? 0 : L[key];
        range.oninput = function () {
          num.value = range.value;
          viewer.updateLight(L.id, (function () { var o = {}; o[key] = Number(range.value); return o; })());
        };
        num.onchange = function () {
          range.value = num.value;
          viewer.updateLight(L.id, (function () { var o = {}; o[key] = Number(num.value); return o; })());
        };
        row.appendChild(range);
        row.appendChild(num);
        body.appendChild(row);
      }
      prop(zh() ? "亮度" : "Intensity", "intensity", 0, 4, 0.05);
      function xyz(label, keys) {
        var row = document.createElement("div");
        row.className = "xyz";
        var lab = document.createElement("span");
        lab.textContent = label;
        lab.style.color = "#8b8373";
        row.appendChild(lab);
        keys.forEach(function (k) {
          var n = document.createElement("input");
          n.type = "number";
          n.step = "0.1";
          n.value = L[k] == null ? 0 : L[k];
          n.title = k;
          n.onchange = function () {
            viewer.updateLight(L.id, (function () { var o = {}; o[k] = Number(n.value); return o; })());
          };
          row.appendChild(n);
        });
        body.appendChild(row);
      }
      xyz(zh() ? "位置" : "Location", ["x", "y", "z"]);
      xyz(zh() ? "旋转" : "Rotation", ["rx", "ry", "rz"]);
      actor.appendChild(body);
      ck.onclick = function (ev) {
        ev.stopPropagation();
        var on = !ck.classList.contains("on");
        ck.classList.toggle("on", on);
        ck.textContent = on ? "✓" : "";
        viewer.updateLight(L.id, { enabled: on });
      };
      col.onclick = function (ev) { ev.stopPropagation(); };
      col.oninput = function () { viewer.updateLight(L.id, { color: col.value }); };
      head.onclick = function () {
        openId = openId === L.id ? "" : L.id;
        renderLights();
      };
      box.appendChild(actor);
    });
  }

  function renderInfo(info) {
    if (!dock) return;
    info = info || {};
    dock.meta.textContent = (info.ext || "car") + " · " + ((info.mats || []).length) + " mats · " + ((info.clips || []).length) + " clips";
    dock.matsBox.innerHTML = "";
    (info.mats || []).forEach(function (m) {
      var d = document.createElement("div");
      d.className = "prop";
      d.textContent = (m.slot || "mat") + "  " + (m.color || "");
      dock.matsBox.appendChild(d);
    });
    dock.clipBox.innerHTML = "";
    (info.clips || []).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gb";
      b.textContent = c.name || "clip";
      b.onclick = function () { if (viewer) viewer.playClip(c.name, "loop", 1); };
      dock.clipBox.appendChild(b);
    });
  }

  CineHost.view3dDock = {
    mount: mount,
    get: function () { return dock; },
    viewer: function () { return viewer; },
    renderLights: renderLights,
  };
})();
