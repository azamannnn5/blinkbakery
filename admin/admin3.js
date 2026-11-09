(function () {
"use strict";
var A = window.A, S = A.S, $ = A.$, $$ = A.$$, esc = A.esc, money = A.money, same = A.same, clone = A.clone;
var V = A.views;

/* ---------- pricing ---------- */
function stepsCard(cat) {
  var steps = A.sGet("pricing")[cat] || [], ch = A.sChanged("pricing", cat);
  var tag = '<span data-tag="pricing.' + cat + '">' + A.kind(ch, 'data-reset="pricing.' + cat + '"') + "</span>";
  return '<div class="card steps" data-cat="' + cat + '"><h2>' + esc(A.catLabel(cat)) + " bulk prices " + tag + '</h2><p class="hint">The price per item drops as the customer adds more. Items in the same category are counted together, any mix.</p>' +
    '<div class="srow" style="font-size:12px;color:#6b6078"><span>From quantity</span><span>Price each</span><span></span></div>' +
    steps.map(function (s, i) {
      return '<div class="srow"><input type="number" min="1" step="1" data-ts="min" data-i="' + i + '" value="' + s.min + '"' + (i === 0 ? " disabled data-keep" : "") + ' aria-label="From quantity"><input type="number" min="0" step="any" data-ts="price" data-i="' + i + '" value="' + s.price + '" aria-label="Price each">' +
        (i ? '<button type="button" class="btn danger sm wr" data-act="rmstep" data-i="' + i + '">Remove</button>' : "<span></span>") + "</div>";
    }).join("") + '<button type="button" class="btn ghost sm wr" data-act="addstep">Add a step</button></div>';
}
function readSteps(cat) {
  var card = $('.steps[data-cat="' + cat + '"]'), out = [];
  $$(".srow", card).forEach(function (r) {
    var m = $('[data-ts="min"]', r), p = $('[data-ts="price"]', r); if (!m) return;
    out.push({min: +m.value || 1, price: +p.value || 0});
  });
  return out;
}
V.pricing = {
  render: function () {
    var ids = A.pAllIds().map(A.pEff).filter(function (e) { return e.variants && e.variants.length; });
    var labels = ids.length ? ids[0].variants.map(function (v) { return v.label; }) : [];
    var cats = Object.keys(A.sGet("pricing"));
    var html = '<div class="page-head"><div class="grow"><h1>Pricing</h1><p>Minimum order, bulk prices and sizes.</p></div></div>' +
      '<div class="card"><h2>Minimum order</h2><p class="hint">Customers cannot send an order below this total.</p><div style="max-width:220px">' + A.sField("orders", "minOrder", "Minimum order in dollars", {type: "num"}) + "</div></div>" +
      cats.map(stepsCard).join("") +
      '<div class="card"><h2>Sizes and prices</h2><p class="hint">Price of each size for every product that has size options.</p>' +
      '<div class="row wr" style="margin-bottom:12px"><span>Change all prices by</span><input type="number" id="pct" step="any" style="width:90px" placeholder="10" aria-label="Percent"><span>percent</span><button type="button" class="btn ghost sm" data-act="pct">Apply</button><span class="hint" style="margin:0">Use a minus for a discount. Rounds to whole dollars.</span></div>' +
      (ids.length ? '<div class="scroll"><table class="tbl"><thead><tr><th>Product</th>' + labels.map(function (l) { return "<th>" + esc(l) + "</th>"; }).join("") + "<th></th></tr></thead><tbody>" +
        ids.map(function (e) {
          return "<tr><td class=\"nm\"><a href=\"#/products/" + encodeURIComponent(e.id) + '">' + esc(e.name) + "</a></td>" + e.variants.map(function (v, i) {
            return '<td><input type="number" step="any" min="0" style="width:84px" data-fv="' + esc(e.id) + "." + i + '" value="' + (v.price == null ? "" : v.price) + '" aria-label="' + esc(e.name + " " + v.label) + '"></td>';
          }).join("") + "<td>" + (A.pChanged(e.id, "variants") ? '<span class="pill warn">Changed</span> <button type="button" class="reset wr" data-fr="' + esc(e.id) + '">Reset</button>' : "") + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<p class="hint">No products with sizes.</p>') + "</div>";
    return {html: html, title: "Pricing", crumbs: [["Pricing"]]};
  },
  bind: function (page) {
    A.bindSettings(page);
    var updTag = function (cat) { var t = $('[data-tag="pricing.' + cat + '"]'); if (t) t.innerHTML = A.kind(A.sChanged("pricing", cat), 'data-reset="pricing.' + cat + '"'); };
    A.pageInput = function (e) {
      var t = e.target;
      if (t.getAttribute("data-ts")) { var cat = t.closest(".steps").getAttribute("data-cat"); A.sSet("pricing", cat, readSteps(cat)); updTag(cat); return; }
      var fv = t.getAttribute("data-fv");
      if (fv) { var p = fv.split("."), id = p.slice(0, -1).join("."), i = +p[p.length - 1], v = clone(A.pEff(id).variants); v[i].price = t.value === "" ? null : +t.value; A.pSet(id, "variants", v); }
    };
    A.pageChange = function (e) {
      var t = e.target;
      if (t.getAttribute("data-ts") === "min") { var cat = t.closest(".steps").getAttribute("data-cat"), s = readSteps(cat); s.sort(function (a, b) { return a.min - b.min; }); s[0].min = 1; A.sSet("pricing", cat, s); A.render(); }
      if (t.getAttribute("data-fv")) A.render();
    };
    A.pageClick = function (e) {
      var b = e.target.closest("[data-act]"), fr = e.target.closest("[data-fr]");
      if (fr) { A.pReset(fr.getAttribute("data-fr"), "variants"); A.render(); return; }
      if (!b) return;
      var a = b.getAttribute("data-act");
      if (a === "addstep" || a === "rmstep") {
        var cat = b.closest(".steps").getAttribute("data-cat"), s = readSteps(cat);
        if (a === "addstep") { var l = s[s.length - 1]; s.push({min: l.min + 5, price: l.price}); } else s.splice(+b.getAttribute("data-i"), 1);
        A.sSet("pricing", cat, s); A.render();
      } else if (a === "pct") {
        var pc = parseFloat($("#pct").value); if (!pc) { A.toast("Type a percent first.", true); return; }
        if (!confirm("Change every size price by " + pc + " percent?")) return;
        A.pAllIds().map(A.pEff).filter(function (x) { return x.variants && x.variants.length; }).forEach(function (x) {
          A.pSet(x.id, "variants", x.variants.map(function (v) { return {label: v.label, price: v.price == null ? null : Math.round(v.price * (1 + pc / 100))}; }));
        });
        A.render();
      }
    };
  }
};

/* ---------- contact and orders ---------- */
V.contact = {
  render: function () {
    var F = A.sField;
    var html = '<div class="page-head"><div class="grow"><h1>Contact and orders</h1><p>How customers reach you and what the order messages say.</p></div></div>' +
      '<div class="card"><h2>Contact details</h2><p class="hint">Shown in the top banner, the menu and the footer.</p><div class="grid2">' +
      F("contact", "phone", "Phone number", {ph: "+1 (555) 123-4567", help: "The tap to call link is made from this automatically."}) +
      F("contact", "telegram", "Telegram username", {help: "Without the @ sign."}) +
      F("contact", "telegramLink", "Telegram chat link", {ph: "https://t.me/yourname", help: "Where the Send order via Telegram button opens."}) +
      F("contact", "whatsapp", "WhatsApp number", {ph: "16892827251", help: "Digits only with the country code. Leave empty if you do not use WhatsApp yet."}) + "</div></div>" +
      '<div class="card"><h2>Order messages</h2><p class="hint">Texts customers see in the cart and send to you.</p>' +
      F("orders", "orderTitle", "First line of every order message") +
      F("orders", "minMsg", "Message when the cart is under the minimum", {help: "Use {min} for the minimum and {more} for the amount still needed."}) +
      F("orders", "tgCopied", "Message after the Telegram button copies the order") +
      F("orders", "cartNote", "Note under the send buttons", {type: "area"}) + "</div>";
    return {html: html, title: "Contact and orders", crumbs: [["Contact and orders"]]};
  },
  bind: function (page) {
    A.bindSettings(page);
    A.onSetting = function (key, f, v) {
      if (key !== "contact") return;
      if (f === "phone") {
        var d = String(v).replace(/\D/g, ""), href = d ? (String(v).trim().charAt(0) === "+" ? "+" + d : (d.length === 10 ? "+1" + d : "+" + d)) : "";
        A.sSet("contact", "phoneHref", href);
      } else if (f === "telegram") {
        var cur = A.sGet("contact").telegramLink || "";
        if (!cur || /^https:\/\/t\.me\//.test(cur)) { var u = String(v).replace(/^@/, "").trim(); A.sSet("contact", "telegramLink", u ? "https://t.me/" + u : ""); var el = $("#f-contact-telegramLink"); if (el) { el.value = u ? "https://t.me/" + u : ""; var tg = $('[data-tag="contact.telegramLink"]'); if (tg) tg.innerHTML = A.kind(A.sChanged("contact", "telegramLink"), 'data-reset="contact.telegramLink"'); } }
      }
    };
  }
};

/* ---------- site ---------- */
V.site = {
  render: function () {
    var F = A.sField, mt = A.sGet("maintenance");
    var html = '<div class="page-head"><div class="grow"><h1>Site and banner</h1><p>The top banner, home page words and search engine text.</p></div></div>' +
      '<div class="card"><h2>Top banner</h2>' + F("banner", "on", "Show the top banner", {type: "check"}) + F("banner", "text", "Banner text", {help: "Type {phone} where the phone number should appear."}) + "</div>" +
      '<div class="card"><h2>Home page words</h2><div class="grid3">' + F("hero", "line1", "Big title, line 1") + F("hero", "line2", "Line 2") + F("hero", "accent", "Highlighted word") + "</div>" + F("hero", "lead", "Sentence under the title", {type: "area", rows: 2}) + "</div>" +
      '<div class="card"><h2>Search engines</h2><p class="hint">What Google shows for your site. Changes can take a while to appear in search results.</p>' + F("seo", "siteName", "Site name", {help: "Used at the end of page titles, like Flower | Blinks Bakery."}) + F("seo", "homeTitle", "Home page title") + F("seo", "homeDesc", "Home page description", {type: "area", rows: 2}) + F("seo", "shopDesc", "Menu page description", {type: "area", rows: 2}) + "</div>" +
      '<div class="card"><h2>Maintenance mode</h2><p class="hint">Turn this on to close the shop with a Back soon page. You can still look around with the View the site link in the menu.</p>' + (mt.on ? '<div class="msg warn">Maintenance mode is on. Visitors cannot see the shop.</div>' : "") + F("maintenance", "on", "Close the shop for visitors", {type: "check"}) + F("maintenance", "title", "Title") + F("maintenance", "text", "Message", {type: "area", rows: 2}) + "</div>";
    return {html: html, title: "Site and banner", crumbs: [["Site and banner"]]};
  },
  bind: function (page) { A.bindSettings(page); }
};

/* ---------- history ---------- */
V.history = {
  render: function () {
    var l = S.hist.map(function (h) {
      return '<div class="li"><div class="grow">' + esc(A.describe(h)) + "<small>" + esc(A.when(h.at)) + '</small></div><button class="btn ghost sm wr" data-undo="' + h.id + '">Undo</button></div>';
    }).join("") || '<p class="hint">No changes yet.</p>';
    return {html: '<div class="page-head"><div class="grow"><h1>Change history</h1><p>The last 200 changes. Undo puts that item back the way it was before.</p></div></div><div class="card list">' + l + "</div>", title: "Change history", crumbs: [["Change history"]]};
  },
  bind: function () {
    A.pageClick = async function (e) {
      var b = e.target.closest("[data-undo]"); if (!b) return;
      var h = S.hist.find(function (x) { return String(x.id) === b.getAttribute("data-undo"); }); if (!h) return;
      if (!confirm("Undo this change?\n\n" + A.describe(h))) return;
      try {
        if (h.action === "insert") await A.api("write", {ops: [{table: h.tbl, op: "delete", keys: [h.row_key]}]});
        else { var o = clone(h.old); delete o.updated_at; await A.api("write", {ops: [{table: h.tbl, op: "upsert", rows: [o]}]}); }
      } catch (x) { A.toast("Could not undo: " + x.message, true); return; }
      await A.load(); A.render(); A.toast("Undone.");
    };
  }
};

/* ---------- backup ---------- */
function clean(rows) { return rows.map(function (r) { var o = clone(r); delete o.updated_at; delete o.updated_by; return o; }); }
V.backup = {
  render: function () {
    var html = '<div class="page-head"><div class="grow"><h1>Backup</h1><p>Save a copy of everything you changed in the admin panel.</p></div></div>' +
      '<div class="card"><h2>Download a backup</h2><p class="hint">A small file with your edits, prices, texts and added products. Photos stay in storage.</p><button class="btn" data-act="export" data-keep>Download backup</button></div>' +
      '<div class="card"><h2>Restore a backup</h2><div class="msg warn">This replaces all your current edits with the ones in the file.</div><label class="btn danger" style="cursor:pointer">Choose a backup file<input type="file" accept=".json,application/json" data-restore="1" hidden></label></div>';
    return {html: html, title: "Backup", crumbs: [["Backup"]]};
  },
  bind: function () {
    A.pageClick = function (e) {
      if (!e.target.closest('[data-act="export"]')) return;
      var d = {app: "blinks-bakery-admin", version: 1, exported_at: new Date().toISOString(),
        settings: Object.keys(S.db.settings).map(function (k) { return {key: k, value: S.db.settings[k]}; }), products: clean(Object.keys(S.db.products).map(function (k) { return S.db.products[k]; })), categories: clean(Object.keys(S.db.categories).map(function (k) { return S.db.categories[k]; }))};
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], {type: "application/json"}));
      a.download = "blinks-backup-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
    };
    A.pageChange = async function (e) {
      var t = e.target; if (!t.getAttribute("data-restore") || !t.files[0]) return;
      var d; try { d = JSON.parse(await t.files[0].text()); } catch (x) { A.toast("That file is not a valid backup.", true); return; }
      if (d.app !== "blinks-bakery-admin" || !Array.isArray(d.settings) || !Array.isArray(d.products) || !Array.isArray(d.categories)) { A.toast("That file is not a Blinks Bakery backup.", true); return; }
      if (!confirm("Replace all current edits with this backup from " + (d.exported_at || "").slice(0, 10) + "?")) return;
      try {
        await A.api("write", {ops: [
          {table: "settings", op: "clear"}, {table: "products", op: "clear"}, {table: "categories", op: "clear"},
          {table: "settings", op: "insert", rows: clean(d.settings)}, {table: "products", op: "insert", rows: clean(d.products)}, {table: "categories", op: "insert", rows: clean(d.categories)}]});
        S.pend = {settings: {}, products: {}, categories: {}}; await A.load(); A.render(); A.toast("Backup restored.");
      } catch (x) { A.toast("Restore failed: " + (x.message || x), true); }
    };
  }
};

/* ---------- help ---------- */
V.help = {
  render: function () {
    var html = '<div class="page-head"><div class="grow"><h1>Help</h1><p>Short answers to the common questions.</p></div></div><div class="card help">' +
      "<h3>How saving works</h3><p>Change as much as you like. A purple bar at the bottom counts your unsaved changes. Nothing goes live until you press Save changes. Discard throws them away. The site picks up a saved change within about a minute.</p>" +
      "<h3>Original and Changed labels</h3><p>Next to each field you will see Original or Changed. Original means it is still the way the site was built. Changed means you edited it. Press Reset to original to go back.</p>" +
      "<h3>Products</h3><ul><li>Click a product to edit its name, price, labels, photos and choices.</li><li>Tick Hide to take a product off the site without deleting it.</li><li>Tick Sold out to keep it visible but stop people ordering it.</li><li>Quick prices lets you change simple prices in one list.</li><li>The Order tab sets which products show first in a category.</li><li>Add a product with the button at the top. Products you add can be deleted. Original products can only be hidden.</li></ul>" +
      "<h3>Prices</h3><p>Disposables and shrooms use quantity prices set on the Pricing page. Flower has a price for each size, also on the Pricing page. The minimum order is on the Pricing page too.</p>" +
      "<h3>Photos</h3><p>Upload from your computer or phone. They are shrunk automatically. The first photo is the main one.</p>" +
      "<h3>Banner and maintenance mode</h3><p>Turn the top banner on or off and change its words on Site and banner. Maintenance mode shows visitors a Back soon page. Use View the site in the menu to see the real shop while it is on.</p>" +
      "<h3>Undo</h3><p>Change history lists every saved change with the time. Press Undo on a line to put it back.</p>" +
      "<h3>Backup</h3><p>Download a backup now and then. The owner can restore it later.</p>" +
      "<h3>Password</h3><p>The password is the ADMIN_PASSWORD value in your Netlify site settings under Environment variables. To change it, edit that value and trigger a new deploy.</p>" +
      "<h3>Shortcuts</h3><p>Press the slash key anywhere to jump to search. Type a product name or a page name and press Enter.</p></div>";
    return {html: html, title: "Help", crumbs: [["Help"]]};
  }
};

A.boot();
})();
