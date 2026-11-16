// /demo/payout-tables: the protocol's five payout formats, in the Solana theme.
// Figures come from the Payouts Calculus workbook. Pool % = share of the whole prize pool.
import { useEffect, useState } from "react";

const BONUSES = [ // name, amount (USDC), odds (1 in N entries), pool %, cumulative prize
  ["Base", 250, 100, 25, 250],
  ["Bonus 1", 250, 200, 12.5, 500],
  ["Bonus 2", 500, 400, 12.5, 1000],
  ["Bonus 3", 1500, 2500, 6, 2500],
  ["Bonus 4", 2500, 5000, 5, 5000],
  ["Bonus 5", 5000, 10000, 5, 10000],
  ["Bonus 6", 15000, 25000, 6, 25000],
  ["Bonus 7", 25000, 50000, 5, 50000],
  ["Bonus 8", 50000, 100000, 5, 100000],
  ["Bonus 9", 150000, 250000, 6, 250000],
  ["Bonus 10", 250000, 500000, 5, 500000],
  ["Bonus 11", 500000, 1000000, 5, 1000000],
];
// each format: entry range, how many bonus rows apply, jackpot split [place, % of pool each, places]
const FORMATS = [
  { n: 1, range: "0 to 999", bonuses: 0, jackpot: [["1st", 40, 1], ["2nd", 20, 1], ["3rd", 10, 1], ["4th to 5th", 5, 2], ["6th to 10th", 4, 5]] },
  { n: 2, range: "1,000 to 9,999", bonuses: 3, jackpot: [["1st", 20, 1], ["2nd", 10, 1], ["3rd", 5, 1], ["4th to 5th", 2.5, 2], ["6th to 10th", 2, 5]] },
  { n: 3, range: "10,000 to 99,999", bonuses: 6, jackpot: [["1st", 10, 1], ["2nd", 5, 1], ["3rd", 2.5, 1], ["4th to 5th", 1.25, 2], ["6th to 10th", 0.5, 5], ["11th to 20th", 0.25, 10], ["21st to 40th", 0.15, 20], ["41st to 100th", 0.1, 60]] },
  { n: 4, range: "100,000 to 999,999", bonuses: 9, jackpot: [["1st", 6, 1], ["2nd", 3, 1], ["3rd", 1.5, 1], ["4th to 5th", 0.75, 2], ["6th to 10th", 0.3, 5], ["11th to 20th", 0.15, 10], ["21st to 40th", 0.075, 20], ["41st to 100th", 0.025, 60]] },
  { n: 5, range: "1,000,000+", bonuses: 12, jackpot: [["1st", 2, 1]] },
];
const usdc = (v) => v.toLocaleString("en-US");
const pct = (v) => `${+v.toFixed(3)}%`;

export default function PayoutTables() {
  const [f, setF] = useState(2); // opens on format 3
  useEffect(() => { document.title = "Payout tables · 1-Earth"; }, []);
  const F = FORMATS[f];
  const rows = BONUSES.slice(0, F.bonuses);
  const bonusPct = rows.reduce((s, r) => s + r[3], 0);
  const jackPct = F.jackpot.reduce((s, j) => s + j[1] * j[2], 0);

  return (
    <div className="pt">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a></div>
        <a href="/demo/provably-fair" className="rp-back">← Back to provably fair</a>
      </header></div>

      <main className="pt-main">
        <section className="pt-head">
          <h1 className="rp-grad">Payout tables</h1>
          <p>The contract picks one of five formats from the total entries at the draw. 1 in 100 entries wins.</p>
        </section>

        <div className="pt-tabs" role="tablist" aria-label="Payout format">
          {FORMATS.map((x, i) => (
            <button key={x.n} role="tab" aria-selected={i === f} className={i === f ? "on" : ""} onClick={() => setF(i)}>
              <b>Format {x.n}</b><span>{x.range} entries</span>
            </button>
          ))}
        </div>

        <div className="pt-grid">
          <section className="pt-card">
            <div className="pt-card-head"><h2>Bonuses</h2><span className="pt-share">{pct(bonusPct)} of the pool</span></div>
            {rows.length ? (
              <table className="pt-table">
                <thead><tr><th>Tier</th><th>Adds</th><th>Who gets it</th><th>Pool</th><th>Running total</th></tr></thead>
                <tbody>{rows.map(([name, amt, odds, p, cum]) => (
                  <tr key={name}><td>{name}</td><td>+{usdc(amt)}</td><td>top 1 in {usdc(odds)}</td><td>{pct(p)}</td><td className="pt-cum">{usdc(cum)} <small>USDC</small></td></tr>
                ))}</tbody>
              </table>
            ) : <p className="pt-empty">No bonuses in format 1. With under 1,000 entries, the whole pool goes to the jackpot places.</p>}
          </section>

          <section className="pt-card">
            <div className="pt-card-head"><h2>Jackpot</h2><span className="pt-share">{pct(jackPct)} of the pool</span></div>
            <table className="pt-table">
              <thead><tr><th>Place</th><th>Each gets</th><th>Places</th><th>Total</th></tr></thead>
              <tbody>{F.jackpot.map(([pl, each, n]) => (
                <tr key={pl}><td>{pl}</td><td>{pct(each)} of pool</td><td>{n}</td><td className="pt-cum">{pct(each * n)}</td></tr>
              ))}</tbody>
            </table>
            <p className="pt-sum">Bonuses {pct(bonusPct)} + jackpot {pct(jackPct)} = <b>{pct(bonusPct + jackPct)}</b> of the prize pool</p>
          </section>
        </div>

        <section className="pt-notes">
          <h2>Notes</h2>
          <ul>
            <li>The smart contract uses format 1, 2, 3, 4 or 5 based on the total number of entries at the draw. 1 in 100 entries wins.</li>
            <li>From format 2 up (1,000+ entries), every winner receives at least 250 USDC.</li>
            <li>Bonuses are cumulative: higher-ranked winners receive every bonus they qualify for. In a 100,000-entry drawing, rank #250 gets the base + bonuses 1 and 2 (1,000 USDC), and rank #10 gets the base + bonuses 1 to 5 (10,000 USDC) plus a 3,000 USDC jackpot share, for 13,000 USDC.</li>
            <li>Bonuses are filled from the top rank down. If a bonus covers part of a winner, the last winner gets that part: with 12,500 entries, bonus 4 covers 2.5 winners, so ranks 1 and 2 get it in full and rank 3 gets exactly half.</li>
            <li>The base + bonus + jackpot system sets exactly what share of the pool each tier receives, so prizes are spread as fairly as possible.</li>
            <li>It scales: the more entries, the smaller the top prizes’ share of the pool. Only first place can win more than 1,000,000 USDC, and in large drawings the odds match the prize: 1 in 10,000 to win at least 10,000 USDC, 1 in 100,000 for 100,000, and 1 in 1,000,000 for 1,000,000.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
