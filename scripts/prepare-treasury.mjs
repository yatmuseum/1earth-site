// Opens the treasury's USDC account (one time) so payments have somewhere to
// land. The deployer pays the small cost. Safe to run more than once.
//
//   node scripts/prepare-treasury.mjs mainnet-beta <treasury address>
//   node scripts/prepare-treasury.mjs devnet devnet-treasury
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { KEYS_DIR, loadSecret, rpcUrl } from "./lib.mjs";

const USDC = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

let [network, who] = process.argv.slice(2);
if (!USDC[network]) { who = network; network = "devnet"; } // old usage: devnet only
if (!who) { console.error("Usage: node scripts/prepare-treasury.mjs mainnet-beta <treasury address>"); process.exit(1); }

const owner = fs.existsSync(path.join(KEYS_DIR, `${who}.json`))
  ? Keypair.fromSecretKey(loadSecret(who)).publicKey
  : new PublicKey(who);
const usdc = new PublicKey(USDC[network]);
const conn = new Connection(rpcUrl(network), "confirmed");
const payer = Keypair.fromSecretKey(loadSecret(network === "devnet" ? "devnet-deployer" : "mainnet-deployer"));

// Safety check: the USDC address must be a real token mint with 6 decimals.
const mintInfo = await conn.getAccountInfo(usdc);
if (!mintInfo || !mintInfo.owner.equals(TOKEN_PROGRAM) || mintInfo.data[44] !== 6) {
  console.error("The USDC address doesn't look right. Stop and tell Claude.");
  process.exit(1);
}

const ataAddr = PublicKey.findProgramAddressSync(
  [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), usdc.toBuffer()], ATA_PROGRAM,
)[0];
console.log(`Network:               ${network}`);
console.log(`Treasury:              ${owner.toBase58()}`);
console.log(`Treasury USDC account: ${ataAddr.toBase58()}`);

if (await conn.getAccountInfo(ataAddr)) { console.log("Already open. Nothing to do."); process.exit(0); }

const ix = new TransactionInstruction({
  programId: ATA_PROGRAM,
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: ataAddr, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: usdc, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
  ],
  data: Buffer.from([1]), // CreateIdempotent
});
const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
console.log(`Opened. Transaction: ${sig}`);
