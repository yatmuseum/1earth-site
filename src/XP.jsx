// /demo/xp: how XP works. Two halves: Participate (Frame mints, details to come) and Use (playing the protocol).
import { useEffect } from "react";

const USE_STATS = [
  ["Weeks", "25", "Every week for 25 weeks"],
  ["Every week", "10,000,000 XP", "Split across all entries"],
  ["Value", "No cash value", "A non-transferable loyalty point"],
  ["In total", "250,000,000 XP", "Across all 25 weeks"],
];
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
          <h1 className="rp-grad">XP: Participate &amp; Use</h1>
          <p>Earn XP by joining the Frame mints and by playing.</p>
        </section>

        <div className="xp-halves">
          {/* ---------- Participate: Frame mint participants (details to come) ---------- */}
          <section className="xp-half">
            <div className="xp-half-head"><span className="xp-tag">Participate</span><h2>Frame mints</h2></div>
            <div className="xp-grid4">
              {["Gold Frame", "Silver Frame", "Bronze Frame", "Surprise"].map((t) => (
                <div key={t} className="xp-stat"><span className="xp-lbl">{t}</span><b className="xp-tbd">Details soon</b><small>XP for participants</small></div>
              ))}
            </div>
            <div className="xp-card xp-soon">
              <h3>How participants earn XP</h3>
              <p>Every Frame you mint earns XP for your wallet. The full breakdown for each mint is coming soon.</p>
            </div>
          </section>

          {/* ---------- Use: playing the protocol ---------- */}
          <section className="xp-half">
            <div className="xp-half-head"><span className="xp-tag">Use</span><h2>Play the protocol</h2></div>
            <div className="xp-grid4">
              {USE_STATS.map(([l, v, s]) => <div key={l} className="xp-stat"><span className="xp-lbl">{l}</span><b>{v}</b><small>{s}</small></div>)}
            </div>
            <div className="xp-use-row">
              <div className="xp-card xp-formula">
                <h3>How much XP each entry earns</h3>
                <div className="xp-eq"><span>XP per entry</span><i>=</i><div className="xp-frac"><b className="rp-grad">10,000,000</b><em>entries that week</em></div></div>
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
