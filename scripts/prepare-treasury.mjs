// Opens the treasury's USDC account (one time), so buyers' USDC has somewhere
// to land. The deployer pays the small cost. Safe to run more than once.
//
// Usage:  node scripts/prepare-treasury.mjs devnet-treasury
//    or:  node scripts/prepare-treasury.mjs <treasury address>
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { KEYS_DIR, loadSecret } from "./lib.mjs";

const USDC_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const arg = process.argv[2];
if (!arg) { console.error("Usage: node scripts/prepare-treasury.mjs devnet-treasury"); process.exit(1); }
const owner = fs.existsSync(path.join(KEYS_DIR, `${arg}.json`))
  ? Keypair.fromSecretKey(loadSecret(arg)).publicKey
  : new PublicKey(arg);

const key = process.env.HELIUS_API_KEY;
const conn = new Connection(key ? `https://devnet.helius-rpc.com/?api-key=${key}` : "https://api.devnet.solana.com", "confirmed");
const payer = Keypair.fromSecretKey(loadSecret("devnet-deployer"));

const ataAddr = PublicKey.findProgramAddressSync(
  [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), USDC_DEVNET.toBuffer()], ATA_PROGRAM,
)[0];

console.log(`Treasury:              ${owner.toBase58()}`);
console.log(`Treasury USDC account: ${ataAddr.toBase58()}`);

const mintInfo = await conn.getAccountInfo(USDC_DEVNET);
if (!mintInfo || !mintInfo.owner.equals(TOKEN_PROGRAM)) {
  console.error("The devnet USDC address in this script doesn't look right. Stop and tell Claude.");
  process.exit(1);
}

if (await conn.getAccountInfo(ataAddr)) {
  console.log("Already open. Nothing to do.");
  process.exit(0);
}

const ix = new TransactionInstruction({
  programId: ATA_PROGRAM,
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: ataAddr, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: USDC_DEVNET, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
  ],
  data: Buffer.from([1]), // CreateIdempotent
});
const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer]);
console.log(`Opened. Transaction: ${sig}`);
