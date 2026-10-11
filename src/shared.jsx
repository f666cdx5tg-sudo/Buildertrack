import React from "react";
import { ICONS } from "./icons.js";

export const APP_VERSION = "3.1.45";

// ─── STYLES ─────────────────────────────────────────────────────────────────
export const font = "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const fontSans = font;

// BuildersPro palette: near-black cards, blue accent, amber secondary
export const AG = "#0A84FF";   // accent (blue)
export const AG2 = "#66bb6a";  // success green
export const PK = "#FFAA33";   // accent 2 (amber): section labels, highlights
export const PK2 = "#ef5350";  // red
export const PK3 = "#FFAA33";  // warning amber
export const BG1 = "#0f0f0f";  // app background
export const BG2 = "#1a1a1a";  // card
export const BG3 = "#222222";  // raised / fields
export const BD = "#2a2a2a";   // borders
export const TXT = "#f0f0f0";  // text
export const TXT2 = "#9e9e9e"; // muted text
export const SAFE_TOP = "calc(max(env(safe-area-inset-top, 14px), 14px) + 10px)";

export const S = {
  app: { fontFamily: fontSans, background: BG1, color: TXT, minHeight: "100vh", display: "flex", flexDirection: "column" },
  navBtn: (active) => ({ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${active ? PK : BD}`, background: active ? PK + "1f" : "transparent", color: active ? PK : TXT2, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: font }),
  page: { flex: 1, padding: 16, maxWidth: 1400, margin: "0 auto", width: "100%" },
  card: { background: BG2, border: `1px solid ${BD}`, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontFamily: font, fontSize: 13, fontWeight: 700, color: PK, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 4 },
  unitCell: (color, selected) => ({ width: "100%", aspectRatio: "1", borderRadius: 6, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontFamily: font, fontWeight: 700, color: "#000", cursor: "pointer", border: selected ? `2px solid #FFF` : "2px solid transparent", opacity: 0.9, transition: "all .15s", position: "relative" }),
  badge: { position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%", background: PK2, border: `1px solid ${BG2}` },
  input: { background: BG3, border: `1px solid ${BD}`, borderRadius: 10, padding: "12px 14px", color: TXT, fontSize: 16, fontFamily: fontSans, width: "100%", boxSizing: "border-box", outline: "none" },
  select: { background: BG3, border: `1px solid ${BD}`, borderRadius: 10, padding: "12px 14px", color: TXT, fontSize: 16, fontFamily: fontSans },
  btn: (variant) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 18px", borderRadius: 12, border: variant ? "none" : `1px solid ${BD}`, fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "opacity .15s", ...(variant === "primary" ? { background: AG, color: "#000" } : variant === "danger" ? { background: PK2, color: "#FFF" } : variant === "success" ? { background: AG2, color: "#000" } : { background: BG3, color: TXT }) }),
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, padding: `${SAFE_TOP} 0 0` },
  modalInner: { background: BG2, border: `1px solid ${BD}`, borderBottom: "none", borderRadius: "20px 20px 0 0", maxWidth: 800, width: "100%", maxHeight: "100%", overflow: "auto", padding: "20px 18px calc(24px + env(safe-area-inset-bottom, 0px))" },
  tag: (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 800, fontFamily: font, background: color + "26", color: color }),
  progressBar: (pct, color) => ({ height: 8, borderRadius: 4, background: BD, position: "relative", overflow: "hidden", flex: 1, }),
  progressFill: (pct, color) => ({ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: 4, transition: "width .5s ease" }),
  tab: (active) => ({ padding: "9px 14px", color: active ? PK : TXT2, cursor: "pointer", fontSize: 14, fontWeight: 700, background: active ? PK + "1f" : "transparent", border: `1.5px solid ${active ? PK : BD}`, borderRadius: 10, fontFamily: fontSans }),
  legend: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12, alignItems: "center" },
  legendItem: (color) => ({ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: TXT2 }),
  legendDot: (color) => ({ width: 12, height: 12, borderRadius: 3, background: color }),
  textarea: { background: BG3, border: `1px solid ${BD}`, borderRadius: 10, padding: "12px 14px", color: TXT, fontSize: 16, fontFamily: fontSans, width: "100%", boxSizing: "border-box", minHeight: 80, resize: "vertical", outline: "none" },
  fieldRow: { display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" },
  label: { fontSize: 12, color: TXT2, fontWeight: 700, marginBottom: 6, display: "block", fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em" },
};

// ─── ICONS (monoline, same set as BuildersPro) ───
export const Icon = ({ n, size, style }) => ICONS[n]
  ? <svg className="bt-ic" viewBox="0 0 24 24" aria-hidden="true" style={size || style ? { ...(size ? { width: size, height: size } : {}), ...style } : undefined} dangerouslySetInnerHTML={{ __html: ICONS[n] }} />
  : null;
// Same icon inside an <svg> (the building map)
export const SvgIcon = ({ n, x, y, size = 18, color = "currentColor" }) => ICONS[n]
  ? <g className="bt-ic-g" transform={`translate(${x} ${y}) scale(${size / 24})`} fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ color, pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: ICONS[n] }} />
  : null;
