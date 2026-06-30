/**
 * timeline.js — static tree + calendar viewer.
 *
 * Data: ./data.json = { "nodes": [ {id, parent_id, title, date, image, mermaid, text, author}, ... ] }
 *   - flat list; parent_id builds the tree (null/absent = a top-level root → parallel thread)
 *   - date: ISO date or datetime; drives the calendar (occurred_at from citerag)
 *   - image OR mermaid OR text rendered in the viewport; calendar tiles use image, else truncated text
 *
 * One shared `state.currentId` drives every pane. Tree click, bubble click,
 * arrow keys, and calendar all just set it, then render() repaints.
 */
const state = {
  nodes: [], byId: {}, childrenOf: {}, roots: [],
  currentId: null,
  view: "tree",                 // "tree" | "calendar"
  treeCollapsed: false,
  collapsed: new Set(),         // collapsed tree node ids
  calYear: null, calMonth: null,
  selectedDay: null,            // YYYY-MM-DD in calendar view
};

const $ = id => document.getElementById(id);

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function mdToHtml(s) {
  if (window.marked && typeof window.marked.parse === "function") return window.marked.parse(String(s || ""));
  return escapeHtml(s).replace(/\n/g, "<br>");
}
function snippet(node, n = 80) {
  const t = (node.title || node.text || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : (t || "(untitled)");
}
function dayKey(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];                       // date-only / ISO prefix → use verbatim (no tz drift)
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---- indexing ----------------------------------------------------------
function buildIndex(nodes) {
  state.byId = {}; state.childrenOf = {}; state.roots = [];
  nodes.forEach(n => { if (n.id) state.byId[n.id] = n; });
  nodes.forEach(n => {
    const pid = (n.parent_id && state.byId[n.parent_id]) ? n.parent_id : "__root__";
    (state.childrenOf[pid] = state.childrenOf[pid] || []).push(n);
  });
  state.roots = state.childrenOf.__root__ || [];
}
function childrenOf(id) { return state.childrenOf[id] || []; }
function pathTo(id) {
  const out = [];
  let cur = state.byId[id];
  const seen = new Set();
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); out.unshift(cur); cur = state.byId[cur.parent_id]; }
  return out;
}
function siblingsOf(id) {
  const n = state.byId[id];
  if (!n) return [];
  return (n.parent_id && state.byId[n.parent_id]) ? childrenOf(n.parent_id) : state.roots;
}

function setCurrent(id, { switchToTree = false } = {}) {
  if (!state.byId[id]) return;
  state.currentId = id;
  // auto-expand ancestors in the tree so the current node is visible
  pathTo(id).forEach(n => state.collapsed.delete(n.id));
  if (switchToTree) state.view = "tree";
  render();
}

// ---- viewport (center, shared) ----------------------------------------
function renderViewport() {
  const host = $("tl-viewport");
  const node = state.byId[state.currentId];
  host.innerHTML = "";
  if (!node) { host.innerHTML = `<p class="tl-empty">No node selected.</p>`; return; }

  const head = document.createElement("div");
  head.className = "tl-vp-head";
  head.innerHTML = `<h2>${escapeHtml(node.title || "(untitled)")}</h2>` +
    (node.date ? `<span class="tl-vp-date">${escapeHtml(dayKey(node.date) || node.date)}</span>` : "") +
    (node.author ? `<span class="tl-vp-author">${escapeHtml(node.author)}</span>` : "");
  host.appendChild(head);

  const media = document.createElement("div");
  media.className = "tl-vp-media";
  if (node.image) {
    media.innerHTML = `<img src="${escapeHtml(node.image)}" alt="${escapeHtml(node.title || "")}">`;
  } else if (node.mermaid) {
    media.innerHTML = `<div class="tl-mermaid">rendering…</div>`;
    renderMermaid(media.querySelector(".tl-mermaid"), node.mermaid);
  }
  if (media.innerHTML) host.appendChild(media);

  if (node.text) {
    const body = document.createElement("div");
    body.className = "tl-vp-text";
    body.innerHTML = mdToHtml(node.text);
    host.appendChild(body);
  }
}

