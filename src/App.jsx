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

      <div className="page">
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
                  <strong>${MINT.priceUsdc} <small>USDC</small></strong>
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
                <p className="prizes-sub">10 winners · $10,000 each</p>
              </div>

              <div className="body-block">
              <ol className="prizes prizes--grid">
                {PRIZES.map(([place, amount]) => (
                  <li key={place} className="card prize">
                    <span>{place}</span>
                    <strong>{amount}</strong>
                  </li>
                ))}
              </ol>

              <div className="card you-mint">
                <span className="label">You mint</span>
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
                  Your Gold Frame is your entry in the draw, and your mint number is your entry
                  number. It also marks you as a founding member of the 1-Earth community: a
                  permanent badge in your wallet showing you were here from the start. It can’t be
                  transferred or sold. Each entry also includes 10,000 $ONE, to be distributed to your
                  wallet at a later date (TBA), for use within the 1-Earth protocol. $ONE is not an
                  investment and has no guaranteed value.
                </p>
              </div>
              </div>
            </section>
          </div>

          <div className="split">
            <div className="card big-figure">
              <span className="label label--lg">Prize pool</span>
              <strong>$100,000</strong>
              <p>$10 of every mint goes to the prize pool</p>
            </div>
            <div className="card big-figure">
              <span className="label label--lg">Operations &amp; development</span>
              <strong>$100,000</strong>
              <p>$10 of every mint supports the 1-Earth protocol</p>
            </div>
          </div>

          <div className="card drawing">
            <span className="label label--lg">The drawing</span>
            <p className="drawing__main">
              Takes place {MINT.drawingLabel}, live on X. If all 10,000 entries aren’t sold by then,
              the drawing will be delayed until sold out, with the new date announced on X.
            </p>
            <p className="drawing__sub">
              Winners are picked with Switchboard VRF, verifiable on-chain randomness anyone can
              check. Prizes are paid in USDC to the winning wallet.
            </p>
          </div>
        </main>
      </div>

      <footer className="footer">
        <div className="page">
          <span className="pill">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            Costa Rica–based protocol
          </span>
          <p className="legal">
            <strong>Important:</strong> For informational purposes only. Not an offer to sell, or a
            solicitation of an offer to buy, any security or investment. 1-Earth is a protocol based
            in Costa Rica. Soulbound tokens are non-transferable entries with no expectation of
            profit, resale or redemption value. Odds: 10 winning entries out of 10,000 (1 in 1,000).
            The drawing takes place {MINT.drawingLabel}, live on X, using Switchboard VRF
            (verifiable on-chain randomness). If all 10,000 entries are not sold by then, the drawing
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
    </>
  );
}
