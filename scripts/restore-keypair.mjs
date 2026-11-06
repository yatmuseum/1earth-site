// Checks (or recreates) a key from its 24 handwritten recovery words.
//   node scripts/restore-keypair.mjs mainnet-deployer
// You'll be asked to type the words (they aren't saved anywhere or shown in history).
//  - If the key file exists: tells you whether your written words MATCH it.
//  - If the key file is missing: recreates it from the words.
import { Keypair } from "@solana/web3.js";
import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";

const name = process.argv[2];
if (!name) { console.error("Usage: node scripts/restore-keypair.mjs mainnet-deployer"); process.exit(1); }
const file = path.join(os.homedir(), "1earth-keys", `${name}.json`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const words = (await rl.question("Type the 24 words, separated by spaces, then press Enter:\n> "))
  .trim().toLowerCase().split(/\s+/).join(" ");
rl.close();

if (!validateMnemonic(words, wordlist)) {
  console.error("\nThose words aren't valid. There's a typo, a missing word, or the order is off. Check your copy.");
  process.exit(1);
}
const kp = Keypair.fromSeed(mnemonicToSeedSync(words, "").subarray(0, 32));
console.log(`\nThese words make the key with address: ${kp.publicKey.toBase58()}`);

if (fs.existsSync(file)) {
  const saved = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
  console.log(saved.publicKey.equals(kp.publicKey)
    ? "✅ MATCH. Your written copy is correct."
    : "❌ DOES NOT MATCH the saved key. Recheck your written words.");
} else {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  console.log(`Recreated the key file: ${file}`);
}
console.log("Run  Clear-Host  to clear the screen.");
