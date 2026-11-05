// Shared helpers for the 1-Earth setup scripts.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, createSignerFromKeypair } from "@metaplex-foundation/umi";
import { mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { mplCore } from "@metaplex-foundation/mpl-core";

export const KEYS_DIR = path.join(os.homedir(), "1earth-keys");

export function rpcUrl(network) {
  const key = process.env.HELIUS_API_KEY;
  if (network === "devnet") {
    return key ? `https://devnet.helius-rpc.com/?api-key=${key}` : "https://api.devnet.solana.com";
  }
  if (!key) throw new Error("Set HELIUS_API_KEY in this terminal before using mainnet.");
  return `https://mainnet.helius-rpc.com/?api-key=${key}`;
}

export function loadSecret(name) {
  const file = path.join(KEYS_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No key named "${name}". Create it with: node scripts/new-keypair.mjs ${name}`);
  }
  return Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")));
}

export function makeUmi(network, payerKeyName) {
  const umi = createUmi(rpcUrl(network)).use(mplBubblegum()).use(mplCore());
  const kp = umi.eddsa.createKeypairFromSecretKey(loadSecret(payerKeyName));
  umi.use(keypairIdentity(kp));
  return umi;
}

export function publicKeyOf(umi, name) {
  return umi.eddsa.createKeypairFromSecretKey(loadSecret(name)).publicKey;
}

export function signerOf(umi, name) {
  return createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(loadSecret(name)));
}

export function stateFile(network) {
  return path.join(KEYS_DIR, `${network}-setup.json`);
}
export function loadState(network) {
  const f = stateFile(network);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
}
export function saveState(network, state) {
  fs.writeFileSync(stateFile(network), JSON.stringify(state, null, 2));
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
