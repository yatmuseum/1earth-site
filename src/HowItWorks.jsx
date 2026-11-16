// /demo/how-it-works: how the 1-Earth protocol works, in the Solana theme.
import { useEffect, useState } from "react";

// Four example drawings, with prizes from the payout tables (format 4 at 100,000 entries, format 5 above).
const SCENARIOS = [
  { label: "10,000 entries", pool: "100,000", rows: [ // format 3
    ["1st", 20000], ["2nd", 10000], ["3rd", 5000], ["4th", 3750], ["5th", 2250], ["6th to 10th", 1500],
    ["11th to 20th", 1250], ["21st to 25th", 1150], ["26th to 40th", 650], ["41st to 50th", 600], ["51st to 100th", 350]] },
  { label: "100,000 entries", pool: "1,000,000", rows: [
    ["1st", 160000], ["2nd", 80000], ["3rd", 40000], ["4th", 32500], ["5th", 17500], ["6th to 10th", 13000],
    ["11th to 20th", 6500], ["21st to 40th", 3250], ["41st to 100th", 1250], ["101st to 250th", 1000], ["251st to 500th", 500], ["501st to 1000th", 250]] },
  { label: "1,000,000 entries", pool: "10,000,000", rows: [
    ["1st", 1200000], ["2nd", 500000], ["3rd to 4th", 250000], ["5th to 10th", 100000], ["11th to 20th", 50000], ["21st to 40th", 25000],
    ["41st to 100th", 10000], ["101st to 200th", 5000], ["201st to 400th", 2500], ["401 to 2500", 1000], ["2501 to 5000", 500], ["5001 to 10000", 250]] },
  { label: "10,000,000 entries", pool: "100,000,000", rows: [
    ["1st", 3000000], ["2nd to 10th", 1000000], ["11th to 20th", 500000], ["21st to 40th", 250000], ["41st to 100th", 100000], ["101st to 200th", 50000],
    ["201st to 400th", 25000], ["401st to 1000th", 10000], ["1001 to 2000", 5000], ["2001 to 4000", 2500], ["4001 to 25000", 1000], ["25001 to 50000", 500], ["50001 to 100000", 250]] },
];
const u = (v) => v.toLocaleString("en-US");


const Coin = () => (
  <svg viewBox="0 0 200 110" className="hw-ill" aria-hidden="true">
    <defs><linearGradient id="hwg1" x1="0" x2="1"><stop offset="0" stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs>
    <circle cx="52" cy="44" r="27" fill="#2775CA"/><circle cx="52" cy="44" r="21" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".9"/>
    <text x="52" y="52" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff" fontFamily="system-ui">$</text>
    <path d="M86 44h22" stroke="url(#hwg1)" strokeWidth="3" strokeLinecap="round"/><path d="M104 38l7 6-7 6" fill="none" stroke="#14F195" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <g transform="rotate(8 150 44)"><rect x="118" y="20" width="64" height="48" rx="7" fill="#1b1a33" stroke="url(#hwg1)" strokeWidth="2.5"/>
    <text x="150" y="38" textAnchor="middle" fontSize="8" fill="#c9c6ee" fontFamily="system-ui" letterSpacing="1.5">TICKET</text>
    <text x="150" y="57" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ecebff" fontFamily="system-ui">#48,213</text></g>
  </svg>);
