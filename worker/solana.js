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
export const MINTS_PER_TX = 3; // the most that fit in one Solana transaction
const USDC_DECIMALS = 6;

export function rpcUrl(env) {
  const host = env.NETWORK === "mainnet-beta" ? "mainnet" : "devnet";
  return `https://${host}.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
}

async function rpc(env, method, params) {
  const r = await fetch(rpcUrl(env), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

export function ata(owner, mint) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()], ATA_PROGRAM,
  )[0];
}

// How many entries the tree has minted so far (read straight from the chain).
export async function mintedSoFar(env) {
  const umi = createUmi(rpcUrl(env)).use(mplBubblegum());
  const cfg = await fetchTreeConfigFromSeeds(umi, { merkleTree: umiKey(env.MERKLE_TREE) });
  return Number(cfg.numMinted);
}

// How many Gold Frames this wallet already owns (Helius DAS index).
export async function ownedBy(env, owner) {
  const res = await rpc(env, "searchAssets", {
    ownerAddress: owner,
    grouping: ["collection", env.COLLECTION],
    page: 1,
    limit: 1,
  });
  return res.total ?? res.items?.length ?? 0;
}

// The buyer's USDC balance, in whole USDC.
export async function usdcBalance(env, owner) {
  const acct = ata(new PublicKey(owner), new PublicKey(env.USDC_MINT));
  try {
    const r = await rpc(env, "getTokenAccountBalance", [acct.toBase58(), { commitment: "confirmed" }]);
    return Number(r.value.uiAmount ?? 0);
  } catch {
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
export async function buildMintTransactions(env, buyerAddr, quantity) {
  const buyer = new PublicKey(buyerAddr);
  const usdcMint = new PublicKey(env.USDC_MINT);
  const treasury = new PublicKey(env.TREASURY);
  const minterKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env.MINTER_SECRET_KEY)));
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

  const { value } = await rpc(env, "getLatestBlockhash", [{ commitment: "confirmed" }]);
  const buyerAta = ata(buyer, usdcMint);
  const treasuryAta = ata(treasury, usdcMint);

  const txs = [];
  for (let left = quantity; left > 0; left -= MINTS_PER_TX) {
    const n = Math.min(MINTS_PER_TX, left);
    const ixs = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 * n + 50_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
      transferChecked(buyerAta, usdcMint, treasuryAta, buyer, priceUnits * BigInt(n)),
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