let _mermaid = null;
async function renderMermaid(el, code) {
  try {
    if (!_mermaid) {
      const m = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
      _mermaid = m.default; _mermaid.initialize({ startOnLoad: false });
    }
    const { svg } = await _mermaid.render("mm-" + Math.abs(hashStr(code)), code);
    el.innerHTML = svg;
  } catch (_) {
    el.innerHTML = `<pre class="tl-code">${escapeHtml(code)}</pre>`;
  }
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

// ---- breadcrumb --------------------------------------------------------
function renderBreadcrumb() {
  const host = $("tl-breadcrumb");
  const path = pathTo(state.currentId);
  if (!path.length) { host.innerHTML = ""; return; }
  host.innerHTML = path.map((n, i) => {
    const last = i === path.length - 1;
    return `<span class="tl-crumb${last ? " current" : ""}" data-id="${escapeHtml(n.id)}">${escapeHtml(snippet(n, 36))}</span>`;
  }).join('<span class="tl-crumb-sep">›</span>');
  host.querySelectorAll(".tl-crumb").forEach(el =>
    el.addEventListener("click", () => setCurrent(el.dataset.id)));
}

// ---- left: tree rail ---------------------------------------------------
function renderTreeRail() {
  const host = $("tl-left");
  host.className = "tl-left" + (state.treeCollapsed ? " collapsed" : "");
  host.innerHTML = state.treeCollapsed ? "" : `<div class="tl-tree-title">Tree</div>`;
  if (state.treeCollapsed) return;
  const root = document.createElement("div");
  root.className = "tl-tree";
  state.roots.forEach(n => root.appendChild(treeNode(n)));
  host.appendChild(root);
}
function treeNode(node) {
  const wrap = document.createElement("div");
  wrap.className = "tl-tnode";
  const kids = childrenOf(node.id);
  const isCollapsed = state.collapsed.has(node.id);

  const row = document.createElement("div");
  row.className = "tl-trow" + (node.id === state.currentId ? " current" : "");
  const tog = document.createElement("span");
  tog.className = "tl-ttoggle";
  tog.textContent = kids.length ? (isCollapsed ? "▸" : "▾") : "·";
  if (kids.length) tog.addEventListener("click", e => {
    e.stopPropagation();
    if (isCollapsed) state.collapsed.delete(node.id); else state.collapsed.add(node.id);
    render();
  });
  const label = document.createElement("span");
  label.className = "tl-tlabel";
  label.textContent = snippet(node, 40);
  label.addEventListener("click", () => setCurrent(node.id));

  row.appendChild(tog); row.appendChild(label);
  wrap.appendChild(row);

  if (kids.length && !isCollapsed) {
    const childBox = document.createElement("div");
    childBox.className = "tl-tchildren";
    kids.forEach(k => childBox.appendChild(treeNode(k)));
    wrap.appendChild(childBox);
  }
  return wrap;
}

// ---- right: recursive bubbles (children of current) --------------------
function renderBubbles() {
  const host = $("tl-right");
  host.className = "tl-right";
  const kids = childrenOf(state.currentId);
  host.innerHTML = `<div class="tl-right-title">Replies (${kids.length})</div>`;
  if (!kids.length) {
    host.insertAdjacentHTML("beforeend", `<p class="tl-empty">No replies under this node.</p>`);
    return;
  }
  kids.forEach(k => {
    const b = document.createElement("div");
    b.className = "tl-bubble";
    const grand = childrenOf(k.id).length;
    b.innerHTML =
      (k.author ? `<div class="tl-bubble-author">${escapeHtml(k.author)}</div>` : "") +
      `<div class="tl-bubble-text">${escapeHtml(snippet(k, 140))}</div>` +
      (k.image ? `<img class="tl-bubble-img" src="${escapeHtml(k.image)}" alt="">` : "") +
      (grand ? `<div class="tl-bubble-more">↳ ${grand} repl${grand === 1 ? "y" : "ies"}</div>` : "");
    b.addEventListener("click", () => setCurrent(k.id));   // drill in: bubble → viewport + its children
    host.appendChild(b);
  });
}

// ---- calendar view -----------------------------------------------------
function nodesByDay() {
  const map = {};
  state.nodes.forEach(n => { const k = dayKey(n.date); if (k) (map[k] = map[k] || []).push(n); });
  return map;
}
function renderCalendar() {
  const host = $("tl-left");
  host.className = "tl-left cal";
  const map = nodesByDay();
  if (state.calYear == null) {
    const keys = Object.keys(map).sort();
    const base = keys.length ? new Date(keys[keys.length - 1]) : new Date(2026, 0, 1);
    state.calYear = base.getFullYear(); state.calMonth = base.getMonth();
  }
  const y = state.calYear, mo = state.calMonth;
  const first = new Date(y, mo, 1);
  const monthName = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const startDow = first.getDay();
  const p = n => String(n).padStart(2, "0");

  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="tl-cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${p(mo + 1)}-${p(d)}`;
    const list = map[key] || [];
    const top = list[0];
    const thumb = top
      ? (top.image
        ? `<img src="${escapeHtml(top.image)}" alt="">`
        : `<span class="tl-cal-snip">${escapeHtml(snippet(top, 22))}</span>`)
      : "";
    const badge = list.length > 1 ? `<span class="tl-cal-badge">+${list.length - 1}</span>` : "";
    cells += `<div class="tl-cal-cell${list.length ? " has" : ""}${key === state.selectedDay ? " sel" : ""}" data-day="${key}">
        <span class="tl-cal-num">${d}</span>${thumb}${badge}</div>`;
  }

  host.innerHTML = `
    <div class="tl-cal-nav">
      <button id="tl-cal-prev" aria-label="Previous month">‹</button>
      <span class="tl-cal-title">${escapeHtml(monthName)}</span>
      <button id="tl-cal-next" aria-label="Next month">›</button>
    </div>
    <div class="tl-cal-dow">${["Su","Mo","Tu","We","Th","Fr","Sa"].map(x => `<span>${x}</span>`).join("")}</div>
    <div class="tl-cal-grid">${cells}</div>`;

  $("tl-cal-prev").onclick = () => { state.calMonth--; if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; } render(); };
  $("tl-cal-next").onclick = () => { state.calMonth++; if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; } render(); };
  host.querySelectorAll(".tl-cal-cell.has").forEach(cell => cell.addEventListener("click", () => {
    state.selectedDay = cell.dataset.day;
    const list = (nodesByDay()[state.selectedDay]) || [];
    if (list.length) state.currentId = list[0].id;   // top node → viewport
    render();
  }));
}
function renderDayList() {
  const host = $("tl-right");
  host.className = "tl-right";
  if (!state.selectedDay) { host.innerHTML = `<p class="tl-empty">Pick a day to see its nodes.</p>`; return; }
  const list = (nodesByDay()[state.selectedDay]) || [];
  host.innerHTML = `<div class="tl-right-title">${escapeHtml(state.selectedDay)} — ${list.length} node(s)</div>`;
  list.forEach(n => {
    const tile = document.createElement("div");
    tile.className = "tl-bubble" + (n.id === state.currentId ? " current" : "");
    tile.innerHTML =
      `<div class="tl-bubble-text">${escapeHtml(snippet(n, 120))}</div>` +
      (n.image ? `<img class="tl-bubble-img" src="${escapeHtml(n.image)}" alt="">` : "");
    tile.addEventListener("click", () => setCurrent(n.id, { switchToTree: true }));  // jump into the tree
    host.appendChild(tile);
  });
}

