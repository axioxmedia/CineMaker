/* CineHost schema 3 extras — categories, inspector panes, model loaders, assets. */
(function () {
  var H = window.CineHost;
  if (!H) return;

  H.SCHEMA = Math.max(H.SCHEMA || 2, 3);
  H.CAPABILITIES = {
    schema: 3,
    inspectorPanes: true,
    modelLoaders: true,
    viewport3d: true,
    aioassets: true,
    pluginUninstall: true,
    catalogDownload: true,
  };

  var categories = {
    blueprint: { id: "blueprint", zh: "蓝图", en: "Blueprint", children: ["flow", "event", "logic"] },
    interface: { id: "interface", zh: "界面", en: "Widget", children: ["hud", "menu"] },
    video: { id: "video", zh: "视频", en: "Video", children: ["play", "cut"] },
    media: { id: "media", zh: "媒体", en: "Media", children: ["audio", "image", "model"] },
    viewport: { id: "viewport", zh: "视口", en: "Viewport", children: ["stage", "model", "light", "material", "clip"] },
    narrative: { id: "narrative", zh: "剧情", en: "Narrative", children: ["dialogue", "choice"] },
    variable: { id: "variable", zh: "变量", en: "Variable", children: ["value", "array"] },
    character: { id: "character", zh: "角色", en: "Character", children: ["attr"] },
    save: { id: "save", zh: "存档", en: "Save", children: ["slot"] },
    input: { id: "input", zh: "输入", en: "Input", children: ["key"] },
    camera: { id: "camera", zh: "镜头", en: "Camera", children: ["shot"] },
    fx: { id: "fx", zh: "特效", en: "Effects", children: ["fade"] },
    loc: { id: "loc", zh: "本地化", en: "Localization", children: ["text"] },
    ai: { id: "ai", zh: "智能", en: "AI", children: ["npc"] },
    economy: { id: "economy", zh: "经济", en: "Economy", children: ["item"] },
    network: { id: "network", zh: "网络", en: "Network", children: ["sync"] },
    analytics: { id: "analytics", zh: "数据", en: "Analytics", children: ["track"] },
    platform: { id: "platform", zh: "平台", en: "Platform", children: ["steam"] },
    debug: { id: "debug", zh: "调试", en: "Debug", children: ["log"] },
    utility: { id: "utility", zh: "工具", en: "Utility", children: ["sample"] },
    system: { id: "system", zh: "系统", en: "System", children: ["core"] },
    asset: { id: "asset", zh: "资产", en: "Asset", children: ["aio"] },
  };

  var panes = {};
  var loaders = {};

  H.registerCategory = function (def) {
    if (!def || !def.id) return;
    categories[def.id] = {
      id: def.id,
      zh: def.title || def.zh || def.id,
      en: def.title_en || def.en || def.id,
      children: def.children || def.subcategory || [],
    };
    H.emit && H.emit("categories:changed", H.listCategories());
  };

  H.listCategories = function () {
    return Object.values(categories);
  };

  H.getCategory = function (id) {
    return categories[id];
  };

  H.registerInspectorPane = function (def) {
    if (!def || !def.id) return;
    panes[def.id] = def;
    H.emit && H.emit("inspector:panes", Object.values(panes));
  };

  H.listInspectorPanes = function () {
    return Object.values(panes);
  };

  H.registerModelLoader = function (def) {
    if (!def || !def.ext) return;
    var key = String(def.ext).toLowerCase().replace(/^\./, "");
    loaders[key] = def;
  };

  H.getModelLoader = function (ext) {
    return loaders[String(ext || "").toLowerCase().replace(/^\./, "")];
  };

  H.listModelLoaders = function () {
    return Object.keys(loaders);
  };

  H.assetUrl = function (assetId) {
    if (!assetId) return "";
    if (String(assetId).indexOf("://") >= 0 || String(assetId).indexOf("blob:") === 0) return assetId;
    return "/api/drive/file/" + assetId + "/raw";
  };

  H.guessModelExt = function (src) {
    var s = String(src || "").split("?")[0].toLowerCase();
    if (s.indexOf(".fbx") >= 0) return "fbx";
    if (s.indexOf(".gltf") >= 0) return "gltf";
    if (s.indexOf(".glb") >= 0) return "glb";
    if (s.indexOf(".obj") >= 0) return "obj";
    return "glb";
  };

  if (H.registerAssetKind) {
    H.registerAssetKind({ id: "model3d", label: "3D Model" });
    H.registerAssetKind({ id: "aioassets", label: ".aioassets" });
  }

  H.log && H.log("output", "CineHost framework schema " + H.SCHEMA);
})();
