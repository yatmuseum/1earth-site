import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Which Solana network the site uses. Stays on "devnet" (free test network)
// until launch. Set VITE_SOLANA_NETWORK=mainnet-beta in Cloudflare to go live.
export const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || "devnet";

// On mainnet, requests go through our own /api/rpc route (added in Step 6),
// which keeps the Helius API key secret on Cloudflare. On devnet we use
// Solana's free public endpoint, so no key is needed while testing.
function getEndpoint() {
  if (NETWORK === "mainnet-beta") return `${window.location.origin}/api/rpc`;
  return clusterApiUrl("devnet");
}

export default function WalletProviders({ children }) {
  const endpoint = useMemo(getEndpoint, []);
  // Phantom, Solflare, Backpack and other modern wallets register themselves
  // automatically (Wallet Standard), so no wallet list is needed here.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
