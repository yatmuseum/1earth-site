// Records a prize payment on 1-earth.io/PastDraws, after checking it on Solana.
//
//   node scripts/record-payout.mjs mainnet-beta --place 1 --tx <transaction signature>
//   node scripts/record-payout.mjs mainnet-beta --file payouts.txt
//        (payouts.txt: one "place,signature" per line, e.g. "1,5Kj9…")
//   add --draw <id> for an older drawing (default: the most recent one)
//   add --amount 10000 if the prize isn't 10,000 USDC
//
// The check: the transaction must have succeeded, sent exactly the prize in USDC
// to the winner's wallet, and taken it from the treasury. If anything doesn't
// match, nothing is recorded. Then: git add . ; git commit -m "Record payouts" ; git push
import fs from "node:fs";
import path from "node:path";
import { rpcUrl } from "./lib.mjs";

const network = process.argv[2];
const arg = (f) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : null; };
if (network !== "mainnet-beta" && network !== "devnet") {
  console.error("Usage: node scripts/record-payout.mjs mainnet-beta --place 1 --tx <signature>   (or --file payouts.txt)");
  process.exit(1);
}

// Treasury and USDC come from the site's own settings, so they always match the mint.
const settings = fs.readFileSync("wrangler.jsonc", "utf8");
const setting = (name) => (settings.match(new RegExp(`"${name}":\\s*"([^"]*)"`)) || [])[1];
const TREASURY = setting("TREASURY");
const USDC = setting("USDC_MINT");
const amount = Number(arg("--amount") || 10000);
if (!TREASURY || !USDC) { console.error("Couldn't read TREASURY / USDC_MINT from wrangler.jsonc."); process.exit(1); }

const indexFile = path.join("public", "draws", "index.json");
const draws = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const draw = arg("--draw") ? draws.find((d) => d.id === arg("--draw")) : draws[0];
if (!draw) { console.error("No published drawing found. Run publish-draw.mjs first."); process.exit(1); }

let pairs = [];
if (arg("--file")) {
  pairs = fs.readFileSync(arg("--file"), "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split(/[,\s]+/)).map(([p, s]) => ({ place: Number(p), tx: s }));
} else {
  pairs = [{ place: Number(arg("--place")), tx: arg("--tx") }];
}

async function rpc(method, params) {
  const r = await fetch(rpcUrl(network), { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
}

// How much USDC an owner's balance changed by in this transaction (in whole USDC).
function usdcChange(meta, owner) {
  const sum = (list) => (list || []).filter((b) => b.mint === USDC && b.owner === owner)
    .reduce((a, b) => a + Number(b.uiTokenAmount.amount), 0);
  return (sum(meta.postTokenBalances) - sum(meta.preTokenBalances)) / 1e6;
}

let recorded = 0;
for (const { place, tx } of pairs) {
  const w = draw.winners.find((x) => x.place === place);
  if (!w || !tx) { console.error(`✗ Place ${place}: no such winner, or no transaction given.`); continue; }
  const t = await rpc("getTransaction", [tx, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]);
  if (!t) { console.error(`✗ Place ${place}: transaction not found (check the signature, or wait a minute).`); continue; }
  if (t.meta?.err) { console.error(`✗ Place ${place}: that transaction failed on-chain.`); continue; }
  const got = usdcChange(t.meta, w.wallet);
  const sent = -usdcChange(t.meta, TREASURY);
  if (Math.abs(got - amount) > 0.000001) { console.error(`✗ Place ${place}: winner received ${got} USDC, expected ${amount}. Not recorded.`); continue; }
  if (sent < amount - 0.000001) { console.error(`✗ Place ${place}: the USDC didn't come from the treasury. Not recorded.`); continue; }
  w.payoutTx = tx;
  recorded++;
  console.log(`✓ Place ${place} (entry #${w.entry}): ${amount.toLocaleString()} USDC from the treasury to ${w.wallet}. Recorded.`);
}

fs.writeFileSync(indexFile, JSON.stringify(draws, null, 2) + "\n");
const paid = draw.winners.filter((x) => x.payoutTx).length;
console.log(`\n${draw.title}: ${paid} of ${draw.winners.length} payments recorded.`);
if (recorded) console.log('Now run:  git add .   then   git commit -m "Record payouts"   then   git push');
