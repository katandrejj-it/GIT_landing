(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════
     CONSTANTS & STATE
  ═══════════════════════════════════════════════════════════ */
  const PANEL_ID = "__vdt8__";
  const INJECT_ID = "__vdt8_styles__";

  let isInspectMode = false;
  let isResetMode = false;
  let selectedEl = null;

  // Persisted changes
  const changes = {
    variables: {}, // { '--varName': '#hex' }
    gradients: {}, // { '--varName': [stops] }
    overrides: [], // [{ selector, prop, value }]
  };

  /* ═══════════════════════════════════════════════════════════
     INJECT TARGET STYLESHEET  (before </head>)
  ═══════════════════════════════════════════════════════════ */
  function getInjectStyle() {
    let el = document.getElementById(INJECT_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = INJECT_ID;
      // Insert as LAST element of <head> so it wins specificity
      document.head.appendChild(el);
    }
    return el;
  }

  function rebuildInjectCSS() {
    const el = getInjectStyle();
    const lines = [];

    // CSS variables
    const varEntries = Object.entries(changes.variables);
    if (varEntries.length) {
      lines.push(":root {");
      varEntries.forEach(([k, v]) => lines.push(`  ${k}: ${v};`));
      lines.push("}");
    }

    // Override rules
    changes.overrides.forEach((o) => {
      lines.push(`${o.selector} { ${o.prop}: ${o.value} !important; }`);
    });

    el.textContent = lines.join("\n");
  }

  /* ═══════════════════════════════════════════════════════════
     COLOR HELPERS
  ═══════════════════════════════════════════════════════════ */
  function rgbToHex(rgb) {
    if (!rgb) return "#000000";
    const clean = rgb.trim();
    if (clean.startsWith("#")) return clean.slice(0, 7);
    const m = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return "#000000";
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map((n) => parseInt(n).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function isValidHex(v) {
    return /^#[0-9a-fA-F]{6}$/.test(v);
  }

  /* Parse gradient stops from a CSS gradient string.
     Returns { fn, angle, stops: [{color, pos}] } or null */
  function parseGradient(str) {
    if (!str || !str.includes("gradient")) return null;
    const fnMatch = str.match(/^([\w-]+gradient)\s*\(([\s\S]+)\)$/);
    if (!fnMatch) return null;
    const fn = fnMatch[1];
    const raw = fnMatch[2].trim();

    // Split outer commas (not inside parens)
    const parts = [];
    let depth = 0,
      cur = "";
    for (const ch of raw) {
      if (ch === "(") {
        depth++;
        cur += ch;
      } else if (ch === ")") {
        depth--;
        cur += ch;
      } else if (ch === "," && depth === 0) {
        parts.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    parts.push(cur.trim());

    // First part is angle/direction if it matches
    let angle = "135deg";
    let stopStart = 0;
    if (/^(to\s|[\d.]+deg|[\d.]+turn|[\d.]+rad)/.test(parts[0])) {
      angle = parts[0];
      stopStart = 1;
    }

    const stops = [];
    for (let i = stopStart; i < parts.length; i++) {
      const p = parts[i];
      // Try to extract color and optional position
      const colorRe = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)\s*([\d.]+%)?/;
      const cm = p.match(colorRe);
      if (cm) {
        stops.push({ color: cm[1], pos: cm[2] || "" });
      }
    }
    if (!stops.length) return null;
    return { fn, angle, stops };
  }

  function rebuildGradient(parsed) {
    const stopStr = parsed.stops
      .map((s) => (s.pos ? `${s.color} ${s.pos}` : s.color))
      .join(", ");
    return `${parsed.fn}(${parsed.angle}, ${stopStr})`;
  }

  /* ═══════════════════════════════════════════════════════════
     CSS VARIABLE SCANNER
  ═══════════════════════════════════════════════════════════ */
  function scanAllCSSVars() {
    const lightVars = {};
    const darkVars = {};
    const allFound = new Map(); // varName → {light, dark}

    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        const sel = rule.selectorText || "";
        const isDark =
          sel.includes(".dark") ||
          sel.includes('[data-theme="dark"]') ||
          sel.includes(":root.dark") ||
          sel.includes("html.dark");
        const isRoot = sel === ":root" || sel === "html" || sel === "body";

        if (isRoot || isDark) {
          for (const prop of rule.style) {
            if (!prop.startsWith("--")) continue;
            const val = rule.style.getPropertyValue(prop).trim();
            if (!allFound.has(prop))
              allFound.set(prop, { light: null, dark: null });
            const entry = allFound.get(prop);
            if (isDark) entry.dark = val;
            else entry.light = val;
          }
        }
      }
    }
    return allFound;
  }

  /* Scan all unique color values used in computed styles across the page */
  function scanPageColors() {
    const colorProps = [
      "color",
      "backgroundColor",
      "borderColor",
      "outlineColor",
      "fill",
      "stroke",
    ];
    const found = new Map(); // hex -> Set of selectors

    document.querySelectorAll("*").forEach((el) => {
      if (el.closest("#" + PANEL_ID)) return;
      const st = window.getComputedStyle(el);
      colorProps.forEach((prop) => {
        const val = st[prop];
        if (!val || val === "transparent" || val === "rgba(0, 0, 0, 0)") return;
        const hex = rgbToHex(val);
        if (!found.has(hex)) found.set(hex, new Set());
        found.get(hex).add(getShortSelector(el));
      });
    });
    return found;
  }

  /* ═══════════════════════════════════════════════════════════
     ELEMENT HELPERS
  ═══════════════════════════════════════════════════════════ */
  function getShortSelector(el) {
    if (el.id) return "#" + el.id;
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === "string") {
      const c = el.className
        .split(" ")
        .filter((x) => x && !x.includes("highlight") && !x.includes("__vdt"))
        .slice(0, 3)
        .join(".");
      if (c) s += "." + c;
    }
    return s;
  }

  /* Detect which CSS variable (if any) is responsible for a property on an element.
     Walks up the matched CSS rules and checks for var(--xxx) usage. */
  function detectCSSVar(el, cssProp) {
    // cssProp: 'color' | 'background-color' | 'background' etc.
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        try {
          if (!el.matches(rule.selectorText)) continue;
        } catch {
          continue;
        }
        const val = rule.style.getPropertyValue(cssProp);
        if (val && val.includes("var(")) {
          // Extract var name
          const m = val.match(/var\(\s*(--[\w-]+)/);
          if (m) return m[1];
        }
      }
    }
    // Also check inline style
    const inline = el.style.getPropertyValue(cssProp);
    if (inline && inline.includes("var(")) {
      const m = inline.match(/var\(\s*(--[\w-]+)/);
      if (m) return m[1];
    }
    return null;
  }

  /* Extract alpha (0-1) from computed rgb/rgba string */
  function getAlpha(rgba) {
    if (!rgba) return 1;
    const m = rgba.match(
      /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)/,
    );
    return m ? parseFloat(m[1]) : 1;
  }

  /* Try to get the RAW (un-computed) background value from CSS rules — needed for rgba() */
  function getRawCSSValue(el, prop) {
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        try {
          if (!el.matches(rule.selectorText)) continue;
        } catch {
          continue;
        }
        const v = rule.style.getPropertyValue(prop);
        if (v && v.trim()) return v.trim();
      }
    }
    return null;
  }

  /* Get the REAL computed background — handles gradient text, rgba, transparent, etc */
  function getElementColors(el) {
    const st = window.getComputedStyle(el);
    const bgImage = st.backgroundImage;
    const bgColor = st.backgroundColor; // always resolved rgb/rgba by browser
    const color = st.color;
    const webkitFill = st.webkitTextFillColor;
    const boxShadow = st.boxShadow;

    // Detect if color/background is driven by a CSS variable
    const colorVar = detectCSSVar(el, "color");
    const bgVar =
      detectCSSVar(el, "background-color") || detectCSSVar(el, "background");

    // Transparency: computed style collapses rgba alpha too
    const bgTransparent =
      !bgColor || bgColor === "transparent" || bgColor === "rgba(0, 0, 0, 0)";

    // Alpha channel from computed bg (e.g. rgba(245,242,238,0.85) → 0.85)
    const bgAlpha = bgTransparent ? 1 : getAlpha(bgColor);
    const bgHasAlpha = bgAlpha < 0.999;

    return {
      bgIsGradient:
        bgImage && bgImage !== "none" && bgImage.includes("gradient"),
      bgGradient: bgImage && bgImage !== "none" ? bgImage : null,
      bgColor: bgTransparent ? null : bgColor,
      bgTransparent,
      bgAlpha,
      bgHasAlpha,
      color,
      textIsGradient:
        webkitFill === "transparent" || webkitFill === "rgba(0, 0, 0, 0)",
      colorVar,
      bgVar,
      boxShadow,
    };
  }

  /* Detect existing override for a selector+prop */
  function getOverride(sel, prop) {
    return changes.overrides.find((o) => o.selector === sel && o.prop === prop);
  }

  function setOverride(sel, prop, value) {
    const ex = getOverride(sel, prop);
    if (ex) ex.value = value;
    else changes.overrides.push({ selector: sel, prop, value });
    rebuildInjectCSS();
  }

  function removeOverride(sel, prop) {
    changes.overrides = changes.overrides.filter(
      (o) => !(o.selector === sel && o.prop === prop),
    );
    rebuildInjectCSS();
  }

  /* ═══════════════════════════════════════════════════════════
     PANEL SHADOW DOM  (fully isolated from page CSS)
  ═══════════════════════════════════════════════════════════ */
  const host = document.createElement("div");
  host.id = PANEL_ID;
  host.style.cssText =
    "all:initial;position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const panelCSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :host { all: initial; }

    #vdt-wrap {
      position: fixed;
      top: 12px;
      right: 12px;
      width: 340px;
      background: #18181b;
      color: #e4e4e7;
      border: 1px solid #3f3f46;
      border-radius: 14px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      pointer-events: all;
      user-select: none;
      max-height: calc(100vh - 24px);
      overflow: hidden;
    }

    /* Header */
    .hdr {
      padding: 9px 12px;
      background: #09090b;
      border-bottom: 1px solid #27272a;
      cursor: move;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 14px 14px 0 0;
      flex-shrink: 0;
    }
    .hdr-title { font-size: 10px; color: #71717a; letter-spacing: 0.12em; text-transform: uppercase; }
    .hdr-badge { background: #007aff; color: #fff; font-size: 9px; padding: 2px 7px; border-radius: 20px; letter-spacing: 0.08em; }

    /* Tabs */
    .tabs { display: flex; background: #09090b; border-bottom: 1px solid #27272a; flex-shrink: 0; }
    .tab {
      flex: 1; padding: 9px 4px; border: none; color: #71717a;
      cursor: pointer; font-size: 9px; text-transform: uppercase;
      letter-spacing: 0.1em; background: none; transition: color .2s;
    }
    .tab.active { color: #fff; border-bottom: 2px solid #007aff; }
    .tab:hover:not(.active) { color: #a1a1aa; }

    /* Content area */
    .pane {
      padding: 12px;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    .pane::-webkit-scrollbar { width: 4px; }
    .pane::-webkit-scrollbar-track { background: transparent; }
    .pane::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }

    /* Footer */
    .footer {
      padding: 10px 12px;
      background: #09090b;
      border-top: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    .footer-row { display: flex; gap: 6px; }

    /* Buttons */
    .btn {
      padding: 7px 10px; border: none; border-radius: 7px;
      cursor: pointer; font-size: 10px; font-weight: 600;
      letter-spacing: 0.05em; transition: filter .15s, opacity .15s;
      flex: 1;
    }
    .btn:hover { filter: brightness(1.15); }
    .btn:active { opacity: .8; }
    .btn-blue   { background: #007aff; color: #fff; }
    .btn-red    { background: #ff3b30; color: #fff; }
    .btn-green  { background: #30d158; color: #000; }
    .btn-gray   { background: #3f3f46; color: #e4e4e7; }
    .btn-yellow { background: #ffd60a; color: #000; }
    .btn-full   { width: 100%; }

    /* Rows */
    .row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
    .lbl { font-size: 10px; color: #a1a1aa; flex-shrink: 0; min-width: 80px; }

    /* Color inputs */
    .color-group { display: flex; align-items: center; gap: 5px; flex: 1; justify-content: flex-end; }
    input[type="color"] {
      width: 26px; height: 26px; border: 1px solid #3f3f46; border-radius: 6px;
      cursor: pointer; padding: 0; background: none; flex-shrink: 0;
    }
    input[type="text"].hex {
      background: #27272a; border: 1px solid #3f3f46; color: #e4e4e7;
      font-size: 10px; padding: 4px 6px; width: 68px; border-radius: 5px;
      text-align: center; font-family: inherit;
    }
    input[type="range"] {
      flex: 1; height: 4px; cursor: pointer; accent-color: #007aff;
    }

    /* Section labels */
    .sec-title {
      font-size: 9px; color: #52525b; text-transform: uppercase;
      letter-spacing: 0.12em; margin-bottom: 8px; margin-top: 4px;
      padding-bottom: 4px; border-bottom: 1px solid #27272a;
    }

    /* Theme badge row */
    .theme-row {
      display: flex; gap: 6px; margin-bottom: 10px; align-items: center;
    }
    .theme-badge {
      padding: 3px 9px; border-radius: 20px; font-size: 9px;
      cursor: pointer; border: 1px solid #3f3f46; background: #27272a; color: #a1a1aa;
      transition: all .15s;
    }
    .theme-badge.active { background: #007aff; color: #fff; border-color: #007aff; }

    /* Gradient stop pill */
    .stop-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; background: #27272a; border-radius: 7px; padding: 6px 8px; }
    .stop-idx { font-size: 9px; color: #52525b; min-width: 18px; }

    /* Inspector info */
    .insp-info { font-size: 9px; color: #007aff; word-break: break-all; margin-bottom: 8px; background: #0a192f; padding: 5px 8px; border-radius: 6px; }

    /* Shadow box */
    .shadow-box { background: #27272a; border-radius: 8px; padding: 10px; margin-top: 6px; }
    .shadow-box .sec-title { border-bottom-color: #3f3f46; }

    /* Color swatch grid for page colors */
    .swatch-grid { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
    .swatch {
      width: 24px; height: 24px; border-radius: 5px; cursor: pointer;
      border: 1px solid rgba(255,255,255,.1); transition: transform .15s;
      flex-shrink: 0;
    }
    .swatch:hover { transform: scale(1.2); }
    .swatch.expanded { outline: 2px solid #007aff; }

    /* Expanded swatch editor */
    .swatch-editor { background: #27272a; border-radius: 7px; padding: 8px; margin-bottom: 8px; }
    .swatch-editor .row { margin-bottom: 4px; }
    .swatch-sel-hint { font-size: 9px; color: #52525b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Mode indicator */
    .mode-bar {
      background: #1c1917; border: 1px solid #44403c; border-radius: 7px;
      padding: 6px 10px; margin-bottom: 8px; font-size: 9px; color: #78716c;
      display: flex; align-items: center; gap: 6px;
    }
    .mode-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .mode-dot.blue { background: #007aff; }
    .mode-dot.red  { background: #ff3b30; }
    .mode-dot.off  { background: #3f3f46; }

    /* Empty state */
    .empty { color: #52525b; font-size: 10px; text-align: center; padding: 20px 0; }
  `;

  shadow.innerHTML = `
    <style>${panelCSS}</style>
    <div id="vdt-wrap">
      <div class="hdr" id="vdt-hdr">
        <span class="hdr-title">Visual Designer</span>
        <span class="hdr-badge">v8.2</span>
      </div>
      <div class="tabs">
        <button class="tab active" data-tab="globals">Глобальные</button>
        <button class="tab" data-tab="manual">Ручной</button>
        <button class="tab" data-tab="colors">Цвета</button>
      </div>

      <!-- GLOBALS PANE -->
      <div class="pane" id="pane-globals">
        <div class="sec-title">CSS переменные — Светлая тема</div>
        <div id="vars-light"></div>
        <div class="sec-title" style="margin-top:10px;">CSS переменные — Тёмная тема</div>
        <div id="vars-dark"></div>
        <button class="btn btn-red btn-full" id="btn-clear" style="margin-top:10px;">Сбросить все изменения</button>
      </div>

      <!-- MANUAL PANE -->
      <div class="pane" id="pane-manual" style="display:none;">
        <div class="mode-bar" id="mode-bar">
          <div class="mode-dot off" id="mode-dot"></div>
          <span id="mode-text">Нет активного режима</span>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <button class="btn btn-blue" id="btn-insp">Выбрать элемент</button>
          <button class="btn btn-red" id="btn-reset-el">Сбросить стили</button>
        </div>
        <div id="editor" style="display:none;">
          <div class="insp-info" id="insp-info"></div>
          <div id="editor-ctrls"></div>
        </div>
      </div>

      <!-- COLORS PANE -->
      <div class="pane" id="pane-colors" style="display:none;">
        <button class="btn btn-blue btn-full" id="btn-scan" style="margin-bottom:10px;">Сканировать цвета страницы</button>
        <div id="scan-results"><div class="empty">Нажмите «Сканировать» чтобы найти все цвета</div></div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-row">
          <button class="btn btn-gray" id="btn-stop">⏸ Стоп слайдер</button>
          <button class="btn btn-green" id="btn-start">▶ Старт слайдер</button>
        </div>
        <div class="footer-row">
          <button class="btn btn-blue" id="btn-exp">Экспорт JSON</button>
          <button class="btn btn-yellow" id="btn-imp">Импорт JSON</button>
        </div>
      </div>
    </div>
    <input type="file" id="imp-file" accept=".json" style="display:none;">
  `;

  /* ═══════════════════════════════════════════════════════════
     OVERLAY (outside shadow, full page)
  ═══════════════════════════════════════════════════════════ */
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;display:none;cursor:crosshair;";
  document.body.appendChild(overlay);

  let lastHovered = null;
  overlay.addEventListener("mousemove", (e) => {
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = "";
    if (!el || el.closest("#" + PANEL_ID)) return;
    if (lastHovered && lastHovered !== el) {
      lastHovered.style.removeProperty("outline");
    }
    el.style.outline = isResetMode ? "3px solid #ff3b30" : "3px solid #007aff";
    el.style.outlineOffset = "-3px";
    lastHovered = el;
  });

  overlay.addEventListener("click", (e) => {
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = "";
    if (!el || el.closest("#" + PANEL_ID)) return;
    if (lastHovered) {
      lastHovered.style.removeProperty("outline");
      lastHovered = null;
    }
    stopModes();

    if (isResetMode) {
      const sel = getShortSelector(el);
      el.style.removeProperty("background");
      el.style.removeProperty("color");
      el.style.removeProperty("box-shadow");
      changes.overrides = changes.overrides.filter((o) => o.selector !== sel);
      rebuildInjectCSS();
    } else {
      selectedEl = el;
      buildEditor(el);
    }
  });

  function stopModes() {
    isInspectMode = false;
    isResetMode = false;
    overlay.style.display = "none";
    if (lastHovered) {
      lastHovered.style.removeProperty("outline");
      lastHovered = null;
    }
    updateModeBar();
  }

  function updateModeBar() {
    const dot = shadow.getElementById("mode-dot");
    const text = shadow.getElementById("mode-text");
    if (isInspectMode) {
      dot.className = "mode-dot blue";
      text.textContent = "Режим выбора элемента — кликните на элемент";
    } else if (isResetMode) {
      dot.className = "mode-dot red";
      text.textContent = "Режим сброса — кликните на элемент";
    } else {
      dot.className = "mode-dot off";
      text.textContent = "Нет активного режима";
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TABS
  ═══════════════════════════════════════════════════════════ */
  const panes = {
    globals: "pane-globals",
    manual: "pane-manual",
    colors: "pane-colors",
  };

  shadow.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      shadow
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      Object.values(panes).forEach((id) => {
        shadow.getElementById(id).style.display = "none";
      });
      shadow.getElementById(panes[tab]).style.display = "block";
      stopModes();
      if (tab === "globals") buildGlobals();
    });
  });

  /* ═══════════════════════════════════════════════════════════
     GLOBALS TAB
  ═══════════════════════════════════════════════════════════ */
  function buildGlobals() {
    const allVars = scanAllCSSVars();
    renderVarList(shadow.getElementById("vars-light"), allVars, false);
    renderVarList(shadow.getElementById("vars-dark"), allVars, true);
  }

  function renderVarList(container, allVars, isDark) {
    container.innerHTML = "";
    const root = document.documentElement;
    // Temporarily toggle dark class to read dark vars
    const wasDark = root.classList.contains("dark");

    if (isDark && !wasDark) root.classList.add("dark");
    if (!isDark && wasDark) root.classList.remove("dark");

    for (const [name, entry] of allVars) {
      const rawVal =
        entry[isDark ? "dark" : "light"] ||
        getComputedStyle(root).getPropertyValue(name).trim();
      if (!rawVal) continue;

      // Determine type
      const isColorVar = /^#|^rgb|^hsl/.test(rawVal.trim());
      const isGradVar = rawVal.includes("gradient");
      if (!isColorVar && !isGradVar) continue;

      const row = document.createElement("div");

      if (isGradVar) {
        const parsed = parseGradient(rawVal);
        if (parsed) {
          row.innerHTML = `<div class="sec-title" style="margin-top:6px;margin-bottom:6px;border:none;color:#a1a1aa;">${name} <span style="color:#52525b;">(gradient)</span></div>`;
          parsed.stops.forEach((stop, i) => {
            const hex = stop.color.startsWith("#")
              ? stop.color
              : rgbToHex(stop.color);
            const sr = document.createElement("div");
            sr.className = "stop-row";
            sr.innerHTML = `
              <span class="stop-idx">#${i + 1}</span>
              <div class="color-group" style="flex:1;">
                <input type="text" class="hex" value="${hex}">
                <input type="color" value="${hex}">
              </div>
              <span style="font-size:9px;color:#52525b;">${stop.pos || ""}</span>
            `;
            const cp = sr.querySelector('input[type="color"]');
            const tx = sr.querySelector('input[type="text"]');
            const update = (nv) => {
              if (!isValidHex(nv)) return;
              parsed.stops[i].color = nv;
              cp.value = nv;
              tx.value = nv.toUpperCase();
              const newGrad = rebuildGradient(parsed);
              root.style.setProperty(name, newGrad);
              if (isDark) changes.variablesDark[name] = newGrad;
              else changes.variablesLight[name] = newGrad;
              rebuildInjectCSS();
            };
            cp.addEventListener("input", (e) => update(e.target.value));
            tx.addEventListener("change", (e) => update(e.target.value));
            row.appendChild(sr);
          });
        }
      } else {
        // Compute the LIVE value (not from sheet, which may be un-resolved)
        const liveVal = getComputedStyle(root).getPropertyValue(name).trim();
        const hex = rgbToHex(liveVal) || rgbToHex(rawVal);
        row.className = "row";
        row.innerHTML = `
          <span class="lbl" title="${name}">${name}</span>
          <div class="color-group">
            <input type="text" class="hex" value="${hex.toUpperCase()}">
            <input type="color" value="${hex}">
          </div>
        `;
        const cp = row.querySelector('input[type="color"]');
        const tx = row.querySelector('input[type="text"]');
        const update = (nv) => {
          if (!isValidHex(nv)) return;
          if (isDark) {
            // Apply live: temporarily ensure dark class is on so setProperty hits the right cascade
            const wasDarkNow = root.classList.contains("dark");
            if (!wasDarkNow) root.classList.add("dark");
            root.style.setProperty(name, nv);
            if (!wasDarkNow) root.classList.remove("dark");
            // CRITICAL: also write directly to root inline so computed style picks it up
            // We track it in variablesDark for the inject <style> block
            changes.variablesDark[name] = nv;
          } else {
            root.style.setProperty(name, nv);
            changes.variablesLight[name] = nv;
          }
          rebuildInjectCSS();
          cp.value = nv;
          tx.value = nv.toUpperCase();
        };
        cp.addEventListener("input", (e) => update(e.target.value));
        tx.addEventListener("change", (e) => update(e.target.value));
      }

      container.appendChild(row);
    }

    // Restore dark state
    if (isDark && !wasDark) root.classList.remove("dark");
    if (!isDark && wasDark) root.classList.add("dark");

    if (!container.children.length) {
      container.innerHTML = `<div class="empty">Переменных не найдено</div>`;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MANUAL EDITOR
  ═══════════════════════════════════════════════════════════ */
  // UID counter for unique per-element selectors
  let vdtUidCounter = 1;

  function buildEditor(el) {
    const editor = shadow.getElementById("editor");
    const ctrls = shadow.getElementById("editor-ctrls");
    const info = shadow.getElementById("insp-info");
    editor.style.display = "block";
    ctrls.innerHTML = "";

    const shortSel = getShortSelector(el);
    info.textContent = shortSel;

    const colors = getElementColors(el);
    const sel = shortSel; // kept for gradient overrides that are selector-based

    // Assign a unique data attribute to THIS element so unlink/color overrides
    // target ONLY this specific DOM node and nothing else with the same class combo
    if (!el.dataset.vdtUid) {
      el.dataset.vdtUid = "u" + vdtUidCounter++;
    }
    const uniqueSel = '[data-vdt-uid="' + el.dataset.vdtUid + '"]';

    // ── BACKGROUND ──────────────────────────────────────────
    const bgTitle = document.createElement("div");
    bgTitle.className = "sec-title";
    bgTitle.textContent = colors.bgIsGradient ? "Фон (градиент)" : "Фон";
    ctrls.appendChild(bgTitle);

    if (colors.bgIsGradient && colors.bgGradient) {
      const parsed = parseGradient(colors.bgGradient);
      if (parsed) {
        // Angle row
        const angleRow = document.createElement("div");
        angleRow.className = "row";
        angleRow.innerHTML = `
          <span class="lbl">Угол</span>
          <input type="text" class="hex" style="width:80px;" value="${parsed.angle}">
        `;
        const angleInput = angleRow.querySelector("input");
        angleInput.addEventListener("change", () => {
          parsed.angle = angleInput.value;
          applyGradBg();
        });
        ctrls.appendChild(angleRow);

        // Stop rows
        parsed.stops.forEach((stop, i) => {
          const hexVal = stop.color.startsWith("#")
            ? stop.color
            : rgbToHex(stop.color);
          const sr = document.createElement("div");
          sr.className = "stop-row";
          sr.innerHTML = `
            <span class="stop-idx">#${i + 1}</span>
            <div class="color-group" style="flex:1;">
              <input type="text" class="hex" value="${hexVal.toUpperCase()}">
              <input type="color" value="${hexVal}">
            </div>
          `;
          const cp = sr.querySelector('input[type="color"]');
          const tx = sr.querySelector('input[type="text"]');
          const upd = (nv) => {
            if (!isValidHex(nv)) return;
            parsed.stops[i].color = nv;
            cp.value = nv;
            tx.value = nv.toUpperCase();
            applyGradBg();
          };
          cp.addEventListener("input", (e) => upd(e.target.value));
          tx.addEventListener("change", (e) => upd(e.target.value));
          ctrls.appendChild(sr);
        });

        function applyGradBg() {
          const newGrad = rebuildGradient(parsed);
          el.style.setProperty("background", newGrad, "important");
          if (colors.textIsGradient) {
            el.style.setProperty(
              "-webkit-background-clip",
              "text",
              "important",
            );
            el.style.setProperty("background-clip", "text", "important");
            el.style.setProperty(
              "-webkit-text-fill-color",
              "transparent",
              "important",
            );
          }
          setOverride(uniqueSel, "background", newGrad);
          if (colors.textIsGradient) {
            setOverride(uniqueSel, "-webkit-background-clip", "text");
            setOverride(uniqueSel, "background-clip", "text");
            setOverride(uniqueSel, "-webkit-text-fill-color", "transparent");
          }
        }
      }
    } else {
      // Solid background — may have alpha (e.g. rgba(245,242,238,0.85))
      if (colors.bgHasAlpha) {
        // Show color + separate alpha slider
        const bgTitle2 = document.createElement("div");
        bgTitle2.className = "sec-title";
        bgTitle2.textContent = "Фон (с прозрачностью)";
        bgTitle2.style.marginBottom = "4px";
        // replace the previous bgTitle
        if (ctrls.lastChild === bgTitle) ctrls.removeChild(bgTitle);
        ctrls.appendChild(bgTitle2);

        let currentBgHex = colors.bgColor
          ? rgbToHex(colors.bgColor)
          : "#000000";
        let currentAlpha = colors.bgAlpha;

        const alphaWrap = document.createElement("div");
        alphaWrap.style.cssText = "margin-bottom:8px;";

        // Color row
        const colorRow = document.createElement("div");
        colorRow.className = "row";
        colorRow.innerHTML =
          '<span class="lbl">Цвет</span>' +
          '<div class="color-group">' +
          '<input type="text" class="hex" id="bg-hex" value="' +
          currentBgHex.toUpperCase() +
          '">' +
          '<input type="color" id="bg-cp" value="' +
          currentBgHex +
          '">' +
          "</div>";
        alphaWrap.appendChild(colorRow);

        // Alpha row
        const alphaRow = document.createElement("div");
        alphaRow.className = "row";
        alphaRow.innerHTML =
          '<span class="lbl">Прозрачность</span>' +
          '<input type="range" id="bg-alpha" min="0" max="1" step="0.01" value="' +
          currentAlpha +
          '">' +
          '<span id="bg-alpha-val" style="font-size:10px;color:#a1a1aa;min-width:32px;text-align:right;">' +
          Math.round(currentAlpha * 100) +
          "%</span>";
        alphaWrap.appendChild(alphaRow);

        ctrls.appendChild(alphaWrap);

        if (colors.bgVar) {
          const badge = document.createElement("div");
          badge.style.cssText =
            "display:flex;align-items:center;gap:5px;margin-bottom:6px;";
          badge.innerHTML =
            '<span style="font-size:9px;color:#71717a;flex:1;">Привязан к</span>' +
            '<span style="background:#1c3553;color:#60a5fa;font-size:9px;padding:2px 7px;border-radius:4px;font-family:monospace;">' +
            colors.bgVar +
            "</span>" +
            '<button class="unlink-btn" style="background:#3f3f46;color:#e4e4e7;border:none;border-radius:5px;padding:3px 8px;font-size:9px;cursor:pointer;font-weight:600;">&#x26D3; Отвязать</button>';
          badge.querySelector(".unlink-btn").addEventListener("click", () => {
            applyRgbaBg();
            badge.style.display = "none";
          });
          ctrls.appendChild(badge);
        }

        function applyRgbaBg() {
          const val =
            "rgba(" +
            parseInt(currentBgHex.slice(1, 3), 16) +
            "," +
            parseInt(currentBgHex.slice(3, 5), 16) +
            "," +
            parseInt(currentBgHex.slice(5, 7), 16) +
            "," +
            currentAlpha +
            ")";
          el.style.setProperty("background", val, "important");
          setOverride(uniqueSel, "background", val);
        }

        const bgCp = alphaWrap.querySelector("#bg-cp");
        const bgTx = alphaWrap.querySelector("#bg-hex");
        const bgAl = alphaWrap.querySelector("#bg-alpha");
        const bgAlVal = alphaWrap.querySelector("#bg-alpha-val");

        bgCp.addEventListener("input", (e) => {
          currentBgHex = e.target.value;
          bgTx.value = currentBgHex.toUpperCase();
          applyRgbaBg();
        });
        bgTx.addEventListener("change", (e) => {
          if (isValidHex(e.target.value)) {
            currentBgHex = e.target.value;
            bgCp.value = currentBgHex;
            applyRgbaBg();
          }
        });
        bgAl.addEventListener("input", (e) => {
          currentAlpha = parseFloat(e.target.value);
          bgAlVal.textContent = Math.round(currentAlpha * 100) + "%";
          applyRgbaBg();
        });
      } else {
        addSolidRow(
          ctrls,
          "Фон",
          colors.bgColor,
          (nv) => {
            el.style.setProperty("background", nv, "important");
            setOverride(uniqueSel, "background", nv);
          },
          colors.bgVar,
        );
      }
    }

    // ── TEXT COLOR ──────────────────────────────────────────
    if (!colors.textIsGradient) {
      const txTitle = document.createElement("div");
      txTitle.className = "sec-title";
      txTitle.style.marginTop = "10px";
      txTitle.textContent = "Цвет текста";
      ctrls.appendChild(txTitle);
      // Pass colorVar so user can unlink element from CSS variable like var(--gold)
      addSolidRow(
        ctrls,
        "Текст",
        colors.color,
        (nv) => {
          el.style.setProperty("color", nv, "important");
          setOverride(uniqueSel, "color", nv);
        },
        colors.colorVar,
      );
    } else {
      const hint = document.createElement("div");
      hint.className = "insp-info";
      hint.style.marginTop = "6px";
      hint.textContent = "Текст: градиентная заливка — изменяйте стопы выше";
      ctrls.appendChild(hint);
    }

    // ── SHADOW ─────────────────────────────────────────────
    buildShadowSection(ctrls, el, uniqueSel);
  }

  /* varName: if set, shows a CSS var badge + Отвязать button that hard-codes
     the computed color as !important so the element stops inheriting the variable */
  function addSolidRow(container, label, computedColor, onChange, varName) {
    const rawHex =
      computedColor &&
      computedColor !== "rgba(0, 0, 0, 0)" &&
      computedColor !== "transparent"
        ? rgbToHex(computedColor)
        : "#000000";

    const wrapper = document.createElement("div");

    if (varName) {
      const badge = document.createElement("div");
      badge.style.cssText =
        "display:flex;align-items:center;gap:5px;margin-bottom:4px;flex-wrap:wrap;";
      badge.innerHTML =
        '<span style="font-size:9px;color:#71717a;flex:1;min-width:50px;">Привязан к</span>' +
        '<span style="background:#1c3553;color:#60a5fa;font-size:9px;padding:2px 7px;border-radius:4px;font-family:monospace;white-space:nowrap;">' +
        varName +
        "</span>" +
        '<button class="unlink-btn" style="background:#3f3f46;color:#e4e4e7;border:none;border-radius:5px;padding:3px 8px;font-size:9px;cursor:pointer;font-weight:600;white-space:nowrap;">&#x26D3; Отвязать</button>';
      wrapper.appendChild(badge);

      badge.querySelector(".unlink-btn").addEventListener("click", () => {
        onChange(rawHex);
        badge.style.display = "none";
      });
    }

    const row = document.createElement("div");
    row.className = "row";
    const cpId = "cp_" + Math.random().toString(36).slice(2);
    const txId = "tx_" + Math.random().toString(36).slice(2);
    row.innerHTML =
      '<span class="lbl">' +
      label +
      "</span>" +
      '<div class="color-group">' +
      '<input type="text" class="hex" id="' +
      txId +
      '" value="' +
      rawHex.toUpperCase() +
      '">' +
      '<input type="color" id="' +
      cpId +
      '" value="' +
      rawHex +
      '">' +
      "</div>";
    const cp = row.querySelector("#" + cpId);
    const tx = row.querySelector("#" + txId);
    const upd = (nv) => {
      if (!isValidHex(nv)) return;
      cp.value = nv;
      tx.value = nv.toUpperCase();
      onChange(nv);
    };
    cp.addEventListener("input", (e) => upd(e.target.value));
    tx.addEventListener("change", (e) => upd(e.target.value));
    wrapper.appendChild(row);
    container.appendChild(wrapper);
  }

  function buildShadowSection(container, el, sel) {
    const st = window.getComputedStyle(el);
    const box = document.createElement("div");
    box.className = "shadow-box";
    box.innerHTML = `
      <div class="sec-title">Тень (box-shadow)</div>
      <div class="row">
        <span class="lbl">Цвет</span>
        <div class="color-group">
          <input type="text" class="hex" id="sh-col-hex" value="#000000">
          <input type="color" id="sh-col" value="#000000">
        </div>
      </div>
      <div class="row"><span class="lbl">Прозрачность</span><input type="range" id="sh-alpha" min="0" max="1" step="0.05" value="0.3"></div>
      <div class="row"><span class="lbl">Смещение X</span><input type="range" id="sh-x" min="-60" max="60" value="0"></div>
      <div class="row"><span class="lbl">Смещение Y</span><input type="range" id="sh-y" min="-60" max="60" value="4"></div>
      <div class="row"><span class="lbl">Размытие</span><input type="range" id="sh-blur" min="0" max="120" value="20"></div>
      <div class="row"><span class="lbl">Разброс</span><input type="range" id="sh-spread" min="-20" max="40" value="0"></div>
    `;
    container.appendChild(box);

    const colInput = box.querySelector("#sh-col");
    const colHex = box.querySelector("#sh-col-hex");
    const alphaIn = box.querySelector("#sh-alpha");
    const xIn = box.querySelector("#sh-x");
    const yIn = box.querySelector("#sh-y");
    const blurIn = box.querySelector("#sh-blur");
    const spreadIn = box.querySelector("#sh-spread");

    const syncColHex = () => {
      colHex.value = colInput.value.toUpperCase();
    };
    colInput.addEventListener("input", () => {
      syncColHex();
      applyShad();
    });
    colHex.addEventListener("change", () => {
      if (isValidHex(colHex.value)) {
        colInput.value = colHex.value;
        applyShad();
      }
    });
    [alphaIn, xIn, yIn, blurIn, spreadIn].forEach((i) =>
      i.addEventListener("input", applyShad),
    );

    function applyShad() {
      const col = colInput.value;
      const r = parseInt(col.slice(1, 3), 16),
        g = parseInt(col.slice(3, 5), 16),
        b = parseInt(col.slice(5, 7), 16);
      const shadow = `${xIn.value}px ${yIn.value}px ${blurIn.value}px ${spreadIn.value}px rgba(${r},${g},${b},${alphaIn.value})`;
      el.style.setProperty("box-shadow", shadow, "important");
      setOverride(sel, "box-shadow", shadow);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     COLORS TAB — page color scan
  ═══════════════════════════════════════════════════════════ */
  shadow.getElementById("btn-scan").addEventListener("click", () => {
    const btn = shadow.getElementById("btn-scan");
    btn.textContent = "Сканирование…";
    btn.disabled = true;
    setTimeout(() => {
      renderPageColors();
      btn.textContent = "Сканировать цвета страницы";
      btn.disabled = false;
    }, 50);
  });

  let expandedSwatch = null;

  function renderPageColors() {
    const results = shadow.getElementById("scan-results");
    results.innerHTML = "";
    const colors = scanPageColors();

    if (!colors.size) {
      results.innerHTML = '<div class="empty">Цвета не найдены</div>';
      return;
    }

    const grid = document.createElement("div");
    grid.className = "swatch-grid";
    const editorEl = document.createElement("div");
    editorEl.className = "swatch-editor";
    editorEl.style.display = "none";

    colors.forEach((selectors, hex) => {
      const sw = document.createElement("div");
      sw.className = "swatch";
      sw.style.background = hex;
      sw.title = hex + "\n" + [...selectors].slice(0, 3).join(", ");

      sw.addEventListener("click", () => {
        if (expandedSwatch === sw) {
          expandedSwatch = null;
          sw.classList.remove("expanded");
          editorEl.style.display = "none";
          return;
        }
        if (expandedSwatch) expandedSwatch.classList.remove("expanded");
        expandedSwatch = sw;
        sw.classList.add("expanded");
        buildSwatchEditor(editorEl, hex, selectors, sw);
        editorEl.style.display = "block";
      });
      grid.appendChild(sw);
    });

    results.appendChild(grid);
    results.appendChild(editorEl);
  }

  function buildSwatchEditor(container, origHex, selectors, swatchEl) {
    container.innerHTML = `
      <div class="row" style="margin-bottom:6px;">
        <span class="lbl">Цвет</span>
        <div class="color-group">
          <input type="text" class="hex" value="${origHex.toUpperCase()}">
          <input type="color" value="${origHex}">
        </div>
      </div>
      <div class="swatch-sel-hint">Элементы: ${[...selectors].slice(0, 5).join(" · ")}</div>
    `;
    const cp = container.querySelector('input[type="color"]');
    const tx = container.querySelector('input[type="text"]');

    const update = (nv) => {
      if (!isValidHex(nv)) return;
      cp.value = nv;
      tx.value = nv.toUpperCase();
      swatchEl.style.background = nv;

      // Apply to all matching elements on the page
      selectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            if (el.closest("#" + PANEL_ID)) return;
            const st = window.getComputedStyle(el);
            const bgHex = rgbToHex(st.backgroundColor);
            const fgHex = rgbToHex(st.color);
            if (bgHex.toLowerCase() === origHex.toLowerCase()) {
              el.style.setProperty("background", nv, "important");
              setOverride(sel, "background", nv);
            }
            if (fgHex.toLowerCase() === origHex.toLowerCase()) {
              el.style.setProperty("color", nv, "important");
              setOverride(sel, "color", nv);
            }
          });
        } catch {}
      });
    };

    cp.addEventListener("input", (e) => update(e.target.value));
    tx.addEventListener("change", (e) => update(e.target.value));
  }

  /* ═══════════════════════════════════════════════════════════
     MANUAL BUTTONS
  ═══════════════════════════════════════════════════════════ */
  shadow.getElementById("btn-insp").addEventListener("click", () => {
    stopModes();
    isInspectMode = true;
    overlay.style.display = "block";
    updateModeBar();
  });

  shadow.getElementById("btn-reset-el").addEventListener("click", () => {
    stopModes();
    isResetMode = true;
    overlay.style.display = "block";
    updateModeBar();
  });

  shadow.getElementById("btn-clear").addEventListener("click", () => {
    if (confirm("Сбросить все изменения и перезагрузить страницу?"))
      location.reload();
  });

  /* ═══════════════════════════════════════════════════════════
     SLIDER CONTROLS
  ═══════════════════════════════════════════════════════════ */
  shadow.getElementById("btn-stop").addEventListener("click", () => {
    try {
      document.querySelector(".hero-swiper").swiper.autoplay.stop();
    } catch {}
  });
  shadow.getElementById("btn-start").addEventListener("click", () => {
    try {
      document.querySelector(".hero-swiper").swiper.autoplay.start();
    } catch {}
  });

  /* ═══════════════════════════════════════════════════════════
     EXPORT
  ═══════════════════════════════════════════════════════════ */
  shadow.getElementById("btn-exp").addEventListener("click", () => {
    const injectEl = document.getElementById(INJECT_ID);
    const payload = {
      timestamp: new Date().toISOString(),
      changes,
      css_block: injectEl ? injectEl.textContent : "",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vdt8_export_" + Date.now() + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ═══════════════════════════════════════════════════════════
     IMPORT
  ═══════════════════════════════════════════════════════════ */
  shadow.getElementById("btn-imp").addEventListener("click", () => {
    shadow.getElementById("imp-file").click();
  });

  shadow.getElementById("imp-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);

        // If we have a raw CSS block, inject it directly
        if (data.css_block) {
          getInjectStyle().textContent = data.css_block;
        }

        // Restore changes object
        if (data.changes) {
          Object.assign(
            changes.variablesLight,
            data.changes.variablesLight || data.changes.variables || {},
          );
          Object.assign(
            changes.variablesDark,
            data.changes.variablesDark || {},
          );
          (data.changes.overrides || []).forEach((o) => {
            if (
              !changes.overrides.find(
                (ex) => ex.selector === o.selector && ex.prop === o.prop,
              )
            ) {
              changes.overrides.push(o);
            }
          });
        }

        // Apply CSS variables to root (light)
        Object.entries(changes.variablesLight).forEach(([k, v]) => {
          document.documentElement.style.setProperty(k, v);
        });
        // Dark vars require dark class to be active — inject handles this via html.dark block

        rebuildInjectCSS();
        buildGlobals();
        alert("Импорт применён ✓");
      } catch (err) {
        alert("Ошибка импорта: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  /* ═══════════════════════════════════════════════════════════
     DRAG
  ═══════════════════════════════════════════════════════════ */
  const wrap = shadow.getElementById("vdt-wrap");
  const hdr = shadow.getElementById("vdt-hdr");
  let drag = false,
    ox = 0,
    oy = 0;

  hdr.addEventListener("mousedown", (e) => {
    drag = true;
    const rect = wrap.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!drag) return;
    wrap.style.right = "auto";
    wrap.style.top = "auto";
    wrap.style.left = e.clientX - ox + "px";
    wrap.style.top = e.clientY - oy + "px";
  });
  document.addEventListener("mouseup", () => {
    drag = false;
  });

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  // Ensure inject style tag exists from the start
  getInjectStyle();
  // Wait for page to be fully loaded then read vars
  if (document.readyState === "complete") buildGlobals();
  else window.addEventListener("load", buildGlobals);
})();
