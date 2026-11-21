// /demo/how-to-play: a step-by-step guide from zero to a first entry, in the Solana theme.
// Four tabs keep the whole guide on one screen on computers.
import { useEffect, useState } from "react";

const TABS = ["Step by step", "Safety and security"];


const STEPS = [
  ["Get a wallet", [
    <>Download <b>MetaMask</b>, <b>Phantom</b>, <b>Solflare</b> or <b>Backpack</b> from the official website or your phone’s app store.</>,
    <>Tap <b>Create new wallet</b> and set a password.</>,
    <>Write your <b>recovery phrase</b> (12 or 24 words) on paper and keep it somewhere safe.</>,
  ], <>Never share your recovery phrase. Anyone who has it can take everything. 1-Earth will never ask for it.</>],
  ["Add USDC and SOL", [
    <>You need <b>10 USDC per entry</b> (up to 100 per draw) and a little <b>SOL</b>, about $1 worth, for network fees.</>,
    <><b>In your wallet:</b> tap <b>Buy</b>, choose <b>USDC (Solana)</b> and pay by card or bank. Buy SOL the same way.</>,
    <><b>Or from an exchange:</b> withdraw USDC and SOL to your wallet’s Solana address. Send a small test first.</>,
    <><b>Fees vary:</b> some apps and exchanges charge to buy or send USDC. Paying by bank transfer is usually cheapest, but the funds may be held for a few days before you can send them.</>,
  ], <>Always pick the <b>Solana</b> network. Sending on another network can lose the money for good.</>],
  ["Connect", [
    <>Go to <b>1-earth.io</b>. Type it yourself or use a bookmark, never a link from a message.</>,
    <>Tap <b>Connect wallet</b> and choose your wallet.</>,
    <>Approve the connection in your wallet.</>,
  ]],
  ["Mint your entries", [
    <>Choose how many entries to mint: <b>10 USDC</b> each, up to <b>100 per draw</b>.</>,
    <>Tap <b>Play</b>, check the total and approve it in your wallet.</>,
    <>Each entry is minted to your wallet as a soulbound token. Its <b>edition number is your ticket number</b>.</>,
  ]],
  ["Wait for the draw", [
    <>The draw happens every <b>Saturday at 15:11 UTC</b>.</>,
    <>Winners are picked on-chain with verifiable randomness from ORAO VRF.</>,
    <>Entries close before the draw. Anything minted after goes into next week’s.</>,
  ]],
  ["Get paid and cash out", [
    <>If you win, your prize is sent <b>straight to your wallet</b> in USDC. There’s nothing to claim. Check results on <a href="/PastDraws">Past Draws</a>.</>,
    <><b>To cash out:</b> on your exchange, tap <b>Deposit</b>, pick <b>USDC on Solana</b> and copy the address. Send your USDC there, then sell and withdraw to your bank.</>,
    <>Prize winnings may be taxable where you live. Keep a record of what you win.</>,
  ]],
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
            <div className="hp-steps">
              {STEPS.map(([t, items, warn], i) => (
                <div key={t} className="hp-card hp-step">
                  <div className="hp-step-head"><span className="hp-num">{i + 1}</span><h3>{t}</h3>{i === 0 && <em>once</em>}</div>
                  <ul>{items.map((x, k) => <li key={k}>{x}</li>)}</ul>
                  {warn && <p className="hp-warn"><span>{warn}</span></p>}
                </div>
              ))}
            </div>
          )}

          {tab === 1 && (
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
