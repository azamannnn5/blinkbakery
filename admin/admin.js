(function () {
"use strict";
var A = window.A = {views: {}};
var DEF = window.BB_DEFAULTS, BASEP = window.BB_PRODUCTS || [], BASEC = window.BB_CATS || [];
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
var clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
var money = function (n) { return n == null || n === "" ? "-" : "$" + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0); };
A.$ = $; A.$$ = $$; A.esc = esc; A.clone = clone; A.same = same; A.money = money;

var S = A.S = {user: null, role: null, db: {settings: {}, products: {}, categories: {}}, pend: {settings: {}, products: {}, categories: {}}, hist: [], team: []};
var API = "/.netlify/functions/admin", TK = "bb_admin_token";
function getToken() { try { return localStorage.getItem(TK) || ""; } catch (e) { return ""; } }
function setToken(t) { try { if (t) localStorage.setItem(TK, t); else localStorage.removeItem(TK); } catch (e) {} }
A.api = async function (action, body) {
  var r;
  try {
    r = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json", Authorization: "Bearer " + getToken()}, body: JSON.stringify(Object.assign({action: action}, body || {}))});
  } catch (e) { var er = new Error("Could not reach the server. Check your internet and that the site is on Netlify."); er.network = true; throw er; }
  var d = null; try { d = await r.json(); } catch (e) { d = null; }
  if (!r.ok) { var err = new Error((d && d.error) || ("Server error " + r.status)); err.status = r.status; throw err; }
  return d;
};
var baseP = {}; BASEP.forEach(function (p) { baseP[p.id] = p; });
var baseC = {}; BASEC.forEach(function (c) { baseC[c.id] = c; });
A.baseP = baseP; A.baseC = baseC;

/* ---------- small ui helpers ---------- */
var toastT;
A.toast = function (msg, bad) {
  var t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.className = "toast" + (bad ? " bad" : ""); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, bad ? 6000 : 2600);
};
A.canEdit = function () { return true; };
A.isOwner = function () { return S.role === "owner"; };

/* ---------- settings (groups of fields stored as one row each) ---------- */
function sOver(key) { var v = key in S.pend.settings ? S.pend.settings[key] : S.db.settings[key]; return clone(v) || {}; }
A.sOver = sOver;
A.sGet = function (key) {
  var base = clone(DEF[key]), o = sOver(key);
  Object.keys(o).forEach(function (f) { base[f] = o[f]; });
  return base;
};
A.sChanged = function (key, field) { return field in sOver(key); };
function stageSetting(key, o) {
  if (same(o, S.db.settings[key] || {})) delete S.pend.settings[key]; else S.pend.settings[key] = o;
  A.changed();
}
A.sSet = function (key, field, val) {
  var o = sOver(key);
  if (same(val, DEF[key][field])) delete o[field]; else o[field] = val;
  stageSetting(key, o);
};
A.sReset = function (key, field) { var o = sOver(key); delete o[field]; stageSetting(key, o); };

