import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import { MINT } from "./config.js";
import { useStatus, refreshStatus, setStatusLocally } from "./status.js";

const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isBusy = (e) => /429|too many|rate limit|busy/i.test(String(e?.message || e));

// Runs a network call; if the network is busy, waits a little and tries again
// (with some randomness, so a crowd of buyers doesn't retry in lockstep).
async function withRetry(fn, tries = 6) {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (!isBusy(e) || i >= tries - 1) throw e;
      await sleep(800 * 2 ** Math.min(i, 3) + Math.random() * 800);
    }
  }
}

// Sends a signed transaction and waits until it's confirmed. Checks every 2
// seconds, re-sends about every 6 seconds in case the network dropped it, and
// gives up once the transaction can no longer land (then nothing was charged).
async function sendAndConfirm(connection, raw, lastValidBlockHeight) {
  const sig = await withRetry(() => connection.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 2 }));
  for (let i = 0; ; i++) {
    await sleep(2000);
    let st;
    try { st = (await connection.getSignatureStatuses([sig])).value[0]; }
    catch (e) { if (isBusy(e)) continue; throw e; }
    if (st?.err) {
      const e = new Error(`On-chain error: ${JSON.stringify(st.err)}`);
      e.sig = sig;
      throw e;
    }
    if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return sig;
    if (i % 3 === 2) {
      try {
        const height = await connection.getBlockHeight("confirmed");
        if (height > lastValidBlockHeight) throw new Error("It expired before confirming, so it wasn’t charged.");
        connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {});
      } catch (e) { if (!isBusy(e)) throw e; }
    }
  }
}

// Opens X with a ready-to-post message (the buyer can edit it before posting).
function shareUrl() {
  const text = "I just minted my 1-Earth 🌍 Gold Frame 🖼️ and became a founding member of the @1earthh community. " +
    "Join me in the 50/50 draw on November 18th @ 11:11 EST.";
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://1-earth.io")}`;
}

