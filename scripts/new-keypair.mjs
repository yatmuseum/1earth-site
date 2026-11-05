// Creates a new Solana keypair and saves it OUTSIDE the project folder,
// in a "1earth-keys" folder in your user directory, so it can never be
// uploaded to GitHub by accident.
//
// Usage:  node scripts/new-keypair.mjs devnet-deployer
import { Keypair } from "@solana/web3.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("Give the key a simple name, e.g.: node scripts/new-keypair.mjs devnet-deployer");
  process.exit(1);
}

const dir = path.join(os.homedir(), "1earth-keys");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${name}.json`);

if (fs.existsSync(file)) {
  console.error(`A key named "${name}" already exists at ${file}. Not overwriting it.`);
  process.exit(1);
}

const kp = Keypair.generate();
fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });

console.log(`Saved new key "${name}"`);
console.log(`  File:    ${file}`);
console.log(`  Address: ${kp.publicKey.toBase58()}`);
console.log("Keep this file private. The address is safe to share.");
