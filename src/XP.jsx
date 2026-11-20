// /demo/xp: how XP works. Two halves: Participate (Frame mints, details to come) and Use (playing the protocol).
import { useEffect } from "react";

const USE_STATS = [
  ["Weeks", "25", "Every week for 25 weeks"],
  ["Every week", "10,000,000 XP", "Split across all entries"],
  ["Value", "No cash value", "A non-transferable loyalty point"],
  ["In total", "250,000,000 XP", "Across all 25 weeks"],
];
// Participants: XP for each Frame mint (250,000,000 in total).
const PART_STATS = [
  ["Gold Frame", "25,000,000 XP", "1,000 Frames · 25,000 XP each"],
  ["Silver Frame", "100,000,000 XP", "Details coming soon"],
  ["Bronze Frame", "100,000,000 XP", "Details coming soon"],
  ["Surprise", "25,000,000 XP", "Details coming soon"],
];
const PART_ROWS = [["Gold Frame", "25,000,000", "1,000", "25,000"], ["Silver Frame", "100,000,000", "Soon", "Soon"], ["Bronze Frame", "100,000,000", "Soon", "Soon"], ["Surprise", "25,000,000", "Soon", "Soon"]];
const WEEKS = [["10,000", "1,000"], ["100,000", "100"], ["1,000,000", "10"]];

export default function XP() {
  useEffect(() => { document.title = "How XP Works · 1-Earth"; }, []);
  return (
    <div className="xp">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Demo · details may change</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>

      <main className="xp-main">
        <section className="xp-head">
          <h1 className="rp-grad">XP: Participants &amp; Users</h1>
          <p>Earn XP by Participating in the Frame Mints and Using the Protocol.</p>
          <span className="xp-supply"><b>Fixed supply:</b> 500,000,000 XP total, forever</span>
        </section>

        <div className="xp-halves">
          {/* ---------- Participate: Frame mint participants (details to come) ---------- */}
          <section className="xp-half">
            <div className="xp-half-head"><h2>Frame Mint</h2><span className="xp-tag">Participants</span></div>
            <div className="xp-grid4">
              {PART_STATS.map(([l, v, sub]) => <div key={l} className="xp-stat"><span className="xp-lbl">{l}</span><b>{v}</b><small>{sub}</small></div>)}
            </div>
            <div className="xp-use-row xp-use-row--one">
              <div className="xp-card xp-table">
                <h3>XP per Frame, by mint</h3>
                <table><thead><tr><th>Frame mint</th><th>Total XP</th><th>Frames</th><th>XP per Frame</th></tr></thead>
                  <tbody>{PART_ROWS.map(([t, total, n, v]) => <tr key={t}><td>{t}</td><td>{total}</td><td className={n === "Soon" ? "xp-soon-v" : ""}>{n}</td><td className={v === "Soon" ? "g xp-soon-v" : "g"}>{v}</td></tr>)}</tbody></table>
                <p className="xp-table-foot"><b>Every Frame counts.</b> Each mint’s XP is split evenly across its Frames.</p>
              </div>
            </div>
            <p className="xp-note">250,000,000 XP in total for participants across all four mints. Details for the other mints are coming soon.</p>
          </section>

          {/* ---------- Use: playing the protocol ---------- */}
          <section className="xp-half">
            <div className="xp-half-head"><h2>Protocol</h2><span className="xp-tag">Users</span></div>
            <div className="xp-grid4">
              {USE_STATS.map(([l, v, s]) => <div key={l} className="xp-stat"><span className="xp-lbl">{l}</span><b>{v}</b><small>{s}</small></div>)}
            </div>
            <div className="xp-use-row">
              <div className="xp-card xp-formula">
                <h3>How much XP each entry earns</h3>
                <div className="xp-eq"><span>XP per entry</span><i>=</i><div className="xp-frac"><b className="xp-white">10,000,000</b><em>entries that week</em></div></div>
                <p><b>Fewer entries, bigger share.</b> The 10,000,000 XP is the same every week, so earlier weeks pay more XP per entry.</p>
              </div>
              <div className="xp-card xp-table">
                <h3>XP per entry, by week size</h3>
                <table><thead><tr><th>Entries that week</th><th>XP per entry</th></tr></thead>
                  <tbody>{WEEKS.map(([e, x]) => <tr key={e}><td>{e}</td><td className="g">{x}</td></tr>)}</tbody></table>
              </div>
            </div>
            <p className="xp-note">XP is earned whether or not the entry wins a prize. XP is a non-transferable loyalty point with no cash value; it can’t be bought, sold or exchanged for money.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