/* ---------- products ---------- */
function emptyRow(r) { return !Object.keys(r.data || {}).length && !r.hidden && r.pin == null && !r.is_new; }
function pRow(id) { var r = id in S.pend.products ? S.pend.products[id] : S.db.products[id]; return r && !r._del ? clone(r) : null; }
A.pRow = pRow;
A.pNewRow = function () { return {data: {}, hidden: false, pin: null, is_new: false}; };
A.pStage = function (id, row) {
  var dbr = S.db.products[id];
  if (baseP[id] && emptyRow(row)) {
    if (dbr) S.pend.products[id] = {_del: true}; else delete S.pend.products[id];
  } else if (dbr && same(strip(row), strip(dbr))) delete S.pend.products[id];
  else S.pend.products[id] = row;
  A.changed();
};
A.pDelete = function (id) { if (S.db.products[id]) S.pend.products[id] = {_del: true}; else delete S.pend.products[id]; A.changed(); };
function strip(r) { return {data: r.data || {}, hidden: !!r.hidden, pin: r.pin == null ? null : r.pin, is_new: !!r.is_new}; }
A.pAllIds = function () {
  var ids = BASEP.map(function (p) { return p.id; });
  var seen = {}; ids.forEach(function (i) { seen[i] = 1; });
  var extra = Object.keys(S.db.products).concat(Object.keys(S.pend.products)).filter(function (i) { return !seen[i] && (seen[i] = 1); });
  return ids.concat(extra).filter(function (i) { return pRow(i) || baseP[i]; });
};
A.pEff = function (id) {
  var b = baseP[id], r = pRow(id) || A.pNewRow(), e = Object.assign({}, clone(b) || {}, clone(r.data));
  e.id = id; e.hidden = !!r.hidden; e.isNew = !b;
  e.pin = r.pin > 0 ? r.pin : (r.pin === 0 ? null : (b && b.pin) || null);
  return e;
};
A.pSet = function (id, f, val) {
  var r = pRow(id) || A.pNewRow(), b = baseP[id];
  r.data = r.data || {};
  var empty = val === "" || val === null || val === false || (Array.isArray(val) && !val.length && !(b && Array.isArray(b[f])));
  if (b ? same(b[f], val) || (empty && b[f] == null) : empty) delete r.data[f]; else r.data[f] = val;
  A.pStage(id, r);
};
A.pReset = function (id, f) { var r = pRow(id); if (!r) return; delete r.data[f]; A.pStage(id, r); };
A.pHide = function (id, v) { var r = pRow(id) || A.pNewRow(); r.hidden = !!v; A.pStage(id, r); };
A.pPin = function (id, n) {
  var r = pRow(id) || A.pNewRow(), b = baseP[id], bp = b && b.pin || null;
  if (n == null) r.pin = bp ? 0 : null; else r.pin = (n === bp ? null : n);
  A.pStage(id, r);
};
A.pChanged = function (id, f) { var r = pRow(id); return !!(baseP[id] && r && r.data && f in r.data); };
A.pEdited = function (id) { var r = pRow(id); return !!(baseP[id] && r && !emptyRow(r)); };
A.pPrice = function (e) {
  var T = A.sGet("pricing")[e.cat];
  if (T && T.length) return money(T[0].price);
  if (e.variants && e.variants.length) return "From " + money(Math.min.apply(null, e.variants.map(function (v) { return +v.price || 0; })));
  return e.price == null ? "Ask" : money(e.price);
};

/* ---------- categories ---------- */
function cRow(id) { var r = id in S.pend.categories ? S.pend.categories[id] : S.db.categories[id]; return r && !r._del ? clone(r) : null; }
A.cRow = cRow;
A.cNewRow = function () { return {data: {}, hidden: false, sort: null}; };
A.cStage = function (id, row) {
  var dbr = S.db.categories[id];
  var empty = !Object.keys(row.data || {}).length && !row.hidden && row.sort == null;
  if (empty) { if (dbr) S.pend.categories[id] = {_del: true}; else delete S.pend.categories[id]; }
  else if (dbr && same(row, strip2(dbr))) delete S.pend.categories[id];
  else S.pend.categories[id] = row;
  A.changed();
};
function strip2(r) { return {data: r.data || {}, hidden: !!r.hidden, sort: r.sort == null ? null : r.sort}; }
A.cEff = function (id) {
  var b = baseC[id], r = cRow(id) || A.cNewRow(), e = Object.assign({}, clone(b), clone(r.data));
  e.hidden = !!r.hidden; e.sort = r.sort; return e;
};
A.cList = function () {
  var l = BASEC.map(function (c, i) { var e = A.cEff(c.id); e._o = e.sort != null ? e.sort : 1000 + i; return e; });
  l.sort(function (a, b) { return a._o - b._o; }); return l;
};
A.cSet = function (id, f, val) {
  var r = cRow(id) || A.cNewRow(), b = baseC[id];
  if (same(b[f], val) || val === "") delete r.data[f]; else r.data[f] = val;
  A.cStage(id, r);
};
A.cChanged = function (id, f) { var r = cRow(id); return !!(r && r.data && f in r.data); };

