// Shows the connected wallet's XP: 25,000 XP per Gold Frame it holds (counted by the mint server).
// Hidden until a wallet is connected. Refreshes after a mint.
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function XpPill() {
  const { publicKey } = useWallet();
  const [xp, setXp] = useState(null);
  const owner = publicKey ? publicKey.toBase58() : null;

  useEffect(() => {
    if (!owner) { setXp(null); return; }
    let alive = true;
    const load = () => fetch(`/api/xp?owner=${owner}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && typeof d.xp === "number") setXp(d.xp); })
      .catch(() => {});
    load();
    // after a mint, check again once the new Frames are visible on-chain
    const onMint = () => { setTimeout(load, 4000); setTimeout(load, 22000); };
    window.addEventListener("frames-minted", onMint);
    return () => { alive = false; window.removeEventListener("frames-minted", onMint); };
  }, [owner]);

  if (!owner || xp === null) return null;
  return (
    <span className="xp-pill" title="25,000 XP per Gold Frame. XP is a non-transferable loyalty point with no cash value.">
      {xp.toLocaleString("en-US")} <small>XP</small>
    </span>
  );
}
