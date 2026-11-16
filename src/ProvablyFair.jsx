// /demo/provably-fair: how anyone can verify a 1-Earth drawing, in the Solana theme.
import { useEffect } from "react";

const STEPS = [
  ["Minting is sealed on-chain first.", "After the mint closes, the collection’s control key is handed to Solana’s incinerator address, so no entries can be added. Check the collection’s authority on any Solana explorer."],
  ["The entry list is fingerprinted.", "Download the entry list and compute its SHA-256. It must match the fingerprint posted before the drawing."],
  ["The randomness request is tied to that list.", "The ORAO VRF request seed is SHA-256 of “1-Earth 50/50 draw|collection|fingerprint”, so there’s exactly one possible drawing per entry list."],
  ["Recompute the winners.", "Our open-source script reads the randomness from Solana and recomputes the winners."],
  ["Check the payments.", "Each “Paid ✓” opens the transfer on Solana: the prize leaving our treasury and arriving in the winning wallet."],
];
const LINKS = [
  ["Collection on Solscan", "https://solscan.io/account/97YiBMmoNDJrvqnCjjrwsbxR9bZxmdtrGNZtaW6dtR9C"],
  ["Treasury on Solscan", "https://solscan.io/account/HvPMmCHju5niMUKkGhJNruY8fGbzHT1caELqSjefSBeM"],
  ["Open-source code on GitHub", "https://github.com/yatmuseum/1earth-site"],
];

export default function ProvablyFair() {
  useEffect(() => { document.title = "Provably fair · 1-Earth"; }, []);
  return (
    <div className="pf">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>

      <main className="pf-main">
        <section className="pf-head">
          <h1 className="rp-grad">Provably fair</h1>
          <p>Every drawing can be checked by anyone, on Solana. Here’s how to verify one yourself.</p>
        </section>

        <ol className="pf-steps">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="pf-step">
              <span className="pf-num">{i + 1}</span>
              <div><h2>{t}</h2><p>{d}</p></div>
            </li>
          ))}
        </ol>

        <section className="pf-links">
          <span className="pf-links-lbl">Check it yourself</span>
          {LINKS.map(([l, u]) => <a key={l} href={u} target="_blank" rel="noopener noreferrer">{l} ↗</a>)}
          <a href="/PastDraws">Past Draws →</a>
        </section>
      </main>
    </div>
  );
}
