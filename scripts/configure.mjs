// Points the site at MAINNET by updating wrangler.jsonc. Push afterwards.
//
//   node scripts/configure.mjs rehearsal --treasury <address> --allow <wallet1,wallet2> [--supply 20] [--limit50]
//       (--limit5 acts like the mint opened over 24 hours ago (5 per wallet); --limit50 over 48 hours ago (50 per wallet))
//       Small rehearsal collection, $0.01 each, 10 available (or --supply), 5 per wallet,
//       and ONLY the listed wallets can mint (everyone else is told it isn't open).
//
//   node scripts/configure.mjs launch --treasury <address> [--metadata <entry metadata url>]
//       The real thing: real collection, $20, 10,000, opens November 11th @ 11:11 EST
//       (nobody can mint before then), 1 per wallet for the first 24 hours, 5 for the next 24, then 50.
//
// Before switching, add the mainnet minter key as the Cloudflare secret
// MINTER_SECRET_KEY_MAINNET (see the instructions in chat).
import fs from "node:fs";
import { loadState } from "./lib.mjs";

const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const arg = (flag) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : null; };
const mode = process.argv[2];
const file = "wrangler.jsonc";
let text = fs.readFileSync(file, "utf8");
function setVar(name, value) {
  const re = new RegExp(`("${name}":\\s*)"[^"]*"`);
  if (!re.test(text)) throw new Error(`Couldn't find ${name} in wrangler.jsonc`);
  text = text.replace(re, `$1"${value}"`);
}
const isAddress = (a) => typeof a === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);

const treasury = arg("--treasury");
if (!isAddress(treasury)) { console.error("Give the treasury address: --treasury <address>"); process.exit(1); }

if (mode === "rehearsal") {
  const allow = (arg("--allow") || "").split(",").map((a) => a.trim()).filter(Boolean);
  if (!allow.length || !allow.every(isAddress)) {
    console.error("List the test wallets: --allow <wallet1,wallet2>"); process.exit(1);
  }
  const st = loadState("mainnet-beta-rehearsal");
  if (!st.collection || !st.merkleTree) { console.error("Run: node scripts/setup.mjs mainnet-beta --rehearsal --go"); process.exit(1); }
  setVar("NETWORK", "mainnet-beta");
  setVar("MINT_LIVE", "true");
  const hoursAgo = process.argv.includes("--limit50") ? 49 : process.argv.includes("--limit5") ? 25 : 1;
  setVar("OPENS_AT", new Date(Date.now() - hoursAgo * 60 * 60_000).toISOString().replace(/\.\d+Z$/, "Z"));
  setVar("PRICE_USDC", "0.01");
  const supply = Number(arg("--supply") || 10);
  const cap = st.capacity || 32;
  if (!Number.isInteger(supply) || supply < 1 || supply > cap) { console.error(`--supply must be 1 to ${cap} for this rehearsal tree.`); process.exit(1); }
  setVar("SUPPLY", String(supply));
  setVar("COLLECTION", st.collection);
  setVar("MERKLE_TREE", st.merkleTree);
  setVar("TREASURY", treasury);
  setVar("USDC_MINT", USDC_MAINNET);
  setVar("ALLOWLIST", allow.join(","));
  setVar("METADATA_URI", "https://1-earth.io/f.json");
  setVar("LOOKUP_TABLE", st.lookupTable && st.lookupTableTreasury === treasury ? st.lookupTable : "");
  if (!st.lookupTable || st.lookupTableTreasury !== treasury) {
    console.log("Note: no lookup table for this treasury yet, so purchases will use up to 3 per transaction.");
  }
  fs.writeFileSync(file, text);
  console.log(`MAINNET REHEARSAL: $0.01 each, total supply ${supply}, max ${hoursAgo > 48 ? 50 : hoursAgo > 24 ? 5 : 1} per wallet, only ${allow.length} test wallet(s) can mint.`);
} else if (mode === "launch") {
  const metadata = arg("--metadata") || "https://1-earth.io/f.json";
  if (!/^https:\/\//.test(metadata)) { console.error("The metadata link must start with https://"); process.exit(1); }
  const st = loadState("mainnet-beta");
  if (!st.collection || !st.merkleTree) { console.error("Run the real setup first: node scripts/setup.mjs mainnet-beta --uri <...> --go"); process.exit(1); }
  setVar("NETWORK", "mainnet-beta");
  setVar("MINT_LIVE", "true");
  setVar("OPENS_AT", "2026-11-11T16:11:00Z");
  setVar("PRICE_USDC", "20");
  setVar("SUPPLY", "10000");
  setVar("COLLECTION", st.collection);
  setVar("MERKLE_TREE", st.merkleTree);
  setVar("TREASURY", treasury);
  setVar("USDC_MINT", USDC_MAINNET);
  setVar("METADATA_URI", metadata);
  setVar("ALLOWLIST", "");
  if (!st.lookupTable || st.lookupTableTreasury !== treasury) {
    console.error("Create the lookup table for this treasury first: node scripts/create-lookup-table.mjs mainnet-beta --treasury <address> --go");
    process.exit(1);
  }
  setVar("LOOKUP_TABLE", st.lookupTable);
  fs.writeFileSync(file, text);
  console.log("LAUNCH SETTINGS: mainnet, $20, 10,000, opens November 11th @ 11:11 EST, 1 per wallet for 24h, 5 for the next 24h, then 50.");
} else {
  console.error("Usage: node scripts/configure.mjs rehearsal|launch --treasury <address> ...");
  process.exit(1);
}
console.log('Now run:  git add .   then   git commit -m "Configure mainnet"   then   git push');
