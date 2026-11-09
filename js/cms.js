// Loads the changes made in the admin panel and applies them on top of the built-in menu.
// If the connection is not set up, or Supabase cannot be reached, nothing changes.
(function () {
  "use strict";
  var D = window.BB_DEFAULTS || {};
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function store(w, k, v) {
    try {
      var s = w === "s" ? sessionStorage : localStorage;
      if (v === undefined) return s.getItem(k);
      if (v === null) s.removeItem(k); else s.setItem(k, v);
    } catch (e) { return null; }
  }
  var S = clone(D);
  window.BB_SETTINGS = S;
  window.BB_CONFIG = window.BB_CONFIG || {};
  window.BB_CATS = window.BB_CATS || [];
  window.BB_PRODUCTS = window.BB_PRODUCTS || [];

  function norm(d) {
    d = d || {};
    return JSON.stringify({s: d.settings || {}, p: d.products || [], c: d.categories || []});
  }
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }

  function apply(snap) {
    if (!snap) return;
    var st = snap.settings || {};
    Object.keys(st).forEach(function (k) {
      var v = st[k];
      if (isObj(v) && isObj(S[k])) { Object.keys(v).forEach(function (f) { if (v[f] !== null && v[f] !== undefined) S[k][f] = v[f]; }); }
      else if (v !== null && v !== undefined) S[k] = v;
    });
    var cf = S.contact || {};
    Object.keys(cf).forEach(function (k) { window.BB_CONFIG[k] = cf[k]; });

    var PROD = window.BB_PRODUCTS, CATS = window.BB_CATS, map = {}, hide = {};
    PROD.forEach(function (p) { map[p.id] = p; });
    (snap.products || []).forEach(function (row) {
      var p = map[row.id], f = clone(row);
      ["id", "hidden", "pin", "isNew", "sort"].forEach(function (k) { delete f[k]; });
      if (p) { Object.keys(f).forEach(function (k) { p[k] = f[k]; }); }
      else if (row.isNew) {
        p = {id: row.id, cat: "", tag: "", price: null, unit: "pc", stock: 99, created: new Date().toISOString().slice(0, 10), images: []};
        Object.keys(f).forEach(function (k) { p[k] = f[k]; });
        PROD.push(p); map[row.id] = p;
      } else return;
      if (row.pin != null) { if (row.pin > 0) p.pin = row.pin; else delete p.pin; }
      if (row.hidden) hide[row.id] = 1;
    });

    var cmap = {}, chide = {};
    CATS.forEach(function (c, i) { c._o = 1000 + i; cmap[c.id] = c; });
    (snap.categories || []).forEach(function (row) {
      var c = cmap[row.id]; if (!c) return;
      ["label", "blurb", "img"].forEach(function (k) { if (row[k] != null && row[k] !== "") c[k] = row[k]; });
      if (row.sort != null) c._o = row.sort;
      if (row.hidden) chide[row.id] = 1;
    });
    CATS.sort(function (a, b) { return a._o - b._o; });
    for (var i = CATS.length - 1; i >= 0; i--) if (chide[CATS[i].id]) CATS.splice(i, 1);
    for (var j = PROD.length - 1; j >= 0; j--) if (hide[PROD[j].id] || chide[PROD[j].cat]) PROD.splice(j, 1);
    CATS.forEach(function (c) {
      c.count = PROD.filter(function (p) { return p.cat === c.id; }).length;
    });
  }

  var url = "/.netlify/functions/admin?action=snapshot";
  var applied = null, appliedVersion = null;
  if (location.protocol === "http:" || location.protocol === "https:") {
    try {
      var raw = store("l", "bb_snap");
      var c = raw ? JSON.parse(raw) : null;
      if (c && c.data) { applied = c.data; appliedVersion = c.v; apply(c.data); }
    } catch (e) { applied = null; }
    if (window.fetch) {
      fetch(url, {headers: {Accept: "application/json"}})
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (row) {
          if (!row || row.version === undefined) return;
          var v = row.version, d = row.data || {};
          if (v === appliedVersion) return;
          store("l", "bb_snap", JSON.stringify({v: v, data: d}));
          if (norm(d) === norm(applied)) return;
          if (store("s", "bb_rl") === String(v)) return;
          store("s", "bb_rl", String(v));
          location.reload();
        })
        .catch(function () {});
    }
  }

  // Preview link from the admin panel lets the owner see the site during maintenance.
  try { if (/[?&]preview=1/.test(location.search)) store("s", "bb_preview", "1"); } catch (e) {}
  var m = S.maintenance || {};
  if (m.on && store("s", "bb_preview") !== "1") {
    window.BB_MAINT = true;
    var show = function () {
      var o = document.createElement("div");
      o.id = "maint";
      o.setAttribute("role", "alert");
      o.style.cssText = "position:fixed;inset:0;z-index:99999;background:#07030d;color:#fff7e6;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:Outfit,system-ui,sans-serif";
      var box = document.createElement("div");
      box.style.cssText = "max-width:520px";
      var logo = document.createElement("img");
      logo.src = "img/brand/logo.webp"; logo.alt = ""; logo.style.cssText = "width:140px;max-width:50%;height:auto;margin:0 auto 18px;display:block";
      var h = document.createElement("h1");
      h.textContent = m.title || "Back soon"; h.style.cssText = "font-size:34px;margin:0 0 10px;color:#ffc23a";
      var p = document.createElement("p");
      p.textContent = m.text || ""; p.style.cssText = "font-size:18px;line-height:1.5;margin:0";
      box.appendChild(logo); box.appendChild(h); box.appendChild(p); o.appendChild(box);
      document.body.appendChild(o);
      document.body.style.overflow = "hidden";
    };
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
  }

  // Page title and description for the home and shop pages.
  var seo = S.seo || {};
  var page = document.body ? document.body.getAttribute("data-page") : "";
  function meta(txt) {
    var el = document.querySelector('meta[name="description"]');
    if (el && txt) el.setAttribute("content", txt);
  }
  if (page === "home") { if (seo.homeTitle) document.title = seo.homeTitle; meta(seo.homeDesc); }
  else if (page === "shop") meta(seo.shopDesc);
})();
