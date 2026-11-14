// /demo: an unlisted preview of the 1-Earth protocol's landing page, with sample data.
// Nothing on the site links here, search engines are told not to index it, and it makes no transactions.
import { useEffect, useMemo, useState } from "react";

const PRIZES = [
  ["1st", "160,000"], ["2nd", "80,000"], ["3rd", "40,000"],
  ["4th", "32,500"], ["5th", "17,500"], ["6th to 10th", "13,000"],
  ["11th to 20th", "6,500"], ["21st to 40th", "3,250"], ["41st to 100th", "1,250"],
  ["101st to 250th", "1,000"], ["251st to 500th", "500"], ["501st to 1000th", "250"],
];
// "Live" shows the same split scaled to a sample of tickets sold so far.
const LIVE_SCALE = 0.42;
const START = 48 * 3600 + 12 * 60 + 55; // the sample countdown starts at 48:12:55

const two = (n) => String(n).padStart(2, "0");
const fmt = (s) => Number(s.replace(/,/g, "")).toLocaleString("en-US");

export default function Demo() {
  const [left, setLeft] = useState(START);
  const [view, setView] = useState("projected");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    document.title = "1-Earth · Demo";
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : START)), 1000);
    return () => { clearInterval(id); m.remove(); };
  }, []);

  const h = Math.floor(left / 3600), mi = Math.floor((left % 3600) / 60), se = left % 60;
  const prizes = useMemo(() => PRIZES.map(([p, a]) => [p, view === "live"
    ? Math.round(Number(a.replace(/,/g, "")) * LIVE_SCALE).toLocaleString("en-US") : fmt(a)]), [view]);

  const play = () => {
    setNote(`Demo only: no transaction. In the live protocol, this would enter ${qty} ticket${qty > 1 ? "s" : ""} for ${qty * 10} USDC.`);
    setTimeout(() => setNote(""), 4200);
  };

  return (
    <div className="demo">
      <header className="demo-top">
        <div className="demo-brand"><img src="/globe.webp" alt="" width="40" height="40" /><span>1-Earth</span><em className="demo-flag">Demo · sample data</em></div>
        <div className="demo-next">
          <p className="demo-grad">Next Drawing</p>
          <div className="demo-cd">
            <div><b>{two(h)}</b><span>Hours</span></div>
            <div><b>{two(mi)}</b><span>Minutes</span></div>
            <div><b>{two(se)}</b><span>Seconds</span></div>
          </div>
        </div>
        <div className="demo-pills">
          <span className="demo-pill demo-x" aria-label="X">𝕏</span>
          <span className="demo-pill">0 <small>XP</small></span>
          <span className="demo-pill"><i className="demo-dot" />7Gx4…Qm2P</span>
        </div>
      </header>

      <section className="demo-hero">
        <div className="demo-globe">
          <img src="/globe.webp" alt="" />
          <p>Prize Pool 1,000,000 <small>USDC</small></p>
        </div>
        <div className="demo-entries"><b>100,000</b><span className="demo-grad">Entries</span></div>
      </section>

      <section className="demo-card demo-dist">
        <div className="demo-dist-head">
          <h2>Prize Distribution</h2>
          <div className="demo-tog" role="tablist">
            <button className={view === "projected" ? "on" : ""} onClick={() => setView("projected")}>Projected</button>
            <button className={view === "live" ? "on" : ""} onClick={() => setView("live")}>Live</button>
          </div>
        </div>
        <div className="demo-grid">
          {prizes.map(([p, a]) => (
            <div className="demo-prize" key={p}><span>{p}</span><b>{a}<small>USDC</small></b></div>
          ))}
        </div>
      </section>

      <div className="demo-row">
        <section className="demo-card demo-enter">
          <h3>Enter</h3>
          <div className="demo-step">
            <span className="demo-lbl">Entries (100 max)</span>
            <div className="demo-step-row">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
              <b>{qty}</b>
              <button onClick={() => setQty((q) => Math.min(100, q + 1))} aria-label="More">+</button>
            </div>
          </div>
          <p className="demo-price"><b>{qty * 10}</b> <small>USDC on SOL</small></p>
          <button className="demo-play" onClick={play}>Play</button>
          <p className="demo-odds">1 in 100 odds</p>
        </section>
        <section className="demo-card demo-mine">
          <h3>My Entries</h3>
          <div className="demo-tix">
            {["#18,984", "#18,985", "#18,986"].map((n) => <span key={n}><img src="/globe.webp" alt="" />{n}</span>)}
          </div>
        </section>
      </div>

      {note && <p className="demo-note" role="status">{note}</p>}

      <footer className="demo-foot">
        <span>© 2026 : 1-Earth</span>
        {["How to Play", "How it Works", "How XP Works", "Past Draws", "Legal", "Support", "Responsible Play", "50/50"].map((l) => <span key={l}>{l}</span>)}
      </footer>
    </div>
  );
}
