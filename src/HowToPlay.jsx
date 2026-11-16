// /demo/how-to-play: a step-by-step guide from zero to a first entry, in the Solana theme.
// Four tabs keep the whole guide on one screen on computers.
import { useEffect, useState } from "react";

const TABS = ["What you need", "Step by step", "Send and receive", "Safety and security"];

const NEED = [
  ["×1", "A Solana wallet", "A free app like Phantom, Solflare or Backpack."],
  ["10 USDC", "USDC on Solana", "10 USDC per entry. Up to 100 entries (1,000 USDC) per draw."],
  ["~1 USDC", "A little SOL", "Pays the network fee, a fraction of a cent per entry. About 1 USDC worth lasts a long time."],
  ["18+", "An eligible country", "You must be of legal age and live where 1-Earth is available. See the Terms & Conditions."],
];

const STEPS = [
  ["Get a wallet", [
    <>Download <b>Phantom</b>, <b>Solflare</b> or <b>Backpack</b> from the official website or your phone’s app store.</>,
    <>Tap <b>Create new wallet</b> and set a password.</>,
    <>Write your <b>recovery phrase</b> (12 or 24 words) on paper and keep it somewhere safe.</>,
  ], <>Never share your recovery phrase. Anyone who has it can take everything. 1-Earth will never ask for it.</>],
  ["Add USDC and SOL", [
    <><b>In your wallet:</b> tap <b>Buy</b>, choose <b>USDC (Solana)</b> and pay with a card or bank. Buy a little <b>SOL</b> the same way.</>,
    <><b>Or on an exchange:</b> buy USDC and a little SOL, tap <b>Withdraw</b>, paste your wallet’s Solana address and pick the <b>Solana</b> network.</>,
    <>Send a small test amount first, then the rest.</>,
  ], <>Always pick the <b>Solana</b> network. Sending on another network can lose the money for good.</>],
  ["Connect", [
    <>Go to <b>1-earth.io</b>. Type it yourself or use a bookmark, never a link from a message.</>,
    <>Tap <b>Connect wallet</b> and choose your wallet.</>,
    <>Approve the connection in your wallet.</>,
  ]],
  ["Pick your entries", [
    <>Choose how many entries you want: <b>10 USDC</b> each, up to <b>100 per draw</b>.</>,
    <>Tap <b>Play</b>, check the total and approve it in your wallet.</>,
    <>Each entry arrives as a soulbound token. Its <b>edition number is your ticket number</b>.</>,
  ]],
  ["Wait for the draw", [
    <>The draw happens every <b>Saturday at 11:11 AM ET</b>.</>,
    <>Winners are picked on-chain with verifiable randomness from ORAO VRF.</>,
    <>Entries close before the draw. Anything after goes into next week’s.</>,
  ]],
  ["Get paid", [
    <>If you win, your prize is sent <b>straight to your wallet</b> in USDC. There’s nothing to claim.</>,
    <>Check results anytime on <a href="/PastDraws">Past Draws</a>.</>,
    <>To cash out, send USDC to an exchange and withdraw to your bank.</>,
  ]],
];

const MONEY = [
  ["Receive", ["Open your wallet and tap Receive.", "Pick USDC on Solana.", "Share your address or QR code with whoever is sending. It’s safe to share: it only lets people send to you."]],
  ["Send", ["Tap Send and choose USDC.", "Paste the address and check that the whole address matches.", "Enter the amount and confirm the network is Solana.", "New address? Send a small test first, then the rest."]],
  ["Cash out", ["On your exchange, tap Deposit, pick USDC on the Solana network and copy the address.", "Send your USDC there from your wallet.", "Sell for your local currency and withdraw to your bank."]],
];
const ADDR_TIPS = [
  [true, "Copy and paste or scan the QR code. Never type an address by hand."],
  [true, "Check the whole address, every character, against the one you meant to send to."],
  [true, "Save trusted addresses in your wallet’s address book."],
  [true, "A Solana address is 32 to 44 letters and numbers. One starting with 0x is a different network."],
  [true, "Send a small test to any new address and confirm it arrived."],
  [true, "Verify on the blockchain: open the transaction in Solscan or Solana Explorer."],
  [false, "Don’t copy from your transaction history. Scammers send tiny amounts from look-alike addresses."],
  [false, "Re-check after pasting. Some malware swaps the address in your clipboard."],
];

const HABITS = [
  [true, "Check the URL", "The only official site is 1-earth.io. Bookmark it."],
  [false, "Never share your recovery phrase", "Not with support, not with anyone, ever."],
  [false, "Ignore DMs", "1-Earth will never message you first or ask you to “verify” a wallet."],
  [true, "Read before approving", "Check the amount in your wallet before you tap Approve."],
];
const SAFETY = [
  ["Protect your wallet", ["Keep your recovery phrase on paper, offline. No screenshots, notes apps, email or cloud.", "Lock your wallet with a strong password and your phone’s Face ID or fingerprint.", "Holding a lot? Use a hardware wallet for savings and a separate wallet for playing.", "Keep your phone, browser and wallet app up to date."]],
  ["Spot a scam", ["Look-alike websites with small spelling changes, like 1-earth.co or one-earth.io.", "Anyone offering to “help”, “verify” or “unlock” your wallet. Real support never asks for your phrase.", "Surprise tokens or NFTs with a link to “claim”. Ignore them and never open the link.", "Promises of guaranteed wins, insider tips or doubled money."]],
  ["If something goes wrong", ["Think your phrase was exposed? Create a new wallet right away and move everything into it.", "Approved something you don’t recognize? Use your wallet’s revoke or security settings to remove access.", "Blockchain transfers can’t be reversed, so check before you send.", "Need help? Use the Support page on 1-earth.io only."]],
];

