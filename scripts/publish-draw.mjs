// Publishes a finished drawing to 1-earth.io/PastDraws.
// Run after  node scripts/draw.mjs draw ... --go  (and verify), then push.
//
//   node scripts/publish-draw.mjs mainnet-beta --title "Gold Frame 50/50 #1" [--prize "10,000 USDC"] [--lockdown <tx>] [--rehearsal]
//   git add . ; git commit -m "Publish drawing" ; git push
import fs from "node:fs";
import path from "node:path";
import { loadState } from "./lib.mjs";

const network = process.argv[2];
const arg = (f) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : null; };
const rehearsal = process.argv.includes("--rehearsal");
if (network !== "mainnet-beta" && network !== "devnet") {
  console.error('Usage: node scripts/publish-draw.mjs mainnet-beta --title "Gold Frame 50/50 #1" [--prize "10,000 USDC"] [--lockdown <tx>]');
  process.exit(1);
}
const title = arg("--title");
if (!title) { console.error('Give the drawing a title: --title "Gold Frame 50/50 #1"'); process.exit(1); }

const stateName = network === "devnet" ? "devnet" : rehearsal ? "mainnet-beta-rehearsal" : "mainnet-beta";
const setup = loadState(stateName);
const base = path.join("draws", `${stateName}-${setup.collection.slice(0, 8)}`);
const snapFile = `${base}-snapshot.csv`;
const resultFile = `${base}-result.json`;
if (!fs.existsSync(snapFile) || !fs.existsSync(resultFile)) {
  console.error("Run the drawing first (draws/ snapshot and result files not found).");
  process.exit(1);
}
const r = JSON.parse(fs.readFileSync(resultFile, "utf8"));
const drawnAt = new Date(r.drawnAt);
const id = `${drawnAt.toISOString().slice(0, 10)}-${setup.collection.slice(0, 8)}`;

// Copy the files where the website can serve them.
const outDir = path.join("public", "draws", id);
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(snapFile, path.join(outDir, "snapshot.csv"));
fs.copyFileSync(resultFile, path.join(outDir, "result.json"));

const entry = {
  id, title,
  drawnAt: r.drawnAt,
  drawnAtLabel: drawnAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "short" }) + " ET",
  entries: r.entries,
  collection: r.collection,
  snapshotSha256: r.snapshotSha256,
  requestAccount: r.requestAccount,
  requestTx: r.requestTx || null,
  randomness: r.randomness,
  lockDownTx: arg("--lockdown"),
  prizeLabel: arg("--prize") || "10,000 USDC",
  winners: r.winners.map(({ place, entry, wallet }) => ({ place, entry, wallet })),
  files: { snapshot: `/draws/${id}/snapshot.csv`, result: `/draws/${id}/result.json` },
};

const indexFile = path.join("public", "draws", "index.json");
const list = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, "utf8")) : [];
const next = [entry, ...list.filter((d) => d.id !== id)];
fs.writeFileSync(indexFile, JSON.stringify(next, null, 2) + "\n");
console.log(`Published "${title}" (${r.entries} entries, ${r.winners.length} winners) to /PastDraws.`);
console.log('Now run:  git add .   then   git commit -m "Publish drawing"   then   git push');
