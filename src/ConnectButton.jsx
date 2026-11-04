import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";

const LABELS = {
  "change-wallet": "Change wallet",
  connecting: "Connecting…",
  "copy-address": "Copy address",
  copied: "Copied",
  disconnect: "Disconnect",
  "has-wallet": "Approve in wallet",
  "no-wallet": "Connect Wallet",
};

export default function ConnectButton() {
  return <BaseWalletMultiButton labels={LABELS} />;
}
