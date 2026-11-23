// Under the wallet button: the connected wallet's entry numbers (e.g. "Your entries: #48, #49").
// Read from the mint server; refreshes after a mint. Hidden until a wallet with entries is connected.
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const SHOW = 3; // list this many, then "+N more"

export default function MyEntries() {
  const { publicKey } = useWallet();
  const [entries, setEntries] = useState(null);
  const owner = publicKey ? publicKey.toBase58() : null;

  useEffect(() => {
    if (!owner) { setEntries(null); return; }
    let alive = true;
    const load = () => fetch(`/api/xp?owner=${owner}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && Array.isArray(d.entries)) setEntries(d.entries); })
      .catch(() => {});
    load();
    const onMint = () => { setTimeout(load, 4000); setTimeout(load, 22000); };
    window.addEventListener("frames-minted", onMint);
    return () => { alive = false; window.removeEventListener("frames-minted", onMint); };
  }, [owner]);

  if (!owner || !entries || entries.length === 0) return null;
  const shown = entries.slice(0, SHOW).map((n) => `#${n.toLocaleString("en-US")}`).join(", ");
  const more = entries.length - SHOW;
  return (
    <p className="my-entries" title={entries.map((n) => `#${n}`).join(", ")}>
      {entries.length === 1 ? "Your entry: " : "Your entries: "}
      <b>{shown}</b>{more > 0 ? ` +${more} more` : ""}
    </p>
  );
}
