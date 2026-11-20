import { Buffer } from "buffer";
window.Buffer = window.Buffer || Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import WalletProviders from "./WalletProviders.jsx";
import App from "./App.jsx";
import PastDraws from "./PastDraws.jsx";
import Frame from "./Frame.jsx";
import Demo from "./Demo.jsx";
import ResponsiblePlay from "./ResponsiblePlay.jsx";
import Support from "./Support.jsx";
import ProvablyFair from "./ProvablyFair.jsx";
import PayoutTables from "./PayoutTables.jsx";
import HowItWorks from "./HowItWorks.jsx";
import HowToPlay from "./HowToPlay.jsx";
import Terms from "./Terms.jsx";
import WhitePaper from "./WhitePaper.jsx";
import "./wp.css";
import XP from "./XP.jsx";
import "./xp.css";
import "./tc.css";
import "./hp.css";
import "./hw.css";
import "./pt.css";
import "./pf.css";
import "./sp.css";
import "./rp.css";
import "./demo.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles.css";
import "./theme-solana.css"; // remove this line to go back to the light theme

const path = window.location.pathname;
const isPastDraws = /^\/pastdraws\/?$/i.test(path);
const isFrame = /^\/frame\/?$/i.test(path);
const isDemo = /^\/demo\/?$/i.test(path);
const isRP = /^\/demo\/responsible-play\/?$/i.test(path);
const isSupport = /^\/demo\/support\/?$/i.test(path);
const isPF = /^\/demo\/provably-fair\/?$/i.test(path);
const isPT = /^\/demo\/payout-tables\/?$/i.test(path);
const isHW = /^\/demo\/how-it-works\/?$/i.test(path);
const isHP = /^\/demo\/how-to-play\/?$/i.test(path);
const isTC = /^\/demo\/terms\/?$/i.test(path);
const isWP = /^\/(demo\/whitepaper|white-paper)\/?$/i.test(path);
const isXP = /^\/demo\/xp\/?$/i.test(path);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isPastDraws ? (
      <PastDraws />
    ) : isFrame ? (
      <Frame />
    ) : isDemo ? (
      <Demo />
    ) : isRP ? (
      <ResponsiblePlay />
    ) : isSupport ? (
      <Support />
    ) : isPF ? (
      <ProvablyFair />
    ) : isPT ? (
      <PayoutTables />
    ) : isHW ? (
      <HowItWorks />
    ) : isHP ? (
      <HowToPlay />
    ) : isTC ? (
      <Terms />
    ) : isWP ? (
      <WhitePaper />
    ) : isXP ? (
      <XP />
    ) : (
      <WalletProviders>
        <App />
      </WalletProviders>
    )}
  </React.StrictMode>
);
