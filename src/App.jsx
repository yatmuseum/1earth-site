import { useStatus } from "./status.js";
import ConnectButton from "./ConnectButton.jsx";
import MintCard from "./MintCard.jsx";
import { MINT, PRIZES } from "./config.js";

export default function App() {
  const status = useStatus();
  return (
    <>
      {status && status.live && status.network !== "mainnet-beta" && (
        <div className="testnet-banner">Test network (devnet). Nothing here uses real funds.</div>
      )}

      <div className="page screen1">
        <header className="topbar">
          <a href="#top" className="brand">
            <img src="/globe.webp" alt="" width="46" height="46" />
            <span>1-Earth</span>
          </a>
          <ConnectButton />
        </header>

        <main id="top">
          <div className="top-grid">
            <section className="col-left" aria-labelledby="title">
              <div className="hero-block">
                <h1 id="title" className="mega">50/50</h1>
                <p className="frame-tag">Gold Frame Mint</p>
                <p className="opens">
                  <span className="label">Mint opens</span>
                  <strong>{MINT.opensLabel}</strong>
                </p>
              </div>

              <div className="body-block">
              <div className="stats">
                <div className="card stat">
                  <span className="label">Price</span>
                  <strong>{MINT.priceUsdc} <small>USDC</small></strong>
                </div>
                <div className="card stat">
                  <span className="label">Supply</span>
                  <strong>{MINT.supply.toLocaleString()}</strong>
                </div>
                <div className="card stat">
                  <span className="label">Odds</span>
                  <strong className="stat__odds">{MINT.oddsLabel}</strong>
                </div>
              </div>

              <MintCard />
              </div>
            </section>

            <section className="col-right" aria-labelledby="prizes-title">
              <div className="hero-block">
                <img className="globe" src="/globe-gold.webp" alt="1-Earth globe" width="240" height="240" />
                <h2 id="prizes-title" className="prizes-title">Prize Distribution</h2>
                <p className="prizes-sub">10 winners · 10,000 USDC each</p>
              </div>

              <div className="body-block">
              <ol className="prizes prizes--grid">
                {PRIZES.map(([place, amount]) => (
                  <li key={place} className="card prize">
                    <span>{place}</span>
                    <strong>{amount}<small className="usdc">USDC</small></strong>
                  </li>
                ))}
              </ol>

              <div className="card you-mint">
                <div className="you-mint__equation" aria-label="Gold Frame equals your 50/50 Entry">
                  <span className="you-mint__frame">
                    <img src="/gold-frame.webp" alt="" width="56" height="56" />
                    Gold Frame
                  </span>
                  <span>
                    <span className="you-mint__equals" aria-hidden="true">=</span> 50/50 Entry
                  </span>
                </div>
                <p className="you-mint__tags">Soulbound · Non-transferable · Mint # = Entry #</p>
                <p className="you-mint__body">
                  More than an entry, each Gold Frame comes with 10,000 $ONE to be distributed to your
                  wallet at a later date + a voice in what we build next.
                </p>
                <p className="you-mint__cta">
                  Every digital PFP deserves a frame. <a href="/Frame">Frame yours →</a>
                </p>
              </div>
              </div>
            </section>
          </div>

        </main>
      </div>

      <div className="screen2">
        <div className="page screen2__body">
          <div className="split">
            <div className="card big-figure">
              <span className="label label--lg">Prize pool</span>
              <strong>100,000<small className="usdc">USDC</small></strong>
              <p>10 USDC of every mint goes to the prize pool</p>
            </div>
            <div className="card big-figure">
              <span className="label label--lg">Operations &amp; development</span>
              <strong>100,000<small className="usdc">USDC</small></strong>
              <p>10 USDC of every mint supports the 1-Earth protocol</p>
            </div>
          </div>

          <div className="card drawing">
            <span className="label label--lg">The drawing</span>
            <p className="drawing__main">
              Takes place {MINT.drawingLabel}. If all 10,000 entries aren’t sold by then, the drawing
              will be delayed until sold out, with the new date announced on X.
            </p>
            <p className="drawing__sub">
              Winners are selected with ORAO VRF, verifiable on-chain randomness. Results are posted
              on X with a link anyone can use to verify them. Prizes are paid in USDC to the winning wallets.
            </p>
          </div>
        </div>

      <footer className="footer">
        <div className="page">
          <nav className="footer-links" aria-label="More">
            <a href="/PastDraws" className="pill pill--link">Past Draws →</a>
            <a href="/Frame" className="pill pill--link">Gold Frame PFP →</a>
          </nav>
          <p className="legal">
            <strong>Important:</strong> For informational purposes only. Not an offer to sell, or a
            solicitation of an offer to buy, any security or investment. 1-Earth is a protocol based
            in Costa Rica. Soulbound tokens are non-transferable entries with no expectation of
            profit, resale or redemption value. Odds: 10 winning entries out of 10,000 (1 in 1,000).
            The drawing takes place {MINT.drawingLabel} using ORAO VRF (verifiable on-chain
            randomness), with results posted on X along with a link to verify them on-chain. If all 10,000 entries are not sold by then, the drawing
            will be delayed until sold out, with the new date announced on X. Prizes will be sent in
            USDC to the winning wallet as soon as possible, within 1 hour after the drawing; no
            claim necessary. All sales final, no refunds. Winners are solely responsible for all
            applicable taxes. Must be 18+ or the age of majority where you live. Void where
            prohibited; residents of restricted jurisdictions may not participate. Solana network
            fees not included. Digital assets carry risks, including smart-contract, wallet and
            network failure. Not affiliated with Solana or Circle.
          </p>
        </div>
      </footer>
      </div>
    </>
  );
}
