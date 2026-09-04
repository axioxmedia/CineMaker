CineHost.registerNodeType({
  type: "story.start",
  title: "游戏开始",
  title_en: "Start",
  category: "flow",
  icon: "fa-play",
  color: "#7d9a6c",
  inputs: [],
  outputs: [{ id: "out", label: "flow" }],
  fields: [{ id: "label", label: "开场标题", label_en: "Label", default: "开始" }],
});
CineHost.registerNodeType({
  type: "video.play",
  title: "播放影片",
  title_en: "Play Video",
  category: "video",
  icon: "fa-film",
  color: "#e7c07a",
  inputs: [{ id: "in", label: "in" }],
  outputs: [{ id: "out", label: "done" }],
  fields: [
    { id: "assetId", label: "影片", label_en: "Video", kind: "asset", accept: ["video"] },
    { id: "waitEnd", label: "播完再继续", label_en: "Wait until end", default: "1" },
  ],
});
CineHost.registerNodeType({
  type: "story.choice",
  title: "玩家选项",
  title_en: "Choice",
  category: "ui",
  icon: "fa-list",
  color: "#7aa2a8",
  inputs: [{ id: "in", label: "in" }],
  outputs: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
    { id: "c", label: "C" },
  ],
  fields: [
    { id: "prompt", label: "问句", label_en: "Prompt", kind: "textarea", default: "你要怎么做？" },
    { id: "optA", label: "选项 A", label_en: "Option A", default: "A" },
    { id: "optB", label: "选项 B", label_en: "Option B", default: "B" },
    { id: "optC", label: "选项 C", label_en: "Option C", default: "C" },
  ],
});
CineHost.registerNodeType({
  type: "story.setVar",
  title: "修改变量",
  title_en: "Set Variable",
  category: "flow",
  icon: "fa-sliders",
  color: "#c9a227",
  inputs: [{ id: "in", label: "in" }],
  outputs: [{ id: "out", label: "out" }],
  fields: [
    { id: "key", label: "变量名", label_en: "Name", default: "affection" },
    { id: "type", label: "number/bool/string", label_en: "Type", default: "number" },
    { id: "op", label: "运算 + 或 =", label_en: "Op", default: "+" },
    { id: "value", label: "数值", label_en: "Value", default: "1" },
  ],
});
CineHost.registerNodeType({
  type: "story.branch",
  title: "条件分支",
  title_en: "Branch",
  category: "flow",
  icon: "fa-code-branch",
  color: "#c45c5c",
  inputs: [{ id: "in", label: "in" }],
  outputs: [
    { id: "yes", label: "成立" },
    { id: "no", label: "不成立" },
  ],
  fields: [
    { id: "key", label: "变量", label_en: "Variable", default: "affection" },
    { id: "mode", label: "value 或 seen", label_en: "value|seen", default: "value" },
    { id: "cmp", label: "比较", label_en: "Compare", default: ">=" },
    { id: "value", label: "阈值", label_en: "Value", default: "10" },
    { id: "nodeId", label: "看过的节点", label_en: "Seen node", default: "" },
  ],
});
CineHost.registerNodeType({
  type: "story.end",
  title: "结局",
  title_en: "Ending",
  category: "flow",
  icon: "fa-flag-checkered",
  color: "#8b8373",
  inputs: [{ id: "in", label: "in" }],
  outputs: [],
  fields: [{ id: "title", label: "结局名", label_en: "Ending title", default: "终章" }],
});
