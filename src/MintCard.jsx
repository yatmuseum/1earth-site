import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { MINT, currentMax } from "./config.js";

export default function MintCard({ minted = 0 }) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [now, setNow] = useState(() => new Date());
  const [qty, setQty] = useState(1);

  // Re-check the clock every 30 seconds so limits update as phases change.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const max = currentMax(now);
  const isOpen = now >= MINT.opensAt;
  useEffect(() => setQty((q) => Math.min(Math.max(q, 1), max)), [max]);

  const total = qty * MINT.priceUsdc;
  const pct = Math.min(100, (minted / MINT.supply) * 100);

  let button;
  if (!connected) {
    button = (
      <button className="buy" onClick={() => setVisible(true)}>
        Connect Wallet to Buy Entries
      </button>
    );
  } else if (!isOpen) {
    button = <button className="buy" disabled>Mint opens {MINT.opensLabel}</button>;
  } else if (!MINT.live) {
    button = <button className="buy" disabled>Minting isn’t live yet</button>;
  } else {
    button = (
      <button className="buy buy--live" onClick={() => alert("Mint not connected yet")}>
        Buy {qty} {qty === 1 ? "Entry" : "Entries"}
      </button>
    );
  }

  return (
    <div className="card mint">
      <div className="mint__row">
        <span className="mint__label">Minted</span>
        <span className="mint__count">
          {minted.toLocaleString()} / {MINT.supply.toLocaleString()}
        </span>
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={MINT.supply} aria-valuenow={minted}>
        <span style={{ width: `${pct}%` }} />
      </div>

      <div className="mint__entries">
        <div>
          <span className="mint__label">Entries</span>
          <p className="mint__rule">
            Max 1 for the first 24 hours,
            <br />
            10 for the next 24 hours, then 100
          </p>
        </div>
        <div className="stepper">
          <button aria-label="Fewer entries" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
          <output aria-live="polite">{qty}</output>
          <button aria-label="More entries" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max}>+</button>
        </div>
      </div>

      <div className="mint__total">
        <span>Total</span>
        <strong>${total.toLocaleString()} USDC</strong>
      </div>

      {button}

      <p className="mint__fine">Paid in USDC on Solana · Network fees not included · All sales final</p>
    </div>
  );
}
