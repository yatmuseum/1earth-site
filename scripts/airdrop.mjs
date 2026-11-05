// Requests free DEVNET SOL for one of your saved keys. Devnet only.
//
// Usage:  node scripts/airdrop.mjs devnet-deployer      (a saved key's name)
//    or:  node scripts/airdrop.mjs <wallet address>      (e.g. your Phantom test account)
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from "@solana/web3.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: node scripts/airdrop.mjs devnet-deployer");
  process.exit(1);
}
const file = path.join(os.homedir(), "1earth-keys", `${name}.json`);
let target;
if (fs.existsSync(file)) {
  target = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")))).publicKey;
} else {
  try {
    target = new PublicKey(name);
  } catch {
    console.error(`"${name}" is not a saved key name or a valid wallet address.`);
    process.exit(1);
  }
}

// Uses your Helius devnet endpoint if HELIUS_API_KEY is set in this terminal,
// otherwise Solana's public devnet endpoint.
const rpc = process.env.HELIUS_API_KEY
  ? `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : clusterApiUrl("devnet");
const connection = new Connection(rpc, "confirmed");

console.log(`Requesting 1 devnet SOL for ${target.toBase58()}…`);
try {
  const sig = await connection.requestAirdrop(target, 1 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
} catch (e) {
  console.error("Airdrop failed (devnet faucets are often rate-limited):", e.message);
  console.error("Wait a minute and try again, or use another devnet faucet.");
}
const bal = await connection.getBalance(target);
console.log(`Balance: ${bal / LAMPORTS_PER_SOL} devnet SOL`);
