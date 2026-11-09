(function () {
"use strict";
var A = window.A, S = A.S, $ = A.$, $$ = A.$$, esc = A.esc, money = A.money, same = A.same, clone = A.clone;
var V = A.views;
var CATNAME = {}; (window.BB_CATS || []).forEach(function (c) { CATNAME[c.id] = c.label; });
A.catLabel = function (id) { try { return A.cEff(id).label || id; } catch (e) { return id || ""; } };
A.img = function (u) { return /^(https?:|data:|\/)/.test(u) ? u : "../" + u; };
A.pf = A.pf || {cat: "all", q: "", status: "all", n: 60, mode: "list"};

/* ---------- history text ---------- */
var SETNAME = {banner: "the top banner", contact: "the contact details", orders: "the order settings", pricing: "the pricing", hero: "the home page text", seo: "the search engine text", maintenance: "maintenance mode"};
function who(h) { return "Admin"; }
function pname(id) { try { var e = A.pEff(id); return e.name || id; } catch (x) { return id; } }
A.describe = function (h) {
  var o = h.old || {}, n = h.new || {}, t = h.tbl, k = h.row_key, what = "";
  if (t === "settings") {
    var nm = SETNAME[k] || k;
    what = h.action === "delete" ? "reset " + nm + " to the original" : "changed " + nm;
  } else if (t === "products") {
    var name = (n.data && n.data.name) || (o.data && o.data.name) || pname(k);
    if (h.action === "insert") what = (n.is_new ? "added the product " : "edited ") + name;
    else if (h.action === "delete") what = o.is_new ? "deleted the product " + name : "reset " + name + " to the original";
    else {
      var f = []; var od = o.data || {}, nd = n.data || {};
      Object.keys(Object.assign({}, od, nd)).forEach(function (x) { if (!same(od[x], nd[x])) f.push(x === "soldOut" ? "sold out" : x === "lb" ? "by the pound" : x); });
      if (!!o.hidden !== !!n.hidden) f.push(n.hidden ? "hid it" : "showed it");
      if (o.pin !== n.pin) f.push("order");
      what = "changed " + name + (f.length ? " (" + f.join(", ") + ")" : "");
    }
  } else if (t === "categories") what = "changed the category " + A.catLabel(k);
  return who(h) + " " + what;
};
A.when = function (iso) { try { return new Date(iso).toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}); } catch (e) { return iso; } };

/* ---------- dashboard ---------- */
V.dashboard = {
  render: function () {
    var ids = A.pAllIds(), cats = A.cList(), banner = A.sGet("banner"), mt = A.sGet("maintenance");
    var cards = cats.map(function (c) {
      var l = ids.map(A.pEff).filter(function (e) { return e.cat === c.id; });
      var hid = l.filter(function (e) { return e.hidden; }).length, sold = l.filter(function (e) { return e.soldOut; }).length;
      return '<a class="stat" href="#/products" data-cat="' + esc(c.id) + '"><span>' + esc(c.label) + (c.hidden ? " (hidden)" : "") + "</span><b>" + (l.length - hid) + "</b><small>" + hid + " hidden, " + sold + " sold out</small></a>";
    }).join("");
    var recent = S.hist.slice(0, 8).map(function (h) { return '<div class="li"><div class="grow">' + esc(A.describe(h)) + "<small>" + esc(A.when(h.at)) + "</small></div></div>"; }).join("") || '<p class="hint">No changes yet.</p>';
    var html = '<div class="page-head"><div class="grow"><h1>Dashboard</h1><p>A quick look at the shop.</p></div></div>' +
      '<div class="stats">' + cards + "</div>" +
      '<div class="stats"><a class="stat" href="#/site"><span>Top banner</span><b>' + (banner.on ? "On" : "Off") + '</b><small>' + esc(String(banner.text).replace('{phone}', A.sGet('contact').phone)) + '</small></a>' +
      '<a class="stat" href="#/site"><span>Maintenance mode</span><b>' + (mt.on ? "ON" : "Off") + "</b><small>" + (mt.on ? "Visitors see the Back soon page" : "The shop is open") + "</small></a>" +
      '<a class="stat" href="#/pricing"><span>Minimum order</span><b>' + money(A.sGet("orders").minOrder) + "</b><small>Change it on Pricing</small></a></div>" +
      '<div class="card"><div class="row" style="justify-content:space-between"><h2>Recent changes</h2><a href="#/history">See all</a></div><div class="list">' + recent + "</div></div>" +
      '<div class="card"><h2>Quick links</h2><div class="row"><a class="btn ghost" href="#/products/new">Add a product</a><a class="btn ghost" href="#/pricing">Edit prices</a><a class="btn ghost" href="#/site">Banner and texts</a><a class="btn ghost" href="../index.html?preview=1" target="_blank" rel="noopener">View the site</a></div></div>';
    return {html: html, title: "Dashboard", crumbs: [["Dashboard"]]};
  },
  bind: function () {
    A.pageClick = function (e) { var a = e.target.closest("[data-cat]"); if (a) { A.pf.cat = a.getAttribute("data-cat"); A.pf.n = 60; } };
  }
};

