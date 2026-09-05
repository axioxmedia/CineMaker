/* App Inventor-style library: extra blocks + toolbox tree. */
(function () {
  if (!window.Blockly) return;
  function def(type, init) { Blockly.Blocks[type] = { init: init }; }
  def("dicts_create_empty", function () {
    this.appendDummyInput().appendField(window.uiLang === "en" ? "empty dictionary" : "空字典");
    this.setOutput(true, "Dictionary"); this.setColour("#8a55d7");
  });
  def("dicts_set", function () {
    this.appendValueInput("DICT").appendField(window.uiLang === "en" ? "set in" : "写入");
    this.appendValueInput("KEY").appendField(window.uiLang === "en" ? "key" : "键");
    this.appendValueInput("VAL").appendField(window.uiLang === "en" ? "to" : "为");
    this.setPreviousStatement(true); this.setNextStatement(true); this.setColour("#8a55d7");
  });
  def("dicts_get", function () {
    this.appendValueInput("DICT").appendField(window.uiLang === "en" ? "get" : "读取");
    this.appendValueInput("KEY").appendField(window.uiLang === "en" ? "key" : "键");
    this.setOutput(true, null); this.setColour("#8a55d7");
  });
  def("dicts_has", function () {
    this.appendValueInput("DICT").appendField(window.uiLang === "en" ? "has key" : "含键");
    this.appendValueInput("KEY"); this.setOutput(true, "Boolean"); this.setColour("#8a55d7");
  });
  def("dicts_keys", function () {
    this.appendValueInput("DICT").appendField(window.uiLang === "en" ? "keys of" : "全部键");
    this.setOutput(true, "Array"); this.setColour("#8a55d7");
  });
  def("matrices_create", function () {
    this.appendValueInput("R").setCheck("Number").appendField(window.uiLang === "en" ? "matrix rows" : "矩阵 行");
    this.appendValueInput("C").setCheck("Number").appendField(window.uiLang === "en" ? "cols" : "列");
    this.setOutput(true, "Matrix"); this.setColour("#2bb7b3");
  });
  def("matrices_get", function () {
    this.appendValueInput("M").appendField(window.uiLang === "en" ? "matrix" : "矩阵");
    this.appendValueInput("R").appendField("r"); this.appendValueInput("C").appendField("c");
    this.setOutput(true, "Number"); this.setColour("#2bb7b3");
  });
  def("matrices_set", function () {
    this.appendValueInput("M").appendField(window.uiLang === "en" ? "set matrix" : "写入矩阵");
    this.appendValueInput("R").appendField("r"); this.appendValueInput("C").appendField("c");
    this.appendValueInput("V").appendField("=");
    this.setPreviousStatement(true); this.setNextStatement(true); this.setColour("#2bb7b3");
  });
  def("matrices_add", function () {
    this.appendValueInput("A").appendField(window.uiLang === "en" ? "add" : "矩阵加");
    this.appendValueInput("B"); this.setOutput(true, "Matrix"); this.setColour("#2bb7b3");
  });
  def("matrices_mul", function () {
    this.appendValueInput("A").appendField(window.uiLang === "en" ? "multiply" : "矩阵乘");
    this.appendValueInput("B"); this.setOutput(true, "Matrix"); this.setColour("#2bb7b3");
  });
  function blk(type) { return { kind: "block", type: type }; }
  function cat(name, colour, contents) { return { kind: "category", name: name, colour: colour, contents: contents }; }
  window.CineToolbox = function () {
    const zh = (window.uiLang || "zh") === "zh";
    const cine = [];
    if (window.CineHost && CineHost.listNodeTypes) {
      const groups = {};
      CineHost.listNodeTypes().forEach((d) => { (groups[d.category || "utility"] ||= []).push({ kind: "block", type: d.type }); });
      const names = { flow: zh ? "流程" : "Flow", blueprint: zh ? "蓝图" : "Blueprint", ui: zh ? "界面" : "Interface", narrative: zh ? "剧情" : "Story", viewport: zh ? "三维" : "3D", camera: zh ? "镜头" : "Camera", media: zh ? "媒体" : "Media", video: zh ? "影片" : "Video", asset: zh ? "资产" : "Assets", utility: zh ? "工具" : "Utility" };
      const colors = { flow: "#5c81a6", blueprint: "#5c81a6", ui: "#5ba55b", narrative: "#a55b80", viewport: "#5ba58c", camera: "#5b67a5", media: "#c9a227", video: "#a5745b", asset: "#745ba5", utility: "#995ba5" };
      Object.keys(groups).forEach((id) => cine.push(cat(names[id] || id, colors[id] || "#888", groups[id])));
    }
    return { kind: "categoryToolbox", contents: [
      cat(zh ? "控制" : "Control", "#ffab19", [blk("controls_if"), blk("controls_repeat_ext"), blk("controls_whileUntil"), blk("controls_for"), blk("controls_forEach"), blk("controls_flow_statements")]),
      cat(zh ? "逻辑" : "Logic", "#5b80a5", [blk("logic_compare"), blk("logic_operation"), blk("logic_negate"), blk("logic_boolean"), blk("logic_null"), blk("logic_ternary")]),
      cat(zh ? "数学" : "Math", "#5b67a5", [blk("math_number"), blk("math_arithmetic"), blk("math_single"), blk("math_trig"), blk("math_constant"), blk("math_number_property"), blk("math_round"), blk("math_on_list"), blk("math_modulo"), blk("math_constrain"), blk("math_random_int"), blk("math_random_float")]),
      cat(zh ? "矩阵" : "Matrices", "#2bb7b3", [blk("matrices_create"), blk("matrices_get"), blk("matrices_set"), blk("matrices_add"), blk("matrices_mul")]),
      cat(zh ? "文本" : "Text", "#5ba58c", [blk("text"), blk("text_join"), blk("text_append"), blk("text_length"), blk("text_isEmpty"), blk("text_indexOf"), blk("text_charAt"), blk("text_getSubstring"), blk("text_changeCase"), blk("text_trim")]),
      cat(zh ? "列表" : "Lists", "#745ba5", [blk("lists_create_with"), blk("lists_repeat"), blk("lists_length"), blk("lists_isEmpty"), blk("lists_indexOf"), blk("lists_getIndex"), blk("lists_setIndex"), blk("lists_getSublist"), blk("lists_split"), blk("lists_sort")]),
      cat(zh ? "字典" : "Dictionaries", "#8a55d7", [blk("dicts_create_empty"), blk("dicts_set"), blk("dicts_get"), blk("dicts_has"), blk("dicts_keys")]),
      cat(zh ? "颜色" : "Colors", "#a5745b", [blk("colour_picker"), blk("colour_random"), blk("colour_rgb"), blk("colour_blend")]),
      { kind: "category", name: zh ? "变量" : "Variables", colour: "#dc7c2f", custom: "VARIABLE" },
      { kind: "category", name: zh ? "过程" : "Procedures", colour: "#9c5ab8", custom: "PROCEDURE" }
    ].concat(cine) };
  };
})();
