/* Engine 3D viewport. Plugins should call CineHost.viewport3d, not roll their own renderer. */
(function () {
  var THREE_VER = "0.160.1";
  var BASE = "/assets/vendor/three";
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

  function ensureLib() {
    if (lib) return Promise.resolve(lib);
    return import(BASE + "/three.module.js").then(function (THREE) {
      return Promise.all([
        Promise.resolve(THREE),
        import(BASE + "/examples/jsm/loaders/GLTFLoader.js"),
        import(BASE + "/examples/jsm/loaders/FBXLoader.js"),
        import(BASE + "/examples/jsm/controls/OrbitControls.js"),
      ]);
    }).then(function (parts) {
      lib = {
        THREE: parts[0],
        GLTFLoader: parts[1].GLTFLoader,
        FBXLoader: parts[2].FBXLoader,
        OrbitControls: parts[3].OrbitControls,
      };
      if (CineHost.registerModelLoader) {
        CineHost.registerModelLoader({ ext: "glb", label: "glTF Binary" });
        CineHost.registerModelLoader({ ext: "gltf", label: "glTF" });
        CineHost.registerModelLoader({ ext: "fbx", label: "FBX" });
      }
      if (CineHost.log) CineHost.log("output", "viewport3d Three r" + THREE_VER + " + FBX");
      return lib;
    }).catch(function (err) {
      loadErr = String(err && err.message ? err.message : err);
      if (CineHost.log) CineHost.log("message", "viewport3d load fail " + loadErr);
      if (CineHost.toast) CineHost.toast("Three.js load failed");
      throw err;
    });
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
    p.style.cssText = "padding:12px;color:#fca5a5;font:12px ui-monospace,monospace";
    p.textContent = "视口未就绪：" + (loadErr || "CDN");
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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1118);
    var w = Math.max(8, this.host.clientWidth || 280);
    var h = Math.max(8, this.host.clientHeight || 180);
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 4000);
    this.camera.position.set(2.6, 1.8, 3.1);
    this.controls = new lib.OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.grid = new THREE.GridHelper(8, 16, 0x245, 0x123);
    this.scene.add(this.grid);
    this.placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x2dd4bf, metalness: 0.35, roughness: 0.4 })
    );
    this.placeholder.position.y = 0.5;
    this.scene.add(this.placeholder);
    this._rebuildLights();
    this._resize();
    this._tick();
    if (this.pendingUrl) this.load(this.pendingUrl, this.pendingExt);
  };

  Viewport.prototype._tick = function () {
    var self = this;
    this.raf = requestAnimationFrame(function () { self._tick(); });
    if (!this.renderer) return;
    var dt = this.clock ? this.clock.getDelta() : 0.016;
    if (this.mixer) this.mixer.update(dt);
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  Viewport.prototype._resize = function () {
    if (!this.renderer || !this.camera) return;
    var w = Math.max(8, this.host.clientWidth || 280);
    var h = Math.max(8, this.host.clientHeight || 180);
    this.renderer.setSize(w, h, false);
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
      if (light.target) {
        var THREE = lib.THREE;
        var dir = new THREE.Vector3(0, 0, -1);
        var eul = new THREE.Euler(
          THREE.MathUtils.degToRad(Number(spec.rx || 0)),
          THREE.MathUtils.degToRad(Number(spec.ry || 0)),
          THREE.MathUtils.degToRad(Number(spec.rz || 0))
        );
        dir.applyEuler(eul);
        light.target.position.copy(light.position).add(dir.multiplyScalar(4));
        self.scene.add(light.target);
      }
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
    this.scene.remove(this.model);
    this.model.traverse(function (o) {
      if (o.geometry && o.geometry.dispose) o.geometry.dispose();
    });
    this.model = null;
    this.mixer = null;
    this.clips = [];
    this.mats = [];
  };

  Viewport.prototype.load = function (url, ext) {
    var self = this;
    this.pendingUrl = url;
    this.pendingExt = ext || (CineHost.guessModelExt && CineHost.guessModelExt(url)) || "glb";
    if (!url) {
      if (this.placeholder) this.placeholder.visible = true;
      this.clearModel();
      if (this.onInfo) this.onInfo({ clips: [], mats: [], status: "empty" });
      return Promise.resolve(null);
    }
    if (!lib || !this.scene) {
      return ensureLib().then(function () { return self.load(url, ext); });
    }
    var kind = this.pendingExt;
    var loader = kind === "fbx" ? new lib.FBXLoader() : new lib.GLTFLoader();
    return new Promise(function (resolve) {
      loader.load(
        url,
        function (res) {
          self.clearModel();
          if (self.placeholder) self.placeholder.visible = false;
          var root = res.scene || res;
          var clips = res.animations || root.animations || [];
          self.model = root;
          self.scene.add(root);
          self.clips = clips || [];
          self.mixer = self.clips.length ? new lib.THREE.AnimationMixer(root) : null;
          self.mats = collectMaterials(root);
          frameObject(root, self.camera, self.controls);
          if (self.onInfo) self.onInfo({ clips: self.clips, mats: self.mats, status: "ok", ext: kind });
          resolve(res);
        },
        undefined,
        function (err) {
          if (CineHost.log) CineHost.log("console", "model load " + err);
          if (self.onInfo) self.onInfo({ clips: [], mats: [], status: "fail", error: String(err) });
          if (CineHost.toast) CineHost.toast("模型加载失败（格式 / CORS / 地址）");
          resolve(null);
        }
      );
    });
  };

  Viewport.prototype.applyTransform = function (data) {
    if (!this.model || !lib) return;
    data = data || {};
    this.model.position.set(Number(data.x || 0), Number(data.y || 0), Number(data.z || 0));
    this.model.rotation.set(
      lib.THREE.MathUtils.degToRad(Number(data.rx || 0)),
      lib.THREE.MathUtils.degToRad(Number(data.ry || 0)),
      lib.THREE.MathUtils.degToRad(Number(data.rz || 0))
    );
    var s = Number(data.scale || 1);
    this.model.scale.setScalar(s <= 0 ? 1 : s);
  };

  Viewport.prototype.applyMaterial = function (data) {
    if (!this.model || !lib) return 0;
    var THREE = lib.THREE;
    var slot = String((data && data.slot) || "*");
    var count = 0;
    this.model.traverse(function (o) {
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

  Viewport.prototype.playClip = function (name, loop, speed) {
    if (!this.mixer || !this.clips.length) return false;
    this.mixer.stopAllAction();
    var clip = this.clips[0];
    if (name && name !== "*") {
      clip = this.clips.filter(function (c) { return c.name === name; })[0] ||
        this.clips.filter(function (c) { return String(c.name).toLowerCase().indexOf(String(name).toLowerCase()) >= 0; })[0];
    }
    if (!clip) return false;
    var action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(loop === "once" ? lib.THREE.LoopOnce : lib.THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = loop === "once";
    action.timeScale = Number(speed || 1) || 1;
    action.play();
    return true;
  };

  Viewport.prototype.setCamera = function (preset, fov) {
    if (!this.camera) return;
    this.camera.fov = Number(fov || 40) || 40;
    this.camera.updateProjectionMatrix();
    var p = String(preset || "iso");
    if (p === "front") this.camera.position.set(0, 1.2, 4);
    else if (p === "side") this.camera.position.set(4, 1.2, 0);
    else if (p === "top") this.camera.position.set(0, 6, 0.2);
    else this.camera.position.set(2.6, 1.8, 3.1);
    if (this.controls) {
      this.controls.target.set(0, 0.8, 0);
      this.controls.update();
    }
  };

  Viewport.prototype.dispose = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.clearModel();
    if (this.renderer) this.renderer.dispose();
    this.host.innerHTML = "";
  };

  function collectMaterials(root) {
    var seen = {};
    var list = [];
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        var key = (m && m.name) || o.name || "mat";
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

  function frameObject(object, camera, controls) {
    if (!lib) return;
    var THREE = lib.THREE;
    var box = new THREE.Box3().setFromObject(object);
    var size = box.getSize(new THREE.Vector3()).length();
    var center = box.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size) || size < 0.0001) size = 2;
    camera.near = size / 100;
    camera.far = size * 40;
    camera.updateProjectionMatrix();
    camera.position.copy(center).add(new THREE.Vector3(size * 0.55, size * 0.35, size * 0.7));
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
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
