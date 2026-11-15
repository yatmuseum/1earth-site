// /demo/support: the help-center request form, in the Solana theme. A preview: requests aren't sent yet.
import { useEffect, useRef, useState } from "react";

const TOPICS = []; // to be filled in (the topic list is still being decided)
const MAX_MB = 10;
const OK_TYPES = /^(image\/|application\/pdf$|text\/)/;

export default function Support() {
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState("");
  const pick = useRef(null);

  useEffect(() => { document.title = "Support · 1-Earth"; }, []);

  const addFiles = (list) => {
    const good = [], bad = [];
    [...list].forEach((f) => (OK_TYPES.test(f.type) && f.size <= MAX_MB * 1024 * 1024 ? good : bad).push(f));
    setFiles((cur) => [...cur, ...good].slice(0, 10));
    setNote(bad.length ? `Skipped ${bad.length} file${bad.length > 1 ? "s" : ""}: only images, PDFs or text files up to ${MAX_MB} MB each.` : "");
  };
  const send = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setNote("Please enter a valid email address.");
    if (!topic) return setNote("Please choose a topic.");
    if (!details.trim()) return setNote("Please describe your issue.");
    setNote("Demo only: requests aren’t sent yet.");
  };

  return (
    <div className="sp">
      <div className="page"><header className="topbar">
        <div className="site-brand"><a href="/" className="brand"><img src="/globe.webp" alt="" width="46" height="46" /><span>1-Earth</span></a><span className="rp-preview">Demo · requests aren’t sent yet</span></div>
        <a href="/demo" className="rp-back">← Back to demo</a>
      </header></div>

      <main className="sp-main">
        <section className="sp-head">
          <div>
            <p className="sp-kicker">Help Center</p>
            <h1 className="rp-grad">Submit a request</h1>
          </div>
          <p className="sp-reply">We’ll reply by email.</p>
        </section>

        <div className="sp-row">
          <label className="sp-field">
            <span className="sp-lbl">Your email address<i>*</i></span>
            <input className="rp-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="sp-field">
            <span className="sp-lbl">What can we help with?<i>*</i></span>
            <span className="sp-select">
              <select className="rp-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="" disabled>Select a topic</option>
                {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                {!TOPICS.length && <option value="general">General question</option>}
              </select>
            </span>
          </label>
        </div>

        <label className="sp-field sp-grow">
          <span className="sp-lbl">Additional details<i>*</i></span>
          <textarea className="rp-input sp-text" placeholder="Describe your issue." value={details} onChange={(e) => setDetails(e.target.value)} />
          <span className="sp-hint">Include as much as you can.</span>
        </label>

        <div className="sp-attach">
          <span className="sp-lbl">Attachments <small>· images, PDFs or text files, up to {MAX_MB} MB each</small></span>
          <div className="sp-bottom">
            <button type="button" className={"sp-drop" + (drag ? " on" : "")} onClick={() => pick.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 11.5l-8.5 8.5a5 5 0 01-7-7L14 4.5a3.3 3.3 0 014.7 4.7l-8.5 8.5a1.7 1.7 0 01-2.4-2.4L15.5 7.6" stroke="url(#spg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="spg" x1="3" y1="21" x2="21" y2="3"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs></svg>
              {files.length ? `${files.length} file${files.length > 1 ? "s" : ""} added: ${files.map((f) => f.name).join(", ")}` : "Add files or drop them here"}
            </button>
            <input ref={pick} type="file" multiple accept="image/*,application/pdf,text/*" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <button type="button" className="rp-btn sp-send" onClick={send}>Send request</button>
          </div>
          <p className="sp-msg" role="status">{note}</p>
        </div>
      </main>
    </div>
  );
}
