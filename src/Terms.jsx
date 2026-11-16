// /demo/terms: Terms & Conditions placeholder until the final terms are ready.
import { useEffect } from "react";

export default function Terms() {
  useEffect(() => { document.title = "Terms & Conditions · 1-Earth"; }, []);
  return (
    <div className="tc">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Demo · coming soon</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>
      <main className="tc-main">
        <div className="tc-card">
          <span className="tc-badge">Coming soon</span>
          <h1 className="rp-grad">Terms &amp; Conditions</h1>
          <p>Our full terms, including eligibility, the countries where 1-Earth is available, and how drawings and payouts work, are being finalized with our legal team.</p>
          <p className="tc-sub">Check back soon. In the meantime, these pages explain how everything works:</p>
          <div className="tc-links">
            <a href="/demo/how-to-play">How to Play →</a>
            <a href="/demo/how-it-works">How it Works →</a>
            <a href="/demo/provably-fair">Provably Fair →</a>
            <a href="/demo/support">Support →</a>
          </div>
        </div>
      </main>
    </div>
  );
}
