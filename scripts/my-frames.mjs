// Lists the Gold Frames a wallet owns, with their entry numbers.
// Needs your Helius key set in this terminal:  $env:HELIUS_API_KEY="your-key"
//
// Usage:  node scripts/my-frames.mjs <wallet address>
import { loadState } from "./lib.mjs";

const owner = process.argv[2];
const network = process.argv[3] || "devnet";
if (!owner) { console.error("Usage: node scripts/my-frames.mjs <wallet address>"); process.exit(1); }
if (!process.env.HELIUS_API_KEY) { console.error('First run:  $env:HELIUS_API_KEY="your-key"'); process.exit(1); }

const { collection } = loadState(network);
const host = network === "mainnet-beta" ? "mainnet" : "devnet";
const r = await fetch(`https://${host}.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "searchAssets",
    params: { ownerAddress: owner, grouping: ["collection", collection], page: 1, limit: 1000 },
  }),
});
const { result, error } = await r.json();
if (error) { console.error(error.message); process.exit(1); }

const frames = result.items
  .map((a) => ({ entry: (a.compression?.leaf_id ?? 0) + 1, id: a.id, name: a.content?.metadata?.name }))
  .sort((a, b) => a.entry - b.entry);

console.log(`${owner} owns ${frames.length} Gold Frame${frames.length === 1 ? "" : "s"}:`);
for (const f of frames) console.log(`  Entry #${f.entry}  ${f.name}  ${f.id}`);
