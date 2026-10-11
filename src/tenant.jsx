import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { APP_VERSION, font, fontSans, AG, AG2, PK, PK2, PK3, BG1, BG2, BG3, BD, TXT, TXT2, SAFE_TOP, S, Icon, SvgIcon, LEGACY_ICON, areaIconKey, GlobalStyle, compressImage, TICKET_STATUSES, TICKET_COLORS, URGENT_RX, CATEGORY_RULES, classifyTicket, ticketAge, ticketCall } from "./shared.jsx";

// ▸ Tenant-facing request page (opened from the shared link: …#request?api=…)
const TenantRequest = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator && /^https?:/.test(window.location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
  }, []);
  useEffect(() => { document.title = "Client Portal"; }, []);
  const params = new URLSearchParams(window.location.hash.replace(/^#request[?&]?/, ""));
  const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  // The link carries the server + building name; remember them so the installed app (which opens without the link) still works.
  const apiUrl = params.get("api") || lsGet("bt_api", "");
  const building = params.get("b") || lsGet("bt_building", "") || "Building Maintenance";
  if (params.get("api")) { lsSet("bt_api", params.get("api")); lsSet("bt_building", params.get("b") || ""); }
  const me = lsGet("bt_tenant", {});
  const [f, setF] = useState({ unit: me.unit || "", name: me.name || "", phone: me.phone || "", description: "", urgent: false, enter: me.enter ?? true, website: "" });
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [mine, setMine] = useState(() => lsGet("bt_tickets", []));
  const [lookup, setLookup] = useState({ id: "", unit: me.unit || "", result: null, err: "", busy: false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const inp = { ...S.input, fontSize: 16, padding: "12px 14px" };
  const lbl = { display: "block", fontSize: 13, fontWeight: 700, color: TXT2, marginBottom: 6, marginTop: 14, fontFamily: font, letterSpacing: 1, textTransform: "uppercase" };

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    try { setPhoto(await compressImage(file, 1024, 0.6)); } catch (x) { setErr("That photo couldn't be read. Try another."); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.unit.trim()) return setErr("Please enter your unit number.");
    if (!f.name.trim()) return setErr("Please enter your name.");
    if (!f.phone.trim()) return setErr("Please enter a phone number so we can reach you.");
    if (f.description.trim().length < 5) return setErr("Please describe the problem.");
    setBusy(true);
    try {
      const c = classifyTicket(f.description);
      const res = await ticketCall({ url: apiUrl }, "POST", "/tickets", {
        unit: f.unit, name: f.name, phone: f.phone, description: f.description, photo,
        category: c.category, priority: (f.urgent || c.urgent) ? "Urgent" : "Normal",
        permissionToEnter: f.enter, website: f.website,
      });
      lsSet("bt_tenant", { unit: f.unit, name: f.name, phone: f.phone, enter: f.enter });
      const list = [{ id: res.id, unit: f.unit.trim().toUpperCase(), at: Date.now() }, ...mine].slice(0, 10);
      setMine(list); lsSet("bt_tickets", list);
      setDone({ id: res.id, urgent: f.urgent || c.urgent });
      setF({ ...f, description: "", urgent: false }); setPhoto("");
    } catch (x) { setErr(x.message || "Something went wrong. Please try again or call the office."); }
    setBusy(false);
  };

  const check = async (id, unit) => {
    setLookup(l => ({ ...l, busy: true, err: "", result: null, id, unit }));
    try {
      const r = await ticketCall({ url: apiUrl }, "GET", `/status?id=${encodeURIComponent(id.trim().toUpperCase())}&unit=${encodeURIComponent(unit.trim())}`);
      setLookup(l => ({ ...l, busy: false, result: r }));
    } catch (x) { setLookup(l => ({ ...l, busy: false, err: x.message })); }
  };

  const shell = (children) => (
    <div style={{ minHeight: "100vh", background: BG1, color: TXT, fontFamily: fontSans, display: "flex", justifyContent: "center", padding: "0 16px 60px" }}>
      <GlobalStyle />
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: `${SAFE_TOP} 2px 14px` }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: AG + "26", color: AG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}><Icon n="wrench" /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>Client Portal</div>
            <div style={{ fontSize: 13, color: TXT2, marginTop: 2 }}>{building}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (!apiUrl) return shell(<div style={{ ...S.card, marginTop: 20 }}>This request link isn't set up yet. Please contact the building office to report a problem.</div>);

  if (done) return shell(
    <div>
      <div style={{ ...S.card, marginTop: 20, textAlign: "center", borderColor: "#66bb6a" }}>
        <div style={{ fontSize: 40, color: AG2 }}><Icon n="check" /></div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>Request received</div>
        <div style={{ fontFamily: font, fontSize: 30, fontWeight: 800, color: AG, margin: "10px 0" }}>{done.id}</div>
        <div style={{ color: TXT2, fontSize: 14 }}>Keep this number. Use it with your unit to check the status of your request.</div>
        {done.urgent && <div style={{ marginTop: 12, fontSize: 14, color: PK3 }}>Marked urgent. If it gets dangerous, call the office or 911.</div>}
      </div>
      <button style={{ ...S.btn("primary"), width: "100%", padding: 14, fontSize: 14, marginTop: 8 }} onClick={() => setDone(null)}>Report another problem</button>
    </div>
  );

  return shell(
    <div>
      <div style={{ background: "#ef535022", border: "1px solid #ef5350", borderRadius: 8, padding: "10px 12px", margin: "14px 0 4px", fontSize: 14, lineHeight: 1.4 }}>
        <Icon n="alert" style={{ color: PK2 }} /> <strong>Smell gas, see fire or smoke, or have sparks?</strong> Leave the apartment and call <strong>911</strong> first. Don't use this form.
      </div>
      <form onSubmit={submit} style={{ ...S.card, marginTop: 10 }}>
        <label style={{ ...lbl, marginTop: 0 }}>Unit number *</label>
        <input style={inp} value={f.unit} onChange={set("unit")} placeholder="e.g. 3B" autoCapitalize="characters" autoComplete="off" maxLength={12} />
        <label style={lbl}>Your name *</label>
        <input style={inp} value={f.name} onChange={set("name")} autoComplete="name" maxLength={80} />
        <label style={lbl}>Phone *</label>
        <input style={inp} value={f.phone} onChange={set("phone")} type="tel" autoComplete="tel" maxLength={40} />
        <label style={lbl}>What's the problem? *</label>
        <textarea style={{ ...inp, minHeight: 110, resize: "vertical" }} value={f.description} onChange={set("description")} placeholder="Tell us what's wrong and where (kitchen sink, bedroom outlet…)" maxLength={2000} />
        <label style={lbl}>Photo (optional)</label>
        {photo ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img src={photo} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: `1px solid ${BD}` }} />
            <button type="button" style={S.btn()} onClick={() => setPhoto("")}>Remove</button>
          </div>
        ) : (
          <input type="file" accept="image/*" onChange={pickPhoto} style={{ fontSize: 14, color: TXT2 }} />
        )}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={f.urgent} onChange={set("urgent")} style={{ width: 20, height: 20, marginTop: 1 }} />
          <span><strong>This is an emergency</strong> (active flooding, no heat, no power)</span>
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={f.enter} onChange={set("enter")} style={{ width: 20, height: 20, marginTop: 1 }} />
          <span>OK to enter if I'm not home</span>
        </label>
        <input value={f.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, opacity: 0, height: 0 }} />
        {err && <div style={{ marginTop: 14, color: "#FF8C8C", fontSize: 14 }}><Icon n="alert" /> {err}</div>}
        <button type="submit" disabled={busy} style={{ ...S.btn("primary"), width: "100%", padding: 16, fontSize: 15, marginTop: 18, opacity: busy ? 0.6 : 1 }}>{busy ? "Sending…" : "Submit request"}</button>
      </form>

      <div style={{ ...S.card, marginTop: 14 }}>
        <div style={S.cardTitle}>Check a request</div>
        {mine.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {mine.map(t => <button key={t.id + t.at} type="button" style={{ ...S.btn(), fontSize: 12 }} onClick={() => check(t.id, t.unit)}>{t.id}</button>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} placeholder="Ticket # (T-1001)" value={lookup.id} onChange={e => setLookup({ ...lookup, id: e.target.value })} />
          <input style={{ ...inp, width: 90 }} placeholder="Unit" value={lookup.unit} onChange={e => setLookup({ ...lookup, unit: e.target.value })} />
        </div>
        <button type="button" style={{ ...S.btn(), width: "100%", marginTop: 8, padding: 12 }} disabled={lookup.busy || !lookup.id || !lookup.unit} onClick={() => check(lookup.id, lookup.unit)}>{lookup.busy ? "Checking…" : "Check status"}</button>
        {lookup.err && <div style={{ marginTop: 10, color: "#FF8C8C", fontSize: 14 }}>{lookup.err}</div>}
        {lookup.result && (
          <div style={{ marginTop: 10, fontSize: 15 }}>
            <strong>{lookup.result.id}</strong> · <span style={{ color: TICKET_COLORS[lookup.result.status] || AG, fontWeight: 700 }}>{lookup.result.status}</span>
            <div style={{ color: TXT2, fontSize: 13, marginTop: 2 }}>{lookup.result.category} · updated {ticketAge(lookup.result.updatedAt)}</div>
          </div>
        )}
      </div>
    </div>
  );
};


createRoot(document.getElementById("root")).render(<TenantRequest />);
