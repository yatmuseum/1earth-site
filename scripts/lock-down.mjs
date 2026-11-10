// Run ONCE after the mint sells out (or ends). Locks everything down, in this order:
//   1. Removes the minter's permission to mint into the tree.
//   2. Removes the minter as a collection update delegate (the minter signs its own
//      removal; a frozen collection doesn't allow removing plugins, only updating them).
//   3. Makes the soulbound lock PERMANENT: the collection's freeze plugin is
//      handed to "None", so nobody (including us) can ever unfreeze Gold Frames.
//   4. With --seal: hands the collection to Solana's incinerator address
//      (1nc1nerator11111111111111111111111111111111), which has no private key.
//      After that, NOBODY can add a Gold Frame to the collection, ever, and anyone
//      can verify it. (Trade-off: the collection's on-chain name/link can't be
//      edited again either.)
//      Or, instead of --seal: --new-authority <address> hands it to e.g. a multisig.
//
//   node scripts/lock-down.mjs mainnet-beta [--rehearsal]            shows the plan
//   node scripts/lock-down.mjs mainnet-beta [--rehearsal] --seal --go  does it
import { publicKey } from "@metaplex-foundation/umi";
import { setTreeDelegate, fetchTreeConfigFromSeeds } from "@metaplex-foundation/mpl-bubblegum";
import {
  updateCollectionPlugin, updateCollection, fetchCollection, approveCollectionPluginAuthority,
} from "@metaplex-foundation/mpl-core";
import { makeUmi, loadState, saveState, signerOf } from "./lib.mjs";

const INCINERATOR = "1nc1nerator11111111111111111111111111111111";
const network = process.argv[2];
if (network !== "devnet" && network !== "mainnet-beta") {
  console.error("Usage: node scripts/lock-down.mjs mainnet-beta [--rehearsal] [--seal | --new-authority <address>] [--go]");
  process.exit(1);
}
const go = process.argv.includes("--go");
const rehearsal = process.argv.includes("--rehearsal");
const seal = process.argv.includes("--seal");
const i = process.argv.indexOf("--new-authority");
const newAuthority = i > 0 ? publicKey(process.argv[i + 1]) : null;
if (seal && newAuthority) { console.error("Use --seal OR --new-authority, not both."); process.exit(1); }

const stateName = network === "devnet" ? "devnet" : rehearsal ? "mainnet-beta-rehearsal" : "mainnet-beta";
const umi = makeUmi(network, network === "devnet" ? "devnet-deployer" : "mainnet-deployer");
const state = loadState(stateName);
if (!state.collection || !state.merkleTree) { console.error(`No setup found for ${stateName}.`); process.exit(1); }
const tree = publicKey(state.merkleTree);
const collection = publicKey(state.collection);
const me = umi.identity.publicKey.toString();

const describe = async () => {
  const cfg = await fetchTreeConfigFromSeeds(umi, { merkleTree: tree });
  const col = await fetchCollection(umi, collection);
  const freeze = col.permanentFreezeDelegate;
  return { cfg, col, freeze };
};

let { cfg, col, freeze } = await describe();
console.log(`Network:              ${network}${rehearsal ? " (REHEARSAL)" : ""}`);
console.log(`Collection:           ${collection}`);
console.log(`Gold Frames minted:   ${cfg.numMinted}`);
console.log(`Tree delegate:        ${cfg.treeDelegate}`);
console.log(`Collection authority: ${col.updateAuthority}`);
const delegatesOf = (c) => (c.updateDelegate ? c.updateDelegate.additionalDelegates.map(String) : []);
console.log(`Update delegates:     ${delegatesOf(col).join(", ") || "(none)"}`);
console.log(`Soulbound (frozen):   ${freeze?.frozen ? "yes" : "NO"}  |  freeze can be changed by: ${freeze?.authority?.type ?? "?"}`);
console.log(`Plan: ${seal ? "seal the collection (nobody can ever add Gold Frames)" : newAuthority ? `hand the collection to ${newAuthority}` : "keep the collection under the deployer"}`);
console.log("");
if (!go) { console.log("Nothing done yet. Run again with --go to lock it down."); process.exit(0); }
if (col.updateAuthority.toString() !== me && (freeze?.authority?.type !== "None" || seal || newAuthority)) {
  console.error("The deployer no longer controls this collection, so it can't complete these steps.");
  process.exit(1);
}

if (cfg.treeDelegate.toString() !== me) {
  console.log("1) Removing the minter's permission to mint…");
  await setTreeDelegate(umi, { merkleTree: tree, newTreeDelegate: umi.identity.publicKey }).sendAndConfirm(umi);
  console.log("   Done.");
} else console.log("1) Minter already removed from the tree.");

if (delegatesOf(col).length) {
  console.log("2) Removing the minter as a collection delegate…");
  const minter = signerOf(umi, network === "devnet" ? "devnet-minter" : "mainnet-minter");
  const remaining = delegatesOf(col).filter((d) => d !== minter.publicKey.toString()).map((d) => publicKey(d));
  await updateCollectionPlugin(umi, {
    collection, authority: minter,
    plugin: { type: "UpdateDelegate", additionalDelegates: remaining },
  }).sendAndConfirm(umi);
  console.log("   Done.");
} else console.log("2) No collection delegate to remove.");

if (freeze && freeze.authority?.type !== "None") {
  console.log("3) Making the soulbound lock permanent…");
  await approveCollectionPluginAuthority(umi, {
    collection, plugin: { type: "PermanentFreezeDelegate" }, newAuthority: { type: "None" },
  }).sendAndConfirm(umi);
  console.log("   Done.");
} else console.log("3) Soulbound lock already permanent.");

if (seal || newAuthority) {
  const to = seal ? publicKey(INCINERATOR) : newAuthority;
  console.log(seal ? "4) Sealing the collection (handing it to the incinerator)…" : `4) Handing the collection to ${to}…`);
  await updateCollection(umi, { collection, newUpdateAuthority: to }).sendAndConfirm(umi);
  console.log("   Done.");
}

({ cfg, col, freeze } = await describe());
console.log("\nCHECK (read back from the blockchain):");
console.log(`  Tree delegate:          ${cfg.treeDelegate}  ${cfg.treeDelegate.toString() === me ? "(minter removed ✓)" : "(!)"}`);
console.log(`  Update delegates:       ${delegatesOf(col).length ? delegatesOf(col).join(", ") + " (!)" : "none ✓"}`);
console.log(`  Soulbound:              ${freeze?.frozen ? "frozen ✓" : "NOT frozen (!)"}, changeable by ${freeze?.authority?.type}${freeze?.authority?.type === "None" ? " ✓ (permanent)" : " (!)"}`);
console.log(`  Collection authority:   ${col.updateAuthority}${col.updateAuthority.toString() === INCINERATOR ? " ✓ (sealed: nobody can add Gold Frames)" : ""}`);
state.lockedDownAt = new Date().toISOString();
state.sealed = col.updateAuthority.toString() === INCINERATOR;
saveState(stateName, state);
console.log(`\nLocked down. Collection: ${collection}`);