/* ---------- products list ---------- */
function statusOf(e) { var s = []; if (e.hidden) s.push('<span class="pill bad">Hidden</span>'); if (e.soldOut) s.push('<span class="pill warn">Sold out</span>'); if (e.deal) s.push('<span class="pill ok">Deal</span>'); if (e.isNew) s.push('<span class="pill ok">Added</span>'); else if (A.pEdited(e.id)) s.push('<span class="pill">Edited</span>'); return s.join(" "); }
function filtered() {
  var f = A.pf, q = f.q.trim().toLowerCase();
  return A.pAllIds().map(A.pEff).filter(function (e) {
    if (f.cat !== "all" && e.cat !== f.cat) return false;
    if (q && (e.name + " " + (e.sub || "") + " " + (e.tag || "")).toLowerCase().indexOf(q) < 0) return false;
    if (f.status === "hidden") return e.hidden; if (f.status === "sold") return !!e.soldOut; if (f.status === "edited") return A.pEdited(e.id) || e.isNew;
    return true;
  });
}
function ordered(cat) {
  var base = A.pAllIds(); var idx = {}; base.forEach(function (id, i) { idx[id] = i; });
  return base.map(A.pEff).filter(function (e) { return e.cat === cat; }).sort(function (a, b) { return (a.pin || 999) - (b.pin || 999) || idx[a.id] - idx[b.id]; });
}
function tableHtml() {
  var f = A.pf, l = filtered();
  if (f.mode === "order") {
    if (f.cat === "all") return '<div class="msg">Pick a category above to change the order of its products.</div>';
    var o = ordered(f.cat);
    return '<p class="hint">Products at the top show first when visitors sort by Newest. Use the arrows to move them.</p><div class="list">' + o.map(function (e, i) {
      return '<div class="li"><span class="pill">' + (i + 1) + '</span>' + (e.images && e.images[0] ? '<img class="thumb" src="' + esc(A.img(e.images[0])) + '" alt="">' : '<span class="thumb"></span>') + '<div class="grow"><b>' + esc(e.name) + "</b>" + (e.hidden ? ' <span class="pill bad">Hidden</span>' : "") + '</div><button class="btn ghost sm wr" data-mv="' + esc(e.id) + '" data-d="-1" ' + (i === 0 ? "disabled" : "") + '>Up</button><button class="btn ghost sm wr" data-mv="' + esc(e.id) + '" data-d="1" ' + (i === o.length - 1 ? "disabled" : "") + ">Down</button></div>";
    }).join("") + "</div>";
  }
  if (f.mode === "quick") {
    var tiers = A.sGet("pricing"), rows = l.filter(function (e) { return !tiers[e.cat] && !(e.variants && e.variants.length); });
    var skipped = l.length - rows.length;
    return (skipped ? '<div class="msg">' + skipped + " products are not listed here. Disposables and shrooms are priced on the Pricing page by quantity, and flower sizes are on the Pricing page too.</div>" : "") +
      '<div class="scroll"><table class="tbl"><thead><tr><th></th><th>Product</th><th>Price</th></tr></thead><tbody>' + rows.map(function (e) {
        return '<tr><td>' + (e.images && e.images[0] ? '<img src="' + esc(A.img(e.images[0])) + '" alt="">' : "") + '</td><td class="nm">' + esc(e.name) + '</td><td class="num"><input type="number" step="any" min="0" data-qp="' + esc(e.id) + '" value="' + (e.price == null ? "" : e.price) + '" placeholder="Ask" aria-label="Price for ' + esc(e.name) + '"></td></tr>';
      }).join("") + "</tbody></table></div>" + (rows.length ? "" : '<p class="hint">Nothing to show.</p>');
  }
  var show = l.slice(0, f.n);
  return '<p class="hint">' + l.length + (l.length === 1 ? " product" : " products") + '. Click one to edit it.</p><div class="scroll"><table class="tbl"><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Status</th></tr></thead><tbody>' + show.map(function (e) {
    return '<tr class="click" data-open="' + esc(e.id) + '"><td>' + (e.images && e.images[0] ? '<img src="' + esc(A.img(e.images[0])) + '" alt="" loading="lazy">' : "") + '</td><td class="nm">' + esc(e.name) + "</td><td>" + esc(A.catLabel(e.cat)) + "</td><td>" + esc(A.pPrice(e)) + "</td><td>" + statusOf(e) + "</td></tr>";
  }).join("") + "</tbody></table></div>" + (l.length > show.length ? '<p style="margin-top:12px"><button class="btn ghost" data-more="1">Show more</button></p>' : "") + (l.length ? "" : '<p class="hint">Nothing matches.</p>');
}
function listView() {
  var f = A.pf, cats = A.cList();
  var html = '<div class="page-head"><div class="grow"><h1>Products</h1><p>Edit, hide, reorder and price your menu.</p></div><a class="btn wr" href="#/products/new">Add a product</a></div>' +
    '<div class="tabs" id="ptabs">' + [["list", "All products"], ["quick", "Quick prices"], ["order", "Order"]].map(function (t) { return '<button type="button" data-mode="' + t[0] + '" class="' + (f.mode === t[0] ? "on" : "") + '" data-keep>' + t[1] + "</button>"; }).join("") + "</div>" +
    '<div class="toolbar" data-keep><input class="grow" id="pq" type="search" placeholder="Search products" value="' + esc(f.q) + '" aria-label="Search products">' +
    '<select id="pc" aria-label="Category"><option value="all">All categories</option>' + cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (f.cat === c.id ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("") + "</select>" +
    '<select id="ps" aria-label="Status">' + [["all", "Any status"], ["hidden", "Hidden"], ["sold", "Sold out"], ["edited", "Edited or added"]].map(function (s) { return '<option value="' + s[0] + '"' + (f.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
    '<div class="card" id="ptable">' + tableHtml() + "</div>";
  return {html: html, title: "Products", crumbs: [["Products"]]};
}
function bindList() {
  var f = A.pf;
  var redraw = function () { $("#ptable").innerHTML = tableHtml(); if (!A.canEdit()) { $$("#ptable input").forEach(function (x) { x.disabled = true; }); $$("#ptable .wr").forEach(function (x) { x.hidden = true; }); } };
  $("#pq").addEventListener("input", function (e) { f.q = e.target.value; f.n = 60; redraw(); });
  $("#pc").addEventListener("change", function (e) { f.cat = e.target.value; f.n = 60; redraw(); });
  $("#ps").addEventListener("change", function (e) { f.status = e.target.value; f.n = 60; redraw(); });
  A.pageClick = function (e) {
    var m = e.target.closest("[data-mode]"); if (m) { f.mode = m.getAttribute("data-mode"); A.render(); return; }
    if (e.target.closest("[data-more]")) { f.n += 60; redraw(); return; }
    var mv = e.target.closest("[data-mv]");
    if (mv) {
      var o = ordered(f.cat), i = o.findIndex(function (x) { return x.id === mv.getAttribute("data-mv"); }), j = i + +mv.getAttribute("data-d");
      if (j < 0 || j >= o.length) return;
      var t = o[i]; o[i] = o[j]; o[j] = t; o.forEach(function (x, k) { A.pPin(x.id, k + 1); }); redraw(); return;
    }
    var r = e.target.closest("[data-open]"); if (r) location.hash = "#/products/" + encodeURIComponent(r.getAttribute("data-open"));
  };
  A.pageInput = function (e) {
    var q = e.target.getAttribute && e.target.getAttribute("data-qp"); if (!q) return;
    A.pSet(q, "price", e.target.value === "" ? null : +e.target.value);
  };
}

/* ---------- product editor ---------- */
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30); }
function editor(id) {
  var e = A.pEff(id), custom = !A.baseP[id], cats = A.cList();
  if (!A.pRow(id) && custom) return {html: '<div class="card"><h2>Product not found</h2><a href="#/products">Back to products</a></div>', title: "Not found", crumbs: [["Products", "#/products"], ["Not found"]]};
  var K = function (f) { return custom ? "" : '<span data-ptag="' + f + '">' + A.kind(A.pChanged(id, f), 'data-pr="' + f + '"') + "</span>"; };
  var tiers = A.sGet("pricing")[e.cat], hasVar = !!(e.variants && e.variants.length), imgs = e.images || [];
  var nameF = '<div class="field"><label for="e-name">Name ' + K("name") + '</label><input id="e-name" type="text" data-pf="name" value="' + esc(e.name || "") + '"></div>';
  var catF = custom ? '<div class="field"><label for="e-cat">Category</label><select id="e-cat" data-pf="cat">' + cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === e.cat ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("") + "</select></div>"
    : '<div class="field"><label>Category</label><input type="text" value="' + esc(A.catLabel(e.cat)) + '" disabled data-keep></div>';
  var priceF;
  if (tiers) priceF = '<div class="msg">Price is set by quantity on the <a href="#/pricing">Pricing page</a> for this category. The first price there is what shows on the product.</div>';
  else if (hasVar) priceF = '<div class="field"><label>Sizes and prices ' + K("variants") + '</label><div id="vars">' + e.variants.map(function (v, i) { return '<div class="vrow"><input type="text" data-vf="label" data-vi="' + i + '" value="' + esc(v.label) + '" placeholder="Size name" aria-label="Size name"><input type="number" step="any" min="0" data-vf="price" data-vi="' + i + '" value="' + (v.price == null ? "" : v.price) + '" placeholder="Price" aria-label="Price"><button type="button" class="btn danger sm wr" data-act="rmvar" data-i="' + i + '">Remove</button></div>'; }).join("") + '</div><div class="row"><button type="button" class="btn ghost sm wr" data-act="addvar">Add a size</button><button type="button" class="btn ghost sm wr" data-act="tosingle">Use one price instead</button></div></div>';
  else priceF = '<div class="grid2"><div class="field"><label for="e-price">Price ' + K("price") + '</label><input id="e-price" type="number" step="any" min="0" data-pf="price" value="' + (e.price == null ? "" : e.price) + '" placeholder="Leave empty to show Ask for price"></div><div class="field"><label for="e-unit">Sold per ' + K("unit") + '</label><select id="e-unit" data-pf="unit"><option value="pc"' + (e.unit === "pc" ? " selected" : "") + '>Each (pc)</option><option value=""' + (!e.unit ? " selected" : "") + '>No unit shown</option></select></div></div><p><button type="button" class="btn ghost sm wr" data-act="tovariants">Switch to size options</button></p>';
  var imgH = imgs.map(function (u, i) { return '<div class="imgbox"><img src="' + esc(A.img(u)) + '" alt=""><div class="row">' + (i ? '<button type="button" class="btn ghost wr" data-act="imgfirst" data-i="' + i + '">Main</button>' : '<span class="pill ok">Main</span>') + '<button type="button" class="btn danger wr" data-act="imgrm" data-i="' + i + '">X</button></div></div>'; }).join("");
  var html = '<div class="page-head"><div class="grow"><h1>' + esc(e.name || "New product") + '</h1><p>' + (custom ? "Added by you." : "Original menu item. Anything you change shows a Changed label with a reset link.") + '</p></div><a class="btn ghost" href="#/products" data-keep>Back to products</a></div>' +
    '<div class="card"><h2>Details</h2>' + nameF + '<div class="grid2">' + catF + '<div class="field"><label for="e-tag">Label ' + K("tag") + '</label><input id="e-tag" type="text" data-pf="tag" value="' + esc(e.tag || "") + '" placeholder="Example: Authentic"></div></div>' +
    '<div class="field"><label for="e-sub">Small text under the name ' + K("sub") + '</label><input id="e-sub" type="text" data-pf="sub" value="' + esc(e.sub || "") + '"></div></div>' +
    '<div class="card"><h2>Price</h2>' + priceF + '<label class="check"><input type="checkbox" data-pf="lb"' + (e.lb ? " checked" : "") + '><span>Sold by the pound</span> ' + K("lb") + "</label></div>" +
    '<div class="card"><h2>Availability</h2><label class="check"><input type="checkbox" data-ph="1"' + (e.hidden ? " checked" : "") + '><span><b>Hide from the site</b></span> <span data-ptag="hidden">' + (custom ? "" : A.kind(e.hidden, 'data-pr="hidden"')) + '</span></label><label class="check"><input type="checkbox" data-pf="soldOut"' + (e.soldOut ? " checked" : "") + '><span><b>Sold out</b> (shows a Sold out badge, cannot be added to the cart)</span> ' + K("soldOut") + '</label><label class="check"><input type="checkbox" data-pf="deal"' + (e.deal ? " checked" : "") + '><span><b>Deal badge</b></span> ' + K("deal") + "</label></div>" +
    '<div class="card"><h2>Photos ' + K("images") + '</h2><p class="hint">The first photo is the main one. Photos are shrunk before upload so the site stays fast.</p><div class="imgs">' + (imgH || '<p class="hint">No photos yet.</p>') + '</div><div class="row wr"><label class="btn ghost sm" style="cursor:pointer">Upload photos<input type="file" accept="image/*" multiple data-up="1" hidden></label><input type="url" id="imgurl" placeholder="or paste a photo link" style="max-width:260px"><button type="button" class="btn ghost sm" data-act="imgurl">Add link</button></div></div>' +
    '<div class="card"><h2>Extra choices</h2><p class="hint">For things like flavor or type. Visitors pick one before adding to the cart.</p><div class="grid2"><div class="field"><label for="e-cl">Question ' + K("choiceLabel") + '</label><input id="e-cl" type="text" data-pf="choiceLabel" value="' + esc(e.choiceLabel || "") + '" placeholder="Example: Type"></div><div class="field"><label for="e-ch">Choices, separated by commas ' + K("choices") + '</label><input id="e-ch" type="text" data-pf="choices" value="' + esc((e.choices || []).join(", ")) + '" placeholder="Blanco, Reposado, Anejo"></div></div></div>' +
    '<div class="card"><h2>More</h2><div class="row wr">' + (custom ? '<button type="button" class="btn danger" data-act="del">Delete this product</button>' : (A.pEdited(id) ? '<button type="button" class="btn ghost" data-act="resetall">Reset this product to the original</button>' : '<span class="hint">This is an original product. To remove it from the site, tick Hide above.</span>')) + "</div></div>";
  return {html: html, title: e.name || "New product", crumbs: [["Products", "#/products"], [e.name || "New product"]]};
}
function bindEditor(id) {
  var custom = !A.baseP[id];
  var upd = function (f) { var t = $('[data-ptag="' + f + '"]'); if (t && !custom) t.innerHTML = A.kind(f === "hidden" ? !!(A.pRow(id) || {}).hidden : A.pChanged(id, f), 'data-pr="' + f + '"'); };
  var curVars = function () { var r = []; $$(".vrow").forEach(function (row) { r.push({label: $('[data-vf="label"]', row).value, price: $('[data-vf="price"]', row).value === "" ? null : +$('[data-vf="price"]', row).value}); }); return r; };
  var setImgs = function (arr) { A.pSet(id, "images", arr); A.render(); };
  A.pageInput = function (e) {
    var t = e.target, f = t.getAttribute("data-pf");
    if (t.getAttribute("data-vf")) { A.pSet(id, "variants", curVars()); upd("variants"); return; }
    if (!f || t.type === "checkbox" || t.tagName === "SELECT") return;
    var v = t.value;
    if (f === "price") v = v === "" ? null : +v;
    else if (f === "choices") v = v.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    A.pSet(id, f, v); upd(f);
    if (f === "name") { var h = $("h1"); if (h) h.textContent = v || "New product"; }
  };
  A.pageChange = async function (e) {
    var t = e.target, f = t.getAttribute("data-pf");
    if (t.getAttribute("data-ph")) { A.pHide(id, t.checked); upd("hidden"); return; }
    if (t.getAttribute("data-up")) {
      var files = Array.prototype.slice.call(t.files); if (!files.length) return;
      A.toast("Uploading..."); var arr = (A.pEff(id).images || []).slice();
      try { for (var i = 0; i < files.length; i++) arr.push(await A.uploadImage(files[i], "products")); setImgs(arr); A.toast("Photos added. Remember to save."); }
      catch (x) { A.toast("Upload failed: " + (x.message || x), true); }
      return;
    }
    if (!f) return;
    if (t.type === "checkbox") { A.pSet(id, f, t.checked); upd(f); }
    else if (t.tagName === "SELECT") { A.pSet(id, f, t.value); upd(f); if (f === "cat") A.render(); }
  };
  A.pageClick = function (e) {
    var r = e.target.closest("[data-pr]");
    if (r) { var f = r.getAttribute("data-pr"); if (f === "hidden") A.pHide(id, false); else A.pReset(id, f); A.render(); return; }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.getAttribute("data-act"), i = +b.getAttribute("data-i"), ef = A.pEff(id);
    if (a === "addvar") { var v = curVars(); v.push({label: "", price: null}); A.pSet(id, "variants", v); A.render(); }
    else if (a === "rmvar") { var v2 = curVars(); v2.splice(i, 1); A.pSet(id, "variants", v2); if (!v2.length) A.pSet(id, "price", null); A.render(); }
    else if (a === "tovariants") { A.pSet(id, "variants", [{label: "", price: ef.price}]); A.pSet(id, "price", null); A.render(); }
    else if (a === "tosingle") { if (confirm("Remove all sizes and use one price?")) { var first = (ef.variants && ef.variants[0] && ef.variants[0].price) || null; A.pSet(id, "variants", []); A.pSet(id, "price", first); A.render(); } }
    else if (a === "imgrm") { var im = (ef.images || []).slice(); im.splice(i, 1); setImgs(im); }
    else if (a === "imgfirst") { var im2 = (ef.images || []).slice(); im2.unshift(im2.splice(i, 1)[0]); setImgs(im2); }
    else if (a === "imgurl") { var u = $("#imgurl").value.trim(); if (u) setImgs((ef.images || []).concat([u])); }
    else if (a === "del") { if (confirm("Delete this product for good?")) { A.pDelete(id); location.hash = "#/products"; } }
    else if (a === "resetall") { if (confirm("Throw away all your changes to this product?")) { var rr = A.pNewRow(); A.pStage(id, rr); A.render(); } }
  };
}
V.products = {
  render: function (args) {
    if (!args.length) return listView();
    if (args[0] === "new") {
      var id = "c-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      var cat = A.pf.cat !== "all" ? A.pf.cat : (A.cList()[0] || {}).id;
      A.pStage(id, {data: {cat: cat, name: "", tag: "", price: null, unit: "pc", created: new Date().toISOString().slice(0, 10), images: []}, hidden: false, pin: null, is_new: true});
      location.replace("#/products/" + id);
      return {html: "", skip: true};
    }
    return editor(args[0]);
  },
  bind: function (page, args) { if (!args.length) bindList(); else bindEditor(args[0]); }
};

/* ---------- categories ---------- */
V.categories = {
  render: function () {
    var l = A.cList();
    var html = '<div class="page-head"><div class="grow"><h1>Categories</h1><p>The shelves on the home page and menu.</p></div></div>' + l.map(function (c, i) {
      var K = function (f) { return '<span data-ctag="' + c.id + "." + f + '">' + A.kind(A.cChanged(c.id, f), 'data-cr="' + c.id + "." + f + '"') + "</span>"; };
      return '<div class="card"><div class="row" style="justify-content:space-between"><h2>' + esc(c.label) + (c.hidden ? ' <span class="pill bad">Hidden</span>' : "") + '</h2><div class="row wr"><button class="btn ghost sm" data-cm="' + c.id + '" data-d="-1"' + (i === 0 ? " disabled" : "") + '>Move up</button><button class="btn ghost sm" data-cm="' + c.id + '" data-d="1"' + (i === l.length - 1 ? " disabled" : "") + '>Move down</button></div></div>' +
        '<div class="grid2"><div><div class="field"><label>Name ' + K("label") + '</label><input type="text" data-cf="label" data-id="' + c.id + '" value="' + esc(c.label) + '"></div><div class="field"><label>Short description ' + K("blurb") + '</label><textarea data-cf="blurb" data-id="' + c.id + '" rows="2">' + esc(c.blurb) + '</textarea></div><label class="check"><input type="checkbox" data-ch="' + c.id + '"' + (c.hidden ? " checked" : "") + "><span><b>Hide this category</b> (and its products)</span></label></div>" +
        '<div><div class="lbl">Card picture ' + K("img") + '</div><img src="' + esc(c.img.indexOf("http") === 0 ? c.img : "../" + c.img) + '" alt="" style="width:100%;max-width:240px;border-radius:10px;display:block;margin-bottom:8px"><label class="btn ghost sm wr" style="cursor:pointer">Upload a new picture<input type="file" accept="image/*" data-cu="' + c.id + '" hidden></label></div></div></div>';
    }).join("");
    return {html: html, title: "Categories", crumbs: [["Categories"]]};
  },
  bind: function () {
    A.pageInput = function (e) {
      var f = e.target.getAttribute("data-cf"); if (!f) return;
      var id = e.target.getAttribute("data-id"); A.cSet(id, f, e.target.value);
      var t = $('[data-ctag="' + id + "." + f + '"]'); if (t) t.innerHTML = A.kind(A.cChanged(id, f), 'data-cr="' + id + "." + f + '"');
    };
    A.pageChange = async function (e) {
      var t = e.target;
      if (t.getAttribute("data-ch")) { var id = t.getAttribute("data-ch"), r = A.cRow(id) || A.cNewRow(); r.hidden = t.checked; A.cStage(id, r); A.render(); return; }
      if (t.getAttribute("data-cu") && t.files[0]) { try { A.toast("Uploading..."); var u = await A.uploadImage(t.files[0], "categories"); A.cSet(t.getAttribute("data-cu"), "img", u); A.render(); A.toast("Picture added. Remember to save."); } catch (x) { A.toast("Upload failed: " + (x.message || x), true); } }
    };
    A.pageClick = function (e) {
      var r = e.target.closest("[data-cr]");
      if (r) { var p = r.getAttribute("data-cr").split("."), row = A.cRow(p[0]); if (row) { delete row.data[p[1]]; A.cStage(p[0], row); } A.render(); return; }
      var m = e.target.closest("[data-cm]");
      if (m) { var l = A.cList(), i = l.findIndex(function (c) { return c.id === m.getAttribute("data-cm"); }), j = i + +m.getAttribute("data-d"); if (j < 0 || j >= l.length) return; var t = l[i]; l[i] = l[j]; l[j] = t; l.forEach(function (c, k) { var rw = A.cRow(c.id) || A.cNewRow(); rw.sort = k + 1; A.cStage(c.id, rw); }); A.render(); }
    };
  }
};
})();
