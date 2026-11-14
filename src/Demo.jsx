// /demo: an unlisted, clickable preview of the 1-Earth protocol with sample data.
// Nothing on the site links here, search engines are told not to index it, and it makes no transactions.
import { useEffect, useMemo, useRef, useState } from "react";

// Projected: 1,000,000 entries, a 10,000,000 USDC pool (bracket 5 of the payout charts). Adds to exactly 10,000,000.
const PROJECTED = [
  ["1st", "1,200,000"], ["2nd", "500,000"], ["3rd to 4th", "250,000"],
  ["5th to 10th", "100,000"], ["11th to 20th", "50,000"], ["21st to 40th", "25,000"],
  ["41st to 100th", "10,000"], ["101st to 200th", "5,000"], ["201st to 400th", "2,500"],
  ["401st to 2,500th", "1,000"], ["2,501st to 5,000th", "500"], ["5,001st to 10,000th", "250"],
];
// Live: 25,000 entries, a 250,000 USDC pool (bracket 3). Adds to exactly 250,000.
const LIVE = [
  ["1st", "35,000"], ["2nd", "22,500"], ["3rd", "13,750"],
  ["4th to 5th", "8,125"], ["6th to 10th", "3,750"], ["11th to 20th", "1,625"],
  ["21st to 40th", "1,375"], ["41st to 62nd", "1,250"], ["63rd", "1,000"],
  ["64th to 100th", "750"], ["101st to 125th", "500"], ["126th to 250th", "250"],
];
const PRICE = 10;
const START = 48 * 3600 + 12 * 60 + 55;
const WALLETS = ["Phantom", "Solflare", "Backpack"];
const ADDR = "7Gx4…Qm2P";

const two = (n) => String(n).padStart(2, "0");
const num = (n) => Math.round(n).toLocaleString("en-US");
const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Counts a number up smoothly whenever its target changes.
function useTicker(target, ms = 900) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const a = from.current, b = target;
    if (a === b) return;
    if (reduced()) { from.current = b; setV(b); return; }
    let raf, t0;
    const step = (t) => {
      t0 = t0 || t;
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      setV(a + (b - a) * e);
      if (p < 1) raf = requestAnimationFrame(step); else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [target, ms]);
  return v;
}

