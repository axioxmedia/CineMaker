if (CineHost.definePlugin) {
  CineHost.definePlugin({
    id: "core.foundation",
    onLoad() { CineHost.log && CineHost.log("output", "core.foundation loaded"); },
  });
}
CineHost.registerNodeType({
  type: "story.line",
  title: "对白",
  title_en: "Line",
  category: "ui",
  icon: "fa-comment",
  color: "#7aa2a8",
  fields: [
    { id: "speaker", label: "说话人", label_en: "Speaker", default: "" },
    { id: "text", label: "台词", label_en: "Text", kind: "textarea", default: "……" },
  ],
});
CineHost.registerNodeType({
  type: "story.wait",
  title: "等待",
  title_en: "Wait",
  category: "flow",
  icon: "fa-clock",
  color: "#8b8373",
  fields: [
    { id: "mode", label: "click 或 sec", label_en: "click|sec", default: "click" },
    { id: "sec", label: "秒", label_en: "Seconds", default: "1" },
  ],
});
CineHost.registerNodeType({
  type: "story.fade",
  title: "淡入淡出",
  title_en: "Fade",
  category: "ui",
  icon: "fa-circle-half-stroke",
  color: "#8b8373",
  fields: [
    { id: "dir", label: "in 或 out", label_en: "in|out", default: "out" },
    { id: "ms", label: "毫秒", label_en: "ms", default: "600" },
  ],
});
CineHost.registerNodeType({
  type: "audio.bgm",
  title: "背景音乐",
  title_en: "BGM",
  category: "media",
  icon: "fa-music",
  color: "#c9a227",
  fields: [
    { id: "assetId", label: "音频", label_en: "Audio", kind: "asset", accept: ["audio"] },
    { id: "loop", label: "循环 1/0", label_en: "Loop", default: "1" },
  ],
});
CineHost.registerNodeType({
  type: "audio.sfx",
  title: "音效",
  title_en: "SFX",
  category: "media",
  icon: "fa-volume-high",
  color: "#c9a227",
  fields: [
    { id: "assetId", label: "音频", label_en: "Audio", kind: "asset", accept: ["audio"] },
  ],
});
CineHost.registerNodeType({
  type: "story.checkpoint",
  title: "存档点",
  title_en: "Checkpoint",
  category: "flow",
  icon: "fa-bookmark",
  color: "#7d9a6c",
  fields: [{ id: "slot", label: "槽位", label_en: "Slot", default: "1" }],
});
CineHost.registerNodeType({
  type: "meta.comment",
  title: "注释框",
  title_en: "Comment",
  category: "flow",
  icon: "fa-note-sticky",
  color: "#5c6570",
  inputs: [],
  outputs: [],
  fields: [{ id: "note", label: "备注", label_en: "Note", kind: "textarea", default: "注释" }],
});
CineHost.registerNodeType({
  type: "meta.reroute",
  title: "重定向",
  title_en: "Reroute",
  category: "flow",
  icon: "fa-circle-dot",
  color: "#e7c07a",
  fields: [],
});
CineHost.registerNodeType({
  type: "flow.sequence",
  title: "序列",
  title_en: "Sequence",
  addPin: true,
  category: "flow",
  icon: "fa-layer-group",
  color: "#e7c07a",
  outputs: [
    { id: "t0", label: "然后 0" },
    { id: "t1", label: "然后 1" },
    { id: "t2", label: "然后 2" },
    { id: "t3", label: "然后 3" },
  ],
  fields: [],
});
CineHost.registerNodeType({
  type: "flow.forLoop",
  title: "循环",
  title_en: "For Loop",
  category: "flow",
  icon: "fa-rotate",
  color: "#c9a227",
  outputs: [
    { id: "body", label: "Loop Body" },
    { id: "done", label: "Completed" },
  ],
  fields: [
    { id: "first", label: "First", default: "0" },
    { id: "last", label: "Last", default: "3" },
    { id: "indexKey", label: "Index 变量", default: "i" },
  ],
});
CineHost.registerNodeType({
  type: "array.make",
  title: "创建数组",
  title_en: "Make Array",
  category: "flow",
  icon: "fa-list-ol",
  color: "#7aa2a8",
  fields: [
    { id: "key", label: "变量名", default: "list" },
    { id: "items", label: "逗号分隔", kind: "textarea", default: "" },
  ],
});
CineHost.registerNodeType({
  type: "array.get",
  title: "取数组项",
  title_en: "Array Get",
  category: "flow",
  icon: "fa-i-cursor",
  color: "#7aa2a8",
  fields: [
    { id: "key", label: "数组", default: "list" },
    { id: "index", label: "下标", default: "0" },
    { id: "out", label: "写入变量", default: "item" },
  ],
});
CineHost.registerNodeType({
  type: "flow.tick",
  title: "每帧事件",
  title_en: "Event Tick",
  category: "flow",
  icon: "fa-stopwatch",
  color: "#7d9a6c",
  inputs: [],
  outputs: [{ id: "out", label: "触发" }],
  fields: [{ id: "ms", label: "间隔毫秒", default: "100" }],
});
CineHost.registerNodeType({
  type: "flow.timer",
  title: "计时器",
  title_en: "Timer",
  category: "flow",
  icon: "fa-hourglass-half",
  color: "#c9a227",
  outputs: [
    { id: "out", label: "到期" },
    { id: "tick", label: "跳动" },
  ],
  fields: [
    { id: "sec", label: "秒", default: "1" },
    { id: "loop", label: "循环 1/0", default: "0" },
  ],
});
CineHost.registerNodeType({
  type: "array.length",
  title: "数组长度",
  title_en: "Array Length",
  category: "flow",
  icon: "fa-ruler",
  color: "#7aa2a8",
  fields: [
    { id: "key", label: "数组", default: "list" },
    { id: "out", label: "写入变量", default: "len" },
  ],
});
