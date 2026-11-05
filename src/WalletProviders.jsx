import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

// All blockchain requests from the site go through our own /api/rpc route,
// which forwards them to Helius on whichever network the server is set to
// (devnet for testing, mainnet at launch). The Helius key never reaches the
// browser, and switching networks is a server setting, not a website rebuild.
export default function WalletProviders({ children }) {
  const endpoint = useMemo(() => `${window.location.origin}/api/rpc`, []);
  // Phantom, Solflare, Backpack, MetaMask and other modern wallets register
  // themselves automatically (Wallet Standard), so no wallet list is needed.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
