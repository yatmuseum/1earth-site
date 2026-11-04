import { Buffer } from "buffer";
window.Buffer = window.Buffer || Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import WalletProviders from "./WalletProviders.jsx";
import App from "./App.jsx";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </React.StrictMode>
);
