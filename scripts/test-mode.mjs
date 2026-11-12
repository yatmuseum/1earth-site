// Switches the site between DEVNET TEST MODE and the PRE-LAUNCH view by
// updating wrangler.jsonc. (Push afterwards for it to take effect.)
//
//   node scripts/test-mode.mjs on 20    test mode: buying open on devnet at 1 USDC,
//                                       5-per-wallet phase, room for 20 more mints
//   node scripts/test-mode.mjs off      back to pre-launch: 0 / 10,000, not live,
//                                       opens November 11th @ 11:11 EST, $20
//
// Needs your Helius key in this terminal for "on":  $env:HELIUS_API_KEY="your-key"
import fs from "node:fs";
import { publicKey } from "@metaplex-foundation/umi";
import { fetchTreeConfigFromSeeds } from "@metaplex-foundation/mpl-bubblegum";
import { makeUmi, loadState } from "./lib.mjs";

const mode = process.argv[2];
const file = "wrangler.jsonc";
let text = fs.readFileSync(file, "utf8");

function setVar(name, value) {
  const re = new RegExp(`("${name}":\\s*)"[^"]*"`);
  if (!re.test(text)) throw new Error(`Couldn't find ${name} in wrangler.jsonc`);
  text = text.replace(re, `$1"${value}"`);
}

if (mode === "on") {
  const extra = Number(process.argv[3] || 20);
  const umi = makeUmi("devnet", "devnet-deployer");
  const { merkleTree, collection } = loadState("devnet");
  const cfg = await fetchTreeConfigFromSeeds(umi, { merkleTree: publicKey(merkleTree) });
  const minted = Number(cfg.numMinted);
  const opened = new Date(Date.now() - 60 * 60_000).toISOString().replace(/\.\d+Z$/, "Z"); // 1 hour ago
  setVar("NETWORK", "devnet");
  setVar("COLLECTION", collection);
  setVar("MERKLE_TREE", merkleTree);
  setVar("MINT_LIVE", "true");
  setVar("OPENS_AT", opened);
  setVar("PRICE_USDC", "1");
  setVar("SUPPLY", String(minted + extra));
  fs.writeFileSync(file, text);
  console.log(`TEST MODE: ${minted} already minted on devnet, supply set to ${minted + extra} (${extra} available).`);
  console.log("Price 1 USDC, max 5 per wallet (until Nov 20). Now run: git add . ; git commit -m \"Test mode on\" ; git push");
} else if (mode === "off") {
  setVar("MINT_LIVE", "false");
  setVar("OPENS_AT", "2026-11-11T16:11:00Z");
  setVar("PRICE_USDC", "20");
  setVar("SUPPLY", "10000");
  fs.writeFileSync(file, text);
  console.log("PRE-LAUNCH VIEW: 0 / 10,000, not live, opens November 11th @ 11:11 EST, $20.");
  console.log("Now run: git add . ; git commit -m \"Test mode off\" ; git push");
} else {
  console.error("Usage: node scripts/test-mode.mjs on 20   |   node scripts/test-mode.mjs off");
  process.exit(1);
}
