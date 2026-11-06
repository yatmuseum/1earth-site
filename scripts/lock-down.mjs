// Run ONCE after the mint sells out (or ends). Makes the minter key useless:
//   1. Takes the minter's permission to mint into the tree away
//      (the tree delegate goes back to the deployer).
//   2. Removes the minter as a collection update delegate.
//   3. Optional: hands control of the collection to another address,
//      e.g. your multisig, with  --new-authority <address>
//
// Usage:  node scripts/lock-down.mjs devnet                 (shows the plan)
//         node scripts/lock-down.mjs devnet --go            (does it)
//         node scripts/lock-down.mjs mainnet-beta --go --new-authority <address>
import { publicKey } from "@metaplex-foundation/umi";
import { setTreeDelegate, fetchTreeConfigFromSeeds } from "@metaplex-foundation/mpl-bubblegum";
import { removeCollectionPlugin, updateCollection, fetchCollection } from "@metaplex-foundation/mpl-core";
import { makeUmi, loadState, saveState } from "./lib.mjs";

const network = process.argv[2];
if (network !== "devnet" && network !== "mainnet-beta") {
  console.error("Usage: node scripts/lock-down.mjs devnet|mainnet-beta [--go] [--new-authority <address>]");
  process.exit(1);
}
const go = process.argv.includes("--go");
const i = process.argv.indexOf("--new-authority");
const newAuthority = i > 0 ? publicKey(process.argv[i + 1]) : null;

const deployerName = network === "devnet" ? "devnet-deployer" : "mainnet-deployer";
const umi = makeUmi(network, deployerName);
const state = loadState(network);
const tree = publicKey(state.merkleTree);
const collection = publicKey(state.collection);

const cfg = await fetchTreeConfigFromSeeds(umi, { merkleTree: tree });
const col = await fetchCollection(umi, collection);
console.log(`Network:            ${network}`);
console.log(`Minted so far:      ${cfg.numMinted}`);
console.log(`Tree delegate now:  ${cfg.treeDelegate}`);
console.log(`Collection owner:   ${col.updateAuthority}`);
console.log(`Update delegates:   ${col.updateDelegate ? col.updateDelegate.additionalDelegates.join(", ") || "(none)" : "(none)"}`);
if (newAuthority) console.log(`Will hand collection to: ${newAuthority}`);
console.log("");
if (!go) { console.log("Nothing done yet. Run again with --go to lock it down."); process.exit(0); }

if (cfg.treeDelegate.toString() !== umi.identity.publicKey.toString()) {
  console.log("1) Removing the minter's permission to mint…");
  await setTreeDelegate(umi, { merkleTree: tree, newTreeDelegate: umi.identity.publicKey }).sendAndConfirm(umi);
  console.log("   Done.");
} else console.log("1) Minter already removed from the tree.");

if (col.updateDelegate) {
  console.log("2) Removing the minter as a collection delegate…");
  await removeCollectionPlugin(umi, { collection, plugin: { type: "UpdateDelegate" } }).sendAndConfirm(umi);
  console.log("   Done.");
} else console.log("2) No collection delegate to remove.");

if (newAuthority) {
  console.log("3) Handing the collection to the new authority…");
  await updateCollection(umi, { collection, newUpdateAuthority: newAuthority }).sendAndConfirm(umi);
  console.log("   Done.");
}

state.lockedDownAt = new Date().toISOString();
saveState(network, state);
console.log("\nLocked down. The minter key can no longer mint or change anything.");
