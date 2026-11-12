import { Buffer } from "buffer";
window.Buffer = window.Buffer || Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import WalletProviders from "./WalletProviders.jsx";
import App from "./App.jsx";
import PastDraws from "./PastDraws.jsx";
import Frame from "./Frame.jsx";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles.css";
import "./theme-solana.css"; // remove this line to go back to the light theme

const path = window.location.pathname;
const isPastDraws = /^\/pastdraws\/?$/i.test(path);
const isFrame = /^\/frame\/?$/i.test(path);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isPastDraws ? (
      <PastDraws />
    ) : isFrame ? (
      <Frame />
    ) : (
      <WalletProviders>
        <App />
      </WalletProviders>
    )}
  </React.StrictMode>
);