/* ---------- pending changes and save bar ---------- */
A.pendCount = function () {
  return Object.keys(S.pend.settings).length + Object.keys(S.pend.products).length + Object.keys(S.pend.categories).length;
};
A.changed = function () {
  var n = A.pendCount(), bar = $("#savebar");
  if (!bar) return;
  bar.hidden = n === 0;
  $("#savecount").textContent = n + (n === 1 ? " unsaved change" : " unsaved changes");
};
window.addEventListener("beforeunload", function (e) { if (A.pendCount()) { e.preventDefault(); e.returnValue = ""; } });

A.discard = function () {
  if (!A.pendCount()) return;
  if (!confirm("Throw away all unsaved changes?")) return;
  S.pend = {settings: {}, products: {}, categories: {}}; A.changed(); A.render();
};

A.save = async function () {
  var btn = $("#savebtn"); btn.disabled = true; btn.textContent = "Saving...";
  try {
    var bad = Object.keys(S.pend.products).filter(function (id) {
      var r = S.pend.products[id]; return !r._del && !baseP[id] && !(r.data && r.data.name && r.data.name.trim());
    });
    if (bad.length) { A.toast("Give every new product a name first.", true); location.hash = "#/products/" + bad[0]; return; }
    var P = S.pend, ops = [];
    var sets = Object.keys(P.settings).filter(function (k) { return Object.keys(P.settings[k]).length; }).map(function (k) { return {key: k, value: P.settings[k]}; });
    var sdel = Object.keys(P.settings).filter(function (k) { return !Object.keys(P.settings[k]).length; });
    ops.push({table: "settings", op: "upsert", rows: sets}, {table: "settings", op: "delete", keys: sdel});
    var prow = [], pdel = [];
    Object.keys(P.products).forEach(function (id) { var r = P.products[id]; if (r._del) pdel.push(id); else prow.push({id: id, data: r.data || {}, hidden: !!r.hidden, pin: r.pin == null ? null : r.pin, is_new: !!r.is_new}); });
    ops.push({table: "products", op: "upsert", rows: prow}, {table: "products", op: "delete", keys: pdel});
    var crow = [], cdel = [];
    Object.keys(P.categories).forEach(function (id) { var r = P.categories[id]; if (r._del) cdel.push(id); else crow.push({id: id, data: r.data || {}, hidden: !!r.hidden, sort: r.sort == null ? null : r.sort}); });
    ops.push({table: "categories", op: "upsert", rows: crow}, {table: "categories", op: "delete", keys: cdel});
    await A.api("write", {ops: ops});
    S.pend = {settings: {}, products: {}, categories: {}};
    await A.load();
    A.toast("Saved. The site shows it within a minute.");
    A.render();
  } catch (e) {
    if (e.status === 401) { setToken(""); A.toast("Session ended. Please sign in again.", true); setTimeout(function () { location.reload(); }, 1200); return; }
    A.toast("Could not save: " + (e.message || e), true);
  } finally {
    btn.disabled = false; btn.textContent = "Save changes"; A.changed();
  }
};

/* ---------- data loading ---------- */
A.load = async function () {
  var d = await A.api("load");
  S.db.settings = {}; d.settings.forEach(function (x) { S.db.settings[x.key] = x.value; });
  S.db.products = {}; d.products.forEach(function (x) { S.db.products[x.id] = x; });
  S.db.categories = {}; d.categories.forEach(function (x) { S.db.categories[x.id] = x; });
  S.hist = d.history;
};

