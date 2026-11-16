// /demo/responsible-play: the protocol's responsible-play page, in the Solana theme.
// It's a preview: the limit and break tools are shown but not active yet, and say so clearly.
import { useEffect, useState } from "react";

const PRICE = 10, MAX = 10;
const DURATIONS = ["7 days", "30 days", "90 days", "6 months", "1 year", "Permanent"];
const SIGNS = [
  "Spending more than you planned, or more than you can afford",
  "Chasing losses by buying more entries",
  "Borrowing money or selling things to play",
  "Hiding how much you play from people close to you",
  "Feeling anxious or irritable when you can’t play",
  "Playing gets in the way of work, sleep or family",
];

export default function ResponsiblePlay() {
  const [limit, setLimit] = useState(5);
  const [wallet1, setWallet1] = useState("");
  const [wallet2, setWallet2] = useState("");
  const [dur, setDur] = useState("");
  const [device, setDevice] = useState(true);
  const [agree, setAgree] = useState(false);
  const [agreeLimit, setAgreeLimit] = useState(false);
  const [note1, setNote1] = useState("");
  const [note2, setNote2] = useState("");

  useEffect(() => { document.title = "Responsible play · 1-Earth"; }, []);

  const preview = "Demo only: limits and breaks aren’t active yet. They’ll work when the protocol launches.";
  const saveLimit = () => {
    if (!wallet1.trim()) return setNote1("Enter your Solana wallet address first.");
    if (!agreeLimit) return setNote1("Please confirm you understand this limit can never be raised.");
    setNote1(preview);
  };
  const startBreak = () => {
    if (!wallet2.trim()) return setNote2("Enter your Solana wallet address first.");
    if (!dur) return setNote2("Choose how long your break should last.");
    if (!agree) return setNote2("Please confirm you understand the break can’t be undone early.");
    setNote2(preview);
  };

  return (
    <div className="rp">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Demo · these tools go live with the protocol</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>

      <main className="rp-main">
        <section className="rp-head">
          <h1 className="rp-grad">Responsible play</h1>
          <div className="rp-head-r">
            <p>Play for fun, within limits you choose. Set a cap on your entries or take a break whenever you need to.</p>
          </div>
        </section>

        <div className="rp-cards">
          <section className="rp-card">
            <h2>Limit your entries</h2>
            <p className="rp-lead">Choose the most entries your wallet can buy in each drawing. The site maximum is {MAX} entries ({(MAX * PRICE).toLocaleString("en-US")} USDC) per drawing.</p>
            <label className="rp-lbl" htmlFor="rp-w1">Wallet address</label>
            <input id="rp-w1" className="rp-input" placeholder="Your Solana wallet address" value={wallet1} onChange={(e) => setWallet1(e.target.value)} autoComplete="off" spellCheck="false" />
            <span className="rp-lbl">Entries per drawing</span>
            <div className="rp-limit">
              <div className="rp-step">
                <button onClick={() => setLimit((v) => Math.max(1, v - 1))} aria-label="Lower limit">−</button>
                <b>{limit}</b>
                <button onClick={() => setLimit((v) => Math.min(MAX, v + 1))} aria-label="Raise limit">+</button>
              </div>
              <p>Up to <b>{(limit * PRICE).toLocaleString("en-US")} USDC</b> per drawing</p>
            </div>
            <input type="range" min="1" max={MAX} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rp-range" aria-label="Entries per drawing" style={{ "--p": `${((limit - 1) / (MAX - 1)) * 100}%` }} />
            <p className="rp-fine">Your limit starts right away.</p>
            <label className="rp-check">
              <input type="checkbox" checked={agreeLimit} onChange={(e) => setAgreeLimit(e.target.checked)} />
              <span><b>I understand that once I save this limit, I can never raise it again.</b></span>
            </label>
            <button className="rp-btn" onClick={saveLimit}>Save limit</button>
            {note1 && <p className="rp-note" role="status">{note1}</p>}
          </section>

          <section className="rp-card">
            <h2>Take a break</h2>
            <p className="rp-lead">Self-exclusion blocks you from entering for the time you choose. It can’t be shortened or cancelled once it starts.</p>
            <label className="rp-lbl" htmlFor="rp-w2">Wallet address</label>
            <input id="rp-w2" className="rp-input" placeholder="Your Solana wallet address" value={wallet2} onChange={(e) => setWallet2(e.target.value)} autoComplete="off" spellCheck="false" />
            <span className="rp-lbl">How long?</span>
            <div className="rp-durs" role="radiogroup" aria-label="How long">
              {DURATIONS.map((d) => <button key={d} role="radio" aria-checked={dur === d} className={dur === d ? "on" : ""} onClick={() => setDur(d)}>{d}</button>)}
            </div>
            <label className="rp-check">
              <input type="checkbox" checked={device} onChange={(e) => setDevice(e.target.checked)} />
              <span><b>Also block this device and IP address</b><small>Stops entries from this connection too, even with a different wallet.</small></span>
            </label>
            <label className="rp-check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span><b>I understand I won’t be able to enter until my break ends, and it can’t be undone early.</b></span>
            </label>
            <button className="rp-btn" onClick={startBreak}>Start my break</button>
            {note2 && <p className="rp-note" role="status">{note2}</p>}
          </section>
        </div>

        <section className="rp-signs">
          <div className="rp-signs-head">
            <h2>Know the signs</h2>
            <p className="rp-lead">If any of these sound familiar, it may be time to set a limit, take a break, or talk to someone.</p>
          </div>
          <div className="rp-signs-body">
            <ul>{SIGNS.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="rp-help">
              <a href="https://www.gamblingtherapy.org" target="_blank" rel="noopener noreferrer"><b>Gambling Therapy</b><span>Free, confidential support worldwide, in many languages</span></a>
              <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer"><b>Gamblers Anonymous</b><span>Meetings and peer support in many countries</span></a>
            </div>
          </div>
        </section>

        <p className="rp-foot">Limits and breaks apply to entries made through the official 1-Earth site. You must be 18 or older, or the legal age where you live, to play.</p>
      </main>
    </div>
  );
}
