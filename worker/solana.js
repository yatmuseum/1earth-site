// Solana helpers for the mint function.
import {
  PublicKey, Keypair, TransactionInstruction, TransactionMessage, VersionedTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createNoopSigner, publicKey as umiKey, some } from "@metaplex-foundation/umi";
import { mplBubblegum, mintV2, fetchTreeConfigFromSeeds } from "@metaplex-foundation/mpl-bubblegum";
import { toWeb3JsInstruction } from "@metaplex-foundation/umi-web3js-adapters";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// A short random tag makes every transaction unique. Without it, two
// transactions with the same contents (e.g. 3 + 3 entries) are byte-for-byte
// identical, and Solana rejects the second as a duplicate.
function uniqueTag() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return new TransactionInstruction({ programId: MEMO_PROGRAM, keys: [], data: new TextEncoder().encode(`1E:${hex}`) });
}
export const MINTS_PER_TX = 3; // the most that fit in one Solana transaction
const USDC_DECIMALS = 6;

// Devnet and mainnet use different minter keys, stored as separate secrets,
// so switching networks never mixes them up.
export function minterSecret(env) {
  return env.NETWORK === "mainnet-beta" ? env.MINTER_SECRET_KEY_MAINNET : env.MINTER_SECRET_KEY;
}

export function rpcUrl(env) {
  const host = env.NETWORK === "mainnet-beta" ? "mainnet" : "devnet";
  return `https://${host}.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
}

export class BusyError extends Error {}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Calls Helius. If Helius says "too many requests", waits a moment and tries
// again (up to 4 times, with a little randomness so retries don't all collide).
async function rpc(env, method, params) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(rpcUrl(env), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const limited = r.status === 429;
    let j = null;
    if (!limited) {
      j = await r.json();
      if (!j.error) return j.result;
    }
    const msg = j?.error?.message || "";
    if ((limited || /rate|too many/i.test(msg)) && attempt < 4) {
      await pause(300 * 2 ** attempt + Math.random() * 300);
      continue;
    }
    if (limited || /rate|too many/i.test(msg)) throw new BusyError(method);
    throw new Error(`${method}: ${msg}`);
  }
}

// Short-lived caches, so a rush of buyers doesn't repeat identical lookups.
let mintedCache = { at: 0, value: null };
let blockhashCache = { at: 0, value: null };

export function ata(owner, mint) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()], ATA_PROGRAM,
  )[0];
}

// How many entries the tree has minted so far (read straight from the chain).
export async function mintedSoFar(env, maxAgeMs = 0) {
  if (maxAgeMs && Date.now() - mintedCache.at < maxAgeMs && mintedCache.value !== null) return mintedCache.value;
  const umi = createUmi(rpcUrl(env)).use(mplBubblegum());
  for (let attempt = 0; ; attempt++) {
    try {
      const cfg = await fetchTreeConfigFromSeeds(umi, { merkleTree: umiKey(env.MERKLE_TREE) });
      mintedCache = { at: Date.now(), value: Number(cfg.numMinted) };
      return mintedCache.value;
    } catch (e) {
      if (/429|rate|too many/i.test(String(e?.message)) && attempt < 4) {
        await pause(300 * 2 ** attempt + Math.random() * 300);
        continue;
      }
      if (/429|rate|too many/i.test(String(e?.message))) throw new BusyError("treeConfig");
      throw e;
    }
  }
}

// How many Gold Frames this wallet already owns (Helius DAS index).
// Remembered for 20 seconds per wallet, so a rush of clicks doesn't exceed the
// DAS limit. This is safe because every purchase's hold lasts longer than that
// (see GRACE_BLOCKS in gate.js), so nothing minted in the meantime is missed.
const ownedCache = new Map();
export async function ownedBy(env, owner) {
  const hit = ownedCache.get(owner);
  if (hit && Date.now() - hit.at < 20_000) return hit.value;
  const value = await ownedByUncached(env, owner);
  ownedCache.set(owner, { at: Date.now(), value });
  if (ownedCache.size > 5000) ownedCache.clear();
  return value;
}

async function ownedByUncached(env, owner) {
  const res = await rpc(env, "searchAssets", {
    ownerAddress: owner,
    grouping: ["collection", env.COLLECTION],
    page: 1,
    limit: 1000, // per-wallet maximum is 100, so one page always covers it
  });
  return res.items?.length ?? 0;
}

// The buyer's USDC balance, in whole USDC.
export async function usdcBalance(env, owner) {
  const acct = ata(new PublicKey(owner), new PublicKey(env.USDC_MINT));
  try {
    const r = await rpc(env, "getTokenAccountBalance", [acct.toBase58(), { commitment: "confirmed" }]);
    return Number(r.value.uiAmount ?? 0);
  } catch (e) {
    if (e instanceof BusyError) throw e;
    return 0; // no USDC account at all
  }
}

function transferChecked(source, mint, dest, owner, amount) {
  const data = new Uint8Array(10);
  data[0] = 12; // TransferChecked
  new DataView(data.buffer).setBigUint64(1, BigInt(amount), true);
  data[9] = USDC_DECIMALS;
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: dest, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

// Builds the transactions for one purchase. Each transaction pays for exactly
// the Gold Frames it mints, so if a buyer stops halfway, every entry they got
// was paid for and every payment got its entries.
export async function latestBlockhash(env) {
  // A blockhash is good for about a minute, so reusing one for 2 seconds is safe.
  if (Date.now() - blockhashCache.at < 2_000 && blockhashCache.value) return blockhashCache.value;
  const { value } = await rpc(env, "getLatestBlockhash", [{ commitment: "confirmed" }]);
  blockhashCache = { at: Date.now(), value };
  return value; // { blockhash, lastValidBlockHeight }
}

export async function buildMintTransactions(env, buyerAddr, quantity, value) {
  const buyer = new PublicKey(buyerAddr);
  const usdcMint = new PublicKey(env.USDC_MINT);
  const treasury = new PublicKey(env.TREASURY);
  const minterKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(minterSecret(env))));
  const priceUnits = BigInt(Math.round(Number(env.PRICE_USDC) * 10 ** USDC_DECIMALS));

  const umi = createUmi(rpcUrl(env)).use(mplBubblegum());
  const buyerSigner = createNoopSigner(umiKey(buyerAddr));
  const minterSigner = createNoopSigner(umiKey(minterKp.publicKey.toBase58()));
  const collection = umiKey(env.COLLECTION);

  const mintIx = () =>
    mintV2(umi, {
      payer: buyerSigner,
      leafOwner: buyerSigner.publicKey,
      merkleTree: umiKey(env.MERKLE_TREE),
      coreCollection: collection,
      treeCreatorOrDelegate: minterSigner,
      collectionAuthority: minterSigner,
      metadata: {
        name: "1-Earth Gold Frame",
        symbol: "1EARTH",
        uri: env.METADATA_URI,
        sellerFeeBasisPoints: 0,
        collection: some(collection),
        creators: [],
      },
    }).getInstructions().map(toWeb3JsInstruction)[0];

  const buyerAta = ata(buyer, usdcMint);
  const treasuryAta = ata(treasury, usdcMint);

  const txs = [];
  for (let left = quantity; left > 0; left -= MINTS_PER_TX) {
    const n = Math.min(MINTS_PER_TX, left);
    const ixs = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 * n + 50_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Number(env.PRIORITY_MICROLAMPORTS || 10_000) }),
      transferChecked(buyerAta, usdcMint, treasuryAta, buyer, priceUnits * BigInt(n)),
      uniqueTag(),
    ];
    for (let i = 0; i < n; i++) ixs.push(mintIx());
    const msg = new TransactionMessage({
      payerKey: buyer, recentBlockhash: value.blockhash, instructions: ixs,
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    tx.sign([minterKp]); // the buyer adds their signature in their wallet
    txs.push(btoa(String.fromCharCode(...tx.serialize())));
  }
  return { transactions: txs, blockhash: value.blockhash, lastValidBlockHeight: value.lastValidBlockHeight };
}