/* ---------- shared form bits ---------- */
A.kind = function (changed, resetAttr, isNew) {
  if (isNew) return '<span class="kind k-new">New</span>';
  return changed ? '<span class="kind k-chg">Changed</span><button type="button" class="reset wr" ' + resetAttr + '>Reset to original</button>' : '<span class="kind k-orig">Original</span>';
};
A.uploadImage = async function (file, folder) {
  var blob = file, type = file.type;
  try {
    var bmp = await createImageBitmap(file), max = 1400, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    var cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    var b = await new Promise(function (res) { cv.toBlob(res, "image/webp", 0.85); });
    if (b && b.type === "image/webp") { blob = b; type = "image/webp"; }
  } catch (e) { /* upload the original */ }
  var data = await new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(",")[1]); }; fr.onerror = rej; fr.readAsDataURL(blob); });
  var r = await A.api("upload", {name: file.name, type: type, data: data, folder: folder});
  return r.url;
};
// Wires inputs that carry data-s="group.field" (data-t = text, num, check) to site settings.
A.bindSettings = function (root) {
  $$("[data-s]", root).forEach(function (el) {
    var p = el.getAttribute("data-s").split("."), key = p[0], f = p[1], t = el.getAttribute("data-t") || "text";
    var h = function () {
      var v = t === "check" ? el.checked : t === "num" ? (el.value === "" ? null : +el.value) : el.value;
      if (t === "num" && v == null) return;
      A.sSet(key, f, v);
      if (A.onSetting) A.onSetting(key, f, v);
      var tg = $('[data-tag="' + key + "." + f + '"]', root); if (tg) tg.innerHTML = A.kind(A.sChanged(key, f), 'data-reset="' + key + "." + f + '"');
    };
    el.addEventListener(t === "check" ? "change" : "input", h);
  });
};
A.sField = function (key, f, label, o) {
  o = o || {}; var cur = A.sGet(key)[f], t = o.type || "text", id = "f-" + key + "-" + f, ch = A.sChanged(key, f);
  var tg = '<span data-tag="' + key + "." + f + '">' + A.kind(ch, 'data-reset="' + key + "." + f + '"') + "</span>";
  if (t === "check") return '<div class="field"><label class="check" for="' + id + '"><input type="checkbox" id="' + id + '" data-s="' + key + "." + f + '" data-t="check"' + (cur ? " checked" : "") + "><span><b>" + esc(label) + "</b></span>" + tg + "</label>" + (o.help ? '<div class="help">' + o.help + "</div>" : "") + "</div>";
  var inp = t === "area" ? '<textarea id="' + id + '" data-s="' + key + "." + f + '" rows="' + (o.rows || 3) + '">' + esc(cur) + "</textarea>"
    : '<input id="' + id + '" type="' + (t === "num" ? "number" : "text") + '"' + (t === "num" ? ' step="any" min="0" data-t="num"' : "") + ' data-s="' + key + "." + f + '" value="' + esc(cur) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + ">";
  return '<div class="field"><label for="' + id + '">' + esc(label) + " " + tg + "</label>" + inp + (o.help ? '<div class="help">' + o.help + "</div>" : "") + "</div>";
};

