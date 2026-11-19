// /demo/whitepaper: the 1-Earth white paper. Placeholder until the text is written.
import { useEffect } from "react";

export default function WhitePaper() {
  useEffect(() => { document.title = "White Paper · 1-Earth"; }, []);
  return (
    <div className="tc">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Demo · coming soon</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>
      <main className="tc-main">
        <div className="tc-card">
          <span className="tc-badge">Coming soon</span>
          <h1 className="rp-grad">White Paper</h1>
          <p>Our full white paper, including how the protocol, drawings and payouts work, is being finalized with our team.</p>
        </div>
      </main>
    </div>
  );
}
