// Blinks Bakery admin API (Netlify Function).
// Needs three environment variables in Netlify:
//   ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const crypto = require("crypto");

const TABLES = {settings: "key", products: "id", categories: "id"};
const DAY = 24 * 3600 * 1000;

function env() {
  const e = {pw: process.env.ADMIN_PASSWORD, url: (process.env.SUPABASE_URL || "").replace(/\/+$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY};
  const miss = [];
  if (!e.pw) miss.push("ADMIN_PASSWORD");
  if (!e.url) miss.push("SUPABASE_URL");
  if (!e.key) miss.push("SUPABASE_SERVICE_ROLE_KEY");
  e.missing = miss;
  return e;
}
function reply(status, body, extra) {
  return {statusCode: status, headers: Object.assign({"Content-Type": "application/json"}, extra || {}), body: JSON.stringify(body)};
}
function secret(e) { return crypto.createHash("sha256").update("bb-admin|" + e.pw + "|" + e.key).digest(); }
function sign(e, exp) {
  const p = String(exp);
  return p + "." + crypto.createHmac("sha256", secret(e)).update(p).digest("hex");
}
function verify(e, token) {
  if (!token || token.indexOf(".") < 0) return false;
  const [p, sig] = token.split(".");
  const good = crypto.createHmac("sha256", secret(e)).update(p).digest("hex");
  const a = Buffer.from(sig || ""), b = Buffer.from(good);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && Number(p) > Date.now();
}
function same(a, b) {
  const x = Buffer.from(crypto.createHash("sha256").update(String(a)).digest("hex")), y = Buffer.from(crypto.createHash("sha256").update(String(b)).digest("hex"));
  return crypto.timingSafeEqual(x, y);
}

async function sb(e, method, path, body, headers) {
  const r = await fetch(e.url + path, {
    method,
    headers: Object.assign({apikey: e.key, Authorization: "Bearer " + e.key, "Content-Type": "application/json"}, headers || {}),
    body: body === undefined ? undefined : (typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body))
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (x) { data = text; }
  if (!r.ok) {
    const msg = data && (data.message || data.error || data.msg) || ("Supabase error " + r.status);
    const err = new Error(msg); err.status = r.status; throw err;
  }
  return data;
}
const list = (vals) => "(" + vals.map((v) => '"' + String(v).replace(/"/g, '\\"') + '"').join(",") + ")";

function bad(m) { const x = new Error(m); x.status = 400; return x; }

async function runOps(e, ops) {
  for (const op of ops) {
    const pk = TABLES[op.table];
    if (!pk) throw bad("Unknown table");
    if (op.op === "upsert" || op.op === "insert") {
      if (!Array.isArray(op.rows) || !op.rows.length) continue;
      await sb(e, "POST", "/rest/v1/" + op.table, op.rows, op.op === "upsert" ? {Prefer: "resolution=merge-duplicates,return=minimal"} : {Prefer: "return=minimal"});
    } else if (op.op === "delete") {
      if (!Array.isArray(op.keys) || !op.keys.length) continue;
      await sb(e, "DELETE", "/rest/v1/" + op.table + "?" + pk + "=in." + encodeURIComponent(list(op.keys)));
    } else if (op.op === "clear") {
      await sb(e, "DELETE", "/rest/v1/" + op.table + "?" + pk + "=not.is.null");
    } else throw bad("Unknown operation");
  }
}

exports.handler = async function (event) {
  const e = env();
  const q = event.queryStringParameters || {};

  // Public: the small snapshot visitors read. Cached at the edge for a short time.
  if (event.httpMethod === "GET" && q.action === "snapshot") {
    if (e.missing.length) return reply(503, {error: "not configured"}, {"Cache-Control": "no-store"});
    try {
      const rows = await sb(e, "GET", "/rest/v1/snapshot?id=eq.1&select=data,version");
      return reply(200, rows && rows[0] ? rows[0] : {version: 0, data: {}}, {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=120"
      });
    } catch (x) { return reply(502, {error: "unavailable"}, {"Cache-Control": "no-store"}); }
  }

  if (event.httpMethod !== "POST") return reply(405, {error: "Use POST"});
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (x) { return reply(400, {error: "Bad request"}); }

  if (e.missing.length) {
    return reply(500, {error: "The server is not set up yet. Missing in Netlify environment variables: " + e.missing.join(", ") + ". Add them and redeploy."});
  }

  if (body.action === "login") {
    if (!same(body.password || "", e.pw)) {
      await new Promise((r) => setTimeout(r, 800));
      return reply(401, {error: "Wrong password."});
    }
    return reply(200, {token: sign(e, Date.now() + 7 * DAY)});
  }

  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || "";
  if (!verify(e, auth.replace(/^Bearer\s+/i, ""))) return reply(401, {error: "Please sign in again."});

  try {
    if (body.action === "load") {
      const r = await Promise.all([
        sb(e, "GET", "/rest/v1/settings?select=*"),
        sb(e, "GET", "/rest/v1/products?select=*"),
        sb(e, "GET", "/rest/v1/categories?select=*"),
        sb(e, "GET", "/rest/v1/history?select=*&order=id.desc&limit=200")
      ]);
      return reply(200, {settings: r[0], products: r[1], categories: r[2], history: r[3]});
    }
    if (body.action === "write") {
      await runOps(e, body.ops || []);
      return reply(200, {ok: true});
    }
    if (body.action === "upload") {
      const type = String(body.type || "");
      if (!/^image\/(webp|png|jpeg|gif|avif)$/.test(type)) return reply(400, {error: "Only images can be uploaded."});
      const buf = Buffer.from(String(body.data || ""), "base64");
      if (!buf.length || buf.length > 4.5 * 1024 * 1024) return reply(400, {error: "Image is empty or too big."});
      const ext = {"image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/avif": "avif"}[type];
      const base = String(body.name || "photo").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "photo";
      const folder = body.folder === "categories" ? "categories" : "products";
      const path = folder + "/" + Date.now().toString(36) + "-" + base + "." + ext;
      await sb(e, "POST", "/storage/v1/object/media/" + path, buf, {"Content-Type": type, "x-upsert": "false", "Cache-Control": "max-age=31536000"});
      return reply(200, {url: e.url + "/storage/v1/object/public/media/" + path});
    }
    return reply(400, {error: "Unknown action"});
  } catch (x) {
    return reply(x.status && x.status < 500 ? 400 : 502, {error: x.message || "Server error"});
  }
};