/* ---------- shell ---------- */
var NAV = [
  ["Overview", [["dashboard", "Dashboard", "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10"]]],
  ["Menu", [["products", "Products", "M4 7l8-4 8 4-8 4-8-4zM4 7v10l8 4 8-4V7"], ["categories", "Categories", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"], ["pricing", "Pricing", "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.5 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3"]]],
  ["Store", [["contact", "Contact and orders", "M4 5h16v11H8l-4 4V5z"], ["site", "Site and banner", "M3 5h18v14H3zM3 9h18"]]],
  ["Admin", [["history", "Change history", "M12 7v5l3 2M4 12a8 8 0 1 0 3-6.2M4 4v4h4"], ["backup", "Backup", "M12 4v11M7 10l5 5 5-5M5 20h14"], ["help", "Help", "M12 17h.01M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18"]]]
];
A.NAV = NAV;
function shell() {
  var nav = NAV.map(function (g) {
    return '<div class="grp">' + g[0] + "</div>" + g[1].map(function (n) {
      return '<a href="#/' + n[0] + '" data-nav="' + n[0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + n[2] + '"/></svg>' + n[1] + "</a>";
    }).join("");
  }).join("");
  $("#app").innerHTML = '<div class="shell"><aside class="side" id="side"><div class="logo"><img src="../img/brand/logo.webp" alt="">Blinks Bakery</div>' + nav +
    '<div class="grp">Site</div><a href="../index.html?preview=1" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/></svg>View the site</a></aside>' +
    '<div class="scrim" id="scrim"></div><div class="main"><div class="topbar"><button class="btn ghost sm menu" id="menubtn" type="button" aria-label="Menu">Menu</button><div class="crumbs" id="crumbs"></div>' +
    '<div class="gsearch"><input id="gs" type="search" placeholder="Search products and pages" autocomplete="off" aria-label="Search"><kbd>/</kbd><div class="gres" id="gres" hidden></div></div>' +
    '<div class="who"><button class="btn ghost sm" id="out" type="button">Sign out</button></div></div>' +
    '<main class="page" id="page"></main></div></div>' +
    '<div class="savebar" id="savebar" hidden><span id="savecount"></span><button class="btn ghost sm" id="discardbtn" type="button">Discard</button><button class="btn" id="savebtn" type="button">Save changes</button></div>';
  $("#out").onclick = async function () { if (A.pendCount() && !confirm("You have unsaved changes. Sign out anyway?")) return; setToken(""); location.hash = ""; location.reload(); };
  $("#savebtn").onclick = A.save; $("#discardbtn").onclick = A.discard;
  var side = $("#side"), scrim = $("#scrim");
  $("#menubtn").onclick = function () { side.classList.toggle("open"); scrim.classList.toggle("open"); };
  scrim.onclick = function () { side.classList.remove("open"); scrim.classList.remove("open"); };
  side.addEventListener("click", function (e) { if (e.target.closest("a")) { side.classList.remove("open"); scrim.classList.remove("open"); } });
  searchBox();
  var pg = $("#page");
  pg.addEventListener("click", function (e) {
    var b = e.target.closest("[data-reset]");
    if (b && b.getAttribute("data-reset").indexOf(".") > 0) { var p = b.getAttribute("data-reset").split("."); A.sReset(p[0], p[1]); A.render(); return; }
    if (A.pageClick) A.pageClick(e);
  });
  pg.addEventListener("input", function (e) { if (A.pageInput) A.pageInput(e); });
  pg.addEventListener("change", function (e) { if (A.pageChange) A.pageChange(e); });
}
function searchBox() {
  var gs = $("#gs"), gr = $("#gres"), hl = -1;
  var pages = NAV.reduce(function (a, g) { return a.concat(g[1].map(function (n) { return {t: n[1], h: "#/" + n[0], s: "Page"}; })); }, []);
  function run() {
    var q = gs.value.trim().toLowerCase(); hl = -1;
    if (!q) { gr.hidden = true; return; }
    var out = pages.filter(function (p) { return p.t.toLowerCase().indexOf(q) >= 0; }).slice(0, 4);
    A.pAllIds().forEach(function (id) {
      if (out.length >= 14) return;
      var e = A.pEff(id); if ((e.name || "").toLowerCase().indexOf(q) >= 0) out.push({t: e.name, h: "#/products/" + encodeURIComponent(id), s: "Product, " + (e.cat || "")});
    });
    gr.innerHTML = out.length ? out.map(function (o) { return '<a href="' + esc(o.h) + '">' + esc(o.t) + "<small>" + esc(o.s) + "</small></a>"; }).join("") : '<a href="#" style="pointer-events:none">Nothing found</a>';
    gr.hidden = false;
  }
  gs.addEventListener("input", run);
  gs.addEventListener("keydown", function (e) {
    var l = $$("a", gr);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); hl = Math.max(0, Math.min(l.length - 1, hl + (e.key === "ArrowDown" ? 1 : -1))); l.forEach(function (a, i) { a.classList.toggle("hl", i === hl); }); }
    else if (e.key === "Enter") { var t = l[hl >= 0 ? hl : 0]; if (t && t.getAttribute("href") !== "#") { location.hash = t.getAttribute("href"); gs.value = ""; gr.hidden = true; gs.blur(); } }
    else if (e.key === "Escape") { gs.value = ""; gr.hidden = true; gs.blur(); }
  });
  gr.addEventListener("click", function () { setTimeout(function () { gs.value = ""; gr.hidden = true; }, 0); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".gsearch")) gr.hidden = true; });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !/^(input|textarea|select)$/i.test(document.activeElement.tagName)) { e.preventDefault(); gs.focus(); }
  });
}

