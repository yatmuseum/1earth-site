// /demo/whitepaper: the 1-Earth protocol white paper (draft), with a cover, contents, and the PDF.
import { useEffect } from "react";

const PDF = "/1-Earth-White-Paper.pdf";
const SECTIONS = [
  "Introduction", "Protocol overview", "Prize pool and payout model", "Fairness and randomness",
  "Verification guide", "Smart contract architecture and tech stack", "Security model",
  "Responsible play and player protection", "XP loyalty program", "Sustainability and operations",
  "Legal and regulatory considerations", "Risks and disclosures", "Roadmap", "Conclusion",
];
const APPENDICES = ["Full payout tables", "Glossary", "Contract addresses", "Audit reports"];

export default function WhitePaper() {
  useEffect(() => { document.title = "White Paper · 1-Earth"; }, []);
  return (
    <div className="wp">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Draft · November 2026</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>

      <main className="wp-main">
        <a className="wp-cover" href={PDF} target="_blank" rel="noopener noreferrer" aria-label="Open the 1-Earth white paper (PDF)">
          <div className="wp-sheet">
            <img src="/globe.webp" alt="" className="wp-globe" />
            <p className="wp-kicker">1-Earth Protocol</p>
            <h2>White Paper</h2>
            <p className="wp-sub">A weekly, verifiable lottery on Solana. 100% of every entry to the prize pool.</p>
            <div className="wp-sheet-foot"><span>Draft</span><span>November 2026</span></div>
          </div>
          <div className="wp-sheet wp-sheet--back" aria-hidden="true" />
          <div className="wp-sheet wp-sheet--back2" aria-hidden="true" />
        </a>

        <section className="wp-info">
          <h1 className="rp-grad">White Paper</h1>
          <p className="wp-lead">How the 1-Earth protocol works: the weekly draw, the payout model, how anyone can verify a result, and the low-cost technology behind it. This is a working draft; the audit and legal review are still to come.</p>
          <div className="wp-actions">
            <a className="rp-btn wp-btn" href={PDF} target="_blank" rel="noopener noreferrer">Read the white paper</a>
            <a className="wp-btn2" href={PDF} download="1-Earth-White-Paper.pdf">Download PDF</a>
            <span className="wp-meta">PDF, 21 pages</span>
          </div>

          <div className="wp-toc">
            <h3>Contents</h3>
            <ol>{SECTIONS.map((t) => <li key={t}>{t}</li>)}</ol>
            <ol className="wp-apx" type="A">{APPENDICES.map((t) => <li key={t}>{t}</li>)}</ol>
          </div>
        </section>
      </main>
    </div>
  );
}