// Saved projects from older versions stored emoji for common-area icons; map them to icon names.
export const LEGACY_ICON = { "\u{1F6D7}":"elevator", "\u{1F3D7}":"roof", "\u{1F527}":"wrench", "\u{1F333}":"tree", "\u{1F6BF}":"shower", "\u26A1":"bolt", "\u{1F525}":"flame", "\u2744":"snow", "\u{1F6AA}":"door", "\u{1F3E0}":"home", "\u{1F4E6}":"box", "\u{1F17F}":"parking", "\u{1F5D1}":"trash", "\u{1F4A1}":"bulb", "\u{1F528}":"hammer" };
export const areaIconKey = (ic) => ICONS[ic] ? ic : LEGACY_ICON[String(ic || "").replace(/\uFE0F/g, "")] || "building";
export const GlobalStyle = () => <style>{`
html,body{margin:0;background:${BG1};-webkit-text-size-adjust:100%}
*{-webkit-tap-highlight-color:transparent}
button,input,select,textarea{font-family:inherit}
input:focus,select:focus,textarea:focus{border-color:${AG} !important}
button:active{opacity:.8}
a{color:inherit}
.bt-ic{width:1.18em;height:1.18em;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;vertical-align:-0.2em;flex-shrink:0}
.bt-ic .f,.bt-ic-g .f{fill:currentColor;stroke:none}
@media (max-width:640px){.bt-wide{display:none}}
`}</style>;



export const compressImage = (file, maxDim = 1280, quality = 0.72) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    resolve(c.toDataURL("image/jpeg", quality));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable image")); };
  img.src = url;
});

// ─── WORK TICKETS ───────────────────────────────────────────────────────────
export const TICKET_STATUSES = ["New", "Assigned", "In Progress", "Done"];
export const TICKET_COLORS = { "New": "#4ADE80", "Assigned": "#38BDF8", "In Progress": "#FACC15", "Done": "#9e9e9e" };
export const URGENT_RX = /\b(gas|flood\w*|burst|sewage|sewer backup|fire|smoke|spark\w*|shock\w*|carbon monoxide|no heat|no power|collaps\w*|overflow\w*|pouring)\b/i;
export const CATEGORY_RULES = [
  ["Appliances", /\b(refrigerator|fridge|freezer|stove|oven|range|cooktop|dishwasher|washer|washing machine|dryer|microwave|appliance\w*|garbage disposal|disposal)\b/i],
  ["Electrical", /\b(outlet|electric\w*|power|breaker|fuse|wiring|switch|light\w*|bulb|spark\w*|buzz\w*|socket)\b/i],
  ["Heating", /\b(heat|heater|heating|radiator|boiler|steam|thermostat)\b/i],
  ["Cooling", /\b(a\/c|ac|air ?con\w*|cooling|too hot|fan)\b/i],
  ["Windows", /\b(window\w*|glass|screen|draft\w*|pane)\b/i],
  ["Tiling", /\b(tile\w*|grout)\b/i],
  ["Painting", /\b(paint\w*|peeling|plaster)\b/i],
  ["Plumbing", /\b(leak\w*|faucet|toilet|sink|drain\w*|clog\w*|pipe\w*|water|shower|tub|bath\w*|sewage|sewer|flood\w*|plumb\w*|drip\w*)\b/i],
  ["Carpentry", /\b(door|cabinet\w*|floor\w*|closet|shelf|shelves|hinge\w*|lock|wood\w*|baseboard|trim)\b/i],
];
export const classifyTicket = (text) => {
  const hit = CATEGORY_RULES.find(([, rx]) => rx.test(text));
  return { category: hit ? hit[0] : "Minor Repairs", urgent: URGENT_RX.test(text) };
};
export const ticketAge = (ms) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export const ticketCall = async (cfg, method, path, body, auth) => {
  const base = String(cfg.url || "").replace(/\/+$/, "");
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(base + path, {
      method, signal: ctl.signal,
      headers: { "Content-Type": "application/json", ...(auth && cfg.key ? { Authorization: "Bearer " + cfg.key } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
    return j;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("The server took too long to answer.");
    if (e instanceof TypeError) throw new Error("Can't reach the server. Check your connection.");
    throw e;
  } finally { clearTimeout(to); }
};

