// /demo: an unlisted, clickable preview of the 1-Earth protocol with sample data.
// Nothing on the site links here, search engines are told not to index it, and it makes no transactions.
import { useEffect, useMemo, useRef, useState } from "react";

// Projected: 10,000,000 entries, a 100,000,000 USDC pool (bracket 5 of the payout charts: all 11 bonuses plus the 2% jackpot).
// Adds to exactly 100,000,000 across 100,000 winners. Each row: place, prize, winners in that tier.
const PROJECTED = [
  ["1st", "3,000,000", 1],
  ["2nd to 10th", "1,000,000", 9], ["11th to 20th", "500,000", 10], ["21st to 40th", "250,000", 20],
  ["41st to 100th", "100,000", 60], ["101st to 200th", "50,000", 100], ["201st to 400th", "25,000", 200],
  ["401st to 1000th", "10,000", 600], ["1001 to 2000", "5,000", 1000], ["2001 to 4000", "2,500", 2000],
  ["4001 to 25000", "1,000", 21000], ["25001 to 50000", "500", 25000], ["50001 to 100000", "250", 50000],
];
// Live: 25,000 entries, a 250,000 USDC pool (bracket 3). Adds to exactly 250,000.
const LIVE = [
  ["1st", "35,000", 1], ["2nd", "22,500", 1], ["3rd", "13,750", 1],
  ["4th to 5th", "8,125", 2], ["6th to 10th", "3,750", 5], ["11th to 20th", "1,625", 10],
  ["21st to 40th", "1,375", 20], ["41st to 62nd", "1,250", 22], ["63rd", "1,000", 1],
  ["64th to 100th", "750", 37], ["101st to 125th", "500", 25], ["126th to 250th", "250", 125],
];
const PRICE = 10;
const LIVE_BASE = 24999; // Live starts one short, so the first demo purchase is entry #25,000
const START = 96 * 3600 + 12 * 60 + 55; // the sample countdown starts at 96:12:55
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
  const [view, setView] = useState("projected");
  const [qty, setQty] = useState(1);
  const [wallet, setWallet] = useState("Phantom");   // the demo starts with a sample wallet already connected
  const [modal, setModal] = useState(null);          // "connect" | "connecting" | "confirm" | "sending"
  const [sold, setSold] = useState(0);               // entries bought in this demo
  const [mine, setMine] = useState([18984, 18985, 18986]); // my entry numbers (three sample ones to start)
  const [xp, setXp] = useState(125000);
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
  const baseEntries = live ? LIVE_BASE : 10000000;
  const entries = useTicker(baseEntries + (live ? sold : 0));
  const pool = useTicker((baseEntries + (live ? sold : 0)) * PRICE);
  const xpShown = useTicker(xp, 700);
  const prizes = useMemo(() => (live ? LIVE : PROJECTED), [live]);
  const totalEntries = live ? Math.max(25000, LIVE_BASE + sold) : baseEntries;   // odds for each tier: entries ÷ winners in that tier
  const h = Math.floor(left / 3600), mi = Math.floor((left % 3600) / 60), se = left % 60;

  const connect = (name) => {
    setModal("connecting");
    setTimeout(() => { setWallet(name); setModal(null); flash(`Connected with ${name}. Demo wallet: ${ADDR}`); }, 1100);
  };
  const flash = (t, ms = 3600) => { setToast(t); clearTimeout(flash.id); flash.id = setTimeout(() => setToast(""), ms); };
  // Play opens a simulated browser-wallet popup: it simulates the transaction, shows the balance changes,
  // then "sends" and confirms it. Nothing is ever sent; it is all on this page.
  const [wstep, setWstep] = useState(null);           // "sim" | "review" | "sending" | "done"
  const [sig, setSig] = useState("");
  const play = () => {
    if (sold > 0) return;                              // the demo buys one entry
    if (!wallet) { setModal("connect"); return; }
    setView("live");
    setWstep("sim");
    setTimeout(() => setWstep((w) => (w === "sim" ? "review" : w)), 1100);
  };
  const confirmTx = () => {
    setWstep("sending");
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const r = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setSig(r(4) + "…" + r(4));
    setTimeout(() => setWstep("done"), 1500);
    setTimeout(() => { setWstep(null); approve(true); }, 2900);
  };

  const approve = (direct) => {
    if (!direct) setModal("sending");
    setTimeout(() => {
      setModal(null);
      const first = LIVE_BASE + sold + 1;
      const nums = Array.from({ length: qty }, (_, i) => first + i);
      setView("live");
      fly(qty, () => {
        setSold((s) => s + qty);
        setMine((m) => [...m, ...nums]);
        setPulse((p) => p + 1);
        flash(qty === 1 ? `You're in! Entry #${num(first)}. Good luck!` : `You're in! Entries #${num(first)} to #${num(first + qty - 1)}. Good luck!`, 4200);
      });
    }, direct ? 0 : 1200);
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
      el.innerHTML = '<img src="/globe.webp" alt=""><span>#' + num(LIVE_BASE + sold + 1 + i) + "</span>";
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

  const shown = mine.length <= 4 ? mine : mine.slice(-3), more = mine.length - shown.length;

  return (
    <div className="demo">
      <header className="demo-top">
        <div className="demo-brand"><img src="/globe.webp" alt="" width="40" height="40" /><span>1-Earth</span><em className="demo-flag">Demo · real payout math</em></div>
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
          <span className="demo-pill">{num(xpShown)} <small>XP</small></span>
          {wallet
            ? <span className="demo-pill"><i className="demo-dot" />{ADDR}</span>
            : <span className="demo-pill demo-connect" aria-disabled="true">Connect Wallet</span>}
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
        <div className={"demo-grid" + (prizes.length === 13 ? " demo-grid--13" : "")}>
          {prizes.map(([p, a, n]) => (
            <div className={"demo-prize" + (prizes.length === 13 && p === "1st" ? " demo-prize--top" : "")} key={view + p}>
              <span className="demo-place">{p}</span>
              <b>{a}<small>USDC</small></b>
              <em className="demo-tier-odds">1 in {num(totalEntries / n)}</em>
            </div>
          ))}
        </div>
      </section>

      <div className="demo-row">
        <section className="demo-card demo-enter">
          <h3>Enter</h3>
          <div className="demo-step">
            <span className="demo-lbl">Entries (100 max)</span>
            <div className="demo-step-row">
              <button disabled aria-label="Fewer">−</button>
              <b>{qty}</b>
              <button disabled aria-label="More">+</button>
            </div>
          </div>
          <p className="demo-price"><b>{qty * PRICE}</b> <small>USDC on SOL</small></p>
          <button className="demo-play" onClick={play} disabled={sold > 0}>{sold > 0 ? "Entered ✓" : "Play"}</button>
          <p className="demo-odds">1 in 100 odds</p>
        </section>
        <section className="demo-card demo-mine" ref={mineRef}>
          <h3>My Entries</h3>
          <div className="demo-tix">
            {!mine.length && <p className="demo-empty">No entries yet. Press Play!</p>}
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


      {wstep && (
        <div className="demo-wbg">
          <div className="demo-wallet" role="dialog" aria-modal="true" aria-label="Wallet (simulated)">
            <div className="demo-wtop"><i className="demo-dot" /><b>Wallet</b><span className="demo-wnet">{wstep === "done" ? "40.00 USDC · $0.99 SOL" : "50.00 USDC · $1.00 SOL"}</span></div>
            <div className="demo-wsite"><img src="/globe.webp" alt="" /><div><b>1-earth.io</b><span>Confirm transaction</span></div></div>
            {wstep === "sim" && (<div className="demo-wbody demo-wcenter"><div className="demo-spin" /><p>Simulating transaction…</p></div>)}
            {wstep === "review" && (
              <div className="demo-wbody">
                <p className="demo-wlbl">Estimated balance changes</p>
                <div className="demo-wchg"><span className="demo-wcoin demo-wusdc">$</span><span>USDC<small>50.00 → 40.00</small></span><b className="neg">−10.00</b></div>
                <div className="demo-wchg"><span className="demo-wcoin demo-wsol">◎</span><span>SOL<small>$1.00 → $0.99</small></span><b className="neg">−$0.01</b></div>
                <div className="demo-wchg"><img src="/globe.webp" alt="" className="demo-wcoin" /><span>1-Earth entry<small>Soulbound</small></span><b className="pos">+1 (#{num(LIVE_BASE + sold + 1)})</b></div>
                <div className="demo-wrow"><span>Network fee</span><b>≈ $0.01 in SOL</b></div>
                <div className="demo-wrow"><span>Account</span><b>{ADDR}</b></div>
                <p className="demo-wnote">Simulated for this demo. No funds move.</p>
                <div className="demo-wbtns"><button onClick={() => setWstep(null)}>Cancel</button><button className="go" onClick={confirmTx}>Confirm</button></div>
              </div>
            )}
            {wstep === "sending" && (<div className="demo-wbody demo-wcenter"><div className="demo-spin" /><p>Sending transaction…</p><span className="demo-wsub">Waiting for confirmation on Solana</span></div>)}
            {wstep === "done" && (<div className="demo-wbody demo-wcenter"><div className="demo-wcheck">✓</div><p>Transaction confirmed</p><span className="demo-wsub">Entry #{num(LIVE_BASE + sold + 1)} minted · Signature {sig}</span></div>)}
          </div>
        </div>
      )}
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
