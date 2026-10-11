// BuildTrack ticket server — Cloudflare Worker + D1.
// Public:   POST /tickets (tenant submits, rate-limited)   GET /status?id=T-1001&unit=2A
// Manager:  GET /tickets   PATCH /tickets/T-1001   POST /tickets (manual)   — need "Authorization: Bearer <MANAGER_KEY>"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

const STATUSES = ["New", "Assigned", "In Progress", "Done"];
const PRIORITIES = ["Normal", "Urgent"];
const CATEGORIES = ["Plumbing", "Carpentry", "Windows", "Electrical", "Painting", "Heating", "Cooling", "Tiling", "Appliances", "Minor Repairs", "Major Repairs"];
const RATE_LIMIT_PER_HOUR = 8;

const idOut = (n) => "T-" + (1000 + n);
const idIn = (s) => { const m = /^T-(\d+)$/.exec(String(s || "")); return m ? Number(m[1]) - 1000 : NaN; };
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

const toTicket = (r) => ({
  id: idOut(r.id), unit: r.unit, name: r.name, phone: r.phone || "", email: r.email || "",
  description: r.description, category: r.category, priority: r.priority, status: r.status,
  permissionToEnter: !!r.permission_to_enter, photo: r.photo || "", assignedTo: r.assigned_to || "",
  notes: r.notes || "", source: r.source, createdAt: r.created_at, updatedAt: r.updated_at,
});

function isManager(req, env) {
  const key = env.MANAGER_KEY;
  if (!key) return false;
  const got = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (got.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= got.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (path === "/" ) return json({ ok: true, service: "buildtrack-tickets" });

      // ── Tenant status lookup (needs ticket # AND unit) ──
      if (path === "/status" && req.method === "GET") {
        const n = idIn(url.searchParams.get("id"));
        const unit = clip(url.searchParams.get("unit"), 12).toUpperCase();
        if (isNaN(n) || !unit) return json({ error: "Enter your ticket number and unit." }, 400);
        const r = await env.DB.prepare("SELECT * FROM tickets WHERE id = ?").bind(n).first();
        if (!r || r.unit.toUpperCase() !== unit) return json({ error: "No ticket found for that number and unit." }, 404);
        return json({ id: idOut(r.id), status: r.status, category: r.category, createdAt: r.created_at, updatedAt: r.updated_at });
      }

      // ── Create ticket ──
      if (path === "/tickets" && req.method === "POST") {
        const body = await req.json().catch(() => null);
        if (!body) return json({ error: "Bad request." }, 400);
        const manager = isManager(req, env);
        if (!manager && body.website) return json({ id: "T-0000", status: "New" }); // honeypot: pretend success

        const unit = clip(body.unit, 12).toUpperCase();
        const name = clip(body.name, 80);
        const description = clip(body.description, 2000);
        const phone = clip(body.phone, 40);
        const email = clip(body.email, 120);
        if (!unit) return json({ error: "Please enter your unit number." }, 400);
        if (!name) return json({ error: "Please enter your name." }, 400);
        if (description.length < 5) return json({ error: "Please describe the problem." }, 400);
        if (!manager && !phone && !email) return json({ error: "Please give a phone number or email so we can reach you." }, 400);
        let photo = typeof body.photo === "string" ? body.photo : "";
        if (photo && (!photo.startsWith("data:image/jpeg;base64,") || photo.length > 700000)) photo = "";

        const ip = req.headers.get("CF-Connecting-IP") || "unknown";
        const now = Date.now();
        if (!manager) {
          const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM tickets WHERE ip = ? AND created_at > ?").bind(ip, now - 3600e3).first();
          if (c && c.n >= RATE_LIMIT_PER_HOUR) return json({ error: "Too many requests from this device. Please call the office." }, 429);
        }
        const category = CATEGORIES.includes(body.category) ? body.category : "Minor Repairs";
        const priority = PRIORITIES.includes(body.priority) ? body.priority : "Normal";
        const res = await env.DB.prepare(
          "INSERT INTO tickets (unit,name,phone,email,description,category,priority,status,permission_to_enter,photo,source,ip,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'New',?,?,?,?,?,?)"
        ).bind(unit, name, phone, email, description, category, priority, body.permissionToEnter ? 1 : 0, photo, manager ? "manager" : "tenant", ip, now, now).run();
        const id = res.meta.last_row_id;
        const r = await env.DB.prepare("SELECT * FROM tickets WHERE id = ?").bind(id).first();
        return json(manager ? toTicket(r) : { id: idOut(id), status: "New" }, 201);
      }

      // ── Everything below is manager-only ──
      if (!isManager(req, env)) return json({ error: "Unauthorized." }, 401);

      if (path === "/tickets" && req.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM tickets ORDER BY id DESC LIMIT 1000").all();
        return json({ tickets: results.map(toTicket), serverTime: Date.now() });
      }

      const m = /^\/tickets\/(T-\d+)$/.exec(path);
      if (m && req.method === "PATCH") {
        const n = idIn(m[1]);
        const body = await req.json().catch(() => null);
        if (!body) return json({ error: "Bad request." }, 400);
        const sets = [], vals = [];
        if (body.status !== undefined) { if (!STATUSES.includes(body.status)) return json({ error: "Bad status." }, 400); sets.push("status = ?"); vals.push(body.status); }
        if (body.priority !== undefined) { if (!PRIORITIES.includes(body.priority)) return json({ error: "Bad priority." }, 400); sets.push("priority = ?"); vals.push(body.priority); }
        if (body.category !== undefined) { if (!CATEGORIES.includes(body.category)) return json({ error: "Bad category." }, 400); sets.push("category = ?"); vals.push(body.category); }
        if (body.assignedTo !== undefined) { sets.push("assigned_to = ?"); vals.push(clip(body.assignedTo, 80)); }
        if (body.notes !== undefined) { sets.push("notes = ?"); vals.push(clip(body.notes, 4000)); }
        if (!sets.length) return json({ error: "Nothing to update." }, 400);
        sets.push("updated_at = ?"); vals.push(Date.now());
        const res = await env.DB.prepare(`UPDATE tickets SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, n).run();
        if (!res.meta.changes) return json({ error: "Not found." }, 404);
        const r = await env.DB.prepare("SELECT * FROM tickets WHERE id = ?").bind(n).first();
        return json(toTicket(r));
      }
      return json({ error: "Not found." }, 404);
    } catch (e) {
      return json({ error: "Server error." }, 500);
    }
  },
};
