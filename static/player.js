function createPlayRuntime() {
  let vars = {};
  let seen = new Set();
  let current = null;
  let graph = { nodes: [], links: [] };
  let ui = { video: null, text: null, choices: null, speaker: null, fade: null, bgm: null, sfx: null, onEnd: null, mediaUrl: null };
  let waiting = null;
  let skipVideo = false;
  let timers = [];
  let chain = 0;
  let chainAt = 0;
  let frames = [];

  function media(id) {
    if (!id) return "";
    return ui.mediaUrl ? ui.mediaUrl(id) : `/api/drive/file/${id}/raw`;
  }

  function mount(box) {
    ui = { ...ui, ...box };
  }

  function reset(g) {
    graph = g || (window.Graph ? Graph.serialize() : { nodes: [], links: [] });
    const mode = graph.gameMode || {};
    if (mode.startLevelId && Array.isArray(graph.levels)) {
      const lv = graph.levels.find((x) => x.id === mode.startLevelId);
      if (lv) {
        graph = Object.assign({}, graph, { nodes: lv.nodes || [], links: lv.links || [], variables: lv.variables || graph.variables });
      }
    }
    vars = {};
    seen = new Set();
    const applyVar = (v) => {
      if (!v || !v.key) return;
      if (v.type === "bool") vars[v.key] = v.value === true || v.value === "true" || v.value === "1";
      else if (v.type === "string") vars[v.key] = String(v.value ?? "");
      else vars[v.key] = Number(v.value || 0);
    };
    (graph.variables || []).forEach(applyVar);
    ((graph.gameInstance || {}).variables || []).forEach(applyVar);
  }

  function active() {
    return frames.length ? frames[frames.length - 1] : graph;
  }
  function node(id) {
    return (active().nodes || []).find((n) => n.id === id);
  }
  function outs(id) {
    return (active().links || []).filter((l) => l.from === id);
  }
  function follow(id, sock) {
    const hit = outs(id).find((l) => !sock || l.fromSock === sock) || outs(id)[0];
    return hit ? node(hit.to) : null;
  }
  function startNode() {
    return (graph.nodes || []).find((n) => n.type === "story.start") || graph.nodes[0];
  }
  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function applySet(data) {
    const key = data.key || "x";
    const typ = data.type || "number";
    if (typ === "string") vars[key] = String(data.value ?? "");
    else if (typ === "bool") vars[key] = data.value === true || data.value === "true" || data.value === "1";
    else if ((data.op || "+") === "=") vars[key] = num(data.value);
    else vars[key] = num(vars[key]) + num(data.value);
  }
  function branchOk(data) {
    if (data.mode === "seen") return seen.has(data.nodeId || data.key);
    const typ = typeof vars[data.key || "x"];
    if (typ === "string") return String(vars[data.key]) === String(data.value ?? "");
    if (typ === "boolean") return Boolean(vars[data.key]) === (data.value === "1" || data.value === "true" || data.value === true);
    const left = num(vars[data.key || "x"]);
    const right = num(data.value);
    const cmp = data.cmp || ">=";
    if (cmp === ">") return left > right;
    if (cmp === "<") return left < right;
    if (cmp === "<=") return left <= right;
    if (cmp === "==") return left === right;
    return left >= right;
  }
  function clearChoices() {
    if (ui.choices) ui.choices.innerHTML = "";
  }
  function locText(key, fallback) {
    const loc = (window.Graph && Graph.state && Graph.state.localization) || {};
    const lang = loc.active || loc.source || "zh";
    const table = (loc.tables && loc.tables[lang]) || {};
    return (key && table[key]) || fallback || "";
  }
  function say(text, speaker) {
    const n = current;
    if (ui.text) ui.text.textContent = locText(n && n.id + ".text", text);
    if (ui.speaker) ui.speaker.textContent = locText(n && n.id + ".speaker", speaker);
  }
  function fadeTo(dir, ms) {
    const el = ui.fade;
    if (!el) return Promise.resolve();
    el.style.transition = `opacity ${ms || 600}ms`;
    el.style.opacity = dir === "out" ? "1" : "0";
    return new Promise((r) => setTimeout(r, Number(ms || 600)));
  }
  function playVideo(assetId, then) {
    skipVideo = false;
    if (!ui.video) {
      then();
      return;
    }
    if (!assetId) {
      ui.video.removeAttribute("src");
      then();
      return;
    }
    ui.video.src = media(assetId);
    ui.video.onended = () => then();
    ui.video.play().catch(() => {});
    waiting = () => {
      skipVideo = true;
      ui.video.pause();
      then();
    };
  }
  function waitClick(fn) {
    waiting = fn;
    if (!ui.choices) return;
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<i class="fa-solid fa-forward"></i>';
    b.onclick = () => {
      waiting = null;
      fn();
    };
    ui.choices.appendChild(b);
  }
  function enter(n) {
    const now = Date.now();
    if (now - chainAt > 250) chain = 0;
    chainAt = now;
    chain += 1;
    if (chain > 120) {
      stop();
      CineHost.toast((window.uiLang === "en") ? "Infinite loop stopped." : "检测到死循环，已停止预览。");
      CineHost.emit("runtime:loop");
      return;
    }
    current = n;
    waiting = null;
    clearChoices();
    if (!n) {
      if (frames.length) {
        const fr = frames.pop();
        if (fr.ret) enter(fr.ret);
        return;
      }
      say("");
      return;
    }
    if (n.type !== "meta.comment" && n.type !== "meta.reroute") seen.add(n.id);
    const data = n.data || {};
    const ctx = {
      node: n,
      data,
      vars,
      seen,
      ui,
      graph,
      follow: (sock) => follow(n.id, sock),
      enter,
      media,
      say,
      waitClick,
      playVideo,
      fadeTo,
      saveSlot,
      log: CineHost.log,
      time: CineHost.time,
    };
    const exec = CineHost.getExecutor && CineHost.getExecutor(n.type);
    if (exec) {
      try {
        exec(ctx);
      } catch (err) {
        CineHost.log("console", n.type + " " + err);
        CineHost.toast(String(err));
        stop();
      }
      return;
    }
    if (n.type === "story.start") {
      say(data.label || "");
      waitClick(() => enter(follow(n.id, "out")));
    } else if (n.type === "video.play") {
      say("");
      playVideo(data.assetId, () => enter(follow(n.id, "out")));
    } else if (n.type === "story.choice") {
      say(data.prompt || "");
      [["a", locText(n.id + ".optA", data.optA)], ["b", locText(n.id + ".optB", data.optB)], ["c", locText(n.id + ".optC", data.optC)]].forEach(([sock, label], i) => {
        if (!label) return;
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.idx = String(i + 1);
        b.textContent = `${i + 1}. ${label}`;
        b.onclick = () => enter(follow(n.id, sock));
        ui.choices.appendChild(b);
      });
    } else if (n.type === "story.setVar") {
      applySet(data);
      enter(follow(n.id, "out"));
    } else if (n.type === "story.branch") {
      enter(follow(n.id, branchOk(data) ? "yes" : "no"));
    } else if (n.type === "story.end") {
      say(data.title || "");
      saveSlot("1");
      if (ui.onEnd) ui.onEnd(data);
    } else if (n.type === "story.line") {
      say(data.text || "", data.speaker || "");
      waitClick(() => enter(follow(n.id, "out")));
    } else if (n.type === "story.wait") {
      if ((data.mode || "click") === "sec") {
        setTimeout(() => enter(follow(n.id, "out")), Number(data.sec || 1) * 1000);
      } else waitClick(() => enter(follow(n.id, "out")));
    } else if (n.type === "story.fade") {
      fadeTo(data.dir || "out", data.ms).then(() => enter(follow(n.id, "out")));
    } else if (n.type === "audio.bgm") {
      if (ui.bgm) {
        ui.bgm.loop = data.loop !== "0";
        ui.bgm.src = media(data.assetId);
        ui.bgm.play().catch(() => {});
      }
      enter(follow(n.id, "out"));
    } else if (n.type === "audio.sfx") {
      if (ui.sfx) {
        ui.sfx.src = media(data.assetId);
        ui.sfx.play().catch(() => {});
      }
      enter(follow(n.id, "out"));
    } else if (n.type === "story.checkpoint") {
      saveSlot(data.slot || "1");
      enter(follow(n.id, "out"));
    } else if (n.type === "meta.comment") {
      enter(follow(n.id, "out"));
    } else if (n.type === "meta.reroute") {
      enter(follow(n.id, "out"));
    } else if (n.type === "flow.sequence") {
      const pins = Array.isArray(data.pins) && data.pins.length
        ? data.pins
        : Array.from({ length: Math.max(2, Number(data.pinCount || 4)) }, (_, i) => ({ id: "t" + i }));
      pins.forEach((p) => {
        const nxt = follow(n.id, p.id);
        if (nxt) enter(nxt);
      });
    } else if (n.type === "user.function") {
      const fn = ((graph.library || {}).functions || []).find((x) => x.id === data.ref);
      if (!fn || !fn.nodes || !fn.nodes.length) {
        enter(follow(n.id, "out"));
        return;
      }
      frames.push({ nodes: fn.nodes, links: fn.links || [], ret: follow(n.id, "out") });
      const entry = fn.nodes.find((x) => x.id === fn.entry) || fn.nodes[0];
      enter(entry);
    } else if (n.type === "flow.forLoop") {
      let i = Number(data.first || 0);
      const last = Number(data.last || 0);
      const key = data.indexKey || "i";
      const run = () => {
        if (i > last) {
          enter(follow(n.id, "done"));
          return;
        }
        vars[key] = i;
        i += 1;
        const body = follow(n.id, "body");
        if (!body) {
          run();
          return;
        }
        enter(body);
      };
      run();
    } else if (n.type === "array.make") {
      vars[data.key || "list"] = String(data.items || "").split(",").map((s) => s.trim()).filter(Boolean);
      enter(follow(n.id, "out"));
    } else if (n.type === "array.get") {
      const arr = Array.isArray(vars[data.key]) ? vars[data.key] : [];
      vars[data.out || "item"] = arr[Number(data.index || 0)];
      enter(follow(n.id, "out"));
    } else if (n.type === "flow.timer") {
      const ms = Number(data.sec || 1) * 1000;
      const loop = data.loop === "1";
      const fire = () => {
        const pulse = follow(n.id, "tick");
        if (pulse) enter(pulse);
        enter(follow(n.id, "out"));
        if (loop) timers.push(setTimeout(fire, ms));
      };
      timers.push(setTimeout(fire, ms));
    } else if (n.type === "array.length") {
      const arr = Array.isArray(vars[data.key]) ? vars[data.key] : [];
      vars[data.out || "len"] = arr.length;
      enter(follow(n.id, "out"));
    } else waitClick(() => enter(follow(n.id, "out")));
  }

  async function saveSlot(slot) {
    try {
      await fetch("/api/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, node_id: current && current.id, vars, seen: [...seen] }),
      });
    } catch (e) {}
  }

  async function loadSlot(slot) {
    const data = await fetch("/api/saves").then((r) => r.json()).catch(() => null);
    const pack = data && data.slots && data.slots[slot || data.last];
    if (!pack) return false;
    vars = pack.vars || {};
    seen = new Set(pack.seen || []);
    enter(node(pack.node_id) || startNode());
    return true;
  }

  function input(key) {
    if (key === "Escape") {
      stop();
      return;
    }
    if (key === "s" || key === "S") {
      if (waiting) waiting();
      return;
    }
    if (key === " " || key === "Enter") {
      if (waiting) waiting();
      return;
    }
    if (["1", "2", "3"].includes(key) && ui.choices) {
      const b = ui.choices.querySelector(`[data-idx="${key}"]`);
      if (b) b.click();
    }
  }

  function stop() {
    current = null;
    waiting = null;
    clearChoices();
    say("");
    if (ui.video) {
      ui.video.pause();
      ui.video.removeAttribute("src");
      ui.video.load();
      ui.video.onended = null;
    }
    if (ui.bgm) ui.bgm.pause();
    if (ui.fade) ui.fade.style.opacity = "0";
    timers.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    timers = [];
    frames = [];
  }

  function start(g) {
    stop();
    reset(g);
    (graph.nodes || []).filter((n) => n.type === "flow.tick").forEach((n) => {
      const ms = Math.max(16, Number((n.data || {}).ms || 100));
      timers.push(setInterval(() => enter(follow(n.id, "out")), ms));
    });
    enter(startNode());
  }

  return { mount, start, stop, loadSlot, saveSlot, input, vars };
}
const PlayRuntime = createPlayRuntime();
PlayRuntime.create = createPlayRuntime;
window.PlayRuntime = PlayRuntime;
