const CineUI = (() => {
  function ensure() {
    if (document.getElementById("cineUiRoot")) return;
    const root = document.createElement("div");
    root.id = "cineUiRoot";
    root.innerHTML = `
      <div id="cineModalBg" class="modal-bg">
        <div class="modal cine-card" id="cineModal">
          <h3 id="cineModalTitle"></h3>
          <p class="muted" id="cineModalText"></p>
          <input id="cineModalInput" hidden />
          <div class="cine-progress" id="cineProgressWrap" hidden>
            <div class="cine-bar"><span id="cineBar"></span></div>
            <div class="muted" id="cineProgLabel"></div>
          </div>
          <div class="modal-actions" id="cineModalActions"></div>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.getElementById("cineModalBg").hidden = true;
  }

  function open() {
    ensure();
    const bg = document.getElementById("cineModalBg");
    bg.hidden = false;
    bg.classList.add("on");
  }
  function hide() {
    const bg = document.getElementById("cineModalBg");
    if (!bg) return;
    bg.classList.remove("on");
    bg.hidden = true;
  }

  function promptBox({ title, text, value, ok, cancel }) {
    return new Promise((resolve) => {
      ensure();
      document.getElementById("cineModalTitle").textContent = title || "";
      document.getElementById("cineModalText").textContent = text || "";
      const input = document.getElementById("cineModalInput");
      input.hidden = false;
      input.value = value || "";
      const extraHost = document.getElementById("cineModalExtra") || (() => {
        const d = document.createElement("div");
        d.id = "cineModalExtra";
        input.after(d);
        return d;
      })();
      extraHost.innerHTML = arguments[0].extraHtml || "";
      extraHost.querySelectorAll(".sf").forEach((lab) => {
        lab.onclick = () => {
          extraHost.querySelectorAll(".sf").forEach((x) => x.classList.remove("on"));
          lab.classList.add("on");
          const r = lab.querySelector("input");
          if (r) r.checked = true;
        };
      });
      document.getElementById("cineProgressWrap").hidden = true;
      const actions = document.getElementById("cineModalActions");
      actions.innerHTML = `
        <button type="button" class="soft" id="cineCancel">${cancel || "取消"}</button>
        <button type="button" class="primary" id="cineOk">${ok || "确定"}</button>`;
      open();
      input.focus();
      input.select();
      const done = (val) => {
        hide();
        resolve(val);
      };
      document.getElementById("cineOk").onclick = () => {
        const extra = document.getElementById("cineModalExtra");
        const platform = (document.querySelector("#cineModalExtra input[name=sf]:checked") || {}).value;
        if (extra && extra.innerHTML.trim()) done({ value: input.value.trim(), platform: platform || "exe" });
        else done(input.value.trim());
      };
      document.getElementById("cineCancel").onclick = () => done(null);
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          const extra = document.getElementById("cineModalExtra");
          const platform = (document.querySelector("#cineModalExtra input[name=sf]:checked") || {}).value;
          if (extra && extra.innerHTML.trim()) done({ value: input.value.trim(), platform: platform || "exe" });
          else done(input.value.trim());
        }
        if (e.key === "Escape") done(null);
      };
    });
  }

  function progress({ title }) {
    ensure();
    document.getElementById("cineModalTitle").textContent = title || "";
    document.getElementById("cineModalText").textContent = "";
    document.getElementById("cineModalInput").hidden = true;
    document.getElementById("cineProgressWrap").hidden = false;
    document.getElementById("cineModalActions").innerHTML = "";
    document.getElementById("cineBar").style.width = "0%";
    open();
    return {
      set(n, label) {
        document.getElementById("cineBar").style.width = Math.max(0, Math.min(100, n)) + "%";
        document.getElementById("cineProgLabel").textContent = label || "";
      },
      close() {
        hide();
      },
    };
  }

  function toast(msg) {
    CineHost.toast(msg);
  }

  window.alert = (msg) => {
    toast(String(msg));
  };
  window.prompt = () => null;
  window.confirm = () => false;

  function hexToRgba(hex, a) {
    let h = String(hex || "#2a5a8c").replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    if (!Number.isFinite(n)) return `rgba(42, 90, 140, ${a})`;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  function rgbaToHex(s) {
    const m = String(s).match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return "#2a5a8c";
    return "#" + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("");
  }
  function recentColors() {
    try {
      return JSON.parse(localStorage.getItem("cineforge-colors") || "[]");
    } catch (e) {
      return [];
    }
  }
  function pushColor(entry) {
    const list = recentColors().filter((c) => c.hex !== entry.hex);
    list.unshift(entry);
    localStorage.setItem("cineforge-colors", JSON.stringify(list.slice(0, 20)));
  }
  function pickColor({ title, hex, rgba, ok, cancel }) {
    return new Promise((resolve) => {
      ensure();
      const startHex = hex || rgbaToHex(rgba || "rgba(42,90,140,0.28)");
      const startA = (() => {
        const m = String(rgba || "").match(/,\s*([0-9.]+)\s*\)$/);
        return m ? Number(m[1]) : 0.28;
      })();
      document.getElementById("cineModalTitle").textContent = title || "颜色";
      document.getElementById("cineModalInput").hidden = true;
      document.getElementById("cineProgressWrap").hidden = true;
      const rec = recentColors();
      document.getElementById("cineModalText").innerHTML = `
        <div class="color-pick">
          <input type="color" id="cineHexPick" value="${startHex}" />
          <label class="field"><span>HEX</span><input id="cineHex" class="field-input" value="${startHex}" /></label>
          <label class="field"><span>RGBA</span><input id="cineRgba" class="field-input" value="${hexToRgba(startHex, startA)}" /></label>
          <label class="field"><span>A</span><input id="cineAlpha" class="field-input" type="number" min="0" max="1" step="0.05" value="${startA}" /></label>
          <div class="swatches">${rec.map((c) => `<button type="button" class="swatch" data-hex="${c.hex}" data-rgba="${c.rgba}" style="background:${c.hex}"></button>`).join("")}</div>
        </div>`;
      document.getElementById("cineModalActions").innerHTML = `
        <button type="button" class="soft" id="cineCancel">${cancel || "取消"}</button>
        <button type="button" class="primary" id="cineOk">${ok || "确定"}</button>`;
      const hexEl = document.getElementById("cineHex");
      const rgbaEl = document.getElementById("cineRgba");
      const aEl = document.getElementById("cineAlpha");
      const pick = document.getElementById("cineHexPick");
      const sync = (h, a) => {
        hexEl.value = h;
        pick.value = h;
        rgbaEl.value = hexToRgba(h, Number(aEl.value || a || 0.28));
      };
      pick.oninput = () => sync(pick.value, aEl.value);
      hexEl.oninput = () => sync(hexEl.value, aEl.value);
      aEl.oninput = () => sync(hexEl.value, aEl.value);
      rgbaEl.oninput = () => {
        hexEl.value = rgbaToHex(rgbaEl.value);
        pick.value = hexEl.value;
      };
      document.querySelectorAll(".swatch").forEach((b) => {
        b.onclick = () => {
          hexEl.value = b.dataset.hex;
          rgbaEl.value = b.dataset.rgba;
          pick.value = b.dataset.hex;
        };
      });
      open();
      const done = (val) => {
        document.getElementById("cineModalText").textContent = "";
        hide();
        resolve(val);
      };
      document.getElementById("cineOk").onclick = () => {
        const entry = { hex: hexEl.value, rgba: rgbaEl.value };
        pushColor(entry);
        done(entry);
      };
      document.getElementById("cineCancel").onclick = () => done(null);
    });
  }

  return { prompt: promptBox, progress, toast, hide, pickColor };
})();
window.CineUI = CineUI;