/* ---------- routing ---------- */
A.render = function () {
  var h = (location.hash || "#/dashboard").replace(/^#\/?/, ""), parts = h.split("/"), name = parts[0] || "dashboard";
  var view = A.views[name] || A.views.dashboard; if (!A.views[name]) name = "dashboard";
  $$("[data-nav]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-nav") === name); });
  var page = $("#page");
  var out = view.render(parts.slice(1).map(decodeURIComponent));
  page.innerHTML = out.html;
  $("#crumbs").innerHTML = '<a href="#/dashboard">Admin</a> / ' + (out.crumbs || []).map(function (c, i, a) { return i === a.length - 1 ? "<b>" + esc(c[0]) + "</b>" : '<a href="' + esc(c[1]) + '">' + esc(c[0]) + "</a>"; }).join(" / ");
  document.title = (out.title || "Admin") + " | Blinks Bakery Admin";
  A.pageClick = A.pageInput = A.pageChange = A.onSetting = null;
  if (view.bind && !out.skip) view.bind(page, parts.slice(1).map(decodeURIComponent));
  if (!A.canEdit()) {
    $$("input,select,textarea", page).forEach(function (el) { if (!el.closest("[data-keep]")) el.disabled = true; });
    $$(".wr", page).forEach(function (el) { el.hidden = true; });
    page.insertAdjacentHTML("afterbegin", '<div class="msg warn">You have view only access. You can look around but not change anything.</div>');
  }
  A.changed();
};
window.addEventListener("hashchange", function () { if (S.user) { A.render(); window.scrollTo(0, 0); } });

/* ---------- login and boot ---------- */
function loginScreen(msg) {
  $("#app").innerHTML = '<div class="center"><form class="box" id="lf"><img src="../img/brand/logo.webp" alt=""><h1>Blinks Bakery Admin</h1><p class="sub">Enter the admin password.</p>' +
    (msg ? '<div class="msg bad">' + esc(msg) + "</div>" : "") +
    '<div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required autofocus></div><button class="btn" style="width:100%" type="submit">Sign in</button><p class="help" style="margin-top:12px;color:#6b6078;font-size:13px">The password is the ADMIN_PASSWORD value set in Netlify.</p></form></div>';
  $("#lf").onsubmit = async function (e) {
    e.preventDefault(); var b = $("#lf button"); b.disabled = true; b.textContent = "Signing in...";
    try { var r = await A.api("login", {password: $("#pw").value}); setToken(r.token); start(); }
    catch (x) { loginScreen(x.message); }
  };
}
async function start() {
  S.user = {email: "Admin"}; S.role = "owner";
  try { await A.load(); }
  catch (e) {
    if (e.status === 401) { setToken(""); loginScreen(); return; }
    $("#app").innerHTML = '<div class="center"><div class="box"><div class="msg bad">Could not load the data: ' + esc(e.message || e) + '. Check the Netlify environment variables and that 1-schema.sql ran in Supabase.</div><button class="btn" onclick="location.reload()">Try again</button></div></div>'; return;
  }
  shell(); A.render();
}
A.boot = function () { if (getToken()) start(); else loginScreen(); };
})();
