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
          <p>Our full terms, including eligibility and the countries where 1-Earth is available, are being finalized with our legal team.</p>
        </div>
      </main>
    </div>
  );
}
