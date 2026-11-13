// The verifiable 50/50 drawing, using ORAO VRF (verifiable randomness on Solana).
//
// Run AFTER the mint has closed (lock-down done, so no new entries can appear):
//
//   1) node scripts/draw.mjs snapshot mainnet-beta
//        Lists every entry (entry number, owner wallet, asset) and prints its
//        fingerprint (SHA-256). POST THE FINGERPRINT PUBLICLY before step 2.
//
//   2) node scripts/draw.mjs draw mainnet-beta            (shows the cost)
//      node scripts/draw.mjs draw mainnet-beta --go       (runs the drawing)
//        Requests randomness from ORAO. The request "seed" is derived from the
//        snapshot fingerprint, so there is exactly ONE possible request for this
//        entry list: nobody (including us) can retry for a different result.
//        ORAO's network answers on-chain within seconds; the winners are
//        computed from that answer and saved.
//
//   Anyone can check the result:
//      node scripts/draw.mjs verify mainnet-beta
//   (recomputes the seed from the snapshot, reads ORAO's answer from the
//    blockchain, and recomputes the winners)
//
// How winners come from ORAO's answer:
//   seed        = SHA-256("1-Earth 50/50 draw|" + collection + "|" + snapshot fingerprint)
//   randomness  = ORAO's 64-byte answer for that seed (on-chain)
//   winner seed = SHA-256(randomness)  ->  pickWinners() in draw-core.mjs
//
// Add --rehearsal for the rehearsal collection, --winners N to change the count (default 10).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Connection, Keypair } from "@solana/web3.js";
import anchorPkg from "@coral-xyz/anchor";
import { Orao, randomnessAccountAddress, networkStateAccountAddress } from "@orao-network/solana-vrf";
import { loadSecret, loadState, rpcUrl, sleep } from "./lib.mjs";
import { pickWinners, snapshotText, sha256Hex } from "./draw-core.mjs";

const { AnchorProvider, Wallet } = anchorPkg;
const [cmd, network] = process.argv.slice(2);
const rehearsal = process.argv.includes("--rehearsal");
const go = process.argv.includes("--go");
const wi = process.argv.indexOf("--winners");
const WINNERS = wi > 0 ? Number(process.argv[wi + 1]) : 1; // 1 winner of 10,000 USDC
if (!["snapshot", "draw", "verify"].includes(cmd) || !["devnet", "mainnet-beta"].includes(network)) {
  console.error("Usage: node scripts/draw.mjs snapshot|draw|verify mainnet-beta [--rehearsal] [--go] [--winners 10]");
  process.exit(1);
}

const stateName = network === "devnet" ? "devnet" : rehearsal ? "mainnet-beta-rehearsal" : "mainnet-beta";
const setup = loadState(stateName);
if (!setup.collection) { console.error(`No collection found for ${stateName}.`); process.exit(1); }

const dir = path.join(process.cwd(), "draws");
fs.mkdirSync(dir, { recursive: true });
const base = path.join(dir, `${stateName}-${setup.collection.slice(0, 8)}`);
const snapFile = `${base}-snapshot.csv`;
const resultFile = `${base}-result.json`;

const conn = new Connection(rpcUrl(network), "confirmed");
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + "\n");

function oraoFor(keypair) {
  const wallet = new Wallet(keypair || Keypair.generate()); // a throwaway key is fine for read-only use
  return new Orao(new AnchorProvider(conn, wallet, { commitment: "confirmed" }));
}
function requestSeed(fingerprint) {
  return createHash("sha256").update(`1-Earth 50/50 draw|${setup.collection}|${fingerprint}`, "utf8").digest();
}
async function fulfilledRandomness(vrf, seed) {
  try {
    const acc = await vrf.getRandomness(seed, "confirmed");
    return acc?.getFulfilledRandomness?.() || null;
  } catch { return null; } // account doesn't exist (not requested yet)
}

async function loadEntries() {
  const rows = [];
  for (let page = 1; ; page++) {
    const res = await fetch(rpcUrl(network), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAssetsByGroup",
        params: { groupKey: "collection", groupValue: setup.collection, page, limit: 1000 } }),
    });
    const j = await res.json();
    if (j.error) throw new Error(JSON.stringify(j.error));
    const items = j.result?.items || [];
    for (const a of items) {
      if (a.burnt) continue;
      rows.push({ entry: (a.compression?.leaf_id ?? -1) + 1, owner: a.ownership?.owner, asset: a.id });
    }
    if (items.length < 1000) break;
  }
  rows.sort((a, b) => a.entry - b.entry);
  rows.forEach((r, i) => { if (r.entry !== i + 1) throw new Error(`Entry list has a gap or duplicate near #${i + 1}`); });
  return rows;
}
function readSnapshot() {
  if (!fs.existsSync(snapFile)) throw new Error("Run the snapshot step first.");
  const text = fs.readFileSync(snapFile, "utf8");
  const rows = text.trim().split("\n").map((l) => { const [entry, owner, asset] = l.split(","); return { entry: Number(entry), owner, asset }; });
  return { text, rows, hash: sha256Hex(text) };
}
function winnersFrom(randomness, rows) {
  const winnerSeed = createHash("sha256").update(Buffer.from(randomness)).digest();
  return pickWinners(winnerSeed, rows.length, WINNERS)
    .map((e, i) => ({ place: i + 1, entry: e, wallet: rows[e - 1].owner, asset: rows[e - 1].asset }));
}
function print(winners) {
  console.log("\nWINNERS:");
  for (const w of winners) console.log(`  ${String(w.place).padStart(2)}. Entry #${w.entry}  ->  ${w.wallet}`);
}