export default function MintCard() {
  const { connection } = useConnection();
  const { connected, publicKey, signAllTransactions, signTransaction, wallet } = useWallet();
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
  const max = status?.phaseMax ?? 5;
  const opensAt = status ? Date.parse(status.opensAt) : MINT.opensAt.getTime();
  const isOpen = now >= opensAt;
  const live = status?.live ?? false;
  const soldOut = minted >= supply;

  useEffect(() => setQty((q) => Math.min(Math.max(q, 1), max)), [max]);

  const pct = Math.min(100, (minted / supply) * 100);
  const total = qty * price;

  async function buy() {
    let done = 0;
    let perTx = [];
    setBusy(true);
    setMessage({ kind: "info", text: "Preparing your Gold Frames…" });
    try {
      // If the server says it's busy, wait a moment and try again automatically.
      let r, data;
      for (let i = 0; i < 4; i++) {
        r = await fetch("/api/mint", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            buyer: publicKey.toBase58(), quantity: qty, acceptedTerms: agreed, wallet: wallet?.adapter?.name || "",
          }),
        });
        data = await r.json().catch(() => ({}));
        if (r.status !== 503 && r.status !== 429) break;
        setMessage({ kind: "info", text: "The mint is busy. Retrying in a moment…" });
        await sleep(1500 * (i + 1) + Math.random() * 1500);
      }
      if (!r.ok) throw new Error(data.error || "The mint is very busy. Please try again in a few seconds.");

      perTx = data.perTx || [];
      const txs = data.transactions.map((b) => VersionedTransaction.deserialize(fromBase64(b)));
      const validUntil = txs.map(() => data.lastValidBlockHeight);
      // Phantom's safety scanner prefers one signing request at a time, so for
      // Phantom each transaction is approved, then sent, before the next one.
      // Other wallets approve the whole purchase in a single popup.
      // Every wallet approves one transaction at a time, each after the previous
      // one has landed. Wallets check each transaction against the current
      // balance, so approving several together can make the later ones fail.
      // (Purchases of up to 5 are a single transaction, so still one approval.)
      const oneAtATime = Boolean(signTransaction);
      if (!signTransaction && !signAllTransactions) {
        throw new Error("This wallet can’t sign transactions here. Try MetaMask, Phantom, Solflare or Backpack.");
      }
      let signedAll = null;
      if (!oneAtATime) {
        setMessage({ kind: "info", text: txs.length > 1
          ? `Approve ${txs.length} transactions in your wallet…`
          : "Approve the transaction in your wallet…" });
        signedAll = await signAllTransactions(txs);
      }

      for (let i = 0; i < txs.length; i++) {
        let signedTx;
        if (oneAtATime) {
          if (i > 0) {
            // Get a fresh copy of the next transaction (they expire after about a minute).
            setMessage({ kind: "info", text: `Preparing transaction ${i + 1} of ${txs.length}…` });
            const nx = await withRetry(async () => {
              const res = await fetch("/api/next", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ticket: data.tickets[i] }),
              });
              const out = await res.json().catch(() => ({}));
              if (res.status === 429 || res.status === 503) throw new Error("busy");
              if (!res.ok) {
                const through = perTx.slice(0, done).reduce((a, b) => a + b, 0);
                throw new Error(`${out.error || "Couldn’t prepare the next transaction."} (${through} Gold Frame${through === 1 ? "" : "s"} already in your wallet.)`);
              }
              return out;
            });
            txs[i] = VersionedTransaction.deserialize(fromBase64(nx.tx));
            data.tickets[i] = nx.ticket;
            validUntil[i] = nx.lastValidBlockHeight;
          }
          setMessage({ kind: "info", text: txs.length > 1
            ? `Approve transaction ${i + 1} of ${txs.length} in your wallet…`
            : "Approve the transaction in your wallet…" });
          try { signedTx = await signTransaction(txs[i]); }
          catch (e) {
            if (done > 0) {
              const through = perTx.slice(0, done).reduce((a, b) => a + b, 0);
              throw new Error(`Stopped after ${through} Gold Frame${through === 1 ? "" : "s"}; those are in your wallet and the rest weren’t charged.`);
            }
            throw e;
          }
        } else {
          signedTx = signedAll[i];
        }
        setMessage({ kind: "info", text: `Confirming ${done + 1} of ${txs.length}…` });
        try {
          // Your wallet signed first; now the server checks the transaction and
          // adds its own signature before it's sent.
          const signedB64 = btoa(String.fromCharCode(...signedTx.serialize()));
          const c = await withRetry(async () => {
            const res = await fetch("/api/cosign", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ tx: signedB64, ticket: data.tickets[i] }),
            });
            const out = await res.json().catch(() => ({}));
            if (res.status === 429 || res.status === 503) throw new Error("busy");
            if (!res.ok) throw new Error(out.error || "Couldn’t finish the transaction.");
            return out;
          });
          await sendAndConfirm(connection, fromBase64(c.tx), validUntil[i]);
        } catch (err) {
          const logs = err?.logs || err?.transactionLogs || [];
          console.error("Mint transaction failed", { index: done + 1, sig: err?.sig, err, logs });
          const reason = logs.find((l) => /error|failed|insufficient/i.test(l)) || String(err?.message || err).split("\n")[0];
          const through = perTx.slice(0, done).reduce((a, b) => a + b, 0);
          throw new Error(`Transaction ${done + 1} of ${txs.length} failed${done ? ` (your first ${through} entries went through)` : ""}. Reason: ${reason}`);
        }
        done++;
      }
      setMessage({ kind: "success", count: qty, text: `Done! ${qty} Gold Frame${qty === 1 ? "" : "s"} minted to your wallet.` });
      setStatusLocally((s) => ({ ...s, minted: (s.minted ?? 0) + qty })); // show it right away
      setTimeout(refreshStatus, 16000); // then confirm from the chain
    } catch (e) {
      const text = /reject|cancel/i.test(e.message) ? "You cancelled in your wallet. Nothing was charged." : e.message;
      setMessage({ kind: "error", text });
      const kept = Math.min(qty, perTx.slice(0, done).reduce((a, b) => a + b, 0));
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
            Max 1 per wallet first 24 hrs,
            <br />
            5 next 72 hrs, then 50
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
      {message?.kind === "success" && (
        <a className="mint__share" href={shareUrl()} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3.2l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/>
          </svg>
          Share on X
        </a>
      )}

      <p className="mint__fine">Paid in USDC on Solana · Network fees not included · All sales final</p>
    </div>
  );
}
