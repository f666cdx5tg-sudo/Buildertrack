import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import qrcode from "qrcode-generator";
import { ICONS } from "./icons.js";
import { APP_VERSION, font, fontSans, AG, AG2, PK, PK2, PK3, BG1, BG2, BG3, BD, TXT, TXT2, SAFE_TOP, S, Icon, SvgIcon, LEGACY_ICON, areaIconKey, GlobalStyle, compressImage, TICKET_STATUSES, TICKET_COLORS, URGENT_RX, CATEGORY_RULES, classifyTicket, ticketAge, ticketCall } from "./shared.jsx";

// Old tenant links pointed at index.html#request?...; send them to the tenant app.
if (/^#request/.test(window.location.hash)) window.location.replace("request.html" + window.location.hash);

const DEFAULT_PROJECT = "456 Grand Ave — Full Building Renovation";

// ─── DATA & CONSTANTS ───────────────────────────────────────────────────────
const TRADE_ICONS = { "Plumbing":"faucet2","Carpentry":"hammer","Windows":"window","Electrical":"plug","Painting":"roller","Heating":"flame","Cooling":"snow","Tiling":"tiles","Appliances":"washer","Minor Repairs":"toolbox","Major Repairs":"hardhat" };
const TRADE_COLORS = { "Plumbing":"#42a5f5","Carpentry":"#d4a373","Windows":"#66bb6a","Electrical":"#FFD60A","Painting":"#bf5af2","Heating":"#ff7043","Cooling":"#80deea","Tiling":"#f06292","Appliances":"#26a69a","Minor Repairs":"#b0bec5","Major Repairs":"#ef5350" };
const TRADES = ["Plumbing","Carpentry","Windows","Electrical","Painting","Heating","Cooling","Tiling","Appliances","Minor Repairs","Major Repairs"];
const PHASES = ["Pending","Demolition","Rough-In","Installation","Finishing","Inspection","Complete"];
const STATUS_COLORS = { "Pending":"#FFFFFF", "Started":"#ef5350", "In Progress":"#F1C40F", "Complete":"#66bb6a", "Vacant":"#FF8C00" };
const DEFAULT_COMMON_AREAS = [
  { id:"elev", label:"Elevators", icon:"elevator", items:["Car 1","Car 2","Car 3","Car 4"] },
  { id:"roof", label:"Roof", icon:"roof", items:["Main Roof","Bulkhead","Water Tower","Antenna Platform"] },
  { id:"base", label:"Basement", icon:"basement", items:["Boiler Room","Storage","Laundry","Mechanical","Fire Suppression"] },
  { id:"grnd", label:"Grounds", icon:"tree", items:["Front Entrance","Courtyard","Parking","Sidewalk"] },
];

const randomName = () => {
  const f = ["Maria","James","Wei","Fatima","Carlos","Sarah","David","Priya","Ahmed","Linda","John","Ana","Michael","Olga","Roberto"];
  const l = ["Rodriguez","Chen","Williams","Patel","Kim","Johnson","Martinez","Lee","Brown","Singh","Garcia","Thompson","Nguyen","Davis","Wilson"];
  return { first: f[Math.floor(Math.random()*f.length)], last: l[Math.floor(Math.random()*l.length)] };
};

const getLetterLabel = (index) => {
  // 0=A, 1=B, ... 25=Z, 26=AA, 27=AB, ...
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
};

const generateUnits = (floors, perFloor, format = "alpha", demo = true) => {
  const units = [];
  const total = floors * perFloor;
  for (let i = 0; i < total; i++) {
    const floorNum = Math.floor(i / perFloor) + 1;
    const posOnFloor = i % perFloor;
    let unitLabel;
    if (format === "alpha") {
      unitLabel = `${floorNum}${getLetterLabel(posOnFloor)}`;
    } else {
      unitLabel = `${floorNum}${String(posOnFloor + 1).padStart(2, "0")}`;
    }
    const isVacant = demo && Math.random() < 0.12;
    const name = demo ? randomName() : { first: "", last: "" };
    const trades = {};
    TRADES.forEach(t => {
      if (!demo) { trades[t] = { status: "Pending", phase: "Pending", contractor: "", scheduled: false, accessDenied: false }; return; }
      const r = Math.random();
      trades[t] = {
        status: r < 0.2 ? "Pending" : r < 0.4 ? "Started" : r < 0.7 ? "In Progress" : "Complete",
        phase: PHASES[Math.floor(Math.random() * PHASES.length)],
        contractor: "",
        scheduled: Math.random() < 0.4,
        accessDenied: Math.random() < 0.08,
      };
    });
    units.push({
      id: i + 1, unit: unitLabel, floor: floorNum,
      vacant: isVacant,
      contact: {
        first: isVacant ? "" : name.first,
        last: isVacant ? "" : name.last,
        phone: (isVacant || !demo) ? "" : `(212) 555-${String(Math.floor(Math.random()*9000)+1000)}`,
        email: (isVacant || !demo) ? "" : `${name.first.toLowerCase()}.${name.last.toLowerCase()}@email.com`,
      },
      trades,
      comments: [],
      photos: [],
      notices: [],
    });
  }
  return units;
};

const toLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Saved projects from before a trade existed: fill in the missing trade on every unit and in the schedule.
const fixUnits = (units) => (units || []).map(u => {
  if (!u.trades || TRADES.every(t => u.trades[t])) return u;
  const trades = { ...u.trades };
  TRADES.forEach(t => { if (!trades[t]) trades[t] = { status: "Pending", phase: "Pending", contractor: "", scheduled: false, accessDenied: false }; });
  return { ...u, trades };
});
const fixSchedule = (sc) => {
  const out = { ...(sc || {}) }; const d = toLocalISO(new Date());
  TRADES.forEach(t => { if (!out[t]) out[t] = { start: d, end: d }; });
  return out;
};

const generateSchedule = (demo = true) => {
  const schedule = {};
  const today = new Date();
  TRADES.forEach(t => {
    const start = new Date(today);
    if (demo) start.setDate(start.getDate() + Math.floor(Math.random() * 14));
    const end = new Date(start);
    end.setDate(end.getDate() + (demo ? Math.floor(Math.random() * 60) + 30 : 30));
    schedule[t] = { start: toLocalISO(start), end: toLocalISO(end) };
  });
  return schedule;
};





const ICON_ANTENNA = "data:image/png;base64,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";
const ICON_WATERTOWER = "data:image/png;base64,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";
const ICON_BOILER = "data:image/png;base64,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";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const unitBucket = (unit) => {
  if (unit.vacant) return "Vacant";
  const statuses = Object.values(unit.trades).map(t => t.status);
  if (statuses.every(s => s === "Complete")) return "Complete";
  if (statuses.every(s => s === "Pending")) return "Pending";
  if (statuses.some(s => s === "In Progress")) return "In Progress";
  if (statuses.some(s => s === "Started")) return "Started";
  return "In Progress";
};

const getUnitColor = (unit) => STATUS_COLORS[unitBucket(unit)];

// Trade progress is calculated from real unit statuses (not stored, not random).
const calcProgress = (units, trade) => {
  if (!units.length) return 0;
  const w = { "Pending": 0, "Started": 0.25, "In Progress": 0.5, "Complete": 1 };
  return Math.round(100 * units.reduce((s, u) => s + (w[u.trades[trade]?.status] || 0), 0) / units.length);
};

const getTradeColor = (status) => STATUS_COLORS[status] || TXT2;

const getDaysFromNow = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
};

const formatDate = (x) => {
  if (!x) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(x) ? new Date(x + "T00:00:00") : new Date(x);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const DEMO_EVENTS = [
  { time: "8:15 AM", type: "arrival", msg: "Plumbing crew arrived - 4 workers", unit: "2A" },
  { time: "8:30 AM", type: "access", msg: "Cannot access unit - no response", unit: "2C" },
  { time: "9:00 AM", type: "progress", msg: "Electrical rough-in complete", unit: "3B" },
  { time: "9:45 AM", type: "issue", msg: "Water damage found behind wall", unit: "4D" },
  { time: "10:15 AM", type: "delivery", msg: "Window delivery received - 12 units", unit: "Lobby" },
  { time: "10:30 AM", type: "inspection", msg: "DOB inspector on site - floor 3", unit: "Floor 3" },
];

// ── Storage: IndexedDB (no 5MB localStorage cap, handles photos) ──
const idb = {
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("buildtrack-nyc", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async get(k) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const q = db.transaction("kv").objectStore("kv").get(k);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  },
  async set(k, v) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction("kv", "readwrite");
      t.objectStore("kv").put(v, k);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  },
};

