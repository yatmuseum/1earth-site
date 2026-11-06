// Creates the lookup table that lets up to 5 Gold Frames fit in one transaction.
// It stores the addresses every mint repeats: the tree, collection, programs,
// USDC and the treasury's USDC account. Run once per collection.
//
//   node scripts/create-lookup-table.mjs mainnet-beta --rehearsal --treasury <address> [--go]
//   node scripts/create-lookup-table.mjs mainnet-beta --treasury <address> [--go]     (real collection)
import {
  AddressLookupTableProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createNoopSigner, publicKey as umiKey, some } from "@metaplex-foundation/umi";
import { mplBubblegum, mintV2 } from "@metaplex-foundation/mpl-bubblegum";
import { toWeb3JsInstruction } from "@metaplex-foundation/umi-web3js-adapters";
import { loadSecret, loadState, saveState, rpcUrl, sleep } from "./lib.mjs";

const USDC = { devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" };
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const network = process.argv[2];
if (!USDC[network]) { console.error("Usage: node scripts/create-lookup-table.mjs mainnet-beta [--rehearsal] --treasury <address> [--go]"); process.exit(1); }
const rehearsal = process.argv.includes("--rehearsal");
const go = process.argv.includes("--go");
const ti = process.argv.indexOf("--treasury");
const treasury = ti > 0 ? new PublicKey(process.argv[ti + 1]) : null;
if (!treasury) { console.error("Give the treasury address: --treasury <address>"); process.exit(1); }

const stateName = rehearsal ? `${network}-rehearsal` : network;
const state = loadState(stateName);
if (!state.collection || !state.merkleTree) { console.error(`Set up the collection first (no ${stateName} setup found).`); process.exit(1); }

const prefix = network === "devnet" ? "devnet" : "mainnet";
const deployer = Keypair.fromSecretKey(loadSecret(`${prefix}-deployer`));
const minter = Keypair.fromSecretKey(loadSecret(`${prefix}-minter`));
const conn = new Connection(rpcUrl(network), "confirmed");

// Work out the exact accounts a mint uses, from a real mint instruction.
const umi = createUmi("http://unused").use(mplBubblegum());
const someone = createNoopSigner(umiKey(Keypair.generate().publicKey.toBase58()));
const minterSigner = createNoopSigner(umiKey(minter.publicKey.toBase58()));
const ix = toWeb3JsInstruction(mintV2(umi, {
  payer: someone, leafOwner: someone.publicKey, merkleTree: umiKey(state.merkleTree),
  coreCollection: umiKey(state.collection), treeCreatorOrDelegate: minterSigner, collectionAuthority: minterSigner,
  metadata: { name: "x", symbol: "", uri: "x", sellerFeeBasisPoints: 0, collection: some(umiKey(state.collection)), creators: [] },
}).getInstructions()[0]);
const usdc = new PublicKey(USDC[network]);
const treasuryAta = PublicKey.findProgramAddressSync([treasury.toBuffer(), TOKEN_PROGRAM.toBuffer(), usdc.toBuffer()], ATA_PROGRAM)[0];

const skip = new Set([someone.publicKey.toString(), minter.publicKey.toBase58()]); // signers can't go in a lookup table
const addrs = [];
for (const k of [...ix.keys.map((k) => k.pubkey), usdc, treasuryAta]) {
  const s = k.toBase58();
  if (!skip.has(s) && !addrs.includes(s)) addrs.push(s);
}

console.log(`Network:   ${network}${rehearsal ? " (REHEARSAL)" : ""}`);
console.log(`Treasury:  ${treasury.toBase58()}`);
console.log(`Addresses for the table (${addrs.length}):`);
addrs.forEach((a) => console.log("  " + a));
if (state.lookupTable && state.lookupTableTreasury === treasury.toBase58()) {
  console.log(`\nAlready created: ${state.lookupTable}`); process.exit(0);
}
if (!go) { console.log("\nNothing done yet. Run again with --go to create it (costs ~0.003 SOL)."); process.exit(0); }

const slot = await conn.getSlot("finalized");
const [createIx, table] = AddressLookupTableProgram.createLookupTable({
  authority: deployer.publicKey, payer: deployer.publicKey, recentSlot: slot,
});
const extendIx = AddressLookupTableProgram.extendLookupTable({
  lookupTable: table, authority: deployer.publicKey, payer: deployer.publicKey,
  addresses: addrs.map((a) => new PublicKey(a)),
});
const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
const msg = new TransactionMessage({ payerKey: deployer.publicKey, recentBlockhash: blockhash, instructions: [createIx, extendIx] }).compileToV0Message();
const tx = new VersionedTransaction(msg);
tx.sign([deployer]);
const sig = await conn.sendTransaction(tx);
await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

console.log(`\nCreated lookup table: ${table.toBase58()}`);
console.log("Waiting for it to activate…");
for (let i = 0; i < 30; i++) {
  const t = (await conn.getAddressLookupTable(table)).value;
  if (t && t.state.addresses.length === addrs.length) break;
  await sleep(2000);
}
await sleep(3000);
state.lookupTable = table.toBase58();
state.lookupTableTreasury = treasury.toBase58();
saveState(stateName, state);
console.log("Ready. Saved to your setup file.");
