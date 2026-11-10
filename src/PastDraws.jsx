// /PastDraws: every completed drawing, with everything needed to verify it.
// The list comes from /draws/index.json, which scripts/publish-draw.mjs updates.
import { useEffect, useState } from "react";
import { MINT } from "./config.js";

const short = (a) => (a && a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
const solscan = (kind, id) => `https://solscan.io/${kind}/${id}`;

function Draw({ d }) {
  return (
    <article className="card pd-draw">
      <header className="pd-draw__head">
        <div>
          <h2>{d.title}</h2>
          <p className="pd-muted">{d.drawnAtLabel} · {d.entries.toLocaleString()} entries</p>
        </div>
        <div className="pd-links">
          <a href={d.files.snapshot} download>Entry list (CSV)</a>
          <a href={d.files.result} download>Results (JSON)</a>
        </div>
      </header>

      <p className="pd-prize-note">Each winner receives {d.prizeLabel}.</p>
      <div className="pd-scroll"><table className="pd-table">
        <thead><tr><th>Place</th><th>Entry #</th><th>Winning wallet</th><th>Prize</th></tr></thead>
        <tbody>
          {d.winners.map((w) => (
            <tr key={w.place}>
              <td>{w.place}</td>
              <td>#{w.entry}</td>
              <td><a href={solscan("account", w.wallet)} target="_blank" rel="noopener noreferrer">{short(w.wallet)}</a></td>
              <td>{d.prizeLabel}</td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <dl className="pd-proof">
        <dt>Collection</dt><dd><a href={solscan("account", d.collection)} target="_blank" rel="noopener noreferrer">{d.collection}</a></dd>
        <dt>Entry list fingerprint (SHA-256)</dt><dd><code>{d.snapshotSha256}</code></dd>
        <dt>ORAO VRF request</dt><dd><a href={solscan("account", d.requestAccount)} target="_blank" rel="noopener noreferrer">{d.requestAccount}</a></dd>
        {d.requestTx && (<><dt>Request transaction</dt><dd><a href={solscan("tx", d.requestTx)} target="_blank" rel="noopener noreferrer">{short(d.requestTx)}</a></dd></>)}
        <dt>Randomness</dt><dd><code>{d.randomness}</code></dd>
        {d.lockDownTx && (<><dt>Lock-down transaction</dt><dd><a href={solscan("tx", d.lockDownTx)} target="_blank" rel="noopener noreferrer">{short(d.lockDownTx)}</a></dd></>)}
      </dl>
    </article>
  );
}

export default function PastDraws() {
  const [draws, setDraws] = useState(null);
  useEffect(() => {
    document.title = "Past Draws · 1-Earth";
    fetch("/draws/index.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDraws)
      .catch(() => setDraws([]));
  }, []);

  return (
    <div className="page pd">
      <header className="topbar">
        <a href="/" className="brand">
          <img src="/globe.webp" alt="" width="46" height="46" />
          <span>1-Earth</span>
        </a>
        <a href="/" className="pd-back">← Back to the mint</a>
      </header>

      <h1 className="pd-title">Past Draws</h1>
      <p className="pd-intro">
        Every 1-Earth drawing, with everything you need to check it yourself: the full entry list, its
        fingerprint, the ORAO VRF request on Solana, the randomness it returned, and the winners.
      </p>

      {draws === null && <p className="pd-muted">Loading…</p>}
      {draws && draws.length === 0 && (
        <div className="card pd-empty">
          <h2>No drawings yet</h2>
          <p>The first drawing takes place {MINT.drawingLabel}. Results will be posted here and on X.</p>
        </div>
      )}
      {draws && draws.map((d) => <Draw key={d.id} d={d} />)}

      <section className="card pd-how">
        <h2>How to verify a drawing</h2>
        <ol>
          <li><strong>Minting is sealed on-chain first.</strong> After the mint closes, the collection is handed to Solana’s incinerator address, so no entries can be added. Check the collection’s authority on any Solana explorer.</li>
          <li><strong>The entry list is fingerprinted.</strong> Download the entry list and compute its SHA-256. It must match the fingerprint posted before the drawing.</li>
          <li><strong>The randomness request is tied to that list.</strong> The ORAO VRF request seed is SHA-256 of “1-Earth 50/50 draw|collection|fingerprint”, so there’s exactly one possible drawing per entry list.</li>
          <li><strong>Recompute the winners.</strong> Our open-source script reads the randomness from Solana and recomputes the winners: <code>node scripts/draw.mjs verify mainnet-beta</code></li>
        </ol>
      </section>
    </div>
  );
}
