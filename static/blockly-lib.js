/* App Inventor-style library: extra blocks + toolbox tree. */
(function () {
  if (!window.Blockly) return;

  function def(type, init) {
    Blockly.Blocks[type] = { init: init };
  }

  def("dicts_create_empty", function () {
    this.appendDummyInput().appendField(window.uiLang === "en" ? "empty dictionary" : "空字典");
    this.setOutput(true, "Dictionary");
    this.setColour("#8a55d7");
    this.setTooltip("Create {}");
  });
  def("dicts_set", function () {
    this.appendValueInput("DICT").setCheck(null).appendField(window.uiLang === "en" ? "set in" : "写入");
    this.appendValueInput("KEY").setCheck(null).appendField(window.uiLang === "en" ? "key" : "键");
    this.appendValueInput("VAL").setCheck(null).appendField(window.uiLang === "en" ? "to" : "为");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#8a55d7");
  });
  def("dicts_get", function () {
    this.appendValueInput("DICT").appendField(window.uiLang === "en" ? "get" : "读取");
    this.appendValueInput("KEY").appendField(window.uiLang === "en" ? "key" : "键");
    this.setOutput(true, null);
    this.setColour("#8a55d7");
  });
  def("dicts_has", function () {
    this.appendValueInput("DICT").appendField(window.uiLang === "en" ? "has key" : "含键");
    this.appendValueInput("KEY");
    this.setOutput(true, "Boolean");
    this.setColour("#8a55d7");
  });
  def("dicts_keys", function () {
    this.appendValueInput("DICT").appendField(window.uiLang === "en" ? "keys of" : "全部键");
    this.setOutput(true, "Array");
    this.setColour("#8a55d7");
  });

  def("matrices_create", function () {
    this.appendValueInput("R").setCheck("Number").appendField(window.uiLang === "en" ? "matrix rows" : "矩阵 行");
    this.appendValueInput("C").setCheck("Number").appendField(window.uiLang === "en" ? "cols" : "列");
    this.setOutput(true, "Matrix");
    this.setColour("#2bb7b3");
  });
  def("matrices_get", function () {
    this.appendValueInput("M").appendField(window.uiLang === "en" ? "matrix" : "矩阵");
    this.appendValueInput("R").appendField("r");
    this.appendValueInput("C").appendField("c");
    this.setOutput(true, "Number");
    this.setColour("#2bb7b3");
  });
  def("matrices_set", function () {
    this.appendValueInput("M").appendField(window.uiLang === "en" ? "set matrix" : "写入矩阵");
    this.appendValueInput("R").appendField("r");
    this.appendValueInput("C").appendField("c");
    this.appendValueInput("V").appendField("=");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#2bb7b3");
  });
  def("matrices_add", function () {
    this.appendValueInput("A").appendField(window.uiLang === "en" ? "add" : "矩阵加");
    this.appendValueInput("B");
    this.setOutput(true, "Matrix");
    this.setColour("#2bb7b3");
  });
  def("matrices_mul", function () {
    this.appendValueInput("A").appendField(window.uiLang === "en" ? "multiply" : "矩阵乘");
    this.appendValueInput("B");
    this.setOutput(true, "Matrix");
    this.setColour("#2bb7b3");
  });

  function blk(type) { return { kind: "block", type: type }; }
  function cat(name, colour, contents) {
    return { kind: "category", name: name, colour: colour, contents: contents };
  }

  const LABELS = {
    zh: {
      controls_if: "如果",
      controls_repeat_ext: "重复 N 次",
      controls_whileUntil: "当 / 直到",
      controls_for: "从数字循环",
      controls_forEach: "对列表每一项",
      controls_flow_statements: "跳出 / 继续",
      logic_compare: "比较",
      logic_operation: "并且 / 或者",
      logic_negate: "非",
      logic_boolean: "真 / 假",
      logic_null: "空",
      logic_ternary: "如果则否则（值）",
      math_number: "数字",
      math_arithmetic: "加减乘除",
      math_single: "开方 / 绝对值",
      math_trig: "三角函数",
      math_constant: "常数 π e",
      math_number_property: "数字性质",
      math_round: "四舍五入",
      math_on_list: "列表统计",
      math_modulo: "取余",
      math_constrain: "限制范围",
      math_random_int: "随机整数",
      math_random_float: "随机小数",
      text: "文字",
      text_join: "合并文字",
      text_append: "追加文字",
      text_length: "文字长度",
      text_isEmpty: "文字为空",
      text_indexOf: "查找文字",
      text_charAt: "取第几个字",
      text_getSubstring: "取子串",
      text_changeCase: "大小写",
      text_trim: "去掉空格",
      lists_create_with: "创建列表",
      lists_repeat: "重复成列表",
      lists_length: "列表长度",
      lists_isEmpty: "列表为空",
      lists_indexOf: "查找列表项",
      lists_getIndex: "取列表项",
      lists_setIndex: "改列表项",
      lists_getSublist: "取子列表",
      lists_split: "文字拆成列表",
      lists_sort: "排序列表",
      dicts_create_empty: "空字典",
      dicts_set: "写入字典",
      dicts_get: "读取字典",
      dicts_has: "字典含键",
      dicts_keys: "全部键",
      matrices_create: "创建矩阵",
      matrices_get: "读取矩阵格",
      matrices_set: "写入矩阵格",
      matrices_add: "矩阵相加",
      matrices_mul: "矩阵相乘",
      colour_picker: "选颜色",
      colour_random: "随机颜色",
      colour_rgb: "红绿蓝",
      colour_blend: "混合颜色"
    },
    en: {
      controls_if: "if",
      controls_repeat_ext: "repeat N times",
      controls_whileUntil: "while / until",
      controls_for: "count with",
      controls_forEach: "for each item",
      controls_flow_statements: "break / continue",
      logic_compare: "compare",
      logic_operation: "and / or",
      logic_negate: "not",
      logic_boolean: "true / false",
      logic_null: "null",
      logic_ternary: "if then else (value)",
      math_number: "number",
      math_arithmetic: "add / subtract / multiply / divide",
      math_single: "sqrt / abs",
      math_trig: "trig",
      math_constant: "constants",
      math_number_property: "number property",
      math_round: "round",
      math_on_list: "list stats",
      math_modulo: "modulo",
      math_constrain: "constrain",
      math_random_int: "random integer",
      math_random_float: "random fraction",
      text: "text",
      text_join: "join text",
      text_append: "append text",
      text_length: "text length",
      text_isEmpty: "text is empty",
      text_indexOf: "find text",
      text_charAt: "letter at",
      text_getSubstring: "substring",
      text_changeCase: "change case",
      text_trim: "trim",
      lists_create_with: "create list",
      lists_repeat: "repeat list",
      lists_length: "list length",
      lists_isEmpty: "list is empty",
      lists_indexOf: "find in list",
      lists_getIndex: "get list item",
      lists_setIndex: "set list item",
      lists_getSublist: "sublist",
      lists_split: "split text to list",
      lists_sort: "sort list",
      dicts_create_empty: "empty dictionary",
      dicts_set: "set dictionary",
      dicts_get: "get dictionary",
      dicts_has: "has key",
      dicts_keys: "all keys",
      matrices_create: "create matrix",
      matrices_get: "get cell",
      matrices_set: "set cell",
      matrices_add: "add matrices",
      matrices_mul: "multiply matrices",
      colour_picker: "colour",
      colour_random: "random colour",
      colour_rgb: "RGB",
      colour_blend: "blend colours"
    }
  };
  window.CineBlockLabel = function (type) {
    const pack = (window.uiLang || "zh") === "en" ? LABELS.en : LABELS.zh;
    return pack[type] || type;
  };
  window.CineToolbox = function cineToolbox() {
    const zh = (window.uiLang || "zh") === "zh";
    const cine = [];
    if (window.CineHost && CineHost.listNodeTypes) {
      const groups = {};
      CineHost.listNodeTypes().forEach((d) => {
        const c = d.category || "utility";
        (groups[c] ||= []).push({ kind: "block", type: d.type });
      });
      const names = {
        flow: zh ? "流程" : "Flow", blueprint: zh ? "蓝图" : "Blueprint",
        ui: zh ? "界面" : "Interface", narrative: zh ? "剧情" : "Story",
        viewport: zh ? "三维" : "3D", camera: zh ? "镜头" : "Camera",
        media: zh ? "媒体" : "Media", video: zh ? "影片" : "Video",
        asset: zh ? "资产" : "Assets", utility: zh ? "工具" : "Utility",
      };
      const colors = {
        flow: "#5c81a6", blueprint: "#5c81a6", ui: "#5ba55b", narrative: "#a55b80",
        viewport: "#5ba58c", camera: "#5b67a5", media: "#c9a227", video: "#a5745b",
        asset: "#745ba5", utility: "#995ba5",
      };
      Object.keys(groups).forEach((id) => {
        cine.push(cat(names[id] || id, colors[id] || "#888", groups[id]));
      });
    }
    return {
      kind: "categoryToolbox",
      contents: [
        cat(zh ? "控制" : "Control", "#ffab19", [
          blk("controls_if"),
          { kind: "block", type: "controls_if", extraState: { elseIfCount: 1, elseCount: 1 } },
          blk("controls_repeat_ext"),
          blk("controls_whileUntil"),
          blk("controls_for"),
          blk("controls_forEach"),
          blk("controls_flow_statements"),
        ]),
        cat(zh ? "逻辑" : "Logic", "#5b80a5", [
          blk("logic_compare"), blk("logic_operation"), blk("logic_negate"),
          blk("logic_boolean"), blk("logic_null"), blk("logic_ternary"),
        ]),
        cat(zh ? "数学" : "Math", "#5b67a5", [
          blk("math_number"), blk("math_arithmetic"), blk("math_single"),
          blk("math_trig"), blk("math_constant"), blk("math_number_property"),
          blk("math_round"), blk("math_on_list"), blk("math_modulo"),
          blk("math_constrain"), blk("math_random_int"), blk("math_random_float"),
        ]),
        cat(zh ? "矩阵" : "Matrices", "#2bb7b3", [
          blk("matrices_create"), blk("matrices_get"), blk("matrices_set"),
          blk("matrices_add"), blk("matrices_mul"),
        ]),
        cat(zh ? "文本" : "Text", "#5ba58c", [
          blk("text"), blk("text_join"), blk("text_append"), blk("text_length"),
          blk("text_isEmpty"), blk("text_indexOf"), blk("text_charAt"),
          blk("text_getSubstring"), blk("text_changeCase"), blk("text_trim"),
        ]),
        cat(zh ? "列表" : "Lists", "#745ba5", [
          blk("lists_create_with"), blk("lists_repeat"), blk("lists_length"),
          blk("lists_isEmpty"), blk("lists_indexOf"), blk("lists_getIndex"),
          blk("lists_setIndex"), blk("lists_getSublist"), blk("lists_split"),
          blk("lists_sort"),
        ]),
        cat(zh ? "字典" : "Dictionaries", "#8a55d7", [
          blk("dicts_create_empty"), blk("dicts_set"), blk("dicts_get"),
          blk("dicts_has"), blk("dicts_keys"),
        ]),
        cat(zh ? "颜色" : "Colors", "#a5745b", [
          blk("colour_picker"), blk("colour_random"), blk("colour_rgb"), blk("colour_blend"),
        ]),
        { kind: "category", name: zh ? "变量" : "Variables", colour: "#dc7c2f", custom: "VARIABLE" },
        { kind: "category", name: zh ? "过程" : "Procedures", colour: "#9c5ab8", custom: "PROCEDURE" },
      ].concat(cine),
    };
  };
})();