export default function HowToPlay() {
  const [tab, setTab] = useState(0);
  useEffect(() => { document.title = "How to Play · 1-Earth"; }, []);
  return (
    <div className="hp">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Demo · how the protocol will work</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>

      <main className="hp-main">
        <section className="hp-hero">
          <div>
            <h1 className="rp-grad">How to Play</h1>
            <div className="hp-chips"><span>6 steps</span><span>About 10 minutes the first time</span><span>1 minute after that</span></div>
          </div>
          <div className="hp-hero-r">
            <p>A step-by-step guide from zero to your first entry: what you need, how to get it, and what happens after you enter.</p>
            <a href="/demo" className="rp-btn hp-go">Enter the draw</a>
          </div>
        </section>

        <div className="hp-tabs" role="tablist" aria-label="Guide sections">
          {TABS.map((t, i) => <button key={t} role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => setTab(i)}><i>{i + 1}</i>{t}</button>)}
        </div>

        <div className="hp-panel">
          {tab === 0 && (
            <div className="hp-need">
              <p className="hp-lead">Check you have everything before you start.</p>
              <div className="hp-need-grid">
                {NEED.map(([big, t, d], i) => <div key={t} className="hp-card hp-need-card"><span className="hp-num">{i + 1}</span><b className="hp-big">{big}</b><h3>{t}</h3><p>{d}</p></div>)}
              </div>
              <div className="hp-card hp-next">
                <p><b>Got everything?</b> Head to <b>Step by step</b>. Steps 1 and 2 are once only; after that, every entry is steps 3 to 6.</p>
                <button className="hp-link" onClick={() => setTab(1)}>Step by step →</button>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="hp-steps">
              {STEPS.map(([t, items, warn], i) => (
                <div key={t} className="hp-card hp-step">
                  <div className="hp-step-head"><span className="hp-num">{i + 1}</span><h3>{t}</h3>{i < 2 && <em>once</em>}</div>
                  <ul>{items.map((x, k) => <li key={k}>{x}</li>)}</ul>
                  {warn && <p className="hp-warn">{warn}</p>}
                </div>
              ))}
            </div>
          )}

          {tab === 2 && (
            <div className="hp-money">
              <p className="hp-lead">Your wallet works like a bank account only you control. Crypto transfers can’t be reversed, so a few seconds of checking matters.</p>
              <div className="hp-money-grid">
                {MONEY.map(([t, steps]) => (
                  <div key={t} className="hp-card hp-mcard"><h3>{t}</h3><ol>{steps.map((x) => <li key={x}>{x}</li>)}</ol>
                    {t === "Cash out" && <p className="hp-note">Prize winnings may be taxable where you live. Keep a record of what you win.</p>}
                  </div>
                ))}
              </div>
              <div className="hp-card hp-addr">
                <div className="hp-addr-l">
                  <h3>Check the address before you send</h3>
                  <div className="hp-cmp"><span>Should be</span><code>9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin</code></div>
                  <div className="hp-cmp ok"><span>Pasted</span><code>9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin</code><i>✓</i></div>
                  <div className="hp-cmp bad"><span>Look-alike</span><code>9xQeWv<mark>a3Kp71TzLq4dRw9nB8cYh2mXs</mark>PusVFin</code><i>✕</i></div>
                  <small>Scammers create addresses that start and end the same way. Always check the whole address.</small>
                </div>
                <ul className="hp-tips">{ADDR_TIPS.map(([ok, t]) => <li key={t} className={ok ? "ok" : "bad"}>{t}</li>)}</ul>
              </div>
            </div>
          )}

          {tab === 3 && (
            <div className="hp-safe">
              <p className="hp-lead">Scammers copy popular sites and pretend to be support. These habits keep your money where it belongs.</p>
              <div className="hp-habits">
                {HABITS.map(([ok, t, d]) => <div key={t} className={"hp-card hp-habit " + (ok ? "ok" : "bad")}><i>{ok ? "✓" : "✕"}</i><h3>{t}</h3><p>{d}</p></div>)}
              </div>
              <div className="hp-safe-grid">
                {SAFETY.map(([t, items]) => (
                  <div key={t} className="hp-card hp-scard"><h3>{t}</h3><ul>{items.map((x) => <li key={x}>{x.includes("Support page") ? <>Need help? Use the <a href="/demo/support">Support</a> page on 1-earth.io only.</> : x}</li>)}</ul></div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="hp-foot">Buying crypto through a wallet or exchange is done with those companies, not 1-Earth, and their fees and country availability apply. Play responsibly: set limits or take a break on the <a href="/demo/responsible-play">Responsible play</a> page.</p>
      </main>
    </div>
  );
}