export default function Demo() {
  const [left, setLeft] = useState(START);
  const [view, setView] = useState("live");
  const [qty, setQty] = useState(1);
  const [wallet, setWallet] = useState(null);        // null until connected
  const [modal, setModal] = useState(null);          // "connect" | "connecting" | "confirm" | "sending"
  const [sold, setSold] = useState(0);               // entries bought in this demo
  const [mine, setMine] = useState([]);              // my entry numbers
  const [xp, setXp] = useState(0);
  const [toast, setToast] = useState("");
  const [pulse, setPulse] = useState(0);
  const globeRef = useRef(null), mineRef = useRef(null), fxRef = useRef(null);

  useEffect(() => {
    document.title = "1-Earth · Demo";
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : START)), 1000);
    return () => { clearInterval(id); m.remove(); };
  }, []);

  const live = view === "live";
  const baseEntries = live ? 25000 : 1000000;
  const entries = useTicker(baseEntries + (live ? sold : 0));
  const pool = useTicker((baseEntries + (live ? sold : 0)) * PRICE);
  const xpShown = useTicker(xp, 700);
  const prizes = useMemo(() => (live ? LIVE : PROJECTED), [live]);
  const h = Math.floor(left / 3600), mi = Math.floor((left % 3600) / 60), se = left % 60;

  const connect = (name) => {
    setModal("connecting");
    setTimeout(() => { setWallet(name); setModal(null); flash(`Connected with ${name}. Demo wallet: ${ADDR}`); }, 1100);
  };
  const flash = (t, ms = 3600) => { setToast(t); clearTimeout(flash.id); flash.id = setTimeout(() => setToast(""), ms); };
  const play = () => { if (!wallet) setModal("connect"); else setModal("confirm"); };

  const approve = () => {
    setModal("sending");
    setTimeout(() => {
      setModal(null);
      const first = 25000 + sold + 1;
      const nums = Array.from({ length: qty }, (_, i) => first + i);
      setView("live");
      fly(qty, () => {
        setSold((s) => s + qty);
        setMine((m) => [...m, ...nums]);
        setXp((x) => x + qty * 10);
        setPulse((p) => p + 1);
        flash(qty === 1 ? `You're in! Entry #${num(first)}. Good luck!` : `You're in! Entries #${num(first)} to #${num(first + qty - 1)}. Good luck!`, 4200);
      });
    }, 1200);
  };

  // Tickets leave the prize-pool globe, arc up and land in My Entries; confetti bursts where they land.
  const fly = (n, done) => {
    const layer = fxRef.current, g = globeRef.current, m = mineRef.current;
    if (!layer || !g || !m || reduced()) { done(); return; }
    const a = g.getBoundingClientRect(), b = m.getBoundingClientRect();
    const sx = a.left + a.width / 2, sy = a.top + a.height / 2;
    const ex = b.left + b.width * 0.62, ey = b.top + b.height / 2;
    const count = Math.min(n, 8);
    let landed = 0;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "demo-fly";
      el.innerHTML = '<img src="/globe.webp" alt=""><span>#' + num(25000 + sold + 1 + i) + "</span>";
      layer.appendChild(el);
      const dx = ex - sx + (i - (count - 1) / 2) * 26, dy = ey - sy, lift = -Math.max(160, Math.abs(dx) * 0.35);
      const anim = el.animate([
        { transform: `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(.3) rotate(-10deg)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(1.15) rotate(0deg)`, opacity: 1, offset: 0.16 },
        { transform: `translate(${sx + dx * 0.5}px, ${sy + dy * 0.5 + lift}px) translate(-50%, -50%) scale(1.05) rotate(6deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${sx + dx}px, ${sy + dy}px) translate(-50%, -50%) scale(.7) rotate(0deg)`, opacity: 1, offset: 0.92 },
        { transform: `translate(${sx + dx}px, ${sy + dy}px) translate(-50%, -50%) scale(.4)`, opacity: 0 },
      ], { duration: 1250, delay: i * 150, easing: "cubic-bezier(.45,.05,.35,1)", fill: "both" });
      anim.onfinish = () => {
        el.remove();
        burst(ex + (i - (count - 1) / 2) * 26, ey, i === count - 1 ? 46 : 10);
        if (++landed === count) done();
      };
    }
  };
  const burst = (x, y, n) => {
    const layer = fxRef.current; if (!layer) return;
    const colors = ["#9945FF", "#14F195", "#F5C04A", "#ECEBFF"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.className = "demo-conf";
      c.style.background = colors[i % 4];
      layer.appendChild(c);
      const ang = Math.random() * Math.PI * 2, d = 60 + Math.random() * 160;
      c.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x + Math.cos(ang) * d}px, ${y + Math.sin(ang) * d - 60}px) rotate(${360 + Math.random() * 360}deg)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${x + Math.cos(ang) * d * 1.1}px, ${y + Math.sin(ang) * d + 40}px) rotate(${540 + Math.random() * 360}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => c.remove();
    }
  };

  const shown = mine.length <= 3 ? mine : mine.slice(-2), more = mine.length - shown.length;

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
          <span className={"demo-pill" + (pulse ? " demo-bump" : "")} key={"xp" + pulse}>{num(xpShown)} <small>XP</small></span>
          {wallet
            ? <span className="demo-pill"><i className="demo-dot" />{ADDR}</span>
            : <button className="demo-pill demo-connect" onClick={() => setModal("connect")}>Connect Wallet</button>}
        </div>
      </header>

      <section className="demo-hero">
        <div className={"demo-globe" + (pulse ? " demo-glow" : "")} ref={globeRef} key={"g" + pulse}>
          <img src="/globe.webp" alt="" />
          <p>Prize Pool {num(pool)} <small>USDC</small></p>
        </div>
        <div className="demo-entries"><b>{num(entries)}</b><span className="demo-grad">Entries</span></div>
      </section>

      <section className="demo-card demo-dist">
        <div className="demo-dist-head">
          <h2>Prize Distribution</h2>
          <div className="demo-tog" role="tablist">
            <button className={!live ? "on" : ""} onClick={() => setView("projected")}>Projected</button>
            <button className={live ? "on" : ""} onClick={() => setView("live")}>Live</button>
          </div>
        </div>
        <div className="demo-grid">
          {prizes.map(([p, a]) => (
            <div className="demo-prize" key={view + p}><span>{p}</span><b>{a}<small>USDC</small></b></div>
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
          <p className="demo-price"><b>{qty * PRICE}</b> <small>USDC on SOL</small></p>
          <button className="demo-play" onClick={play}>Play</button>
          <p className="demo-odds">1 in 100 odds</p>
        </section>
        <section className="demo-card demo-mine" ref={mineRef}>
          <h3>My Entries</h3>
          <div className="demo-tix">
            {!wallet && <p className="demo-empty">Connect a wallet to see your entries</p>}
            {wallet && !mine.length && <p className="demo-empty">No entries yet. Press Play!</p>}
            {shown.map((n) => <span key={n} className="demo-tix-new"><img src="/globe.webp" alt="" />#{num(n)}</span>)}
            {more > 0 && <span className="demo-more">+{num(more)} more</span>}
          </div>
        </section>
      </div>

      <footer className="demo-foot">
        <span>© 2026 : 1-Earth</span>
        {["How to Play", "How it Works", "How XP Works", "Past Draws", "Legal", "Support", "Responsible Play", "50/50"].map((l) => <span key={l}>{l}</span>)}
      </footer>

      {toast && <p className="demo-note" role="status">{toast}</p>}
      <div className="demo-fx" ref={fxRef} aria-hidden="true" />

      {modal && (
        <div className="demo-modal" onClick={(e) => { if (e.target === e.currentTarget && (modal === "connect" || modal === "confirm")) setModal(null); }}>
          <div className="demo-sheet" role="dialog" aria-modal="true">
            {modal === "connect" && (<>
              <h4>Connect a wallet</h4>
              <p className="demo-sheet-sub">Demo only. No real wallet is used.</p>
              {WALLETS.map((w) => <button key={w} className="demo-wbtn" onClick={() => connect(w)}><i className="demo-dot" />{w}</button>)}
              <button className="demo-cancel" onClick={() => setModal(null)}>Cancel</button>
            </>)}
            {modal === "connecting" && (<><div className="demo-spin" /><h4>Connecting…</h4><p className="demo-sheet-sub">Approve in your wallet</p></>)}
            {modal === "confirm" && (<>
              <h4>Confirm entry</h4>
              <div className="demo-bill">
                <div><span>Entries</span><b>{qty}</b></div>
                <div><span>Price</span><b>{qty * PRICE} USDC</b></div>
                <div><span>Network fee</span><b>≈ 0.001 SOL</b></div>
                <div><span>Wallet</span><b>{wallet} · {ADDR}</b></div>
              </div>
              <button className="demo-approve" onClick={approve}>Approve</button>
              <button className="demo-cancel" onClick={() => setModal(null)}>Cancel</button>
              <p className="demo-sheet-sub">Demo only: no transaction is sent.</p>
            </>)}
            {modal === "sending" && (<><div className="demo-spin" /><h4>Minting your entries…</h4><p className="demo-sheet-sub">Confirming on Solana</p></>)}
          </div>
        </div>
      )}
    </div>
  );
}
