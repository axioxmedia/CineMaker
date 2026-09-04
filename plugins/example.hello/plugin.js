CineHost.registerNodeType({
  type: "example.hello",
  title: "示例招呼",
  title_en: "Hello (example)",
  category: "misc",
  icon: "fa-hand",
  color: "#7aa2a8",
  inputs: [{ id: "in", label: "in" }],
  outputs: [{ id: "out", label: "out" }],
  fields: [{ id: "note", label: "备注", label_en: "Note", default: "可替换此插件。" }],
});