if (cmd === "snapshot") {
  if (read(resultFile)) { console.error("This collection's drawing already happened; the snapshot can't change."); process.exit(1); }
  const rows = await loadEntries();
  const text = snapshotText(rows);
  fs.writeFileSync(snapFile, text);
  console.log(`Collection: ${setup.collection}`);
  console.log(`Entries:    ${rows.length}`);
  console.log(`Saved:      ${snapFile}`);
  console.log(`\nSNAPSHOT FINGERPRINT (post this publicly before the draw step):\n  ${sha256Hex(text)}`);
}

if (cmd === "draw") {
  const snap = readSnapshot();
  const seed = requestSeed(snap.hash);
  const payer = Keypair.fromSecretKey(loadSecret(network === "devnet" ? "devnet-deployer" : "mainnet-deployer"));
  const vrf = oraoFor(payer);
  const state = await vrf.getNetworkState();
  const fee = Number(state.config.requestFee) / 1e9;
  console.log(`Entries:          ${snap.rows.length}`);
  console.log(`Snapshot:         ${snap.hash}`);
  console.log(`Request seed:     ${seed.toString("hex")}`);
  console.log(`Request account:  ${randomnessAccountAddress(seed).toBase58()}`);
  console.log(`ORAO fee:         ${fee} SOL (plus a small account deposit)`);

  let randomness = await fulfilledRandomness(vrf, seed);
  let requestTx = read(resultFile)?.requestTx || null;
  if (!randomness) {
    if (!go) { console.log("\nNothing requested yet. Run again with --go to run the drawing."); process.exit(0); }
    let exists = false;
    try { await vrf.getRandomness(seed, "confirmed"); exists = true; } catch {}
    if (!exists) {
      const [, sig] = await (await vrf.request(seed)).rpc();
      requestTx = sig;
      console.log(`\nRequested: ${sig}`);
    } else {
      console.log("\nAlready requested earlier; waiting for ORAO's answer…");
    }
    for (let i = 0; i < 60 && !randomness; i++) { await sleep(2000); randomness = await fulfilledRandomness(vrf, seed); }
    if (!randomness) { console.error("ORAO hasn't answered yet. Run this same command again in a minute (it won't request twice)."); process.exit(1); }
  }
  const winners = winnersFrom(randomness, snap.rows);
  console.log(`\nORAO randomness:  ${Buffer.from(randomness).toString("hex")}`);
  print(winners);
  write(resultFile, {
    collection: setup.collection, entries: snap.rows.length, snapshotSha256: snap.hash,
    oraoProgram: "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y",
    requestSeed: seed.toString("hex"), requestAccount: randomnessAccountAddress(seed).toBase58(),
    requestTx, randomness: Buffer.from(randomness).toString("hex"), winners, drawnAt: new Date().toISOString(),
  });
  console.log(`\nSaved: ${resultFile}`);
}

if (cmd === "verify") {
  const snap = readSnapshot();
  const published = read(resultFile);
  if (published && published.snapshotSha256 !== snap.hash) console.log("⚠ The snapshot file doesn't match the published fingerprint.");
  const seed = requestSeed(snap.hash);
  const randomness = await fulfilledRandomness(oraoFor(null), seed);
  if (!randomness) { console.error("No fulfilled ORAO randomness found on-chain for this snapshot."); process.exit(1); }
  console.log(`Snapshot fingerprint: ${snap.hash}`);
  console.log(`ORAO request account: ${randomnessAccountAddress(seed).toBase58()}`);
  console.log(`ORAO randomness:      ${Buffer.from(randomness).toString("hex")}`);
  const winners = winnersFrom(randomness, snap.rows);
  print(winners);
  if (published?.winners) {
    const same = JSON.stringify(winners.map((w) => w.entry)) === JSON.stringify(published.winners.map((w) => w.entry));
    console.log(same ? "\n✅ Matches the published winners." : "\n❌ Does NOT match the published winners.");
  }
}