// ── Files, printing, notices ──
const downloadFile = (name, content, type = "text/html") => {
  const url = URL.createObjectURL(new Blob([content], { type: type + ";charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const printHtml = (html) => {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
  return true;
};

const csvCell = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const noticePlain = (n) => {
  const lines = ["NOTICE OF WORK", n.projectName, ""];
  if (n.unitLabel) lines.push(`Unit: ${n.unitLabel}`);
  if (n.resident) lines.push(`Resident: ${n.resident}`);
  if (n.startDate) lines.push(`Work dates: ${formatDate(n.startDate)}${n.endDate ? " to " + formatDate(n.endDate) : ""}`);
  if (n.trades.length) lines.push(`Trades: ${n.trades.join(", ")}`);
  lines.push("", n.text);
  return lines.join("\n");
};

const noticePageHtml = (n) => `<section class="page">
<h1>NOTICE OF WORK</h1>
<div class="proj">${esc(n.projectName)}</div>
<table>
${n.unitLabel ? `<tr><th>Unit</th><td>${esc(n.unitLabel)}</td></tr>` : ""}
${n.resident ? `<tr><th>Resident</th><td>${esc(n.resident)}</td></tr>` : ""}
${n.startDate ? `<tr><th>Work dates</th><td>${esc(formatDate(n.startDate))}${n.endDate ? " &ndash; " + esc(formatDate(n.endDate)) : ""}</td></tr>` : ""}
${n.trades.length ? `<tr><th>Trades</th><td>${esc(n.trades.join(", "))}</td></tr>` : ""}
</table>
<div class="body">${esc(n.text).replace(/\n/g, "<br>")}</div>
<div class="foot">Issued ${esc(formatDate(new Date()))}</div>
</section>`;

const noticeDocHtml = (pages) => `<!doctype html><html><head><meta charset="utf-8"><title>Notices</title><style>
body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:0}
.page{padding:48px 56px;page-break-after:always;max-width:720px;margin:0 auto}
.page:last-child{page-break-after:auto}
h1{font-size:28px;letter-spacing:4px;margin:0 0 4px;border-bottom:3px solid #111;padding-bottom:8px}
.proj{font-size:15px;margin:8px 0 20px;color:#444}
table{border-collapse:collapse;margin-bottom:20px}
th{text-align:left;padding:4px 20px 4px 0;font-size:13px;text-transform:uppercase;color:#555}
td{padding:4px 0;font-size:15px}
.body{font-size:16px;line-height:1.6}
.foot{margin-top:40px;font-size:12px;color:#666;border-top:1px solid #bbb;padding-top:8px}
</style></head><body>${pages.join("")}</body></html>`;

// Downscale phone photos so a few hundred fit comfortably in storage.

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

// ▸ Legend Bar
const Legend = () => (
  <div style={S.legend}>
    {Object.entries(STATUS_COLORS).map(([label, color]) => (
      <div key={label} style={S.legendItem(color)}>
        <div style={S.legendDot(color)} />
        <span>{label}</span>
      </div>
    ))}
    <div style={S.legendItem(PK2)}>
      <div style={{ ...S.legendDot(PK2), width: 10, height: 10, borderRadius: "50%" }} />
      <span>Access Denied</span>
    </div>
  </div>
);

// ▸ Building Map (NYC Cross-Section — Elevators Center)
const UnitGrid = ({ units, onSelect, selectedId, tradeFilter, commonAreas, setCommonAreas, areaList, showAreas, isItemEnabled, elevatorFloors, elevatorStuck, setElevFloor, toggleElevStuck, floorCount, ticketInfo }) => {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingCA, setEditingCA] = useState(null);
  const [mapView, setMapView] = useState(() => { try { return localStorage.getItem("bt_mapview") || (window.innerWidth < 700 ? "units" : "building"); } catch (e) { return "building"; } });
  const pickView = (v) => { setMapView(v); try { localStorage.setItem("bt_mapview", v); } catch (e) {} };
  const maxFloor = Math.max(...units.map(u => u.floor));
  const perFloor = Math.ceil(units.length / maxFloor);

  let filtered = units;
  if (statusFilter) filtered = filtered.filter(u => unitBucket(u) === statusFilter);
  if (search) filtered = filtered.filter(u => u.unit.toLowerCase().includes(search.toLowerCase()) || `${u.contact.first} ${u.contact.last}`.toLowerCase().includes(search.toLowerCase()));
  if (tradeFilter) filtered = filtered.map(u => ({ ...u, _color: u.vacant ? STATUS_COLORS["Vacant"] : getTradeColor(u.trades[tradeFilter]?.status) }));
  const filteredIds = new Set(filtered.map(u => u.id));
  const floors = {};
  units.forEach(u => { if (!floors[u.floor]) floors[u.floor] = []; floors[u.floor].push(u); });
  const floorNums = Object.keys(floors).map(Number).sort((a, b) => b - a);

  const getCAStatus = (areaId, item) => (commonAreas[`${areaId}-${item}`]?.status) || "Pending";
  const getCAColor = (areaId, item) => getTradeColor(getCAStatus(areaId, item));
  const caItems = (id) => (areaList.find(a => a.id === id)?.items) || [];
  const floorBandColors = ["#D8B4FE","#93C5FD","#BAE6FD","#BBF7D0","#BBF7D0","#FDE68A","#BBF7D0","#BBF7D0","#93C5FD","#D8B4FE","#BBF7D0","#BAE6FD","#FDE68A","#BBF7D0","#D8B4FE"];
  const getFloorColor = (fi) => floorBandColors[fi % floorBandColors.length];
  const elevColors = ["#DC2626","#2563EB","#059669","#D97706","#7C3AED","#DB2777"];
  const floorLabel = (n) => n === 1 ? "LBY" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

  // Layout
  const uW = 62, uH = 44;
  const floorH = uH + 22;
  const floorLblW = 44;
  const cars = caItems("elev").filter(c => isItemEnabled("elev", c));
  const carW = 44, carGap = 4;
  const elevCenterW = Math.max(cars.length * (carW + carGap) + 8, 60);
  const leftCount = Math.ceil(perFloor / 2);
  const rightCount = perFloor - leftCount;
  const leftW = leftCount * (uW + 5) + 6;
  const rightW = rightCount * (uW + 5) + 6;
  const bodyW = floorLblW + leftW + elevCenterW + rightW;
  const roofH = 170;
  const lobbyH = 65;
  const bsmtH = 85;
  const bodyH = maxFloor * floorH;
  const totalW = bodyW + 20;
  // User-added areas (anything beyond the four built-ins) get their own strip under the grounds.
  const customAreas = areaList
    .filter(a => !["elev", "roof", "base", "grnd"].includes(a.id) && showAreas?.[a.id] !== false)
    .map(a => ({ ...a, vis: a.items.filter(i => isItemEnabled(a.id, i)) }))
    .filter(a => a.vis.length > 0);
  const chipW = 124, chipH = 26, chipGap = 6;
  const chipCols = Math.max(1, Math.floor((bodyW - 8 + chipGap) / (chipW + chipGap)));
  const customRows = customAreas.reduce((s, a) => s + Math.ceil(a.vis.length / chipCols), 0);
  const customH = customAreas.length ? customAreas.length * 24 + customRows * (chipH + chipGap) + 16 : 0;
  const totalH = roofH + bodyH + lobbyH + bsmtH + 80 + customH;
  const bx = 10, by = roofH;
  const OL = "#9CA3AF";
  const WALL = "#1F2937";
  const elevStartX = bx + floorLblW + leftW;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...S.input, flex: "1 1 130px", width: "auto", minWidth: 0 }} placeholder="Search unit or name..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={S.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option>Vacant</option><option>Pending</option><option>Started</option><option>In Progress</option><option>Complete</option>
        </select>
        <span style={{ fontSize: 12, color: TXT2, fontFamily: font }}>{filtered.length} / {units.length} units</span>
        {!tradeFilter && (
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <button style={{ ...S.tab(mapView === "units"), display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => pickView("units")}><Icon n="tiles" /> Units</button>
            <button style={{ ...S.tab(mapView === "building"), display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => pickView("building")}><Icon n="building" /> Building</button>
          </div>
        )}
      </div>

      {(mapView === "units" && !tradeFilter) ? (
        <div>
          {floorNums.map(fn => (
            <div key={fn} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: TXT2, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{fn === 1 ? "Lobby / Floor 1" : `Floor ${fn}`}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8 }}>
                {floors[fn].slice().sort((x, y) => x.unit.localeCompare(y.unit, undefined, { numeric: true })).map(u => {
                  const col = u._color || getUnitColor(u);
                  const ti = ticketInfo?.[u.unit.toUpperCase()];
                  const denied = Object.values(u.trades).some(tr => tr.accessDenied && tr.scheduled);
                  const nm = u.vacant ? "Vacant" : (`${u.contact.first || ""} ${u.contact.last || ""}`.trim() || "No name");
                  return (
                    <button key={u.id} onClick={() => onSelect(u)} style={{ position: "relative", textAlign: "left", background: BG3, border: `1.5px solid ${selectedId === u.id ? "#fff" : BD}`, borderLeft: `7px solid ${col}`, borderRadius: 12, padding: "10px 10px 10px 10px", minHeight: 64, cursor: "pointer", color: TXT, fontFamily: font, opacity: filteredIds.has(u.id) ? 1 : 0.25 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{u.unit}</div>
                      <div style={{ fontSize: 12, color: TXT2, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nm}</div>
                      {ti && <span style={{ position: "absolute", top: 6, right: 6, minWidth: 20, height: 20, borderRadius: 10, padding: "0 5px", background: ti.urgent ? PK2 : PK, color: ti.urgent ? "#fff" : "#000", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{ti.open}</span>}
                      {denied && <span title="Access denied" style={{ position: "absolute", bottom: 8, right: 8, width: 9, height: 9, borderRadius: "50%", background: PK2 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (

      <div style={{ overflow: "auto" }}>
        <svg viewBox={`0 0 ${totalW} ${totalH}`} style={{ width: "100%", minWidth: Math.min(totalW, 760), maxWidth: 1200 }}
          xmlns="http://www.w3.org/2000/svg" fontFamily={font}>

          {/* ═══ MAIN ROOF SECTION ═══ */}
          <rect x={bx} y={by-50} width={bodyW} height={50} fill="#2D3A4A" stroke={OL} strokeWidth="3" />
          <text x={bx+bodyW/2} y={by-18} textAnchor="middle" fill="#E2E8F0" fontSize="18" fontWeight="800" letterSpacing="8"
            onClick={() => setEditingCA("roof-Main Roof")} style={{ cursor: "pointer" }}>MAIN ROOF</text>

          {/* ═══ WATER TOWER (far LEFT on roof) ═══ */}
          {showAreas?.roof !== false && (() => {
            const wtX = bx + 6, wtY = by - 158;
            return (<g onClick={() => setEditingCA("roof-Water Tower")} style={{ cursor: "pointer" }}>
              <rect x={wtX} y={wtY} width={110} height={108} rx="6" fill="#4ADE800C" stroke="#4ADE80" strokeWidth="2.5" />
              <image href={ICON_WATERTOWER} x={wtX+20} y={wtY+4} width={70} height={68} style={{ filter: "invert(0.7) sepia(1) saturate(3) hue-rotate(80deg)", opacity: 0.95 }} />
              <text x={wtX+55} y={wtY+82} textAnchor="middle" fill="#4ADE80" fontSize="14" fontWeight="800">WATER</text>
              <text x={wtX+55} y={wtY+98} textAnchor="middle" fill="#4ADE80" fontSize="14" fontWeight="800">TOWER</text>
            </g>);
          })()}

          {/* ═══ BULKHEAD (CENTER on roof) ═══ */}
          {showAreas?.roof !== false && (() => {
            const bkW = bodyW * 0.24, bkX = bx + bodyW/2 - bkW/2, bkY = by - 126;
            return (<g onClick={() => setEditingCA("roof-Bulkhead")} style={{ cursor: "pointer" }}>
              <rect x={bkX} y={bkY} width={bkW} height={76} fill="#1F2937" stroke={OL} strokeWidth="3" />
              <rect x={bkX-5} y={bkY-6} width={bkW+10} height={8} rx="1" fill="#374151" stroke={OL} strokeWidth="2" />
              <rect x={bkX+10} y={bkY+12} width={bkW-20} height={50} fill="#11182760" stroke={OL} strokeWidth="1" />
              <rect x={bkX+bkW/2-14} y={bkY+22} width={28} height={40} rx="2" fill="#0D121880" stroke={OL} strokeWidth="1" />
              <circle cx={bkX+bkW/2+10} cy={bkY+44} r="2.5" fill={OL} />
              <text x={bkX+bkW/2} y={bkY+72} textAnchor="middle" fill="#FDE68A" fontSize="16" fontWeight="800">BULKHEAD</text>
            </g>);
          })()}

          {/* ═══ ANTENNA (far RIGHT on roof) ═══ */}
          {showAreas?.roof !== false && (() => {
            const anX = bx + bodyW - 116, anY = by - 158;
            return (<g onClick={() => setEditingCA("roof-Antenna Platform")} style={{ cursor: "pointer" }}>
              <rect x={anX} y={anY} width={110} height={108} rx="6" fill="#FFD7000C" stroke="#FFD700" strokeWidth="2.5" />
              <image href={ICON_ANTENNA} x={anX+16} y={anY+2} width={78} height={68} style={{ filter: "invert(0.7) sepia(1) saturate(5) hue-rotate(30deg)", opacity: 0.95 }} />
              <text x={anX+55} y={anY+80} textAnchor="middle" fill="#FFD700" fontSize="13" fontWeight="800">ANTENNA</text>
              <text x={anX+55} y={anY+98} textAnchor="middle" fill="#FFD700" fontSize="13" fontWeight="800">PLATFORM</text>
            </g>);
          })()}

          {/* ═══ BUILDING BODY ═══ */}
          <rect x={bx} y={by} width={bodyW} height={bodyH} fill={WALL} stroke={OL} strokeWidth="3" />

          {/* ═══ ELEVATOR SHAFT LINES (center, one per car, full height) ═══ */}
          {cars.map((car, ci) => {
            const sx = elevStartX + 4 + ci * (carW + carGap) + carW / 2;
            return (<g key={`shaft-${ci}`}>
              <line x1={sx} y1={by-50} x2={sx} y2={by+bodyH+lobbyH+bsmtH} stroke={OL} strokeWidth="0.6" opacity="0.3" strokeDasharray="4,4" />
            </g>);
          })}
          {/* Center divider walls */}
          <line x1={elevStartX} y1={by} x2={elevStartX} y2={by+bodyH} stroke={OL} strokeWidth="1.5" opacity="0.5" />
          <line x1={elevStartX+elevCenterW} y1={by} x2={elevStartX+elevCenterW} y2={by+bodyH} stroke={OL} strokeWidth="1.5" opacity="0.5" />

          {/* ═══ LEFT STAIRWELL ═══ */}
          <rect x={bx+floorLblW-2} y={by} width={14} height={bodyH} fill="#11182780" stroke={OL} strokeWidth="1" />
          {floorNums.map((f, i) => {
            const sy = by + i * floorH;
            return (<g key={`stL${f}`}>
              <line x1={bx+floorLblW} y1={sy+floorH*0.3} x2={bx+floorLblW+10} y2={sy+floorH*0.3} stroke={OL} strokeWidth="0.5" opacity="0.5" />
              <line x1={bx+floorLblW} y1={sy+floorH*0.5} x2={bx+floorLblW+10} y2={sy+floorH*0.5} stroke={OL} strokeWidth="0.5" opacity="0.5" />
              <line x1={bx+floorLblW} y1={sy+floorH*0.7} x2={bx+floorLblW+10} y2={sy+floorH*0.7} stroke={OL} strokeWidth="0.5" opacity="0.5" />
            </g>);
          })}
          <text x={bx+floorLblW+6} y={by+bodyH/2} textAnchor="middle" fill={OL} fontSize="6" fontWeight="700"
            transform={`rotate(-90,${bx+floorLblW+6},${by+bodyH/2})`}>STAIRS</text>

          {/* ═══ RIGHT STAIRWELL ═══ */}
          <rect x={bx+bodyW-14} y={by} width={14} height={bodyH} fill="#11182780" stroke={OL} strokeWidth="1" />
          {floorNums.map((f, i) => {
            const sy = by + i * floorH;
            return (<g key={`stR${f}`}>
              <line x1={bx+bodyW-12} y1={sy+floorH*0.3} x2={bx+bodyW-2} y2={sy+floorH*0.3} stroke={OL} strokeWidth="0.5" opacity="0.5" />
              <line x1={bx+bodyW-12} y1={sy+floorH*0.5} x2={bx+bodyW-2} y2={sy+floorH*0.5} stroke={OL} strokeWidth="0.5" opacity="0.5" />
              <line x1={bx+bodyW-12} y1={sy+floorH*0.7} x2={bx+bodyW-2} y2={sy+floorH*0.7} stroke={OL} strokeWidth="0.5" opacity="0.5" />
            </g>);
          })}
          <text x={bx+bodyW-8} y={by+bodyH/2} textAnchor="middle" fill={OL} fontSize="6" fontWeight="700"
            transform={`rotate(-90,${bx+bodyW-8},${by+bodyH/2})`}>STAIRS</text>

          {/* ═══ SPRINKLER SYSTEM ═══ */}
          {/* Left riser pipe (runs from basement to roof) */}
          <line x1={bx+floorLblW+18} y1={by-50} x2={bx+floorLblW+18} y2={by+bodyH+lobbyH+bsmtH}
            stroke="#ef5350" strokeWidth="1.5" opacity="0.4" />
          <circle cx={bx+floorLblW+18} cy={by-50} r="3" fill="#ef5350" opacity="0.5" />
          {/* Right riser pipe */}
          <line x1={bx+bodyW-18} y1={by-50} x2={bx+bodyW-18} y2={by+bodyH+lobbyH+bsmtH}
            stroke="#ef5350" strokeWidth="1.5" opacity="0.4" />
          <circle cx={bx+bodyW-18} cy={by-50} r="3" fill="#ef5350" opacity="0.5" />
          {/* Branch lines per floor */}
          {floorNums.map((f, i) => {
            const sy = by + i * floorH + 6;
            return (<g key={`sprk${f}`}>
              <line x1={bx+floorLblW+18} y1={sy} x2={bx+bodyW-18} y2={sy}
                stroke="#ef5350" strokeWidth="0.6" opacity="0.25" />
              {/* Sprinkler heads */}
              {[0.25, 0.5, 0.75].map((p, j) => (
                <g key={j}>
                  <line x1={bx+floorLblW+18+(bodyW-floorLblW-36)*p} y1={sy}
                    x2={bx+floorLblW+18+(bodyW-floorLblW-36)*p} y2={sy+5}
                    stroke="#ef5350" strokeWidth="0.5" opacity="0.3" />
                  <circle cx={bx+floorLblW+18+(bodyW-floorLblW-36)*p} cy={sy+6}
                    r="1.5" fill="#ef5350" opacity="0.3" />
                </g>
              ))}
            </g>);
          })}
          {/* Sprinkler labels */}
          <text x={bx+floorLblW+18} y={by-54} textAnchor="middle" fill="#ef5350" fontSize="5" fontWeight="700" opacity="0.6">SPRK</text>
          <text x={bx+bodyW-18} y={by-54} textAnchor="middle" fill="#ef5350" fontSize="5" fontWeight="700" opacity="0.6">SPRK</text>

          {/* ═══ ELEVATOR FLOOR BOXES (clickable per car per floor for repairs) ═══ */}
          {cars.map((car, ci) => {
            return floorNums.map((floorNum, fi) => {
              const fy = by + fi * floorH;
              const bxc = elevStartX + 4 + ci * (carW + carGap);
              const carFloor = Math.min(elevatorFloors?.[car] || 1, maxFloor);
              const isHere = carFloor === floorNum;
              if (isHere) return null;
              return (<g key={`slot-${car}-${floorNum}`} onClick={() => setEditingCA(`elev-${car}`)} style={{ cursor: "pointer" }}>
                <rect x={bxc+1} y={fy+10} width={carW-2} height={uH} rx="4"
                  fill={elevColors[ci]+"0A"} stroke={elevColors[ci]+"35"} strokeWidth="1.2" strokeDasharray="3,2" />
                <text x={bxc+carW/2} y={fy+floorH/2+3} textAnchor="middle" fill={elevColors[ci]+"50"} fontSize="10" fontWeight="700">{ci+1}</text>
                <text x={bxc+carW/2} y={fy+floorH/2+13} textAnchor="middle" fill={elevColors[ci]+"30"} fontSize="6" fontWeight="600">F{floorNum}</text>
              </g>);
            });
          })}

          {/* ═══ FLOORS ═══ */}
          {floorNums.map((floorNum, fi) => {
            const fy = by + fi * floorH;
            const floorUnits = floors[floorNum];
            const bandColor = getFloorColor(fi);
            const isLobby = floorNum === 1;
            const isTop = floorNum === maxFloor;
            const leftUnits = floorUnits.slice(0, leftCount);
            const rightUnits = floorUnits.slice(leftCount);

            return (<g key={floorNum}>
              <rect x={bx+1} y={fy+1} width={bodyW-2} height={floorH-1} fill={bandColor + "18"} />
              <line x1={bx} y1={fy} x2={bx+bodyW} y2={fy} stroke={OL} strokeWidth="0.5" opacity="0.4" />

              {/* Floor label */}
              <rect x={bx+3} y={fy+floorH/2-11} width={floorLblW-8} height={22} rx="4" fill={bandColor+"50"} stroke={bandColor} strokeWidth="1.5" />
              <text x={bx+floorLblW/2} y={fy+floorH/2+4} textAnchor="middle" fill={bandColor} fontSize="11" fontWeight="800">
                {isLobby ? "LBY" : isTop ? "PH" : floorLabel(floorNum)}
              </text>

              {/* LEFT side units */}
              {leftUnits.map((u, ui) => {
                const vis = filteredIds.has(u.id);
                let color = tradeFilter ? (u.vacant ? STATUS_COLORS["Vacant"] : getTradeColor(u.trades[tradeFilter]?.status)) : getUnitColor(u);
                const sel = selectedId === u.id;
                const hasAcc = Object.values(u.trades).some(t => t.accessDenied && t.scheduled);
                const ux = bx + floorLblW + 3 + ui * (uW + 5), uy = fy + 10;
                return (<g key={u.id} onClick={() => onSelect(u)} style={{ cursor: "pointer" }}>
                  <rect x={ux} y={uy} width={uW} height={uH} rx="3" fill={vis ? color : "#111827"} stroke={sel ? "#FFF" : OL} strokeWidth={sel ? "3" : "1"} opacity={vis ? 1 : 0.1} />
                  {vis && <><line x1={ux+uW/2} y1={uy} x2={ux+uW/2} y2={uy+uH} stroke={OL} strokeWidth="0.4" opacity="0.25" /><line x1={ux} y1={uy+uH/2} x2={ux+uW} y2={uy+uH/2} stroke={OL} strokeWidth="0.4" opacity="0.25" /></>}
                  <text x={ux+uW/2} y={uy+uH/2+4} textAnchor="middle" fill={vis?(color==="#FFFFFF"||color==="#F1C40F"?"#000":"#FFF"):"#222"} fontSize="11" fontWeight="700" opacity={vis?1:0.15}>{u.unit}</text>
                  {hasAcc && vis && <circle cx={ux+uW-4} cy={uy+4} r="4" fill="#ef5350" stroke={WALL} strokeWidth="1" />}
                  {vis && ticketInfo?.[u.unit.toUpperCase()] && <g><circle cx={ux+9} cy={uy+uH-9} r="8" fill={ticketInfo[u.unit.toUpperCase()].urgent ? "#ef5350" : PK} stroke="#000" strokeWidth="1.5" /><text x={ux+9} y={uy+uH-5} textAnchor="middle" fill="#000" fontSize="10" fontWeight="900">{ticketInfo[u.unit.toUpperCase()].open}</text></g>}
                </g>);
              })}

              {/* ELEVATOR CARS on their tracked floor */}
              {showAreas?.elev !== false && cars.map((car, ci) => {
                const carFloor = Math.min(elevatorFloors?.[car] || 1, maxFloor);
                if (carFloor !== floorNum) return null;
                const cx = elevStartX + 4 + ci * (carW + carGap), cy = fy + 8;
                const stuck = elevatorStuck?.[car];
                const statusCol = getCAColor("elev", car);
                return (<g key={`car-${car}`} onClick={() => setEditingCA(`elev-${car}`)} style={{ cursor: "pointer" }}>
                  <rect x={cx} y={cy} width={carW} height={uH} rx="5" fill={stuck ? "#ef5350" : elevColors[ci] || "#888"} stroke={stuck ? "#FF0" : "#FFF"} strokeWidth={stuck ? "3" : "2"} />
                  {stuck && <><line x1={cx+4} y1={cy+4} x2={cx+carW-4} y2={cy+uH-4} stroke="#FF0" strokeWidth="2" /><line x1={cx+carW-4} y1={cy+4} x2={cx+4} y2={cy+uH-4} stroke="#FF0" strokeWidth="2" /></>}
                  <text x={cx+carW/2} y={cy+uH/2+6} textAnchor="middle" fill="#FFF" fontSize="18" fontWeight="900">{ci+1}</text>
                  <circle cx={cx+carW-6} cy={cy+6} r="5" fill={statusCol} stroke={statusCol==="#FFFFFF"?"#999":"#FFF"} strokeWidth="1" />
                  {stuck && <text x={cx+carW/2} y={cy+uH+11} textAnchor="middle" fill="#FF0" fontSize="7" fontWeight="800">STUCK</text>}
                </g>);
              })}

              {/* RIGHT side units */}
              {rightUnits.map((u, ui) => {
                const vis = filteredIds.has(u.id);
                let color = tradeFilter ? (u.vacant ? STATUS_COLORS["Vacant"] : getTradeColor(u.trades[tradeFilter]?.status)) : getUnitColor(u);
                const sel = selectedId === u.id;
                const hasAcc = Object.values(u.trades).some(t => t.accessDenied && t.scheduled);
                const ux = elevStartX + elevCenterW + 3 + ui * (uW + 5), uy = fy + 10;
                return (<g key={u.id} onClick={() => onSelect(u)} style={{ cursor: "pointer" }}>
                  <rect x={ux} y={uy} width={uW} height={uH} rx="3" fill={vis ? color : "#111827"} stroke={sel ? "#FFF" : OL} strokeWidth={sel ? "3" : "1"} opacity={vis ? 1 : 0.1} />
                  {vis && <><line x1={ux+uW/2} y1={uy} x2={ux+uW/2} y2={uy+uH} stroke={OL} strokeWidth="0.4" opacity="0.25" /><line x1={ux} y1={uy+uH/2} x2={ux+uW} y2={uy+uH/2} stroke={OL} strokeWidth="0.4" opacity="0.25" /></>}
                  <text x={ux+uW/2} y={uy+uH/2+4} textAnchor="middle" fill={vis?(color==="#FFFFFF"||color==="#F1C40F"?"#000":"#FFF"):"#222"} fontSize="11" fontWeight="700" opacity={vis?1:0.15}>{u.unit}</text>
                  {hasAcc && vis && <circle cx={ux+uW-4} cy={uy+4} r="4" fill="#ef5350" stroke={WALL} strokeWidth="1" />}
                  {vis && ticketInfo?.[u.unit.toUpperCase()] && <g><circle cx={ux+9} cy={uy+uH-9} r="8" fill={ticketInfo[u.unit.toUpperCase()].urgent ? "#ef5350" : PK} stroke="#000" strokeWidth="1.5" /><text x={ux+9} y={uy+uH-5} textAnchor="middle" fill="#000" fontSize="10" fontWeight="900">{ticketInfo[u.unit.toUpperCase()].open}</text></g>}
                </g>);
              })}
            </g>);
          })}

          {/* ═══ GROUND LINE ═══ */}
          <line x1={0} y1={by+bodyH+lobbyH} x2={totalW} y2={by+bodyH+lobbyH} stroke={AG} strokeWidth="3" />

          {/* ═══ LOBBY (entrance centered under elevators) ═══ */}
          {(() => {
            const ly = by + bodyH;
            const doorX = elevStartX + elevCenterW/2 - bodyW*0.15;
            const doorW = bodyW * 0.3;
            return (<g>
              <rect x={bx} y={ly} width={bodyW} height={lobbyH} fill="#4ADE800A" stroke={OL} strokeWidth="2.5" />
              {/* Door centered under elevators */}
              <rect x={doorX} y={ly+6} width={doorW} height={lobbyH-8} rx="3" fill="#D1FAE512" stroke={OL} strokeWidth="1.5" />
              <line x1={doorX+doorW/2} y1={ly+6} x2={doorX+doorW/2} y2={ly+lobbyH-2} stroke={OL} strokeWidth="1.5" />
              {[0.1,0.28,0.58,0.76].map((p,i) => <rect key={i} x={doorX+doorW*p} y={ly+10} width={doorW*0.12} height={lobbyH-18} rx="1" fill="#D1FAE508" stroke={OL} strokeWidth="0.5" opacity="0.4" />)}
              <circle cx={doorX+doorW/2-6} cy={ly+lobbyH/2+6} r="2" fill={PK} />
              <circle cx={doorX+doorW/2+6} cy={ly+lobbyH/2+6} r="2" fill={PK} />
              {/* Steps */}
              {[0,1,2].map(i => <rect key={i} x={doorX-4-i*5} y={ly+lobbyH-8+i*4} width={doorW+8+i*10} height={3} fill={WALL} stroke={OL} strokeWidth="0.6" />)}
              <text x={doorX+doorW/2} y={ly+lobbyH/2} textAnchor="middle" fill={AG} fontSize="10" fontWeight="700" letterSpacing="1.5">MAIN ENTRANCE</text>
              {/* Mailroom right */}
              <rect x={bx+bodyW*0.74} y={ly+4} width={bodyW*0.22} height={lobbyH-8} rx="4" fill="#FDE68A12" stroke="#FDE68A" strokeWidth="1.5" />
              <text x={bx+bodyW*0.85} y={ly+lobbyH/2+3} textAnchor="middle" fill="#FDE68A" fontSize="10" fontWeight="700">MAILROOM</text>
              {/* Lobby label */}
              <rect x={bx+3} y={ly+lobbyH/2-11} width={floorLblW-8} height={22} rx="4" fill="#4ADE8050" stroke="#4ADE80" strokeWidth="1.5" />
              <text x={bx+floorLblW/2} y={ly+lobbyH/2+4} textAnchor="middle" fill="#4ADE80" fontSize="11" fontWeight="800">LBY</text>
            </g>);
          })()}

          {/* ═══ BASEMENT ═══ */}
          {showAreas?.base !== false && (() => {
            const bsy = by + bodyH + lobbyH;
            const rooms = caItems("base").filter(r => isItemEnabled("base", r));
            const roomW = rooms.length > 0 ? bodyW / rooms.length : bodyW;
            const roomColors = ["#F87171","#FB923C","#4ADE80","#60A5FA","#A78BFA","#FBBF24"];
            return (<g>
              <rect x={bx} y={bsy} width={bodyW} height={bsmtH} fill="#1F293780" stroke={OL} strokeWidth="2.5" strokeDasharray="6,3" />
              <line x1={bx-6} y1={bsy} x2={bx-6} y2={bsy+bsmtH+10} stroke={OL} strokeWidth="2" />
              <line x1={bx+bodyW+6} y1={bsy} x2={bx+bodyW+6} y2={bsy+bsmtH+10} stroke={OL} strokeWidth="2" />
              <rect x={bx-10} y={bsy+bsmtH} width={bodyW+20} height={10} fill={WALL} stroke={OL} strokeWidth="1.5" />
              {rooms.map((room, i) => {
                const key = `base-${room}`;
                const rc = roomColors[i % roomColors.length];
                const statusCol = getCAColor("base", room);
                const rx = bx + 3 + i * roomW;
                const isBoiler = room.toLowerCase().includes("boiler");
                const isStorage = room.toLowerCase().includes("storage") || room.toLowerCase().includes("locker");
                const isLaundry = room.toLowerCase().includes("laundry");
                const isMech = room.toLowerCase().includes("mech") || room.toLowerCase().includes("pump") || room.toLowerCase().includes("electric");
                const isFire = room.toLowerCase().includes("fire") || room.toLowerCase().includes("suppression") || room.toLowerCase().includes("sprinkler");
                const hasIcon = isStorage || isLaundry || isMech || isFire || isBoiler;
                return (<g key={key} onClick={() => setEditingCA(key)} style={{ cursor: "pointer" }}>
                  <rect x={rx} y={bsy+4} width={roomW-6} height={bsmtH-8} rx="5" fill={rc+"25"} stroke={rc} strokeWidth="2" />
                  {isStorage && <SvgIcon n="shelves" x={rx+roomW/2-4-12} y={bsy+7} size={24} color={rc} />}
                  {isLaundry && <SvgIcon n="washer" x={rx+roomW/2-4-12} y={bsy+7} size={24} color={rc} />}
                  {isMech && <SvgIcon n="cog" x={rx+roomW/2-4-12} y={bsy+7} size={24} color={rc} />}
                  {isBoiler && <SvgIcon n="boiler" x={rx+roomW/2-4-12} y={bsy+7} size={24} color={rc} />}
                  {isFire && <SvgIcon n="sprinkler" x={rx+roomW/2-4-12} y={bsy+7} size={24} color={rc} />}
                  <text x={rx+(roomW-6)/2} y={bsy+bsmtH/2+(hasIcon?12:0)} textAnchor="middle" fill={rc} fontSize="10" fontWeight="800">{room}</text>
                  <circle cx={rx+roomW-14} cy={bsy+12} r="6" fill={statusCol} stroke={statusCol==="#FFFFFF"?"#999":rc} strokeWidth="1.5" />
                </g>);
              })}
              <text x={bx+bodyW/2} y={bsy+bsmtH+20} textAnchor="middle" fill="#F87171" fontSize="9" fontWeight="700" letterSpacing="2">BASEMENT LEVEL (BELOW GRADE)</text>
            </g>);
          })()}

          {/* ═══ GROUNDS (enlarged, distinct colors) ═══ */}
          {showAreas?.grnd !== false && caItems("grnd").filter(item => isItemEnabled("grnd", item)).length > 0 && (() => {
            const gy = by + bodyH + lobbyH + bsmtH + 26;
            const items = caItems("grnd").filter(item => isItemEnabled("grnd", item));
            const gw = bodyW / items.length;
            const grndColors = ["#06B6D4","#8B5CF6","#F59E0B","#EC4899","#10B981","#6366F1"];
            const grndIcons = ["\ud83d\udeaa","\ud83c\udfe1","\ud83c\udd7f\ufe0f","\ud83d\udeb6"];
            return items.map((item, i) => {
              const key = `grnd-${item}`;
              const statusCol = getCAColor("grnd", item);
              const gc = grndColors[i % grndColors.length];
              return (<g key={key} onClick={() => setEditingCA(key)} style={{ cursor: "pointer" }}>
                <rect x={bx+i*gw+2} y={gy} width={gw-4} height={36} rx="6" fill={gc+"18"} stroke={gc} strokeWidth="2" />
                <circle cx={bx+i*gw+18} cy={gy+18} r="7" fill={statusCol} stroke={statusCol==="#FFFFFF"?"#999":gc} strokeWidth="1.5" />
                <text x={bx+i*gw+gw/2+8} y={gy+22} textAnchor="middle" fill={gc} fontSize="11" fontWeight="800">{item}</text>
              </g>);
            });
          })()}

          {/* ═══ CUSTOM AREAS ═══ */}
          {customAreas.length > 0 && (() => {
            const palette = ["#06B6D4","#A78BFA","#F59E0B","#EC4899","#10B981","#6366F1"];
            let y = by + bodyH + lobbyH + bsmtH + 26 + 36 + 18;
            return customAreas.map((area, ai) => {
              const ac = palette[ai % palette.length];
              const top = y;
              const rows = Math.ceil(area.vis.length / chipCols);
              y += 24 + rows * (chipH + chipGap);
              return (<g key={area.id}>
                <SvgIcon n={areaIconKey(area.icon)} x={bx + 4} y={top + 2} size={14} color={ac} /><text x={bx + 22} y={top + 14} fill={ac} fontSize="10" fontWeight="800" letterSpacing="1.5">{area.label.toUpperCase()}</text>
                {area.vis.map((item, i) => {
                  const key = `${area.id}-${item}`;
                  const statusCol = getCAColor(area.id, item);
                  const cx = bx + 4 + (i % chipCols) * (chipW + chipGap);
                  const cy = top + 22 + Math.floor(i / chipCols) * (chipH + chipGap);
                  const label = item.length > 15 ? item.slice(0, 14) + "…" : item;
                  return (<g key={key} onClick={() => setEditingCA(key)} style={{ cursor: "pointer" }}>
                    <title>{item}</title>
                    <rect x={cx} y={cy} width={chipW} height={chipH} rx="6" fill={ac + "18"} stroke={ac} strokeWidth="2" />
                    <circle cx={cx + 14} cy={cy + chipH / 2} r="6" fill={statusCol} stroke={statusCol === "#FFFFFF" ? "#999" : ac} strokeWidth="1.5" />
                    <text x={cx + chipW / 2 + 8} y={cy + chipH / 2 + 4} textAnchor="middle" fill={ac} fontSize="10" fontWeight="700">{label}</text>
                  </g>);
                })}
              </g>);
            });
          })()}

          {/* Other roof items */}
          {showAreas?.roof !== false && caItems("roof").filter(item => isItemEnabled("roof", item))
            .filter(item => !["antenna","water","bulkhead","main roof"].some(k => item.toLowerCase().includes(k)))
            .map((item, i) => {
            const key = `roof-${item}`;
            const statusCol = getCAColor("roof", item);
            return (<g key={key} onClick={() => setEditingCA(key)} style={{ cursor: "pointer" }}>
              <rect x={bx+120+i*90} y={by-72} width={85} height={24} rx="5" fill="#FFD70015" stroke="#FFD700" strokeWidth="1.5" />
              <circle cx={bx+134+i*90} cy={by-60} r="5" fill={statusCol} stroke={statusCol==="#FFFFFF"?"#999":"#FFD700"} strokeWidth="1" />
              <text x={bx+166+i*90} y={by-56} textAnchor="middle" fill="#FFD700" fontSize="9" fontWeight="700">{item}</text>
            </g>);
          })}

        </svg>
      </div>
      )}

      {/* ═══ COMMON AREA EDIT POPUP ═══ */}
      {editingCA && (
        <div style={S.modal} onClick={() => setEditingCA(null)}>
          <div style={{ ...S.modalInner, maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontFamily: font, color: PK, margin: 0, fontSize: 16 }}>{editingCA.replace("-", " \u2192 ")}</h3>
              <button style={S.btn()} onClick={() => setEditingCA(null)}>{"\u2715"}</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Status</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Pending","Started","In Progress","Complete"].map(st => {
                  const active = (commonAreas[editingCA]?.status || "Pending") === st;
                  return (<button key={st} style={{...S.btn(active?"primary":undefined),fontSize:12,padding:"8px 14px",background:active?getTradeColor(st):undefined,color:active?(st==="Pending"||st==="In Progress"?"#000":"#FFF"):undefined}}
                    onClick={() => setCommonAreas({...commonAreas,[editingCA]:{...commonAreas[editingCA],status:st,trades:commonAreas[editingCA]?.trades||{}}})}>{st}</button>);
                })}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Assign Trades</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {TRADES.map(t => {
                  const on = commonAreas[editingCA]?.trades?.[t];
                  return (<button key={t} style={{...S.btn(on?"primary":undefined),fontSize:10,padding:"4px 8px"}}
                    onClick={() => {const cur=commonAreas[editingCA]||{trades:{},status:"Pending"};setCommonAreas({...commonAreas,[editingCA]:{...cur,trades:{...cur.trades,[t]:!on}}});}}>{on?"\u2713 ":""}{t}</button>);
                })}
              </div>
            </div>
            <button style={S.btn("primary")} onClick={() => setEditingCA(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};
// ▸ Unit Detail Modal
const UnitModal = ({ unit, onClose, onUpdate, projectName, tickets = [], onTicketChange, onNewTicket }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const [tab, setTab] = useState("overview");
  const [comment, setComment] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [photoAnnotation, setPhotoAnnotation] = useState("");
  const recRef = useRef(null);
  useEffect(() => () => { try { recRef.current?.stop(); } catch (e) {} }, []);

  if (!unit) return null;

  const handleTradeUpdate = (trade, field, value) => {
    const updated = { ...unit, trades: { ...unit.trades, [trade]: { ...unit.trades[trade], [field]: value } } };
    onUpdate(updated);
  };

  const handleContactUpdate = (field, value) => {
    const updated = { ...unit, contact: { ...unit.contact, [field]: value } };
    onUpdate(updated);
  };

  const addComment = () => {
    if (!comment.trim()) return;
    const updated = { ...unit, comments: [...unit.comments, { text: comment, date: new Date().toISOString(), type: "text" }] };
    onUpdate(updated);
    setComment("");
  };

  // Real dictation (Web Speech API). Text lands in the box so you can fix it before saving.
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice dictation isn't supported in this browser. Try Chrome, Edge or Safari."); return; }
    if (isRecording) { try { recRef.current?.stop(); } catch (e) {} return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.continuous = true;
    rec.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) text += ev.results[i][0].transcript + " ";
      if (text.trim()) setComment(prev => (prev ? prev + " " : "") + text.trim());
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    recRef.current = rec;
    try { rec.start(); setIsRecording(true); } catch (e) { setIsRecording(false); }
  };

  const fileInputRef = useRef(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  const addPhoto = async (e) => {
    const files = Array.from(e?.target?.files || []);
    if (files.length === 0) return;
    const ann = photoAnnotation;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhotoAnnotation("");
    for (const file of files) {
      try {
        const src = await compressImage(file);
        const newPhoto = { id: Date.now() + Math.random(), annotation: ann || file.name || "Site photo", date: new Date().toISOString(), marked: false, src, fileName: file.name };
        onUpdate(u => ({ ...u, photos: [...u.photos, newPhoto] }));
      } catch (err) {
        alert(`Could not read ${file.name} as an image.`);
      }
    }
  };

  const deletePhoto = (photoId) => {
    const updated = { ...unit, photos: unit.photos.filter(p => p.id !== photoId) };
    onUpdate(updated);
    setViewingPhoto(null);
  };

  const myTickets = tickets.filter(t => t.unit.toUpperCase() === unit.unit.toUpperCase());
  const openTickets = myTickets.filter(t => t.status !== "Done");
  const tenantName = `${unit.contact.first} ${unit.contact.last}`.trim();
  const phoneDigits = (unit.contact.phone || "").replace(/[^\d+]/g, "");
  const email = (unit.contact.email || "").trim();
  const accessIssues = TRADES.filter(tr => unit.trades[tr]?.accessDenied);
  const lastNotice = unit.notices[unit.notices.length - 1];
  const linkBtn = { ...S.btn("primary"), textDecoration: "none" };
  const ticketList = (list) => list.map(t => (
    <TicketCard key={t.id} t={t} units={[unit]} onChange={onTicketChange || (() => {})} onOpenUnit={() => {}} onPhoto={(src) => window.open(src, "_blank")} />
  ));

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalInner} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: font, color: PK, margin: 0, fontSize: 20 }}>UNIT {unit.unit}{!unit.vacant && tenantName ? <span style={{ color: TXT, fontSize: 15, fontWeight: 600 }}> · {tenantName}</span> : null}</h2>
            <span style={S.tag(unit.vacant ? PK3 : AG)}>{unit.vacant ? "VACANT" : "OCCUPIED"}</span>
            {openTickets.length > 0 && <span style={{ ...S.tag(openTickets.some(t => t.priority === "Urgent") ? PK2 : PK), marginLeft: 6 }}>{openTickets.length} OPEN TICKET{openTickets.length > 1 ? "S" : ""}</span>}
          </div>
          <button style={S.btn()} onClick={onClose}><Icon n="close" /> Close</button>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `1px solid ${BD}`, paddingBottom: 8, flexWrap: "wrap" }}>
          {["overview","tickets","info","trades","comments","photos","notices"].map(t => (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t === "info" ? "Contact" : t === "tickets" ? `Tickets${myTickets.length ? ` (${openTickets.length})` : ""}` : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {tab === "overview" && (
          <div>
            <div style={S.card}>
              <div style={S.cardTitle}>Tenant</div>
              {unit.vacant ? <div style={{ color: TXT2, fontSize: 13 }}>This unit is marked vacant.</div> : (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{tenantName || "No tenant name on file"}</div>
                  <div style={{ fontSize: 13, color: TXT2, margin: "2px 0 10px" }}>{unit.contact.phone || "No phone"} · {email || "No email"} · Floor {unit.floor}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {phoneDigits && <a href={`tel:${phoneDigits}`} style={linkBtn}><Icon n="tel" /> Call</a>}
                    {phoneDigits && <a href={`sms:${phoneDigits}`} style={linkBtn}><Icon n="chat" /> Text</a>}
                    {email && <a href={`mailto:${email}`} style={linkBtn}><Icon n="mail" /> Email</a>}
                    <button style={S.btn()} onClick={() => setTab("info")}><Icon n="pencil" /> Edit contact</button>
                  </div>
                </div>
              )}
            </div>

            {accessIssues.length > 0 && (
              <div style={{ background: PK2 + "22", border: `1px solid ${PK2}`, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
                <Icon n="alert" /> <strong>No access</strong> reported for: {accessIssues.join(", ")}
              </div>
            )}

            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                <div style={{ ...S.cardTitle, marginBottom: 0 }}><Icon n="ticket" /> Open tickets ({openTickets.length})</div>
                <button style={S.btn("primary")} onClick={() => onNewTicket && onNewTicket(unit.unit)}><Icon n="plus" /> New ticket</button>
              </div>
              {openTickets.length === 0 ? <div style={{ fontSize: 13, color: TXT2 }}>No open tickets for this unit.{myTickets.length > 0 && ` (${myTickets.length} closed)`}</div> : ticketList(openTickets)}
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Work status</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
                {TRADES.map(tr => {
                  const t = unit.trades[tr];
                  return (
                    <div key={tr} onClick={() => setTab("trades")} style={{ display: "flex", alignItems: "center", gap: 6, background: BG1, border: `1px solid ${BD}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, cursor: "pointer" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: getTradeColor(t.status), flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }}><Icon n={TRADE_ICONS[tr] || "wrench"} style={{ color: TRADE_COLORS[tr] }} /> {tr}</span>
                      <span style={{ color: TXT2, fontSize: 10 }}>{t.status}{t.scheduled ? " · sched" : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Latest notes &amp; notices</div>
              {unit.comments.length === 0 && !lastNotice && <div style={{ fontSize: 13, color: TXT2 }}>Nothing logged yet.</div>}
              {unit.comments.slice(-3).reverse().map((c, i) => (
                <div key={i} style={{ fontSize: 13, padding: "6px 0", borderTop: i ? `1px solid ${BD}` : "none" }}>
                  <span style={{ color: TXT2, fontSize: 11 }}>{formatDate(c.date)} · </span>{c.text}
                </div>
              ))}
              {lastNotice && <div style={{ fontSize: 12, color: TXT2, marginTop: 8 }}><Icon n="clipboard" /> Last notice sent {formatDate(lastNotice.date)} ({lastNotice.method}){unit.photos.length ? ` · ${unit.photos.length} photo${unit.photos.length > 1 ? "s" : ""}` : ""}</div>}
            </div>
          </div>
        )}

        {tab === "tickets" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button style={S.btn("primary")} onClick={() => onNewTicket && onNewTicket(unit.unit)}><Icon n="plus" /> New ticket</button>
            </div>
            {myTickets.length === 0 ? <div style={{ ...S.card, color: TXT2, textAlign: "center" }}>No tickets for this unit yet.</div> : ticketList([...myTickets].sort((a, b) => b.createdAt - a.createdAt))}
          </div>
        )}

        {tab === "info" && (
          <div>
            <div style={S.cardTitle}>Contact Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={S.label}>First Name</label><input style={S.input} value={unit.contact.first} onChange={e => handleContactUpdate("first", e.target.value)} /></div>
              <div><label style={S.label}>Last Name</label><input style={S.input} value={unit.contact.last} onChange={e => handleContactUpdate("last", e.target.value)} /></div>
              <div><label style={S.label}>Phone</label><input style={S.input} value={unit.contact.phone} onChange={e => handleContactUpdate("phone", e.target.value)} /></div>
              <div><label style={S.label}>Email</label><input style={S.input} value={unit.contact.email} onChange={e => handleContactUpdate("email", e.target.value)} /></div>
              <div><label style={S.label}>Unit Number</label><input style={S.input} value={unit.unit} readOnly /></div>
              <div><label style={S.label}>Floor</label><input style={S.input} value={unit.floor} readOnly /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={unit.vacant} onChange={e => onUpdate({ ...unit, vacant: e.target.checked })} />
                <span style={{ fontSize: 13 }}>Unit is Vacant</span>
              </label>
            </div>
          </div>
        )}

        {tab === "trades" && (
          <div>
            {TRADES.map(trade => {
              const t = unit.trades[trade];
              return (
                <div key={trade} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 110 }}>
                    <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700 }}>{trade}</span>
                  </div>
                  <select style={S.select} value={t.status} onChange={e => handleTradeUpdate(trade, "status", e.target.value)}>
                    <option>Pending</option><option>Started</option><option>In Progress</option><option>Complete</option>
                  </select>
                  <select style={S.select} value={t.phase} onChange={e => handleTradeUpdate(trade, "phase", e.target.value)}>
                    {PHASES.map(p => <option key={p}>{p}</option>)}
                  </select>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: getTradeColor(t.status) }} />
                    {t.accessDenied && <span style={S.tag(PK2)}><Icon n="alert" /> NO ACCESS</span>}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: TXT2 }}>
                    <input type="checkbox" checked={t.accessDenied} onChange={e => handleTradeUpdate(trade, "accessDenied", e.target.checked)} /> Access Denied
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: TXT2 }}>
                    <input type="checkbox" checked={!!t.scheduled} onChange={e => handleTradeUpdate(trade, "scheduled", e.target.checked)} /> Scheduled (2-wk)
                  </label>
                  <input style={{ ...S.input, width: 150, padding: "4px 8px", fontSize: 12 }} placeholder="Contractor" value={t.contractor || ""} onChange={e => handleTradeUpdate(trade, "contractor", e.target.value)} />
                </div>
              );
            })}
          </div>
        )}

        {tab === "comments" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <textarea style={S.textarea} value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." spellCheck={true} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={S.btn("primary")} onClick={addComment}><Icon n="chat" /> Add Comment</button>
                <button style={S.btn(isRecording ? "danger" : undefined)} onClick={toggleVoice}>
                  {isRecording ? <><Icon n="stopsq" /> Stop dictation</> : <><Icon n="mic" /> Dictate</>}
                </button>
              </div>
            </div>
            <div style={{ maxHeight: 300, overflow: "auto" }}>
              {unit.comments.length === 0 && <div style={{ color: TXT2, fontSize: 13 }}>No comments yet</div>}
              {unit.comments.map((c, i) => (
                <div key={i} style={{ ...S.card, padding: 10 }}>
                  <div style={{ fontSize: 10, color: TXT2, marginBottom: 4, fontFamily: font }}>{formatDate(c.date)} • {c.type === "voice" ? <><Icon n="mic" /> Voice</> : <><Icon n="chat" /> Text</>}</div>
                  <div style={{ fontSize: 13 }}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "photos" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <input style={S.input} placeholder="Photo annotation / description (optional)..." value={photoAnnotation} onChange={e => setPhotoAnnotation(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={addPhoto}
                  style={{ display: "none" }} />
                <button style={S.btn("primary")} onClick={() => fileInputRef.current?.click()}><Icon n="upload" /> Upload Photo</button>
                <button style={S.btn()} onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                    fileInputRef.current.removeAttribute("capture");
                  }
                }}><Icon n="camera" /> Take Photo</button>
                <span style={{ fontSize: 11, color: TXT2 }}>{unit.photos.length} photo(s)</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {unit.photos.map((p, i) => (
                <div key={p.id} style={{ ...S.card, padding: 8, textAlign: "center" }}>
                  <div onClick={() => setViewingPhoto(p)} style={{ cursor: "pointer", borderRadius: 4, overflow: "hidden", height: 120, marginBottom: 6, background: BD }}>
                    {p.src ? (
                      <img src={p.src} alt={p.annotation} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: TXT2 }}><Icon n="image" /></div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: PK, fontFamily: font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.annotation}</div>
                  <div style={{ fontSize: 9, color: TXT2 }}>{formatDate(p.date)}</div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
                    <button style={{ ...S.btn(), fontSize: 10, padding: "2px 8px" }} onClick={() => {
                      const updated = { ...unit, photos: unit.photos.map((ph, idx) => idx === i ? { ...ph, marked: !ph.marked } : ph) };
                      onUpdate(updated);
                    }}>{p.marked ? <><Icon n="check" /> Marked</> : <><Icon n="pencil" /> Mark</>}</button>
                    <button style={{ ...S.btn("danger"), fontSize: 10, padding: "2px 8px" }} onClick={() => deletePhoto(p.id)}><Icon n="trash" /></button>
                  </div>
                </div>
              ))}
              {unit.photos.length === 0 && <div style={{ color: TXT2, fontSize: 13, gridColumn: "1 / -1" }}>No photos yet — upload or take a photo</div>}
            </div>

            {/* Photo Viewer Modal */}
            {viewingPhoto && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
                onClick={() => setViewingPhoto(null)}>
                <div style={{ maxWidth: "90vw", maxHeight: "80vh", position: "relative" }} onClick={e => e.stopPropagation()}>
                  {viewingPhoto.src ? (
                    <img src={viewingPhoto.src} alt={viewingPhoto.annotation} style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 8, border: `2px solid ${PK}` }} />
                  ) : (
                    <div style={{ width: 400, height: 300, background: BD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, borderRadius: 8, color: TXT2 }}><Icon n="image" /></div>
                  )}
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <div style={{ fontFamily: font, fontSize: 14, color: AG, fontWeight: 700 }}>{viewingPhoto.annotation}</div>
                    <div style={{ fontSize: 11, color: TXT2, marginTop: 2 }}>{formatDate(viewingPhoto.date)} • Unit {unit.unit}</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                      <button style={S.btn("danger")} onClick={() => deletePhoto(viewingPhoto.id)}><Icon n="trash" /> Delete</button>
                      <button style={S.btn()} onClick={() => setViewingPhoto(null)}><Icon n="close" /> Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "notices" && (
          <div>
            <NoticeGenerator unit={unit} onUpdate={onUpdate} projectName={projectName} />
            <div style={{ marginTop: 16 }}>
              <div style={S.cardTitle}>Notice History</div>
              {unit.notices.length === 0 && <div style={{ color: TXT2, fontSize: 13 }}>No notices yet</div>}
              {[...unit.notices].reverse().map(n => (
                <div key={n.id} style={{ ...S.card, padding: 10 }}>
                  <div style={{ fontSize: 10, color: TXT2, fontFamily: font }}>{formatDate(n.date)} • {n.method}</div>
                  <div style={{ fontSize: 13 }}>{n.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ▸ Notice Generator
const NoticeGenerator = ({ unit, onUpdate, bulk, projectName }) => {
  const [noticeText, setNoticeText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [sendMethod, setSendMethod] = useState("print");

  // mode: undefined = use the chosen send method, "download" = save a print-ready file
  const generateNotice = (mode) => {
    if (!noticeText.trim()) { alert("Write the notice text first."); return; }
    const n = {
      unitLabel: unit.unit,
      resident: [unit.contact.first, unit.contact.last].filter(Boolean).join(" "),
      text: noticeText, startDate, endDate, trades: selectedTrades, projectName,
    };
    const html = noticeDocHtml([noticePageHtml(n)]);
    const fileName = `Notice-Unit-${unit.unit}-${toLocalISO(new Date())}.html`;
    const method = mode === "download" ? "download" : sendMethod;
    if (method === "download") {
      downloadFile(fileName, html);
    } else if (method === "print") {
      if (!printHtml(html)) { downloadFile(fileName, html); alert("Your browser blocked the print window, so the notice was downloaded. Open it and print."); }
    } else if (method === "email") {
      if (!unit.contact.email) { alert("No email address on file for this unit."); return; }
      window.location.href = `mailto:${encodeURIComponent(unit.contact.email)}?subject=${encodeURIComponent("Notice of Work — Unit " + unit.unit)}&body=${encodeURIComponent(noticePlain(n))}`;
    } else {
      const phone = (unit.contact.phone || "").replace(/[^\d+]/g, "");
      if (!phone) { alert("No phone number on file for this unit."); return; }
      window.location.href = `sms:${phone}?&body=${encodeURIComponent(noticePlain({ ...n, projectName: "" }).trim())}`;
    }
    const rec = { id: Date.now(), date: new Date().toISOString(), unit: unit.unit, text: noticeText, startDate, endDate, trades: selectedTrades, method };
    onUpdate(u => ({ ...u, notices: [...u.notices, rec] }));
    setNoticeText("");
  };

  return (
    <div>
      <div style={S.cardTitle}>Generate Notice {bulk && "(Bulk)"}</div>
      <div style={{ marginBottom: 8 }}>
        <label style={S.label}>Work Schedule</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" style={S.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: TXT2, alignSelf: "center" }}>to</span>
          <input type="date" style={S.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={S.label}>Trades Involved</label>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TRADES.map(t => (
            <button key={t} style={{ ...S.btn(selectedTrades.includes(t) ? "primary" : undefined), fontSize: 10, padding: "4px 8px" }}
              onClick={() => setSelectedTrades(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={S.label}>Notice Content</label>
        <textarea style={S.textarea} value={noticeText} onChange={e => setNoticeText(e.target.value)}
          placeholder="Dear Resident, work will begin in your unit..." spellCheck={true} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select style={S.select} value={sendMethod} onChange={e => setSendMethod(e.target.value)}>
          <option value="print">Print</option>
          <option value="email">Email</option>
          <option value="text">Text Message</option>
        </select>
        <button style={S.btn("primary")} onClick={() => generateNotice()}><Icon n="clipboard" /> Create Notice</button>
        <button style={S.btn()} onClick={() => generateNotice("download")}><Icon n="download" /> Download</button>
        <span style={{ fontSize: 10, color: TXT2 }}>Print opens your print dialog · Email/Text open your mail/messages app</span>
      </div>
    </div>
  );
};

// ▸ Schedule View
const ScheduleView = ({ schedule, units, progress }) => {
  const [view, setView] = useState("global");
  const today = new Date();
  const twoWeeks = new Date(today);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const globalStart = Object.values(schedule).reduce((min, s) => s.start < min ? s.start : min, "9999-99-99");
  const globalEnd = Object.values(schedule).reduce((max, s) => s.end > max ? s.end : max, "0000-00-00");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={S.navBtn(view === "global")} onClick={() => setView("global")}>Global Schedule</button>
        <button style={S.navBtn(view === "lookahead")} onClick={() => setView("lookahead")}>2-Week Look Ahead</button>
        {TRADES.map(t => (
          <button key={t} style={S.navBtn(view === t)} onClick={() => setView(t)}>{t}</button>
        ))}
      </div>

      {view === "global" && (
        <div style={S.card}>
          <div style={S.cardTitle}>Global Project Schedule</div>
          <div style={{ marginBottom: 12, fontSize: 13, color: TXT2 }}>
            Project: {formatDate(globalStart)} – {formatDate(globalEnd)}
          </div>
          {TRADES.map(t => {
            const s = { ...schedule[t], progress: progress[t] };
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ minWidth: 100, fontFamily: font, fontSize: 11, fontWeight: 600 }}>{t}</div>
                <div style={S.progressBar()}>
                  <div style={S.progressFill(s.progress, s.progress === 100 ? AG : s.progress > 0 ? AG2 : PK2)} />
                </div>
                <span style={{ fontFamily: font, fontSize: 11, color: TXT2, minWidth: 35 }}>{s.progress}%</span>
                <span style={{ fontSize: 10, color: TXT2 }}>{formatDate(s.start)} - {formatDate(s.end)}</span>
              </div>
            );
          })}
        </div>
      )}

      {view === "lookahead" && (
        <div style={S.card}>
          <div style={S.cardTitle}>2-Week Look Ahead</div>
          <div style={{ fontSize: 13, color: TXT2, marginBottom: 12 }}>
            {formatDate(today)} – {formatDate(twoWeeks)}
          </div>
          {TRADES.map(trade => {
            const scheduledUnits = units.filter(u => u.trades[trade]?.scheduled);
            const accessIssues = scheduledUnits.filter(u => u.trades[trade]?.accessDenied);
            if (scheduledUnits.length === 0) return null;
            return (
              <div key={trade} style={{ ...S.card, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700 }}>{trade}</span>
                  <span style={{ fontSize: 11, color: TXT2 }}>{scheduledUnits.length} units scheduled</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {scheduledUnits.map(u => (
                    <span key={u.id} style={S.tag(u.trades[trade].accessDenied ? PK2 : AG)}>
                      {u.unit} {u.trades[trade].accessDenied && <Icon n="alert" />}
                    </span>
                  ))}
                </div>
                {accessIssues.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: PK2 }}>
                    <Icon n="alert" /> {accessIssues.length} unit(s) with access issues: {accessIssues.map(u => u.unit).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {TRADES.includes(view) && (
        <div style={S.card}>
          <div style={S.cardTitle}>{view} Schedule</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
              <span>Start: <strong>{formatDate(schedule[view].start)}</strong></span>
              <span>End: <strong>{formatDate(schedule[view].end)}</strong></span>
              <span>Progress: <strong>{progress[view]}%</strong></span>
            </div>
          </div>
          <div style={S.cardTitle}>Units by Status</div>
          {["Pending", "Started", "In Progress", "Complete"].map(status => {
            const matching = units.filter(u => u.trades[view]?.status === status);
            return (
              <div key={status} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: getTradeColor(status) }} />
                  <span style={{ fontFamily: font, fontSize: 11, fontWeight: 600 }}>{status} ({matching.length})</span>
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {matching.slice(0, 40).map(u => (
                    <span key={u.id} style={{ ...S.tag(getTradeColor(status)), fontSize: 9 }}>{u.unit}</span>
                  ))}
                  {matching.length > 40 && <span style={{ fontSize: 10, color: TXT2 }}>+{matching.length - 40} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ▸ Common Areas (Fully Editable)
const CommonAreasView = ({ commonAreas, setCommonAreas, areaList, setAreaList }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaLabel, setNewAreaLabel] = useState("");
  const [newAreaIcon, setNewAreaIcon] = useState("wrench");
  const [addingItemTo, setAddingItemTo] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [itemNote, setItemNote] = useState("");

  const iconOptions = ["elevator","roof","wrench","tree","shower","bolt","flame","snow","door","home","box","parking","trash","bulb","hammer"];

  const addArea = () => {
    if (!newAreaLabel.trim()) return;
    const id = newAreaLabel.toLowerCase().replace(/\s+/g, "_").slice(0, 8) + "_" + Date.now();
    setAreaList([...areaList, { id, label: newAreaLabel.trim(), icon: newAreaIcon, items: [] }]);
    setNewAreaLabel(""); setAddingArea(false);
  };

  const removeArea = (areaId) => {
    if (!confirm(`Remove this entire area and all its items?`)) return;
    setAreaList(areaList.filter(a => a.id !== areaId));
  };

  const renameArea = (areaId) => {
    if (!editLabel.trim()) return;
    setAreaList(areaList.map(a => a.id === areaId ? { ...a, label: editLabel.trim() } : a));
    setEditingAreaId(null); setEditLabel("");
  };

  const addItem = (areaId) => {
    if (!newItemName.trim()) return;
    setAreaList(areaList.map(a => a.id === areaId ? { ...a, items: [...a.items, newItemName.trim()] } : a));
    setNewItemName(""); setAddingItemTo(null);
  };

  const removeItem = (areaId, itemName) => {
    setAreaList(areaList.map(a => a.id === areaId ? { ...a, items: a.items.filter(i => i !== itemName) } : a));
    const key = `${areaId}-${itemName}`;
    const updated = { ...commonAreas };
    delete updated[key];
    setCommonAreas(updated);
  };

  return (
    <div>
      {/* Add Area Button */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: font, color: TXT, margin: 0, fontSize: 16 }}>COMMON AREAS</h2>
        <button style={S.btn("primary")} onClick={() => setAddingArea(true)}>+ Add Area</button>
        <span style={{ fontSize: 11, color: TXT2 }}>{areaList.length} areas • {areaList.reduce((sum, a) => sum + a.items.length, 0)} items</span>
      </div>

      {/* Add Area Form */}
      {addingArea && (
        <div style={{ ...S.card, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={S.label}>Icon</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 360 }}>
              {iconOptions.map(ic => <button type="button" key={ic} title={ic} onClick={() => setNewAreaIcon(ic)} style={{ ...S.btn(newAreaIcon === ic ? "primary" : undefined), padding: "9px 11px" }}><Icon n={ic} /></button>)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={S.label}>Area Name</label>
            <input style={S.input} value={newAreaLabel} onChange={e => setNewAreaLabel(e.target.value)}
              placeholder="e.g. Hallways, Compactor Room..." onKeyDown={e => e.key === "Enter" && addArea()} />
          </div>
          <button style={S.btn("primary")} onClick={addArea}>Add</button>
          <button style={S.btn()} onClick={() => setAddingArea(false)}>Cancel</button>
        </div>
      )}

      {/* Area Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {areaList.map(area => (
          <div key={area.id} style={S.card}>
            {/* Area Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              {editingAreaId === area.id ? (
                <div style={{ display: "flex", gap: 4, flex: 1 }}>
                  <input style={{ ...S.input, fontSize: 13 }} value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && renameArea(area.id)} autoFocus />
                  <button style={{ ...S.btn("primary"), fontSize: 10, padding: "4px 8px" }} onClick={() => renameArea(area.id)}><Icon n="check" /></button>
                  <button style={{ ...S.btn(), fontSize: 10, padding: "4px 8px" }} onClick={() => setEditingAreaId(null)}><Icon n="close" /></button>
                </div>
              ) : (
                <div style={S.cardTitle}><Icon n={areaIconKey(area.icon)} /> {area.label}</div>
              )}
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ ...S.btn(), fontSize: 9, padding: "2px 6px" }}
                  onClick={() => { setEditingAreaId(area.id); setEditLabel(area.label); }} title="Rename"><Icon n="pencil" /></button>
                <button style={{ ...S.btn("danger"), fontSize: 9, padding: "2px 6px" }}
                  onClick={() => removeArea(area.id)} title="Remove area"><Icon n="trash" /></button>
              </div>
            </div>

            {/* Items */}
            {area.items.map(item => {
              const key = `${area.id}-${item}`;
              const data = commonAreas[key] || { trades: {}, status: "Pending", notes: "" };
              const assignedTrades = Object.entries(data.trades || {}).filter(([,v]) => v).map(([k]) => k);
              return (
                <div key={item} style={{ padding: "8px 0", borderBottom: `1px solid ${BD}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: getTradeColor(data.status) }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item}</span>
                      <span style={{ fontSize: 10, color: TXT2 }}>({data.status})</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ ...S.btn("primary"), fontSize: 10, padding: "3px 8px" }}
                        onClick={() => { setSelectedItem(key); setItemNote(data.notes || ""); }}>Edit</button>
                      <button style={{ ...S.btn("danger"), fontSize: 10, padding: "3px 6px" }}
                        onClick={() => removeItem(area.id, item)}><Icon n="close" /></button>
                    </div>
                  </div>
                  {assignedTrades.length > 0 && (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4, marginLeft: 22 }}>
                      {assignedTrades.map(t => <span key={t} style={S.tag(AG)}>{t}</span>)}
                    </div>
                  )}
                  {data.notes && (
                    <div style={{ fontSize: 11, color: TXT2, marginTop: 3, marginLeft: 22, fontStyle: "italic" }}><Icon n="pencilline" /> {data.notes}</div>
                  )}
                </div>
              );
            })}

            {/* Add Item */}
            {addingItemTo === area.id ? (
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                <input style={{ ...S.input, fontSize: 12 }} value={newItemName} onChange={e => setNewItemName(e.target.value)}
                  placeholder="New item name..." onKeyDown={e => e.key === "Enter" && addItem(area.id)} autoFocus />
                <button style={{ ...S.btn("primary"), fontSize: 10 }} onClick={() => addItem(area.id)}>Add</button>
                <button style={{ ...S.btn(), fontSize: 10 }} onClick={() => setAddingItemTo(null)}><Icon n="close" /></button>
              </div>
            ) : (
              <button style={{ ...S.btn(), fontSize: 10, marginTop: 8, width: "100%" }}
                onClick={() => { setAddingItemTo(area.id); setNewItemName(""); }}>+ Add Item</button>
            )}
          </div>
        ))}
      </div>

      {/* ── EDIT ITEM MODAL ── */}
      {selectedItem && (
        <div style={S.modal} onClick={() => setSelectedItem(null)}>
          <div style={{ ...S.modalInner, maxWidth: 550 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: font, color: PK, margin: 0, fontSize: 18 }}>{selectedItem.replace("-", " – ")}</h3>
              <button style={S.btn()} onClick={() => setSelectedItem(null)}><Icon n="close" /> Close</button>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Status</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["Pending","Started","In Progress","Complete"].map(st => {
                  const active = (commonAreas[selectedItem]?.status || "Pending") === st;
                  return (
                    <button key={st} style={{ ...S.btn(active ? "primary" : undefined), fontSize: 11, padding: "6px 12px",
                      background: active ? getTradeColor(st) : undefined, color: active ? (st === "Pending" || st === "In Progress" ? "#000" : "#FFF") : undefined }}
                      onClick={() => setCommonAreas({ ...commonAreas, [selectedItem]: { ...commonAreas[selectedItem], status: st } })}>
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assigned Trades */}
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Assigned Trades</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {TRADES.map(t => {
                  const assigned = commonAreas[selectedItem]?.trades?.[t];
                  return (
                    <button key={t} style={{ ...S.btn(assigned ? "primary" : undefined), fontSize: 11, padding: "5px 10px" }}
                      onClick={() => {
                        const current = commonAreas[selectedItem] || { trades: {}, status: "Pending", notes: "" };
                        setCommonAreas({ ...commonAreas, [selectedItem]: { ...current, trades: { ...current.trades, [t]: !assigned } } });
                      }}>
                      {assigned ? <Icon n="check" /> : null} {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Notes / Comments</label>
              <textarea style={S.textarea} value={itemNote} onChange={e => setItemNote(e.target.value)}
                placeholder="Add notes about this area..." spellCheck={true} />
              <button style={{ ...S.btn("primary"), marginTop: 6 }}
                onClick={() => {
                  const current = commonAreas[selectedItem] || { trades: {}, status: "Pending" };
                  setCommonAreas({ ...commonAreas, [selectedItem]: { ...current, notes: itemNote } });
                }}>Save Notes</button>
            </div>

            <button style={S.btn("primary")} onClick={() => setSelectedItem(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ▸ Field Monitor
const FieldMonitor = ({ units, events, setEvents }) => {
  const [newEvent, setNewEvent] = useState("");
  const [newType, setNewType] = useState("progress");
  const [newUnit, setNewUnit] = useState("");

  const typeColors = { arrival: AG, access: PK2, progress: AG, issue: PK2, delivery: PK, inspection: PK3 };
  const logEvent = () => {
    if (!newEvent.trim()) return;
    const time = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    setEvents([{ time, type: newType, msg: newEvent.trim(), unit: newUnit.trim() || "—" }, ...events]);
    setNewEvent(""); setNewUnit("");
  };

  const accessDenied = units.filter(u => Object.values(u.trades).some(t => t.accessDenied && t.scheduled));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={S.card}>
          <div style={S.cardTitle}><Icon n="signal" /> Live Field Events</div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {events.length === 0 && <div style={{ color: TXT2, fontSize: 13 }}>No events logged yet</div>}
            {events.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${BD}` }}>
                <span style={{ fontFamily: font, fontSize: 10, color: TXT2, minWidth: 95 }}>{e.time}</span>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeColors[e.type] || TXT2, marginTop: 4, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 12 }}>{e.msg}</span>
                  <span style={{ fontSize: 10, color: AG, marginLeft: 6 }}>Unit {e.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <select style={S.select} value={newType} onChange={e => setNewType(e.target.value)}>
              {Object.keys(typeColors).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input style={{ ...S.input, width: 80 }} placeholder="Unit" value={newUnit} onChange={e => setNewUnit(e.target.value)} />
            <input style={{ ...S.input, flex: 1, minWidth: 160, width: "auto" }} placeholder="Log field event..." value={newEvent}
              onChange={e => setNewEvent(e.target.value)} onKeyDown={e => e.key === "Enter" && logEvent()} />
            <button style={S.btn("primary")} onClick={logEvent}>Log</button>
          </div>
        </div>

        <div>
          <div style={S.card}>
            <div style={S.cardTitle}><Icon n="alert" /> Access Denied Notifications</div>
            {accessDenied.length === 0 ? (
              <div style={{ color: AG, fontSize: 13 }}><Icon n="check" /> All scheduled units accessible</div>
            ) : (
              <div style={{ maxHeight: 200, overflow: "auto" }}>
                {accessDenied.map(u => {
                  const blockedTrades = Object.entries(u.trades).filter(([, t]) => t.accessDenied && t.scheduled).map(([name]) => name);
                  return (
                    <div key={u.id} style={{ padding: "6px 0", borderBottom: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: PK2 }}>Unit {u.unit}</span>
                        <span style={{ fontSize: 11, color: TXT2, marginLeft: 8 }}>{u.contact.first} {u.contact.last}</span>
                      </div>
                      <div style={{ display: "flex", gap: 3 }}>
                        {blockedTrades.map(t => <span key={t} style={S.tag(PK2)}>{t}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}><Icon n="chart" /> Project Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "In Progress", value: units.filter(u => unitBucket(u) === "In Progress").length, color: AG2 },
                { label: "Completed", value: units.filter(u => unitBucket(u) === "Complete").length, color: AG },
                { label: "Pending", value: units.filter(u => unitBucket(u) === "Pending").length, color: PK2 },
                { label: "Vacant", value: units.filter(u => u.vacant).length, color: PK3 },
              ].map(stat => (
                <div key={stat.label} style={{ background: BG1, borderRadius: 6, padding: 12, textAlign: "center" }}>
                  <div style={{ fontFamily: font, fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: TXT2, textTransform: "uppercase", fontFamily: font }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ▸ Bulk Notices
const BulkNotices = ({ units, setUnits, projectName }) => {
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [noticeText, setNoticeText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [sendMethod, setSendMethod] = useState("print");
  const [floorSelect, setFloorSelect] = useState("");

  const sendBulk = (mode) => {
    if (selectedUnits.length === 0) { alert("Select at least one unit first."); return; }
    if (!noticeText.trim()) { alert("Write the notice text first."); return; }
    const chosen = units.filter(u => selectedUnits.includes(u.id));
    const mk = (u) => ({
      unitLabel: u.unit, resident: [u.contact.first, u.contact.last].filter(Boolean).join(" "),
      text: noticeText, startDate, endDate, trades: selectedTrades, projectName,
    });
    const stamp = toLocalISO(new Date());
    const html = noticeDocHtml(chosen.map(u => noticePageHtml(mk(u))));
    const method = mode === "download" ? "download" : sendMethod;
    if (method === "download") {
      downloadFile(`Notices-${stamp}.html`, html);
    } else if (method === "print") {
      if (!printHtml(html)) { downloadFile(`Notices-${stamp}.html`, html); alert("Your browser blocked the print window, so the notices were downloaded. Open the file and print it (one page per unit)."); }
    } else if (method === "email") {
      const emails = chosen.map(u => u.contact.email).filter(Boolean);
      if (emails.length === 0) { alert("None of the selected units have an email on file."); return; }
      const body = noticePlain({ ...mk(chosen[0]), unitLabel: "", resident: "" });
      window.location.href = `mailto:?bcc=${emails.map(encodeURIComponent).join(",")}&subject=${encodeURIComponent("Notice of Work — " + projectName)}&body=${encodeURIComponent(body)}`;
      if (emails.length < chosen.length) alert(`${chosen.length - emails.length} selected unit(s) have no email and were skipped.`);
    } else {
      const rows = [["Unit", "Resident", "Phone", "Message"], ...chosen.map(u => [u.unit, `${u.contact.first} ${u.contact.last}`.trim(), u.contact.phone, noticePlain(mk(u))])];
      downloadFile(`Notice-texts-${stamp}.csv`, rows.map(r => r.map(csvCell).join(",")).join("\n"), "text/csv");
      alert("A browser can't text many people at once, so I saved a CSV of numbers + messages you can load into a texting tool.");
    }
    const rec = { date: new Date().toISOString(), text: noticeText, startDate, endDate, trades: selectedTrades, method };
    const ids = new Set(selectedUnits);
    setUnits(prev => prev.map(u => ids.has(u.id) ? { ...u, notices: [...u.notices, { ...rec, id: Date.now() + u.id, unit: u.unit }] } : u));
  };

  const selectFloor = (floor) => {
    const floorUnits = units.filter(u => u.floor === parseInt(floor)).map(u => u.id);
    setSelectedUnits(prev => {
      const allSelected = floorUnits.every(id => prev.includes(id));
      return allSelected ? prev.filter(id => !floorUnits.includes(id)) : [...new Set([...prev, ...floorUnits])];
    });
  };

  const maxFloor = Math.max(...units.map(u => u.floor));

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}><Icon n="clipboard" /> Bulk Notice Distribution</div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Select Units</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button style={S.btn(selectedUnits.length === units.length ? "primary" : undefined)} onClick={() => setSelectedUnits(selectedUnits.length === units.length ? [] : units.map(u => u.id))}>
              {selectedUnits.length === units.length ? "Deselect All" : "Select All"}
            </button>
            <select style={S.select} value={floorSelect} onChange={e => { if (e.target.value) selectFloor(e.target.value); setFloorSelect(""); }}>
              <option value="">Select Floor...</option>
              {Array.from({ length: maxFloor }, (_, i) => <option key={i + 1} value={i + 1}>Floor {i + 1}</option>)}
            </select>
            <span style={{ fontSize: 11, color: TXT2, alignSelf: "center" }}>{selectedUnits.length} units selected</span>
          </div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxHeight: 100, overflow: "auto" }}>
            {units.map(u => (
              <button key={u.id} style={{ ...S.btn(selectedUnits.includes(u.id) ? "primary" : undefined), fontSize: 9, padding: "2px 6px" }}
                onClick={() => setSelectedUnits(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])}>
                {u.unit}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>Work Start</label>
            <input type="date" style={S.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Work End</label>
            <input type="date" style={S.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={S.label}>Trades</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {TRADES.map(t => (
              <button key={t} style={{ ...S.btn(selectedTrades.includes(t) ? "primary" : undefined), fontSize: 10, padding: "4px 8px" }}
                onClick={() => setSelectedTrades(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={S.label}>Notice Content</label>
          <textarea style={S.textarea} value={noticeText} onChange={e => setNoticeText(e.target.value)}
            placeholder="Dear Resident, please be advised that construction work is scheduled for your unit..." spellCheck={true} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <select style={S.select} value={sendMethod} onChange={e => setSendMethod(e.target.value)}>
            <option value="print">Print All</option>
            <option value="email">Email All</option>
            <option value="text">Text All</option>
          </select>
          <button style={S.btn("primary")} onClick={() => sendBulk()}>
            Send to {selectedUnits.length} Units
          </button>
          <button style={S.btn("success")} onClick={() => sendBulk("download")}>
            <Icon n="download" /> Download print-ready file
          </button>
        </div>
      </div>
    </div>
  );
};

const WMO = (c) => c === 0 ? ["Clear", "sun"] : c <= 2 ? ["Partly Cloudy", "suncloud"] : c === 3 ? ["Overcast", "cloud"] : c <= 48 ? ["Fog", "fog"] : c <= 57 ? ["Drizzle", "suncloudrain"] : c <= 67 ? ["Rain", "rain"] : c <= 77 ? ["Snow", "snowcloud"] : c <= 82 ? ["Showers", "rain"] : c <= 86 ? ["Snow Showers", "snowcloud"] : ["Thunderstorm", "storm"];

// Own component so the clock ticking never re-renders the building map.
function HeaderRight() {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState(null); // null = loading, false = unavailable
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t); }, []);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => { if (alive && j.current) setWeather({ temp: j.current.temperature_2m, code: j.current.weather_code }); })
      .catch(() => { if (alive) setWeather(false); });
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const [cond, icon] = weather ? WMO(weather.code) : ["", "suncloud"];
  return (
    <div style={{ textAlign: "right", flexShrink: 0, lineHeight: 1.3 }}>
      <div style={{ color: AG, fontWeight: 800, fontSize: 16 }}>{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
      <div style={{ color: TXT2, fontSize: 12, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
        <span className="bt-wide">{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
        {weather ? <span title={cond} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: TXT }}><Icon n={icon} /> {Math.round(weather.temp)}°F</span>
          : <span className="bt-wide">{weather === null ? "…" : "No weather"}</span>}
      </div>
    </div>
  );
}

const DEMO_TICKETS = () => {
  const now = Date.now();
  return [
    { id: "T-0003", unit: "3B", name: "Maria Rodriguez", phone: "(212) 555-0142", email: "", description: "Kitchen sink is leaking under the cabinet. Water on the floor.", category: "Plumbing", priority: "Urgent", status: "New", permissionToEnter: true, photo: "", assignedTo: "", notes: "", source: "demo", createdAt: now - 25 * 60000, updatedAt: now - 25 * 60000 },
    { id: "T-0002", unit: "2A", name: "James Chen", phone: "(212) 555-0177", email: "", description: "Bedroom outlet stopped working.", category: "Electrical", priority: "Normal", status: "Assigned", permissionToEnter: false, photo: "", assignedTo: "Volt Electric", notes: "Vendor coming Tuesday AM", source: "demo", createdAt: now - 26 * 3600000, updatedAt: now - 20 * 3600000 },
    { id: "T-0001", unit: "5C", name: "Sarah Johnson", phone: "(212) 555-0190", email: "", description: "Front door lock sticks.", category: "Carpentry", priority: "Normal", status: "Done", permissionToEnter: true, photo: "", assignedTo: "In-house", notes: "Lock replaced", source: "demo", createdAt: now - 4 * 86400000, updatedAt: now - 3 * 86400000 },
  ];
};

// ▸ Manager: server settings + tenant link/QR
const TicketSettings = ({ cfg, onSave, projectName, syncState }) => {
  const [url, setUrl] = useState(cfg.url || "");
  const [key, setKey] = useState(cfg.key || "");
  const [msg, setMsg] = useState("");
  const base = `${window.location.origin}${window.location.pathname}`;
  const link = cfg.url ? `${new URL("request.html", window.location.href).href.split("#")[0]}#request?api=${encodeURIComponent(cfg.url)}&b=${encodeURIComponent(projectName)}` : "";
  const isFile = window.location.protocol === "file:";
  let qrSvg = "";
  if (link && !isFile) {
    try { const q = qrcode(0, "M"); q.addData(link); q.make(); qrSvg = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) {}
  }
  const save = async () => {
    const c = { url: url.trim().replace(/\/+$/, ""), key: key.trim() };
    setMsg("Testing…");
    try {
      await ticketCall(c, "GET", "/tickets", null, true);
      onSave(c); setMsg("Connected");
    } catch (e) { setMsg("Failed: " + e.message); }
  };
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Ticket server</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        <div><label style={S.label}>Server URL</label><input style={S.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://buildtrack-tickets.you.workers.dev" /></div>
        <div><label style={S.label}>Manager key</label><input style={S.input} type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="the key you set with wrangler secret" /></div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button style={S.btn("primary")} onClick={save} disabled={!url || !key}>Save &amp; test</button>
        {cfg.url && <button style={S.btn()} onClick={() => { onSave({ url: "", key: "" }); setUrl(""); setKey(""); setMsg(""); }}>Disconnect</button>}
        <span style={{ fontSize: 12, color: msg.startsWith("Failed") ? "#FF8C8C" : TXT2 }}>{msg || (syncState.status === "error" ? "Sync problem: " + syncState.err : "")}</span>
      </div>
      {!cfg.url && <div style={{ fontSize: 12, color: TXT2, marginTop: 10 }}>Not connected: tickets you create stay on this device only. Tenant requests need the server (setup steps are in the server folder's README).</div>}
      {link && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${BD}`, paddingTop: 12 }}>
          <label style={S.label}>Tenant link (post it, text it, or print the QR in the lobby)</label>
          {isFile && <div style={{ fontSize: 12, color: PK3, marginBottom: 8 }}><Icon n="alert" /> You opened this app from a file on your device. Put the file on a website (e.g. GitHub Pages) first, then open it from there. Otherwise this link won't work for tenants.</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...S.input, flex: 1, minWidth: 220 }} readOnly value={link} onFocus={e => e.target.select()} />
            <button style={S.btn()} onClick={() => { navigator.clipboard?.writeText(link); setMsg("Link copied"); }}>Copy</button>
            <a style={{ ...S.btn(), textDecoration: "none", display: "inline-block" }} href={link} target="_blank" rel="noreferrer">Preview</a>
          </div>
          {qrSvg && <div style={{ width: 150, marginTop: 12, background: "#fff", padding: 6, borderRadius: 6 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />}
        </div>
      )}
    </div>
  );
};

// ▸ Manager: ticket card
const TicketCard = ({ t, units, onChange, onOpenUnit, onPhoto }) => {
  const [notes, setNotes] = useState(t.notes || "");
  useEffect(() => { setNotes(t.notes || ""); }, [t.notes]);
  const unit = units.find(u => u.unit.toUpperCase() === t.unit.toUpperCase());
  const urgent = t.priority === "Urgent";
  const col = TICKET_COLORS[t.status] || AG;
  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${urgent && t.status !== "Done" ? PK2 : col}`, opacity: t.status === "Done" ? 0.7 : 1 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontFamily: font, fontWeight: 800, color: AG }}>{t.id}</span>
        {urgent && <span style={{ background: PK2, color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 3, fontFamily: font }}>URGENT</span>}
        <select style={{ ...S.select, fontSize: 12, padding: "3px 6px" }} value={t.category} onChange={e => onChange(t.id, { category: e.target.value })}>
          {TRADES.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <button style={{ ...S.btn(), fontSize: 12, padding: "3px 10px" }} onClick={() => unit && onOpenUnit(unit)} title={unit ? "Open unit" : "No unit with this number in the building"}>Unit {t.unit}{unit ? null : <> <Icon n="alert" /></>}</button>
        <span style={{ fontSize: 12, color: TXT2, marginLeft: "auto" }}>{ticketAge(t.createdAt)}{t.source === "manager" ? " · entered by you" : ""}{t.localOnly ? " · waiting to sync" : ""}</span>
      </div>
      <div style={{ fontSize: 15, marginBottom: 8, whiteSpace: "pre-wrap" }}>{t.description}</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, color: TXT2, marginBottom: 8, alignItems: "center" }}>
        <span><Icon n="user" /> {t.name}</span>
        {t.phone && <a href={`tel:${t.phone}`} style={{ color: AG, textDecoration: "none" }}><Icon n="tel" /> {t.phone}</a>}
        {t.email && <a href={`mailto:${t.email}`} style={{ color: AG, textDecoration: "none" }}><Icon n="mail" /> {t.email}</a>}
        <span style={{ color: t.permissionToEnter ? "#66bb6a" : PK3 }}>{t.permissionToEnter ? <><Icon n="key" /> OK to enter</> : <><Icon n="door" /> Call before entering</>}</span>
        {t.photo && <img src={t.photo} alt="" onClick={() => onPhoto(t.photo)} style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 4, cursor: "zoom-in", border: `1px solid ${BD}` }} />}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {TICKET_STATUSES.map(s => {
          const on = t.status === s;
          return <button key={s} style={{ ...S.btn(), fontSize: 12, padding: "6px 12px", background: on ? TICKET_COLORS[s] : undefined, color: on ? (s === "In Progress" ? "#000" : "#fff") : undefined, border: on ? "none" : undefined }} onClick={() => !on && onChange(t.id, { status: s })}>{s}</button>;
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
        <input style={S.input} placeholder="Assigned to (vendor / super)" defaultValue={t.assignedTo} key={t.id + "a" + t.assignedTo} onBlur={e => e.target.value !== t.assignedTo && onChange(t.id, { assignedTo: e.target.value })} />
        <input style={S.input} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (t.notes || "") && onChange(t.id, { notes })} />
      </div>
    </div>
  );
};

// ▸ Manager: Tickets page
const TicketsView = ({ tickets, units, onChange, onCreate, onOpenUnit, cfg, onSaveCfg, projectName, syncState, onSync, prefill, onPrefillUsed }) => {
  const [filter, setFilter] = useState("Open");
  const [q, setQ] = useState("");
  const [showSettings, setShowSettings] = useState(!cfg.url);
  const [creating, setCreating] = useState(false);
  const [photo, setPhoto] = useState("");
  const blank = { unit: "", name: "", phone: "", description: "", category: "", urgent: false, enter: true };
  const [nf, setNf] = useState(blank);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!prefill) return;
    const u = units.find(x => x.unit.toUpperCase() === prefill.toUpperCase());
    setNf({ ...blank, unit: prefill, name: u ? `${u.contact.first} ${u.contact.last}`.trim() : "", phone: u?.contact.phone || "" });
    setCreating(true);
    onPrefillUsed && onPrefillUsed();
  }, [prefill]);

  useEffect(() => {
    if (!creating) return;
    const h = (e) => { if (e.key === "Escape") setCreating(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [creating]);

  const list = tickets
    .filter(t => filter === "All" ? true : filter === "Open" ? t.status !== "Done" : t.status === filter)
    .filter(t => !q || `${t.id} ${t.unit} ${t.name} ${t.description} ${t.assignedTo}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => ((b.priority === "Urgent" && b.status !== "Done") - (a.priority === "Urgent" && a.status !== "Done")) || b.createdAt - a.createdAt);

  const unitMatch = units.find(u => u.unit.toUpperCase() === nf.unit.trim().toUpperCase());
  const create = () => {
    if (!nf.unit.trim() || !nf.description.trim() || !nf.name.trim()) return setErr("Unit, name and description are required.");
    const c = classifyTicket(nf.description);
    onCreate({
      unit: nf.unit.trim().toUpperCase(), name: nf.name.trim(), phone: nf.phone.trim(), email: "",
      description: nf.description.trim(), category: nf.category || c.category,
      priority: (nf.urgent || c.urgent) ? "Urgent" : "Normal", permissionToEnter: nf.enter, photo,
    });
    setNf(blank); setPhoto(""); setErr(""); setCreating(false);
  };
  const openCount = tickets.filter(t => t.status !== "Done").length;
  const photoPick = async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) try { setPhoto(await compressImage(f, 1024, 0.6)); } catch (x) {} };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontFamily: font, color: TXT, margin: 0, fontSize: 16 }}>WORK TICKETS</h2>
          <span style={{ fontSize: 12, color: TXT2 }}>{openCount} open · {tickets.length} total{cfg.url ? (syncState.status === "error" ? " · sync problem" : syncState.at ? ` · synced ${ticketAge(syncState.at)}` : " · syncing…") : " · local only"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cfg.url && <button style={S.btn()} onClick={onSync}><Icon n="refresh" /> Refresh</button>}
          <button style={S.btn()} onClick={() => setShowSettings(!showSettings)}><Icon n="gear" /> Server</button>
          <button style={S.btn("primary")} onClick={() => setCreating(true)}><Icon n="plus" /> New ticket</button>
        </div>
      </div>

      {showSettings && <TicketSettings cfg={cfg} onSave={onSaveCfg} projectName={projectName} syncState={syncState} />}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {["Open", "New", "Assigned", "In Progress", "Done", "All"].map(s => (
          <button key={s} style={{ ...S.btn(filter === s ? "primary" : undefined), fontSize: 12, padding: "6px 12px" }} onClick={() => setFilter(s)}>{s}{s === "New" ? ` (${tickets.filter(t => t.status === "New").length})` : ""}</button>
        ))}
        <input style={{ ...S.input, width: 200, marginLeft: "auto" }} placeholder="Search unit, name, text…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {list.length === 0 && <div style={{ ...S.card, color: TXT2, textAlign: "center", padding: 30 }}>{tickets.length ? "No tickets match this filter." : "No tickets yet. Tenant requests will show up here."}</div>}
      {list.map(t => <TicketCard key={t.id} t={t} units={units} onChange={onChange} onOpenUnit={onOpenUnit} onPhoto={(p) => window.open(p, "_blank")} />)}

      {creating && (
        <div style={S.modal} onClick={() => setCreating(false)}>
          <div style={{ ...S.modalInner, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontFamily: font, color: PK, margin: 0, fontSize: 16 }}>NEW TICKET</h3>
              <button style={S.btn()} onClick={() => setCreating(false)}><Icon n="close" /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <div><label style={S.label}>Unit *</label>
                <input style={S.input} list="bt-units" value={nf.unit} onChange={e => {
                  const v = e.target.value; const u = units.find(x => x.unit.toUpperCase() === v.trim().toUpperCase());
                  setNf({ ...nf, unit: v, name: nf.name || (u ? `${u.contact.first} ${u.contact.last}`.trim() : ""), phone: nf.phone || u?.contact.phone || "" });
                }} />
                <datalist id="bt-units">{units.map(u => <option key={u.id} value={u.unit} />)}</datalist>
              </div>
              <div><label style={S.label}>Name *</label><input style={S.input} value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} /></div>
            </div>
            {nf.unit && !unitMatch && <div style={{ fontSize: 11, color: PK3, marginTop: 4 }}><Icon n="alert" /> No unit "{nf.unit}" in this building.</div>}
            <label style={S.label}>Phone</label><input style={S.input} value={nf.phone} onChange={e => setNf({ ...nf, phone: e.target.value })} />
            <label style={S.label}>Problem *</label><textarea style={{ ...S.input, minHeight: 80 }} value={nf.description} onChange={e => setNf({ ...nf, description: e.target.value })} />
            <label style={S.label}>Trade (auto-picked from the text if blank)</label>
            <select style={{ ...S.select, width: "100%" }} value={nf.category} onChange={e => setNf({ ...nf, category: e.target.value })}>
              <option value="">Auto: {classifyTicket(nf.description).category}</option>
              {TRADES.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap", fontSize: 13 }}>
              <label><input type="checkbox" checked={nf.urgent} onChange={e => setNf({ ...nf, urgent: e.target.checked })} /> Urgent</label>
              <label><input type="checkbox" checked={nf.enter} onChange={e => setNf({ ...nf, enter: e.target.checked })} /> OK to enter</label>
              <label style={{ cursor: "pointer", color: AG }}>{photo ? <><Icon n="check" /> Photo added</> : <><Icon n="camera" /> Add photo</>}<input type="file" accept="image/*" style={{ display: "none" }} onChange={photoPick} /></label>
            </div>
            {err && <div style={{ color: "#FF8C8C", fontSize: 12, marginTop: 8 }}>{err}</div>}
            <button style={{ ...S.btn("primary"), width: "100%", marginTop: 12, padding: 12 }} onClick={create}>Create ticket</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ▸ Dashboard panel
const TicketsPanel = ({ tickets, onOpen, connected }) => {
  const open = tickets.filter(t => t.status !== "Done");
  const urgent = open.filter(t => t.priority === "Urgent").length;
  const recent = [...open].sort((a, b) => ((b.priority === "Urgent") - (a.priority === "Urgent")) || b.createdAt - a.createdAt).slice(0, 5);
  const stat = (label, value, color) => (
    <div style={{ textAlign: "center", minWidth: 0 }}>
      <div style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: TXT2, textTransform: "uppercase", fontFamily: font, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ ...S.card, borderColor: urgent ? PK2 : BD }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <div style={{ ...S.cardTitle, marginBottom: 0 }}><Icon n="ticket" /> Work tickets</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 14, flexWrap: "wrap" }}>
          {stat("New", tickets.filter(t => t.status === "New").length, TICKET_COLORS.New)}
          {stat("Assigned", tickets.filter(t => t.status === "Assigned").length, TICKET_COLORS.Assigned)}
          {stat("In progress", tickets.filter(t => t.status === "In Progress").length, TICKET_COLORS["In Progress"])}
          {stat("Urgent", urgent, PK2)}
        </div>
        <button style={S.btn("primary")} onClick={onOpen}>View all <Icon n="arrowright" /></button>
      </div>
      {recent.length === 0 && <div style={{ fontSize: 13, color: TXT2 }}>No open tickets.{!connected && " Connect the ticket server so tenant requests land here."}</div>}
      {recent.map(t => (
        <div key={t.id} onClick={onOpen} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderTop: `1px solid ${BD}`, cursor: "pointer", fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: TICKET_COLORS[t.status], flexShrink: 0 }} />
          <span style={{ fontFamily: font, fontWeight: 700, color: AG, width: 44, flexShrink: 0 }}>{t.unit}</span>
          <span style={{ flexShrink: 0 }}><Icon n={TRADE_ICONS[t.category] || "wrench"} style={{ color: TRADE_COLORS[t.category] }} /></span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.priority === "Urgent" && <strong style={{ color: PK2 }}>URGENT · </strong>}{t.description}</span>
          <span style={{ color: TXT2, fontSize: 11, flexShrink: 0 }}>{ticketAge(t.createdAt)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN APP ───────────────────────────────────────────────────────────────
function App({ saved, savedCfg }) {
  const [unitFormat, setUnitFormat] = useState(saved?.unitFormat || "alpha");
  const [floorCount, setFloorCount] = useState(saved?.floorCount || 5);
  const [perFloor, setPerFloor] = useState(saved?.perFloor || 8);
  const [demoMode, setDemoMode] = useState(saved ? saved.demoMode !== false : true);
  const [units, setUnits] = useState(() => saved?.units ? fixUnits(saved.units) : generateUnits(5, 8, "alpha", true));
  const [schedule, setSchedule] = useState(() => saved?.schedule ? fixSchedule(saved.schedule) : generateSchedule(true));
  const [commonAreas, setCommonAreas] = useState(saved?.commonAreas || {});
  const [areaList, setAreaList] = useState(saved?.areaList || DEFAULT_COMMON_AREAS);
  const [showAreas, setShowAreas] = useState(saved?.showAreas || { elev: true, roof: true, base: true, grnd: true });
  const [enabledItems, setEnabledItems] = useState(saved?.enabledItems || {});
  const [elevatorFloors, setElevatorFloors] = useState(saved?.elevatorFloors || {});
  const [elevatorStuck, setElevatorStuck] = useState(saved?.elevatorStuck || {});
  const [events, setEvents] = useState(saved?.events || DEMO_EVENTS);
  const [tickets, setTickets] = useState(saved?.tickets || (saved ? [] : DEMO_TICKETS()));
  const [ticketCfg, setTicketCfg] = useState(savedCfg || { url: "", key: "" });
  const [syncState, setSyncState] = useState({ status: "off", at: 0, err: "" });
  const ticketsRef = useRef(tickets); ticketsRef.current = tickets;
  const cfgRef = useRef(ticketCfg); cfgRef.current = ticketCfg;
  const syncBusy = useRef(false);
  const syncAgain = useRef(false);
  const syncRef = useRef(null);
  const [ticketPrefill, setTicketPrefill] = useState(null);
  const importRef = useRef(null);
  const [sidebarAddItem, setSidebarAddItem] = useState(null);
  const [sidebarNewItem, setSidebarNewItem] = useState("");

  // Helper: is a specific item enabled (default true for existing items)
  const isItemEnabled = (areaId, item) => enabledItems[`${areaId}-${item}`] !== false;
  const toggleItem = (areaId, item) => setEnabledItems(prev => ({ ...prev, [`${areaId}-${item}`]: !isItemEnabled(areaId, item) }));
  const getElevFloor = (car) => elevatorFloors[car] || 1;
  const isElevStuck = (car) => elevatorStuck[car] || false;
  const setElevFloor = (car, floor) => setElevatorFloors(prev => ({ ...prev, [car]: floor }));
  const toggleElevStuck = (car) => setElevatorStuck(prev => ({ ...prev, [car]: !prev[car] }));
  const [page, setPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const selectedUnit = units.find(u => u.id === selectedId) || null;
  const setSelectedUnit = (u) => setSelectedId(u ? u.id : null);
  const [tradeFilter, setTradeFilter] = useState("");
  const [projectName, setProjectName] = useState(saved?.projectName || DEFAULT_PROJECT);
  const [editingProject, setEditingProject] = useState(false);
  const sidebarOpen = true; // the sidebar is now a slide-out drawer; its contents always render full-size
  const [drawer, setDrawer] = useState(false);
  const [zoom, setZoomState] = useState(() => { try { return parseFloat(localStorage.getItem("bt_zoom")) || 1.15; } catch (e) { return 1.15; } });
  const setZoom = (z) => { setZoomState(z); try { localStorage.setItem("bt_zoom", String(z)); } catch (e) {} };
  const [saveStatus, setSaveStatus] = useState("");

  const progress = Object.fromEntries(TRADES.map(t => [t, calcProgress(units, t)]));

  const snapshot = () => ({ units, schedule, commonAreas, areaList, showAreas, enabledItems, elevatorFloors, elevatorStuck, projectName, unitFormat, floorCount, perFloor, events, demoMode, tickets });

  // Auto-save (debounced) so a refresh never wipes the project.
  useEffect(() => {
    const t = setTimeout(() => {
      idb.set("state", { ...snapshot(), savedAt: Date.now() })
        .then(() => setSaveStatus("Saved " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })))
        .catch(() => setSaveStatus("Not saved (storage blocked)"));
    }, 1200);
    return () => clearTimeout(t);
  }, [units, schedule, commonAreas, areaList, showAreas, enabledItems, elevatorFloors, elevatorStuck, projectName, unitFormat, floorCount, perFloor, events, demoMode, tickets]);

  // change = a unit object, or a function (unit) => unit (use the function form for async work like photo uploads)
  const updateUnit = (change) => {
    setUnits(prev => prev.map(u => {
      if (typeof change === "function") return u.id === selectedId ? change(u) : u;
      return u.id === change.id ? change : u;
    }));
  };

  const hasWork = (u) => u.comments.length || u.photos.length || u.notices.length || u.contact.first || u.contact.last || Object.values(u.trades).some(t => t.status !== "Pending" || t.contractor);

  // Changing the grid keeps data for every unit that still exists.
  const regenerate = (opts = {}) => {
    const fl = opts.floors ?? floorCount;
    const pf = opts.perFloor ?? perFloor;
    const fmt = opts.format ?? unitFormat;
    if (fmt !== unitFormat) {
      if (!confirm("Changing the unit format renames every unit and resets all unit data. Continue?")) return;
      setFloorCount(fl); setPerFloor(pf); setUnitFormat(fmt);
      setUnits(generateUnits(fl, pf, fmt, demoMode));
      setSelectedUnit(null);
      return;
    }
    const fresh = generateUnits(fl, pf, fmt, demoMode);
    const keep = new Set(fresh.map(u => u.unit));
    const lost = units.filter(u => !keep.has(u.unit) && hasWork(u));
    if (lost.length && !confirm(`This removes ${lost.length} unit(s) that have data. Continue?`)) return;
    const old = new Map(units.map(u => [u.unit, u]));
    setFloorCount(fl); setPerFloor(pf);
    setUnits(fresh.map(u => old.has(u.unit) ? { ...old.get(u.unit), id: u.id, floor: u.floor } : u));
    setSelectedUnit(null);
  };

  const startBlank = () => {
    if (!confirm("Start a blank project? This clears all units, notes, photos, schedule dates and events. Export a backup first if you need them.")) return;
    setDemoMode(false);
    setUnits(generateUnits(floorCount, perFloor, unitFormat, false));
    setSchedule(generateSchedule(false));
    setCommonAreas({}); setEvents([]); setElevatorFloors({}); setElevatorStuck({});
    setTickets(prev => prev.filter(t => t.source !== "demo"));
    setProjectName(n => n === DEFAULT_PROJECT ? "New Project — click to rename" : n);
    setSelectedUnit(null);
  };

  const applyState = (s) => {
    setUnitFormat(s.unitFormat || "alpha"); setFloorCount(s.floorCount || 5); setPerFloor(s.perFloor || 8);
    setDemoMode(s.demoMode !== false && s.demoMode !== undefined ? true : false);
    setUnits(fixUnits(s.units)); setSchedule(fixSchedule(s.schedule)); setCommonAreas(s.commonAreas || {});
    setAreaList(s.areaList || DEFAULT_COMMON_AREAS); setShowAreas(s.showAreas || { elev: true, roof: true, base: true, grnd: true });
    setEnabledItems(s.enabledItems || {}); setElevatorFloors(s.elevatorFloors || {}); setElevatorStuck(s.elevatorStuck || {});
    setEvents(s.events || []); setTickets(s.tickets || []); setProjectName(s.projectName || DEFAULT_PROJECT); setSelectedUnit(null);
  };

  const exportBackup = () => downloadFile(
    `BuildTrack-${projectName.replace(/[^\w]+/g, "-").slice(0, 40)}-${toLocalISO(new Date())}.json`,
    JSON.stringify(snapshot()), "application/json");

  const importBackup = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!Array.isArray(s.units) || !s.schedule) throw new Error("bad");
        if (!confirm("Replace the current project with this backup?")) return;
        applyState(s);
      } catch (err) { alert("That file isn't a valid BuildTrack backup."); }
    };
    r.readAsText(file);
  };

  const ticketInfo = {};
  tickets.forEach(t => {
    if (t.status === "Done") return;
    const k = t.unit.toUpperCase();
    const i = ticketInfo[k] || (ticketInfo[k] = { open: 0, urgent: false });
    i.open++; if (t.priority === "Urgent") i.urgent = true;
  });

  const saveTicketCfg = (c) => {
    setTicketCfg(c);
    idb.set("ticketApi", c).catch(() => {});
    if (!c.url) setSyncState({ status: "off", at: 0, err: "" });
  };

  const syncTickets = async () => {
    const cfg = cfgRef.current;
    if (!cfg.url || !cfg.key) return;
    if (syncBusy.current) { syncAgain.current = true; return; }
    syncBusy.current = true;
    try {
      let pushErr = "";
      for (const t of ticketsRef.current.filter(t => t.localOnly)) {
        try {
          const created = await ticketCall(cfg, "POST", "/tickets", { unit: t.unit, name: t.name, phone: t.phone, email: t.email, description: t.description, category: t.category, priority: t.priority, permissionToEnter: t.permissionToEnter, photo: t.photo }, true);
          setTickets(prev => prev.map(x => x.id === t.id ? created : x));
        } catch (e) { pushErr = `${t.id}: ${e.message}`; }
      }
      for (const t of ticketsRef.current.filter(t => t.dirty && !t.localOnly && t.source !== "demo")) {
        try {
          const res = await ticketCall(cfg, "PATCH", `/tickets/${t.id}`, { status: t.status, priority: t.priority, category: t.category, assignedTo: t.assignedTo, notes: t.notes }, true);
          setTickets(prev => prev.map(x => x.id === t.id && x.updatedAt === t.updatedAt ? res : x));
        } catch (e) { pushErr = `${t.id}: ${e.message}`; }
      }
      const { tickets: remote } = await ticketCall(cfg, "GET", "/tickets", null, true);
      setTickets(prev => {
        const byId = new Map(prev.filter(t => t.source !== "demo").map(t => [t.id, t]));
        remote.forEach(r => { const l = byId.get(r.id); if (!l || (!l.dirty && r.updatedAt >= l.updatedAt)) byId.set(r.id, r); });
        return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
      });
      setSyncState(pushErr ? { status: "error", at: Date.now(), err: "Couldn't upload " + pushErr } : { status: "ok", at: Date.now(), err: "" });
    } catch (e) { setSyncState(st => ({ ...st, status: "error", err: e.message })); }
    syncBusy.current = false;
    if (syncAgain.current) { syncAgain.current = false; setTimeout(() => syncRef.current && syncRef.current(), 300); }
  };
  syncRef.current = syncTickets;

  const updateTicket = (id, patch) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch, updatedAt: Date.now(), dirty: true } : t));
    setTimeout(() => syncRef.current && syncRef.current(), 400);
  };

  const createTicket = (fields) => {
    const now = Date.now();
    const n = ticketsRef.current.reduce((m, x) => /^L-\d+$/.test(x.id) ? Math.max(m, parseInt(x.id.slice(2), 10)) : m, 0) + 1;
    setTickets(prev => [{ ...fields, id: "L-" + String(n).padStart(4, "0"), status: "New", assignedTo: "", notes: "", source: "manager", createdAt: now, updatedAt: now, localOnly: true }, ...prev]);
    setTimeout(() => syncRef.current && syncRef.current(), 300);
  };

  useEffect(() => {
    if (!ticketCfg.url || !ticketCfg.key) return;
    syncRef.current();
    const iv = setInterval(() => { if (!document.hidden) syncRef.current(); }, 45000);
    const vis = () => { if (!document.hidden) syncRef.current(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, [ticketCfg.url, ticketCfg.key]);

  const newTicketCount = tickets.filter(t => t.status === "New").length;
  useEffect(() => { document.title = (newTicketCount ? `(${newTicketCount}) ` : "") + "BuildTrack NYC"; }, [newTicketCount]);

  const mainPages = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "tickets", label: "Tickets", icon: "ticket", badge: newTicketCount },
    { id: "schedule", label: "Schedule", icon: "calendar" },
    { id: "field", label: "Field Monitor", icon: "signal" },
    { id: "common", label: "Common Areas", icon: "building" },
    { id: "notices", label: "Notices", icon: "clipboard" },
  ];

  const tradePages = TRADES.map(t => ({ id: `trade-${t}`, label: t, icon: TRADE_ICONS[t] || "wrench" }));

  const curPage = mainPages.find(p => p.id === page) || tradePages.find(p => p.id === page);
  const pageTitle = curPage ? curPage.label : "Dashboard";
  const navItem = (active, col) => ({ display: "flex", alignItems: "center", gap: 14, width: "100%", minHeight: 52, padding: "6px 14px", background: active ? col + "28" : "transparent", border: "none", borderRadius: 12, cursor: "pointer", color: active ? col : TXT, fontFamily: font, fontSize: 17, fontWeight: 700, marginBottom: 2, textAlign: "left" });
  const secLbl = { fontFamily: font, fontSize: 13, color: TXT2, textTransform: "uppercase", letterSpacing: "0.07em", padding: "12px 14px 6px", fontWeight: 700 };

  return (
    <div style={{ ...S.app, height: `calc(100vh / ${zoom})`, zoom, minHeight: 0, overflow: "hidden" }}>
      <GlobalStyle />

      {/* ── TOPBAR ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: `${SAFE_TOP} 16px 12px`, background: BG1, borderBottom: `1px solid ${BD}`, flexShrink: 0, zIndex: 100 }}>
        <button onClick={() => setDrawer(true)} aria-label="Menu" style={{ width: 46, height: 46, borderRadius: 13, border: `1px solid ${BD}`, background: BG3, color: TXT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, fontSize: 22, flexShrink: 0, position: "relative" }}>
          <Icon n="menu" />
          {newTicketCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: PK, color: "#000", fontSize: 11, fontWeight: 800, borderRadius: 10, padding: "1px 6px" }}>{newTicketCount}</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pageTitle}</div>
          {editingProject ? (
            <input
              style={{ ...S.input, fontSize: 14, fontWeight: 700, padding: "4px 8px", marginTop: 2 }}
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              onBlur={() => setEditingProject(false)}
              onKeyDown={e => e.key === "Enter" && setEditingProject(false)}
              autoFocus
            />
          ) : (
            <div style={{ fontSize: 13, color: TXT2, marginTop: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              onClick={() => setEditingProject(true)} title="Tap to edit project name">
              {projectName}
            </div>
          )}
        </div>
        <HeaderRight />
      </div>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

        {/* ── DRAWER ── */}
        <div onClick={() => setDrawer(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 290, opacity: drawer ? 1 : 0, pointerEvents: drawer ? "auto" : "none", transition: "opacity .2s" }} />
        <div role="dialog" aria-label="Menu" aria-hidden={!drawer} style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: 290, maxWidth: "74vw", background: BG2, borderRight: `1px solid ${BD}`,
          zIndex: 300, display: "flex", flexDirection: "column", overflowY: "auto", transform: drawer ? "translateX(0)" : "translateX(-105%)",
          visibility: drawer ? "visible" : "hidden", transition: `transform .22s, visibility 0s linear ${drawer ? "0s" : ".22s"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${SAFE_TOP} 14px 10px 16px`, borderBottom: `1px solid ${BD}`, position: "sticky", top: 0, background: BG2, zIndex: 2, flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Build<span style={{ color: AG }}>Track</span> <span style={{ color: TXT2, fontSize: 12, fontWeight: 600 }}>v{APP_VERSION}</span></div>
            <button onClick={() => setDrawer(false)} aria-label="Close menu" style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${BD}`, background: BG3, color: TXT, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><Icon n="close" /></button>
          </div>

          <div style={{ flexShrink: 0, padding: "8px 0" }}>
            <div style={{ padding: "0 10px" }}>
              <div style={secLbl}>Navigation</div>
              {mainPages.map(p => (
                <button key={p.id} onClick={() => { setPage(p.id); setTradeFilter(""); setDrawer(false); }} style={navItem(page === p.id, AG)}>
                  <Icon n={p.icon} size={26} />
                  <span style={{ flex: 1 }}>{p.label}</span>
                  {p.badge > 0 && <span style={{ background: PK, color: "#000", fontSize: 12, fontWeight: 800, borderRadius: 10, padding: "1px 8px" }}>{p.badge}</span>}
                </button>
              ))}
            </div>

            <div style={{ padding: "0 10px" }}>
              <div style={secLbl}>Trades</div>
              {tradePages.map(p => {
                const trade = p.label;
                const tradeProgress = progress[trade] || 0;
                return (
                  <button key={p.id} onClick={() => { setPage(p.id); setTradeFilter(trade); setDrawer(false); }} style={navItem(page === p.id, PK)}>
                    <Icon n={p.icon} size={26} style={{ color: TRADE_COLORS[trade] }} />
                    <div style={{ flex: 1 }}>
                      <div>{trade}</div>
                      <div style={{ height: 3, borderRadius: 2, background: BD, marginTop: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${tradeProgress}%`, background: tradeProgress === 100 ? AG2 : tradeProgress > 0 ? AG : PK2, borderRadius: 2, transition: "width .5s" }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "0 14px 8px" }}>
              <div style={{ ...secLbl, padding: "12px 0 8px", display: "flex", justifyContent: "space-between" }}><span>Text size</span><span style={{ color: PK }}>{Math.round(zoom * 100)}%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: TXT2, fontWeight: 700 }}>A</span>
                <input type="range" aria-label="Text size" min="0.85" max="1.5" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: AG, height: 32 }} />
                <span style={{ fontSize: 22, color: TXT2, fontWeight: 700 }}>A</span>
              </div>
            </div>
          </div>

          {/* Building Config Section */}
          {sidebarOpen && (
            <div style={{ padding: "8px", borderTop: `1px solid ${BD}`, flexShrink: 0 }}>
              <div style={{ fontFamily: font, fontSize: 14, color: AG, textTransform: "uppercase", letterSpacing: 1, padding: "4px 8px", fontWeight: 700 }}>Building Setup</div>

              {/* FORMAT */}
              <div style={{ padding: "5px 8px" }}>
                <label style={{ fontSize: 13, color: TXT2, fontFamily: font, display: "block", marginBottom: 2 }}>FORMAT</label>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => regenerate({ format: "alpha" })}
                    style={{ ...S.btn(unitFormat === "alpha" ? "primary" : undefined), fontSize: 13, padding: "5px 10px", flex: 1 }}>
                    Alpha (1A, 1B)
                  </button>
                  <button onClick={() => regenerate({ format: "numeric" })}
                    style={{ ...S.btn(unitFormat === "numeric" ? "primary" : undefined), fontSize: 13, padding: "5px 10px", flex: 1 }}>
                    Numeric (101)
                  </button>
                </div>
              </div>

              {/* FLOORS + UNITS PER FLOOR side by side */}
              <div style={{ display: "flex", gap: 4, padding: "5px 8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, color: TXT2, fontFamily: font, display: "block", marginBottom: 2 }}>FLOORS</label>
                  <select style={{ ...S.select, padding: "3px 4px", fontSize: 14, width: "100%" }}
                    value={floorCount} onChange={e => regenerate({ floors: parseInt(e.target.value) })}>
                    {Array.from({ length: 60 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, color: TXT2, fontFamily: font, display: "block", marginBottom: 2 }}>PER FLOOR</label>
                  <select style={{ ...S.select, padding: "3px 4px", fontSize: 14, width: "100%" }}
                    value={perFloor} onChange={e => regenerate({ perFloor: parseInt(e.target.value) })}>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              {/* TOTAL */}
              <div style={{ padding: "3px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: font, fontSize: 10, color: PK, background: PK + "15", padding: "3px 6px", borderRadius: 3, border: `1px solid ${PK}30` }}>
                  {floorCount} x {perFloor} = <strong>{floorCount * perFloor} units</strong>
                  <span style={{ marginLeft: 6, fontSize: 8, color: AG, opacity: 0.8 }}>
                    ({unitFormat === "alpha" ? `1A-${floorCount}${getLetterLabel(perFloor - 1)}` : `101-${floorCount}${String(perFloor).padStart(2, "0")}`})
                  </span>
                </div>
              </div>

              {/* COMMON AREAS WITH ITEM CHECKBOXES */}
              <div style={{ padding: "5px 8px", borderTop: `1px solid ${BD}`, marginTop: 6 }}>
                <div style={{ fontFamily: font, fontSize: 14, color: PK, textTransform: "uppercase", letterSpacing: 1, padding: "4px 0 2px", fontWeight: 700 }}>
                  Common Areas
                </div>

                {areaList.map(area => (
                  <div key={area.id} style={{ marginBottom: 5, padding: "3px 0", borderBottom: `1px solid ${BD}20` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                      <input type="checkbox" checked={showAreas[area.id] !== false}
                        onChange={e => setShowAreas({ ...showAreas, [area.id]: e.target.checked })}
                        style={{ accentColor: AG, width: 12, height: 12 }} />
                      <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}><Icon n={areaIconKey(area.icon)} /> {area.label}</span>
                      <button style={{ background: "none", border: "none", color: PK2, cursor: "pointer", fontSize: 9 }}
                        onClick={() => { if (confirm(`Remove ${area.label}?`)) setAreaList(areaList.filter(a => a.id !== area.id)); }}>x</button>
                    </div>
                    <div style={{ paddingLeft: 10 }}>
                      {area.items.map(item => {
                        const col = getTradeColor(commonAreas[`${area.id}-${item}`]?.status || "Pending");
                        const enabled = isItemEnabled(area.id, item);
                        const isElev = area.id === "elev";
                        return (
                          <div key={item} style={{ marginBottom: isElev ? 4 : 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <input type="checkbox" checked={enabled} onChange={() => toggleItem(area.id, item)}
                                style={{ accentColor: col === "#FFFFFF" ? "#999" : col, width: 11, height: 11 }} />
                              <div style={{ width: 7, height: 7, borderRadius: 2, background: col, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, flex: 1, opacity: enabled ? 1 : 0.4 }}>{item}</span>
                              <button style={{ background: "none", border: "none", color: TXT2, cursor: "pointer", fontSize: 8 }}
                                onClick={() => setAreaList(areaList.map(a => a.id === area.id ? { ...a, items: a.items.filter(i => i !== item) } : a))}>x</button>
                            </div>
                            {/* Elevator floor selector + stuck toggle */}
                            {isElev && enabled && (
                              <div style={{ display: "flex", gap: 3, paddingLeft: 18, marginTop: 2, alignItems: "center" }}>
                                <span style={{ fontSize: 8, color: TXT2 }}>Floor:</span>
                                <select style={{ ...S.select, fontSize: 8, padding: "1px 3px", width: 42 }}
                                  value={getElevFloor(item)} onChange={e => setElevFloor(item, parseInt(e.target.value))}>
                                  {Array.from({ length: floorCount }, (_, i) => i + 1).map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <button style={{
                                  fontSize: 7, padding: "1px 4px", borderRadius: 3, border: "none", cursor: "pointer", fontWeight: 700,
                                  background: isElevStuck(item) ? "#ef5350" : BD, color: isElevStuck(item) ? "#FF0" : TXT2,
                                }} onClick={() => toggleElevStuck(item)}>
                                  {isElevStuck(item) ? "STUCK" : "OK"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {sidebarAddItem === area.id ? (
                        <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                          <input style={{ ...S.input, fontSize: 9, padding: "2px 4px" }} value={sidebarNewItem}
                            onChange={e => setSidebarNewItem(e.target.value)} placeholder="Item..."
                            onKeyDown={e => { if (e.key === "Enter" && sidebarNewItem.trim()) { setAreaList(areaList.map(a => a.id === area.id ? { ...a, items: [...a.items, sidebarNewItem.trim()] } : a)); setSidebarNewItem(""); setSidebarAddItem(null); }}} autoFocus />
                          <button style={{ ...S.btn("primary"), fontSize: 8, padding: "2px 4px" }}
                            onClick={() => { if (sidebarNewItem.trim()) { setAreaList(areaList.map(a => a.id === area.id ? { ...a, items: [...a.items, sidebarNewItem.trim()] } : a)); setSidebarNewItem(""); setSidebarAddItem(null); }}}>+</button>
                        </div>
                      ) : (
                        <button style={{ background: "none", border: "none", color: AG, cursor: "pointer", fontSize: 12, padding: "2px 0" }}
                          onClick={() => { setSidebarAddItem(area.id); setSidebarNewItem(""); }}>+ add item</button>
                      )}
                    </div>
                  </div>
                ))}

                <button style={{ ...S.btn(), fontSize: 13, padding: "5px 8px", width: "100%", marginTop: 3 }}
                  onClick={() => { const nm = prompt("New area name:"); if (nm?.trim()) { const id = nm.trim().toLowerCase().replace(/\s+/g,"_").slice(0,8)+"_"+Date.now(); setAreaList([...areaList, { id, label: nm.trim(), icon: "wrench", items: [] }]); setShowAreas({...showAreas,[id]:true}); }}}>+ Add Area</button>
                <button style={{ ...S.btn(), fontSize: 13, padding: "5px 8px", width: "100%", marginTop: 3 }}
                  onClick={() => { setPage("common"); setTradeFilter(""); }}>Full Editor <Icon n="arrowright" /></button>
              </div>
              <div style={{ padding: "8px", borderTop: `1px solid ${BD}`, marginTop: 6 }}>
                <div style={{ fontFamily: font, fontSize: 14, color: AG, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>Project Data</div>
                <div style={{ fontSize: 11, color: demoMode ? PK3 : TXT2, marginBottom: 6 }}>
                  {demoMode ? "Demo data (random names & statuses)" : "Live project data"}{saveStatus ? ` • ${saveStatus}` : ""}
                </div>
                <button style={{ ...S.btn(demoMode ? "primary" : undefined), fontSize: 12, padding: "5px 8px", width: "100%", marginBottom: 4 }} onClick={startBlank}>Start Blank Project</button>
                <button style={{ ...S.btn(), fontSize: 12, padding: "5px 8px", width: "100%", marginBottom: 4 }} onClick={exportBackup}><Icon n="download" /> Export Backup</button>
                <button style={{ ...S.btn(), fontSize: 12, padding: "5px 8px", width: "100%" }} onClick={() => importRef.current?.click()}><Icon n="upload" /> Import Backup</button>
                <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={importBackup} />
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, minWidth: 0, padding: "16px 16px calc(24px + env(safe-area-inset-bottom, 0px))", overflow: "auto" }}>

        {demoMode && (
          <div style={{ background: PK3 + "22", border: `1px solid ${PK3}`, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span><Icon n="alert" /> You're looking at <strong>demo data</strong> — names, statuses and dates are randomly generated.</span>
            <button style={{ ...S.btn("primary"), fontSize: 11, padding: "4px 10px" }} onClick={startBlank}>Start Blank Project</button>
          </div>
        )}

        {/* Dashboard */}
        {page === "dashboard" && (
          <div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
              {[
                { label: "Total Units", value: units.length, color: PK },
                { label: "Pending", value: units.filter(u => unitBucket(u) === "Pending").length, color: "#FFFFFF" },
                { label: "Started", value: units.filter(u => unitBucket(u) === "Started").length, color: "#ef5350" },
                { label: "In Progress", value: units.filter(u => unitBucket(u) === "In Progress").length, color: "#F1C40F" },
                { label: "Completed", value: units.filter(u => unitBucket(u) === "Complete").length, color: "#66bb6a" },
                { label: "Vacant", value: units.filter(u => unitBucket(u) === "Vacant").length, color: "#FF8C00" },
                { label: "Access Issues", value: units.filter(u => Object.values(u.trades).some(t => t.accessDenied && t.scheduled)).length, color: "#ef5350" },
              ].map(stat => (
                <div key={stat.label} style={{ ...S.card, textAlign: "center", padding: "8px 14px", marginBottom: 0, minWidth: 92, flexShrink: 0 }}>
                  <div style={{ fontFamily: font, fontSize: 26, fontWeight: 800, lineHeight: 1.1, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: TXT2, textTransform: "uppercase", fontFamily: font, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Unit Map</div>
              <Legend />
              <UnitGrid units={units} onSelect={setSelectedUnit} selectedId={selectedUnit?.id} tradeFilter={tradeFilter} commonAreas={commonAreas} setCommonAreas={setCommonAreas} areaList={areaList} showAreas={showAreas} isItemEnabled={isItemEnabled} elevatorFloors={elevatorFloors} elevatorStuck={elevatorStuck} setElevFloor={setElevFloor} toggleElevStuck={toggleElevStuck} floorCount={floorCount} ticketInfo={ticketInfo} />
            </div>

            <TicketsPanel tickets={tickets} connected={!!ticketCfg.url} onOpen={() => setPage("tickets")} />
          </div>
        )}

        {/* Trade Pages */}
        {page.startsWith("trade-") && (
          <div>
            <h2 style={{ fontFamily: font, color: AG, marginTop: 0, fontSize: 16 }}>{tradeFilter} — TRADE VIEW</h2>
            <Legend />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginBottom: 16 }}>
              {["Pending", "Started", "In Progress", "Complete"].map(status => {
                const count = units.filter(u => u.trades[tradeFilter]?.status === status).length;
                return (
                  <div key={status} style={{ ...S.card, textAlign: "center" }}>
                    <div style={{ fontFamily: font, fontSize: 36, fontWeight: 800, color: getTradeColor(status) }}>{count}</div>
                    <div style={{ fontSize: 11, color: TXT2, fontFamily: font }}>{status}</div>
                  </div>
                );
              })}
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Schedule: {tradeFilter}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={S.progressBar()}>
                  <div style={S.progressFill(progress[tradeFilter] || 0, AG)} />
                </div>
                <span style={{ fontFamily: font, fontSize: 12 }}>{progress[tradeFilter] || 0}%</span>
              </div>
              <div style={{ fontSize: 12, color: TXT2, marginTop: 6 }}>
                {formatDate(schedule[tradeFilter]?.start)} – {formatDate(schedule[tradeFilter]?.end)} · progress is calculated from unit statuses
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                <label style={{ fontSize: 11, color: TXT2 }}>Start</label>
                <input type="date" style={{ ...S.input, width: 150 }} value={schedule[tradeFilter]?.start || ""}
                  onChange={e => setSchedule(s => ({ ...s, [tradeFilter]: { ...s[tradeFilter], start: e.target.value } }))} />
                <label style={{ fontSize: 11, color: TXT2 }}>End</label>
                <input type="date" style={{ ...S.input, width: 150 }} value={schedule[tradeFilter]?.end || ""}
                  onChange={e => setSchedule(s => ({ ...s, [tradeFilter]: { ...s[tradeFilter], end: e.target.value } }))} />
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>{tradeFilter} Unit Map</div>
              <UnitGrid units={units} onSelect={setSelectedUnit} selectedId={selectedUnit?.id} tradeFilter={tradeFilter} commonAreas={commonAreas} setCommonAreas={setCommonAreas} areaList={areaList} showAreas={showAreas} isItemEnabled={isItemEnabled} elevatorFloors={elevatorFloors} elevatorStuck={elevatorStuck} setElevFloor={setElevFloor} toggleElevStuck={toggleElevStuck} floorCount={floorCount} ticketInfo={ticketInfo} />
            </div>
          </div>
        )}

        {page === "tickets" && <TicketsView tickets={tickets} units={units} onChange={updateTicket} onCreate={createTicket} onOpenUnit={setSelectedUnit} cfg={ticketCfg} onSaveCfg={saveTicketCfg} projectName={projectName} syncState={syncState} onSync={() => syncRef.current && syncRef.current()} prefill={ticketPrefill} onPrefillUsed={() => setTicketPrefill(null)} />}
        {page === "schedule" && <ScheduleView schedule={schedule} units={units} progress={progress} />}
        {page === "field" && <FieldMonitor units={units} events={events} setEvents={setEvents} />}
        {page === "common" && <CommonAreasView commonAreas={commonAreas} setCommonAreas={setCommonAreas} areaList={areaList} setAreaList={setAreaList} />}
        {page === "notices" && <BulkNotices units={units} setUnits={setUnits} projectName={projectName} />}

        </div>
      </div>

      {selectedUnit && <UnitModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} onUpdate={updateUnit} projectName={projectName} tickets={tickets} onTicketChange={updateTicket} onNewTicket={(label) => { setSelectedUnit(null); setPage("tickets"); setTicketPrefill(label); }} />}
    </div>
  );
}

function Root() {
  const [state, setState] = useState({ loaded: false, saved: null, cfg: null });
  useEffect(() => {
    if ("serviceWorker" in navigator && /^https?:/.test(window.location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    const h = () => window.location.reload();
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  useEffect(() => {
    let alive = true;
    try { navigator.storage?.persist?.(); } catch (e) {}
    Promise.all([idb.get("state").catch(() => null), idb.get("ticketApi").catch(() => null)])
      .then(([s, cfg]) => { if (alive) setState({ loaded: true, saved: s || null, cfg: cfg || null }); });
    return () => { alive = false; };
  }, []);
  if (!state.loaded) return <div style={{ color: TXT2, fontFamily: font, padding: 40 }}>Loading BuildTrack…</div>;
  return <App saved={state.saved} savedCfg={state.cfg} />;
}

createRoot(document.getElementById("root")).render(<Root />);
