// Under the wallet button: the connected wallet's entry numbers (e.g. "Your entries: #48, #49").
// Read from the mint server; refreshes after a mint. Hidden until a wallet with entries is connected.
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";



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
  return (
    <p className="my-entries">
      <span className="my-entries__lbl">{entries.length === 1 ? "Your entry" : `Your ${entries.length} entries`}</span>
      <b>{ranges(entries)}</b>
    </p>
  );
}

// Group consecutive numbers into ranges: [48, 49, 50, 52] -> "#48–50, #52"
function ranges(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    const a = list[i].toLocaleString("en-US"), b = list[j].toLocaleString("en-US");
    out.push(j > i ? `#${a}–${b}` : `#${a}`);
    i = j;
  }
  return out.join(", ");
}
