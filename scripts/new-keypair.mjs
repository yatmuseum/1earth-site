// Creates a new Solana key and saves it OUTSIDE the project folder, in
// 1earth-keys in your user directory (so it can never be uploaded to GitHub).
//
//   node scripts/new-keypair.mjs mainnet-deployer --words
//       Also shows 24 recovery words to WRITE DOWN BY HAND. The words can
//       recreate this exact key later with:  node scripts/restore-keypair.mjs mainnet-deployer
//       (Solana CLI compatible. Not for importing into Phantom.)
//
//   node scripts/new-keypair.mjs devnet-deployer      (no words; fine for test keys)
import { Keypair } from "@solana/web3.js";
import { generateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const name = process.argv[2];
const withWords = process.argv.includes("--words");
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("Give the key a simple name, e.g.: node scripts/new-keypair.mjs mainnet-deployer --words");
  process.exit(1);
}
const dir = path.join(os.homedir(), "1earth-keys");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${name}.json`);
if (fs.existsSync(file)) {
  console.error(`A key named "${name}" already exists at ${file}. Not overwriting it.`);
  process.exit(1);
}

let kp, words = null;
if (withWords) {
  words = generateMnemonic(wordlist, 256); // 24 words
  kp = Keypair.fromSeed(mnemonicToSeedSync(words, "").subarray(0, 32));
} else {
  kp = Keypair.generate();
}
fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });

console.log(`Saved new key "${name}"`);
console.log(`  File:    ${file}`);
console.log(`  Address: ${kp.publicKey.toBase58()}`);
if (words) {
  const list = words.split(" ");
  console.log("\nRECOVERY WORDS. Write these down by hand, in order. Never photograph or type them anywhere else:\n");
  for (let i = 0; i < 24; i += 4) {
    console.log("  " + list.slice(i, i + 4).map((w, j) => `${String(i + j + 1).padStart(2)}. ${w.padEnd(10)}`).join(""));
  }
  console.log("\nWhen you've written them down, run  Clear-Host  to clear the screen.");
  console.log(`Then check your copy with:  node scripts/restore-keypair.mjs ${name}`);
}