const Clock = () => (
  <svg viewBox="0 0 200 110" className="hw-ill" aria-hidden="true">
    <circle cx="100" cy="52" r="44" fill="none" stroke="#2b2950" strokeWidth="2" strokeDasharray="3 5"/>
    <circle cx="100" cy="52" r="30" fill="#15142a" stroke="url(#hwg1)" strokeWidth="2.5"/>
    <text x="100" y="45" textAnchor="middle" fontSize="7" fill="#14F195" fontFamily="system-ui" letterSpacing="1.5">SAT</text>
    <text x="100" y="60" textAnchor="middle" fontSize="16" fontWeight="800" fill="#ecebff" fontFamily="system-ui">11:11</text>
    {[["#9,102", 38, 18], ["#77,560", 160, 24], ["#31,407", 34, 90], ["#48,213", 164, 86]].map(([t, x, y], i) => (
      <g key={t}><rect x={x - 22} y={y - 9} width="44" height="18" rx="9" fill={i === 3 ? "#14F195" : "#1b1a33"} stroke={i === 3 ? "none" : "#2b2950"}/>
      <text x={x} y={y + 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={i === 3 ? "#0c0b16" : "#c9c6ee"} fontFamily="system-ui">{t}</text></g>))}
  </svg>);
const Wallet = () => (
  <svg viewBox="0 0 200 110" className="hw-ill" aria-hidden="true">
    <rect x="58" y="36" width="92" height="56" rx="10" fill="#1b1a33" stroke="#2b2950" strokeWidth="2"/>
    <rect x="66" y="26" width="72" height="16" rx="6" fill="url(#hwg1)"/>
    <rect x="128" y="54" width="30" height="20" rx="7" fill="#15142a" stroke="#2b2950" strokeWidth="2"/><circle cx="141" cy="64" r="4" fill="#14F195"/>
    <text x="96" y="72" textAnchor="middle" fontSize="8" fill="#c9c6ee" fontFamily="system-ui" letterSpacing="1">YOUR WALLET</text>
    <path d="M30 22 q10 20 30 18" fill="none" stroke="#14F195" strokeWidth="2" strokeDasharray="3 4"/>
    <rect x="6" y="6" width="58" height="18" rx="9" fill="#14F195"/><text x="35" y="19" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0c0b16" fontFamily="system-ui">+160K</text>
  </svg>);
const Cycle = () => (
  <svg viewBox="0 0 200 110" className="hw-ill" aria-hidden="true">
    <path d="M100 14 a40 40 0 1 1 -34 19" fill="none" stroke="url(#hwg1)" strokeWidth="5" strokeLinecap="round"/>
    <path d="M60 22l6 12 12-4" fill="none" stroke="#9945FF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="100" y="50" textAnchor="middle" fontSize="14" fontWeight="800" fill="#ecebff" fontFamily="system-ui">Every</text>
    <text x="100" y="67" textAnchor="middle" fontSize="14" fontWeight="800" fill="#ecebff" fontFamily="system-ui">week</text>
  </svg>);

const STEPS = [
  [Coin, "Enter", <>Pay <b>10 USDC</b> on Solana. Each entry mints a compressed, soulbound token, and its <b>edition number is your ticket number</b>.</>, "soulbound entry"],
  [Clock, "Draw", <>Every <b>Saturday at 11:11 AM ET</b>, the contract gets verifiable randomness from ORAO VRF and picks the winners on-chain. Anyone can check the result.</>, "ORAO VRF"],
  [Wallet, "Payout", <>Prizes go <b>straight to the winners’ wallets</b>, automatically. No claims process, no forms, no middleman.</>, "sent automatically"],
  [Cycle, "Repeat", <>The draw <b>resets every week</b> and runs indefinitely. Enter again whenever you like.</>, "runs indefinitely"],
];
const TRUST = [
  ["Provably fair", <>ORAO VRF proves every draw is random and untampered. <a href="/demo/provably-fair">See how to verify →</a></>],
  ["Public ledger", "Anyone can verify every entry, draw and payout on Solana."],
  ["Immutable", "Once audited, the contract’s upgrade authority is revoked. No one can change the rules, including us."],
  ["Non-custodial", "1-Earth never holds player funds. The prize pool sits in a vault the contract owns, and prizes go straight to winners."],
  ["Audited", "The smart contract and payout logic are independently audited before launch."],
  ["Play responsibly", <>Set entry limits or take a break anytime on the <a href="/demo/responsible-play">Responsible play</a> page.</>],
];

export default function HowItWorks() {
  useEffect(() => { document.title = "How it Works · 1-Earth"; }, []);
  const [sc, setSc] = useState(0);
  const S = SCENARIOS[sc], max = S.rows[0][1];
  return (
    <div className="hw">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Demo · how the protocol will work</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>

      <main className="hw-main">
        <section className="hw-hero">
          <h1 className="rp-grad">How it Works</h1>
          <div className="hw-hero-r">
            <p>A global weekly draw. <b>10 USDC entries on Solana</b>, winners picked on-chain every Saturday, and <b>every entry goes back to players</b>.</p>
            <a href="/demo" className="rp-btn hw-go hw-go-top">Enter the draw</a>
          </div>
        </section>

        <section className="hw-sec">
          <h2>Four steps, every week</h2>
          <p className="hw-lead">From entry to payout, everything happens on-chain. There’s nothing to claim and no one in the middle.</p>
          <div className="hw-steps">
            {STEPS.map(([Ill, t, d, cap], i) => (
              <article key={t} className="hw-step">
                <span className="hw-num">{i + 1}</span>
                <h3>{t}</h3><p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="hw-sec">
          <h2>Where the money goes</h2>
          <p className="hw-lead">Nothing is taken out of the prize pool. Every USDC from every entry is paid back to players.</p>
          <div className="hw-money">
            <div className="hw-facts">
              <div className="hw-fact"><b className="rp-grad">10 USDC</b><p><strong>per entry</strong>Paid in USDC on Solana.</p></div>
              <div className="hw-fact"><b className="rp-grad">100%</b><p><strong>to the prize pool</strong>Nothing is taken out.</p></div>
              <div className="hw-fact"><b className="rp-grad">Top 1%</b><p><strong>paid</strong>1 in 100 entries wins.</p></div>
            </div>
            <div className="hw-card hw-money-card">
            <h3 className="hw-card-t">Share of ticket money paid back as prizes</h3>
            <div className="hw-bars hw-money-bars">
              <div className="hw-bar"><span>1-Earth</span><i><em style={{ width: "100%" }} /></i><b>100%</b></div>
              <div className="hw-bar hw-bar--dim"><span>Typical lottery</span><i><em style={{ width: "50%" }} /></i><b>~50%</b></div>
            </div>
            <div className="hw-logic">
              <p><b>Our own payout logic.</b> Winners are paid using 1-Earth’s open-source payout model, which spreads the pool so more players win meaningful prizes instead of one top-heavy jackpot.</p>
              <a href="/demo/payout-tables" className="hw-cta2">See how payouts are calculated →</a>
            </div>
            </div>
          </div>
        </section>

        <section className="hw-sec">
          <h2>Who wins</h2>
          <p className="hw-lead">Instead of one giant jackpot, prizes are spread so more players win something meaningful.</p>
          <div className="hw-wins">
            <div className="hw-facts">
              <div className="hw-fact"><b className="rp-grad">1 in 100</b><p><strong>entries wins a prize</strong>The top 1% of every draw.</p></div>
              <div className="hw-fact"><b className="rp-grad">250 USDC</b><p><strong>minimum prize</strong>From 1,000 entries up.</p></div>
              <div className="hw-fact"><b className="rp-grad">10 entries</b><p><strong>max per wallet</strong>100 USDC per draw.</p></div>
            </div>
            <div className="hw-card hw-ex">
              <div className="hw-ex-top">
                <h3 className="hw-card-t">Example payouts per {S.label} <span className="hw-pool">· {S.pool} USDC pool</span></h3>
                <div className="hw-ex-tabs" role="tablist" aria-label="Example drawing size">
                  {SCENARIOS.map((x, i) => <button key={x.label} role="tab" aria-selected={i === sc} className={i === sc ? "on" : ""} onClick={() => setSc(i)}>{x.label.replace(" entries", "")}</button>)}
                </div>
              </div>
              <div className="hw-ex-rows">
                {S.rows.map(([pl, v]) => (
                  <div key={pl} className="hw-ex-row"><span>{pl}</span><i><em style={{ width: `${Math.max(1.2, (v / max) * 100)}%` }} /></i><b>{u(v)} <small>USDC</small></b></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="hw-sec">
          <h2>Don’t trust us. Check it.</h2>
          <p className="hw-lead">Every rule is in public code, and every entry and payout is on Solana’s public ledger.</p>
          <div className="hw-trust">
            {TRUST.map(([t, d]) => <div key={t} className="hw-tr" tabIndex={0}><span className="hw-dot" /><div><h3>{t}</h3><p>{d}</p></div></div>)}
          </div>
        </section>

        <section className="hw-end">
          <div><h2>Ready for Saturday’s draw?</h2><p>Connect your wallet, pick how many entries, and you’re in.</p></div>
          <a href="/demo" className="rp-btn hw-go">Enter the draw</a>
        </section>
      </main>
    </div>
  );
}
