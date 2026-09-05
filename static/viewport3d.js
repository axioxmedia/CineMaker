/* Engine 3D viewport — classic script THREE, no ESM / import map. */
(function () {
  var THREE_SRC = "/assets/vendor/three/legacy/three.min.js";
  var lib = null;
  var loadErr = "";
  var instance = null;

  var DEFAULT_LIGHTS = [
    { id: "hemi", type: "hemisphere", enabled: true, intensity: 0.9, color: "#c7d8ff", ground: "#1a1510", x: 0, y: 1, z: 0, rx: 0, ry: 0, rz: 0 },
    { id: "key", type: "directional", enabled: true, intensity: 1.6, color: "#fff4e5", x: 4, y: 8, z: 3, rx: -40, ry: 25, rz: 0 },
    { id: "fill", type: "directional", enabled: true, intensity: 0.45, color: "#88aaff", x: -5, y: 2, z: -2, rx: -10, ry: -30, rz: 0 },
    { id: "rim", type: "directional", enabled: true, intensity: 0.7, color: "#ffe0c0", x: -2, y: 6, z: -6, rx: -20, ry: 160, rz: 0 },
    { id: "ambient", type: "ambient", enabled: true, intensity: 0.12, color: "#ffffff", x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
  ];

  function cloneLights(src) {
    return JSON.parse(JSON.stringify(src || DEFAULT_LIGHTS));
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.THREE && src.indexOf("three.min") >= 0) return resolve(window.THREE);
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(window.THREE); };
      s.onerror = function () { reject(new Error("script 404 " + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureLib() {
    if (lib && lib.THREE) return Promise.resolve(lib);
    return loadScript(THREE_SRC).then(function (THREE) {
      if (!THREE) throw new Error("window.THREE missing after " + THREE_SRC);
      lib = { THREE: THREE, GLTFLoader: null, FBXLoader: null, OrbitControls: null };
      if (CineHost.registerModelLoader) {
        CineHost.registerModelLoader({ ext: "glb", label: "glTF Binary" });
        CineHost.registerModelLoader({ ext: "gltf", label: "glTF" });
        CineHost.registerModelLoader({ ext: "fbx", label: "FBX" });
      }
      if (CineHost.log) CineHost.log("output", "viewport3d three.min.js ready");
      return lib;
    }).catch(function (err) {
      loadErr = String(err && err.message ? err.message : err);
      if (CineHost.log) CineHost.log("message", "viewport3d load fail " + loadErr);
      throw err;
    });
  }

  function makeCar(THREE) {
    var root = new THREE.Group();
    root.name = "default-car";
    var paint = new THREE.MeshStandardMaterial({ color: 0xc45c32, metalness: 0.35, roughness: 0.42 });
    var dark = new THREE.MeshStandardMaterial({ color: 0x1a1d22, metalness: 0.6, roughness: 0.35 });
    var glass = new THREE.MeshStandardMaterial({ color: 0x88c8e0, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.55 });
    var chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 0.85, roughness: 0.18 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 0.92), paint);
    body.position.y = 0.38;
    body.name = "body";
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 0.84), glass);
    cabin.position.set(-0.12, 0.72, 0);
    cabin.name = "cabin";
    var hood = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.88), paint);
    hood.position.set(0.62, 0.56, 0);
    var bumper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.94), chrome);
    bumper.position.set(0.95, 0.28, 0);
    var lightL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.16), new THREE.MeshStandardMaterial({ color: 0xfff4cc, emissive: 0xffeeaa, emissiveIntensity: 0.8 }));
    lightL.position.set(0.98, 0.4, 0.28);
    var lightR = lightL.clone();
    lightR.position.z = -0.28;
    function wheel(x, z) {
      var g = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16);
      var m = new THREE.Mesh(g, dark);
      m.rotation.z = Math.PI / 2;
      m.position.set(x, 0.22, z);
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.17, 12), chrome);
      cap.rotation.z = Math.PI / 2;
      cap.position.copy(m.position);
      root.add(m);
      root.add(cap);
    }
    wheel(0.58, 0.48);
    wheel(0.58, -0.48);
    wheel(-0.58, 0.48);
    wheel(-0.58, -0.48);
    root.add(body);
    root.add(cabin);
    root.add(hood);
    root.add(bumper);
    root.add(lightL);
    root.add(lightR);
    return root;
  }

  function bindOrbit(camera, canvas, target) {
    var state = { down: false, lx: 0, ly: 0, theta: 0.9, phi: 0.7, dist: 4.2 };
    function apply() {
      camera.position.set(
        target.x + state.dist * Math.sin(state.theta) * Math.sin(state.phi),
        target.y + state.dist * Math.cos(state.phi),
        target.z + state.dist * Math.cos(state.theta) * Math.sin(state.phi)
      );
      camera.lookAt(target);
    }
    apply();
    canvas.addEventListener("pointerdown", function (e) {
      state.down = true;
      state.lx = e.clientX;
      state.ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointerup", function () { state.down = false; });
    canvas.addEventListener("pointermove", function (e) {
      if (!state.down) return;
      state.theta -= (e.clientX - state.lx) * 0.01;
      state.phi = Math.min(1.45, Math.max(0.12, state.phi + (e.clientY - state.ly) * 0.01));
      state.lx = e.clientX;
      state.ly = e.clientY;
      apply();
    });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      state.dist = Math.min(18, Math.max(1.6, state.dist + e.deltaY * 0.01));
      apply();
    }, { passive: false });
    return { update: apply, target: target, state: state };
  }

  function Viewport(host) {
    this.host = host;
    this.lightsData = cloneLights();
    this.lightObjs = {};
    this.clips = [];
    this.mats = [];
    this.model = null;
    this.mixer = null;
    this.onInfo = null;
    this.pendingUrl = "";
    this.pendingExt = "";
    var self = this;
    ensureLib().then(function () { self._boot(); }).catch(function () { self._fail(); });
  }

  Viewport.prototype._fail = function () {
    this.host.innerHTML = "";
    var p = document.createElement("div");
    p.style.cssText = "padding:12px;color:#fca5a5;font:12px ui-monospace,monospace;white-space:pre-wrap";
    p.textContent = "视口未就绪：" + (loadErr || "three.min.js");
    this.host.appendChild(p);
  };

  Viewport.prototype._boot = function () {
    var THREE = lib.THREE;
    this.host.innerHTML = "";
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block;background:#07090d";
    this.host.appendChild(canvas);
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1118);
    var w = Math.max(8, this.host.clientWidth || 280);
    var h = Math.max(8, this.host.clientHeight || 180);
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 4000);
    this.camera.position.set(2.8, 1.6, 3.2);
    this.orbitTarget = new THREE.Vector3(0, 0.45, 0);
    this.controls = bindOrbit(this.camera, canvas, this.orbitTarget);
    this.grid = new THREE.GridHelper(8, 16, 0x335544, 0x1a2220);
    this.scene.add(this.grid);
    this.placeholder = makeCar(THREE);
    this.scene.add(this.placeholder);
    this.model = this.placeholder;
    this._rebuildLights();
    this._resize();
    var selfFit = this;
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(function () { selfFit._resize(); });
      this._ro.observe(this.host);
    }
    window.addEventListener("resize", function () { selfFit._resize(); });
    this._tick();
    if (this.onInfo) this.onInfo({ clips: [], mats: collectMaterials(this.placeholder), status: "car" });
    if (this.pendingUrl) this.load(this.pendingUrl, this.pendingExt);
  };

  Viewport.prototype._tick = function () {
    var self = this;
    this.raf = requestAnimationFrame(function () { self._tick(); });
    if (!this.renderer) return;
    var dt = this.clock ? this.clock.getDelta() : 0.016;
    if (this.mixer) this.mixer.update(dt);
    if (this.placeholder && this.placeholder === this.model) this.placeholder.rotation.y += dt * 0.25;
    this.renderer.render(this.scene, this.camera);
  };

  Viewport.prototype._resize = function () {
    if (!this.renderer || !this.camera || !this.host || !this.canvas) return;
    var rect = this.host.getBoundingClientRect();
    var w = Math.max(8, Math.floor(rect.width));
    var h = Math.max(8, Math.floor(rect.height));
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  Viewport.prototype._rebuildLights = function () {
    if (!lib || !this.scene) return;
    var THREE = lib.THREE;
    var self = this;
    Object.keys(this.lightObjs).forEach(function (id) {
      var pack = self.lightObjs[id];
      if (pack.light) self.scene.remove(pack.light);
      if (pack.helper) self.scene.remove(pack.helper);
    });
    this.lightObjs = {};
    this.lightsData.forEach(function (spec) {
      var light = null;
      if (spec.type === "hemisphere") {
        light = new THREE.HemisphereLight(spec.color || "#c7d8ff", spec.ground || "#1a1510", Number(spec.intensity || 1));
      } else if (spec.type === "ambient") {
        light = new THREE.AmbientLight(spec.color || "#ffffff", Number(spec.intensity || 0.1));
      } else if (spec.type === "point") {
        light = new THREE.PointLight(spec.color || "#ffffff", Number(spec.intensity || 1), 40);
      } else if (spec.type === "spot") {
        light = new THREE.SpotLight(spec.color || "#ffffff", Number(spec.intensity || 1), 40, Math.PI / 5);
      } else {
        light = new THREE.DirectionalLight(spec.color || "#ffffff", Number(spec.intensity || 1));
      }
      light.visible = spec.enabled !== false;
      light.position.set(Number(spec.x || 0), Number(spec.y || 0), Number(spec.z || 0));
      self.scene.add(light);
      self.lightObjs[spec.id] = { light: light, spec: spec };
    });
  };

  Viewport.prototype.setLights = function (list) {
    if (Array.isArray(list) && list.length) this.lightsData = cloneLights(list);
    else this.lightsData = cloneLights();
    this._rebuildLights();
    return this.lightsData;
  };

  Viewport.prototype.updateLight = function (id, patch) {
    var spec = this.lightsData.filter(function (l) { return l.id === id; })[0];
    if (!spec) return null;
    Object.assign(spec, patch || {});
    this._rebuildLights();
    return spec;
  };

  Viewport.prototype.setStage = function (data) {
    data = data || {};
    if (this.scene && lib) this.scene.background = new lib.THREE.Color(data.bg || "#0b1118");
    if (this.grid) this.grid.visible = data.grid !== "0" && data.grid !== false;
    if (Array.isArray(data.lights)) this.setLights(data.lights);
  };

  Viewport.prototype.clearModel = function () {
    if (!this.scene || !this.model) return;
    if (this.model !== this.placeholder) this.scene.remove(this.model);
    this.model = this.placeholder || null;
    if (this.placeholder) this.placeholder.visible = true;
    this.mixer = null;
    this.clips = [];
    this.mats = this.placeholder ? collectMaterials(this.placeholder) : [];
  };

  Viewport.prototype.load = function (url, ext) {
    var self = this;
    this.pendingUrl = url;
    this.pendingExt = ext || (CineHost.guessModelExt && CineHost.guessModelExt(url)) || "glb";
    if (!url) {
      this.clearModel();
      if (this.onInfo) this.onInfo({ clips: [], mats: this.mats, status: "car" });
      return Promise.resolve(null);
    }
    if (!lib || !this.scene) {
      return ensureLib().then(function () { return self.load(url, ext); });
    }
    if (CineHost.log) CineHost.log("message", "外部模型稍后接入，当前显示内置小汽车");
    if (CineHost.toast) CineHost.toast("已显示内置小汽车");
    return Promise.resolve(this.placeholder);
  };

  Viewport.prototype.applyTransform = function (data) {
    var obj = this.model || this.placeholder;
    if (!obj || !lib) return;
    data = data || {};
    obj.position.set(Number(data.x || 0), Number(data.y || 0), Number(data.z || 0));
    obj.rotation.set(
      lib.THREE.MathUtils.degToRad(Number(data.rx || 0)),
      lib.THREE.MathUtils.degToRad(Number(data.ry || 0)),
      lib.THREE.MathUtils.degToRad(Number(data.rz || 0))
    );
    var s = Number(data.scale || 1);
    obj.scale.setScalar(s <= 0 ? 1 : s);
  };

  Viewport.prototype.applyMaterial = function (data) {
    var obj = this.model || this.placeholder;
    if (!obj || !lib) return 0;
    var THREE = lib.THREE;
    var slot = String((data && data.slot) || "*");
    var count = 0;
    obj.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (mat) {
        if (!mat) return;
        var hit = slot === "*" || slot === "" || mat.name === slot || o.name === slot;
        if (!hit) return;
        if (data.color) mat.color = new THREE.Color(data.color);
        if (data.emissive) mat.emissive = new THREE.Color(data.emissive);
        if (data.metalness !== "" && data.metalness != null) mat.metalness = Number(data.metalness);
        if (data.roughness !== "" && data.roughness != null) mat.roughness = Number(data.roughness);
        if (data.opacity !== "" && data.opacity != null) {
          mat.opacity = Number(data.opacity);
          mat.transparent = mat.opacity < 1;
        }
        mat.wireframe = data.wireframe === true || data.wireframe === "1";
        mat.needsUpdate = true;
        count += 1;
      });
    });
    return count;
  };

  Viewport.prototype.playClip = function () { return false; };

  Viewport.prototype.setCamera = function (preset, fov) {
    if (!this.camera) return;
    this.camera.fov = Number(fov || 40) || 40;
    this.camera.updateProjectionMatrix();
    var p = String(preset || "iso");
    if (p === "front") this.camera.position.set(0, 1.2, 4);
    else if (p === "side") this.camera.position.set(4, 1.2, 0);
    else if (p === "top") this.camera.position.set(0, 6, 0.2);
    else this.camera.position.set(2.8, 1.6, 3.2);
    this.camera.lookAt(this.orbitTarget || new lib.THREE.Vector3(0, 0.45, 0));
  };

  Viewport.prototype.dispose = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.renderer) this.renderer.dispose();
    this.host.innerHTML = "";
  };

  function collectMaterials(root) {
    var seen = {};
    var list = [];
    if (!root) return list;
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        var key = o.name || (m && m.name) || "mat";
        if (seen[key]) return;
        seen[key] = 1;
        list.push({
          slot: key,
          mesh: o.name || "",
          color: m.color ? "#" + m.color.getHexString() : "#ffffff",
          metalness: m.metalness,
          roughness: m.roughness,
        });
      });
    });
    return list;
  }

  CineHost.viewport3d = {
    DEFAULT_LIGHTS: DEFAULT_LIGHTS,
    ensureLib: ensureLib,
    create: function (host) {
      instance = new Viewport(host);
      return instance;
    },
    get: function () { return instance; },
    cloneLights: cloneLights,
  };
})();
