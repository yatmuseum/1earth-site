// /demo/provably-fair: how anyone can verify a 1-Earth drawing, in the Solana theme.
import { useEffect } from "react";

// How a drawing is verified once the protocol runs on an immutable contract with its upgrade authority revoked.
const STEPS = [
  ["Entries close on-chain at the deadline.", "The contract refuses new entries after each drawing’s cutoff, using Solana’s own clock. No one holds a key that could add entries: check that the program’s upgrade authority is revoked on any Solana explorer."],
  ["The entry list is fingerprinted on-chain.", "Every entry updates an on-chain fingerprint of the full list, plus the entry count. At the cutoff it’s frozen for everyone to see, so no one has to post it."],
  ["The contract gets a fair random number.", "When entries close, the drawing starts automatically. The contract asks ORAO for a random number that comes with proof it wasn’t chosen by anyone. That number is tied to the exact list of entries, so the drawing can’t be re-run or changed."],
  ["The contract picks the winners.", "A fixed, audited formula turns that randomness into the winners. Any entry can be checked to see exactly which prize place it won."],
  ["Prizes are paid from a vault no one controls.", "The prize pool sits in a vault owned by the program itself, not a person. Every payout is a public Solana transfer from the vault to the winning wallet."],
];
// Buttons at the bottom: shown, not linked until the protocol's accounts exist.
const LINKS = [
  ["Entries (Merkle tree)", null],
  ["Immutable proof", null],
  ["Prize vault", null],
  ["Open-source code", null],
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
          <p>Every drawing is run by an immutable, decentralized smart contract on Solana. Here’s how to verify one yourself.</p>
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
          {LINKS.map(([l, u]) => u
            ? <a key={l} href={u} target="_blank" rel="noopener noreferrer">{l} ↗</a>
            : <span key={l} className="pf-chip" aria-disabled="true">{l}</span>)}
          <a href="/demo/payout-tables">Payout Tables →</a>
        </section>
      </main>
    </div>
  );
}