// ---- top-level render --------------------------------------------------
function render() {
  $("tl-status").textContent = `${state.nodes.length} nodes · ${state.roots.length} threads`;
  document.querySelectorAll(".tl-view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  renderBreadcrumb();
  renderViewport();
  if (state.view === "calendar") { renderCalendar(); renderDayList(); }
  else { renderTreeRail(); renderBubbles(); }
}

// ---- keyboard nav ------------------------------------------------------
function onKey(e) {
  if (state.view !== "tree" || !state.currentId) return;
  const sibs = siblingsOf(state.currentId);
  const i = sibs.findIndex(n => n.id === state.currentId);
  const cur = state.byId[state.currentId];
  if (e.key === "ArrowRight") { if (sibs[i + 1]) { e.preventDefault(); setCurrent(sibs[i + 1].id); } }
  else if (e.key === "ArrowLeft") { if (sibs[i - 1]) { e.preventDefault(); setCurrent(sibs[i - 1].id); } }
  else if (e.key === "ArrowUp") { if (cur && state.byId[cur.parent_id]) { e.preventDefault(); setCurrent(cur.parent_id); } }
  else if (e.key === "ArrowDown") { const k = childrenOf(state.currentId); if (k[0]) { e.preventDefault(); setCurrent(k[0].id); } }
}

// ---- init --------------------------------------------------------------
async function init() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error(`data.json → ${res.status}`);
    const data = await res.json();
    state.nodes = Array.isArray(data) ? data : (data.nodes || []);
    buildIndex(state.nodes);
    state.currentId = state.roots[0] ? state.roots[0].id : (state.nodes[0] && state.nodes[0].id) || null;
  } catch (err) {
    $("tl-viewport").innerHTML = `<p class="tl-empty">Could not load data.json: ${escapeHtml(err.message)}<br>
      Serve over HTTP: <code>python3 -m http.server</code> then open this page.</p>`;
    return;
  }
  document.querySelectorAll(".tl-view-btn").forEach(b =>
    b.addEventListener("click", () => { state.view = b.dataset.view; render(); }));
  $("tl-tree-toggle").addEventListener("click", () => { state.treeCollapsed = !state.treeCollapsed; render(); });
  document.addEventListener("keydown", onKey);
  render();
}
document.addEventListener("DOMContentLoaded", init);
