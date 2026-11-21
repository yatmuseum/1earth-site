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
  useEffect(() => { document.title = "Payout Tables · 1-Earth"; }, []);
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
          <h1 className="rp-grad">Payout Tables</h1>
          <p>The contract picks one of five formats based off of the total entries at the draw. 1 in 100 entries wins.</p>
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
            <div className="pt-card-head"><h2>Base + Bonuses</h2><span className="pt-share">{pct(bonusPct)} of the pool</span></div>
            {rows.length ? (
              <table className="pt-table">
                <thead><tr><th>Tier</th><th>Adds</th><th>Odds</th><th>Pool</th><th>Running total</th></tr></thead>
                <tbody>{rows.map(([name, amt, odds, p, cum]) => (
                  <tr key={name}><td>{name}</td><td>+{usdc(amt)}</td><td>1 in {usdc(odds)}</td><td>{pct(p)}</td><td className="pt-cum">{usdc(cum)} <small>USDC</small></td></tr>
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
            <p className="pt-sum">Base + bonuses {pct(bonusPct)} + jackpot {pct(jackPct)} = <b>{pct(bonusPct + jackPct)}</b> of the prize pool</p>
          </section>
        </div>

        <section className="pt-notes">
          <h2>Notes</h2>
          <div className="pt-note-grid">
            <div className="pt-note"><h3>Prizes stack</h3><p>Each prize is the base, plus every bonus your rank reaches, plus your place’s jackpot share. In a 100,000-entry draw, rank #250 wins 1,000 USDC (base + bonuses 1 and 2), and rank #10 wins 13,000 USDC (base + bonuses 1 to 5 + a 3,000 USDC jackpot share).</p></div>
            <div className="pt-note"><h3>When a bonus doesn’t divide evenly</h3><p>Each bonus is paid in full to the top places, one winner at a time, and any amount left over goes to the next place. For example, with 12,500 entries there’s enough for 2.5 Bonus 4 prizes (2,500 USDC each). So 1st and 2nd place each get the full 2,500 USDC, and 3rd place gets the remaining 1,250 USDC, half the bonus.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
}
