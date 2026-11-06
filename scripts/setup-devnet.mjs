// One-time DEVNET setup for the 1-Earth mint:
//   1. Creates the soulbound collection (Metaplex Core) with:
//        - BubblegumV2           (lets compressed entries join the collection)
//        - PermanentFreezeDelegate, frozen = true  (entries can't be transferred)
//        - UpdateDelegate = minter key             (lets the mint function add entries)
//   2. Creates a private Merkle tree (depth 14 = room for 16,384 entries).
//   3. Makes the minter key the tree's delegate (it can mint, nothing else).
//
// It saves what it created to 1earth-keys/devnet-setup.json and skips any step
// that's already done, so it's safe to run again if something fails halfway.
//
// Usage:  node scripts/setup-devnet.mjs           (shows the plan and cost)
//         node scripts/setup-devnet.mjs --go      (actually does it)
//
// Clean-slate test collection (new collection + small, cheap tree; the old
// devnet setup is kept as a backup file):
//         node scripts/setup-devnet.mjs --fresh --small --go
import { generateSigner, sol } from "@metaplex-foundation/umi";
import { createCollection } from "@metaplex-foundation/mpl-core";
import { createTreeV2, setTreeDelegate } from "@metaplex-foundation/mpl-bubblegum";
import fs from "node:fs";
import { makeUmi, publicKeyOf, loadState, saveState, stateFile } from "./lib.mjs";

const NETWORK = "devnet";
const DEPLOYER = "devnet-deployer";
const MINTER = "devnet-minter";
const SITE = "https://1-earth.io";

const small = process.argv.includes("--small");
// Small test tree: room for 32 entries, costs a tiny amount of devnet SOL.
const TREE = small
  ? { maxDepth: 5, maxBufferSize: 8, canopyDepth: 0 }
  : { maxDepth: 14, maxBufferSize: 64, canopyDepth: 8 };

const umi = makeUmi(NETWORK, DEPLOYER);
const minter = publicKeyOf(umi, MINTER);
const go = process.argv.includes("--go");
if (process.argv.includes("--fresh") && go && fs.existsSync(stateFile(NETWORK))) {
  const backup = stateFile(NETWORK).replace(/\.json$/, `-backup-${Date.now()}.json`);
  fs.renameSync(stateFile(NETWORK), backup);
  console.log(`Old devnet setup saved as ${backup}`);
}
const state = loadState(NETWORK);

const balance = await umi.rpc.getBalance(umi.identity.publicKey);
console.log(`Network:   ${NETWORK}`);
console.log(`Deployer:  ${umi.identity.publicKey}  (${Number(balance.basisPoints) / 1e9} SOL)`);
console.log(`Minter:    ${minter}`);
console.log(`Tree:      depth ${TREE.maxDepth}, buffer ${TREE.maxBufferSize}, canopy ${TREE.canopyDepth} ${small ? "(small test tree, tiny cost)" : "(about 0.34 SOL rent)"}`);
console.log("");

if (!go) {
  console.log("Nothing done yet. Run again with --go to create everything.");
  process.exit(0);
}

// 1. Collection
if (!state.collection) {
  const collection = generateSigner(umi);
  console.log("Creating soulbound collection…");
  await createCollection(umi, {
    collection,
    name: "1-Earth Gold Frames (Devnet)",
    uri: `${SITE}/metadata/collection.json`,
    plugins: [
      { type: "BubblegumV2" },
      { type: "PermanentFreezeDelegate", frozen: true },
      { type: "UpdateDelegate", additionalDelegates: [minter] },
    ],
  }).sendAndConfirm(umi);
  state.collection = collection.publicKey.toString();
  saveState(NETWORK, state);
  console.log(`  Collection: ${state.collection}`);
} else {
  console.log(`Collection already created: ${state.collection}`);
}

// 2. Merkle tree
if (!state.merkleTree) {
  const merkleTree = generateSigner(umi);
  console.log("Creating Merkle tree…");
  const builder = await createTreeV2(umi, {
    merkleTree,
    maxDepth: TREE.maxDepth,
    maxBufferSize: TREE.maxBufferSize,
    canopyDepth: TREE.canopyDepth,
    public: false,
  });
  await builder.sendAndConfirm(umi);
  state.merkleTree = merkleTree.publicKey.toString();
  saveState(NETWORK, state);
  console.log(`  Merkle tree: ${state.merkleTree}`);
} else {
  console.log(`Merkle tree already created: ${state.merkleTree}`);
}

// 3. Tree delegate = minter
if (state.treeDelegate !== minter.toString()) {
  console.log("Making the minter key the tree delegate…");
  await setTreeDelegate(umi, {
    merkleTree: state.merkleTree,
    newTreeDelegate: minter,
  }).sendAndConfirm(umi);
  state.treeDelegate = minter.toString();
  saveState(NETWORK, state);
  console.log("  Done.");
} else {
  console.log("Tree delegate already set to the minter.");
}

const after = await umi.rpc.getBalance(umi.identity.publicKey);
console.log("");
console.log("Setup complete.");
console.log(`Saved to: ${stateFile(NETWORK)}`);
console.log(`Deployer balance now: ${Number(after.basisPoints) / 1e9} SOL`);
