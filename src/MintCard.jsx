import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import { MINT } from "./config.js";
import { useStatus, refreshStatus, setStatusLocally } from "./status.js";

const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sends a signed transaction and waits until it's confirmed, re-sending it
// every couple of seconds in case the network dropped it. Gives up once the
// transaction can no longer land (then nothing was charged for it).
async function sendAndConfirm(connection, raw, lastValidBlockHeight) {
  const sig = await connection.sendRawTransaction(raw, { maxRetries: 0 });
  for (let i = 0; ; i++) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const st = value[0];
    if (st?.err) {
      const e = new Error(`On-chain error: ${JSON.stringify(st.err)}`);
      e.sig = sig;
      throw e;
    }
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return sig;
    if (i % 3 === 2) {
      const height = await connection.getBlockHeight("confirmed");
      if (height > lastValidBlockHeight) throw new Error("It expired before confirming, so it wasn’t charged.");
      connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {});
    }
    await sleep(1000);
  }
}

export default function MintCard() {
  const { connection } = useConnection();
  const { connected, publicKey, signAllTransactions, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const status = useStatus();
  const [qty, setQty] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { kind: "info" | "error" | "success", text }
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const b = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(b);
  }, []);

  const price = status?.priceUsdc ?? MINT.priceUsdc;
  const supply = status?.supply ?? MINT.supply;
  const minted = status?.minted ?? 0;
  const max = status?.phaseMax ?? 1;
  const opensAt = status ? Date.parse(status.opensAt) : MINT.opensAt.getTime();
  const isOpen = now >= opensAt;
  const live = status?.live ?? false;
  const soldOut = minted >= supply;

  useEffect(() => setQty((q) => Math.min(Math.max(q, 1), max)), [max]);

  const pct = Math.min(100, (minted / supply) * 100);
  const total = qty * price;

  async function buy() {
    let done = 0;
    setBusy(true);
    setMessage({ kind: "info", text: "Preparing your Gold Frames…" });
    try {
      const r = await fetch("/api/mint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buyer: publicKey.toBase58(), quantity: qty, acceptedTerms: agreed }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Couldn’t prepare the mint.");

      const txs = data.transactions.map((b) => VersionedTransaction.deserialize(fromBase64(b)));
      setMessage({ kind: "info", text: txs.length > 1
        ? `Approve ${txs.length} transactions in your wallet…`
        : "Approve the transaction in your wallet…" });
      // Most wallets approve all transactions in one popup. If a wallet can't,
      // fall back to approving them one at a time.
      let signed;
      if (signAllTransactions) signed = await signAllTransactions(txs);
      else if (signTransaction) {
        signed = [];
        for (const tx of txs) signed.push(await signTransaction(tx));
      } else throw new Error("This wallet can’t sign transactions here. Try Phantom, Solflare or Backpack.");

      for (const tx of signed) {
        setMessage({ kind: "info", text: `Confirming ${done + 1} of ${signed.length}…` });
        try {
          await sendAndConfirm(connection, tx.serialize(), data.lastValidBlockHeight);
        } catch (err) {
          const logs = err?.logs || err?.transactionLogs || [];
          console.error("Mint transaction failed", { index: done + 1, sig: err?.sig, err, logs });
          const reason = logs.find((l) => /error|failed|insufficient/i.test(l)) || String(err?.message || err).split("\n")[0];
          throw new Error(`Transaction ${done + 1} of ${signed.length} failed${done ? ` (your first ${done * 3} entries went through)` : ""}. Reason: ${reason}`);
        }
        done++;
      }
      setMessage({ kind: "success", text: `Done! ${qty} Gold Frame${qty === 1 ? "" : "s"} minted to your wallet.` });
      setStatusLocally((s) => ({ ...s, minted: (s.minted ?? 0) + qty })); // show it right away
      setTimeout(refreshStatus, 16000); // then confirm from the chain
    } catch (e) {
      const text = /reject|cancel/i.test(e.message) ? "You cancelled in your wallet. Nothing was charged." : e.message;
      setMessage({ kind: "error", text });
      const kept = Math.min(qty, done * 3);
      if (kept) setStatusLocally((s) => ({ ...s, minted: (s.minted ?? 0) + kept }));
    } finally {
      setBusy(false);
    }
  }

  let button;
  if (!connected) {
    button = <button className="buy" onClick={() => setVisible(true)}>Connect Wallet to Buy Entries</button>;
  } else if (!isOpen) {
    button = <button className="buy" disabled>Mint opens {MINT.opensLabel}</button>;
  } else if (!live) {
    button = <button className="buy" disabled>Minting isn’t live yet</button>;
  } else if (soldOut) {
    button = <button className="buy" disabled>Sold out</button>;
  } else {
    button = (
      <button className="buy buy--live" onClick={buy} disabled={!agreed || busy}>
        {busy ? "Minting…" : `Buy ${qty} ${qty === 1 ? "Entry" : "Entries"}`}
      </button>
    );
  }

  const canBuyNow = connected && isOpen && live && !soldOut;

  return (
    <div className="card mint">
      <div className="mint__row">
        <span className="mint__label">Minted</span>
        <span className="mint__count">{minted.toLocaleString()} / {supply.toLocaleString()}</span>
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={supply} aria-valuenow={minted}>
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
          <button aria-label="Fewer entries" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || busy}>−</button>
          <output aria-live="polite">{qty}</output>
          <button aria-label="More entries" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max || busy}>+</button>
        </div>
      </div>

      <div className="mint__total">
        <span>Total</span>
        <strong>${total.toLocaleString()} USDC</strong>
      </div>

      {canBuyNow && (
        <label className="mint__terms">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={busy} />
          <span>
            I confirm I’m 18 or older (or the age of majority where I live) and I’m not located in, or a
            resident of, a restricted jurisdiction, and that I’m solely responsible for any taxes on
            winnings.
          </span>
        </label>
      )}

      {button}

      {message && <p className={`mint__msg mint__msg--${message.kind}`} role="status">{message.text}</p>}

      <p className="mint__fine">Paid in USDC on Solana · Network fees not included · All sales final</p>
    </div>
  );
}
