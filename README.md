# 1-Earth website

Run it on your computer:

    npm install
    npm run dev

Then open http://localhost:5173 in your browser.

- `src/config.js` – price, supply, dates, prizes, per-wallet limits, and the `live` switch
- `src/App.jsx` – page layout and text
- `src/MintCard.jsx` – the minted counter, entries picker and buy button
- `src/styles.css` – colours, fonts, spacing
- `public/` – logos and favicon

The buy button can't send any transaction until the mint program is connected and
`live` is set to true in `src/config.js`.

The site uses the Solana devnet (test network) until VITE_SOLANA_NETWORK is set to mainnet-beta.
Never put API keys, seed phrases or private keys in any file in this folder.
