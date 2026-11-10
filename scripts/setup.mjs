// One-time setup of the Gold Frames collection and tree, on any network.
//
//   node scripts/setup.mjs mainnet-beta --rehearsal          plan for the small $0.01 rehearsal
//   node scripts/setup.mjs mainnet-beta --rehearsal --go     create it
//   node scripts/setup.mjs mainnet-beta --rehearsal --fresh --go   start a NEW rehearsal (counts reset)
//   add --big for a rehearsal tree that holds 16,384 (~0.13 SOL) instead of 32
//   node scripts/setup.mjs mainnet-beta --uri <collection metadata url> --go
//                                                            create the REAL collection + full tree
//
// Keys used: mainnet-deployer (pays, owns the collection) and mainnet-minter
// (the only key allowed to mint). Create them first with new-keypair.mjs.
// Results are saved in 1earth-keys/<network>[-rehearsal]-setup.json, and any
// step already done is skipped, so it's safe to run again after an error.
import { generateSigner } from "@metaplex-foundation/umi";
import { createCollection } from "@metaplex-foundation/mpl-core";
import { createTreeV2, setTreeDelegate } from "@metaplex-foundation/mpl-bubblegum";
import fs from "node:fs";
import { makeUmi, publicKeyOf, loadState, saveState, stateFile } from "./lib.mjs";

const network = process.argv[2];
if (network !== "devnet" && network !== "mainnet-beta") {
  console.error("Usage: node scripts/setup.mjs mainnet-beta [--rehearsal] [--uri <url>] [--go]");
  process.exit(1);
}
const go = process.argv.includes("--go");
const rehearsal = process.argv.includes("--rehearsal");
const uriAt = process.argv.indexOf("--uri");
const collectionUri = uriAt > 0 ? process.argv[uriAt + 1] : "https://1-earth.io/metadata/collection.json";

const prefix = network === "devnet" ? "devnet" : "mainnet";
const stateName = rehearsal ? `${network}-rehearsal` : network;
const big = process.argv.includes("--big");
const TREE = rehearsal
  ? (big
      ? { maxDepth: 14, maxBufferSize: 64, canopyDepth: 0 }  // 16,384 entries, ~0.13 SOL (for testing 50 per wallet)
      : { maxDepth: 5, maxBufferSize: 8, canopyDepth: 0 })   // 32 entries, tiny cost
  : { maxDepth: 14, maxBufferSize: 64, canopyDepth: 8 };     // 16,384 entries, ~0.34 SOL
const name = rehearsal ? "1-Earth Gold Frames (Rehearsal)" : "1-Earth Gold Frames";

const umi = makeUmi(network, `${prefix}-deployer`);
const minter = publicKeyOf(umi, `${prefix}-minter`);
// --fresh (rehearsal only): start a brand-new rehearsal collection + tree, so
// counts and per-wallet limits start from zero. The old one is kept as a backup file.
if (process.argv.includes("--fresh") && go) {
  if (!rehearsal) { console.error("--fresh is only for the rehearsal."); process.exit(1); }
  if (fs.existsSync(stateFile(stateName))) {
    const backup = stateFile(stateName).replace(/\.json$/, `-backup-${Date.now()}.json`);
    fs.renameSync(stateFile(stateName), backup);
    console.log(`Old rehearsal setup saved as ${backup}`);
  }
}
const state = loadState(stateName);

const balance = Number((await umi.rpc.getBalance(umi.identity.publicKey)).basisPoints) / 1e9;
console.log(`Network:     ${network}${rehearsal ? " (REHEARSAL)" : ""}`);
console.log(`Deployer:    ${umi.identity.publicKey}  (${balance} SOL)`);
console.log(`Minter:      ${minter}`);
console.log(`Collection:  "${name}"  metadata: ${collectionUri}`);
console.log(`Tree:        depth ${TREE.maxDepth}, buffer ${TREE.maxBufferSize}, canopy ${TREE.canopyDepth} (holds ${2 ** TREE.maxDepth})`);
console.log("");
if (!go) { console.log("Nothing done yet. Run again with --go to create it."); process.exit(0); }
if (!rehearsal && balance < 0.37) { console.error("The deployer needs at least ~0.37 SOL for the real setup."); process.exit(1); }

if (!state.collection) {
  const collection = generateSigner(umi);
  console.log("1) Creating the soulbound collection…");
  await createCollection(umi, {
    collection, name, uri: collectionUri,
    plugins: [
      { type: "BubblegumV2" },
      { type: "PermanentFreezeDelegate", frozen: true },
      { type: "UpdateDelegate", additionalDelegates: [minter] },
    ],
  }).sendAndConfirm(umi);
  state.collection = collection.publicKey.toString();
  saveState(stateName, state);
  console.log(`   Collection: ${state.collection}`);
} else console.log(`1) Collection already created: ${state.collection}`);

if (!state.merkleTree) {
  const merkleTree = generateSigner(umi);
  console.log("2) Creating the Merkle tree…");
  await (await createTreeV2(umi, { merkleTree, ...TREE, public: false })).sendAndConfirm(umi);
  state.merkleTree = merkleTree.publicKey.toString();
  state.capacity = 2 ** TREE.maxDepth;
  saveState(stateName, state);
  console.log(`   Merkle tree: ${state.merkleTree}`);
} else console.log(`2) Merkle tree already created: ${state.merkleTree}`);

if (state.treeDelegate !== minter.toString()) {
  console.log("3) Letting the minter key mint (and nothing else)…");
  await setTreeDelegate(umi, { merkleTree: state.merkleTree, newTreeDelegate: minter }).sendAndConfirm(umi);
  state.treeDelegate = minter.toString();
  saveState(stateName, state);
  console.log("   Done.");
} else console.log("3) Minter already set.");

const after = Number((await umi.rpc.getBalance(umi.identity.publicKey)).basisPoints) / 1e9;
console.log(`\nSetup complete. Saved to ${stateFile(stateName)}`);
console.log(`Deployer balance now: ${after} SOL`);
