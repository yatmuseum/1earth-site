import { Buffer } from "buffer";
window.Buffer = window.Buffer || Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import WalletProviders from "./WalletProviders.jsx";
import App from "./App.jsx";
import PastDraws from "./PastDraws.jsx";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles.css";

const isPastDraws = /^\/pastdraws\/?$/i.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isPastDraws ? (
      <PastDraws />
    ) : (
      <WalletProviders>
        <App />
      </WalletProviders>
    )}
  </React.StrictMode>
);
