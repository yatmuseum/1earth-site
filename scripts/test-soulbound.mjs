// DEVNET test: mints one Gold Frame to your test treasury key, then tries to
// TRANSFER it and BURN it. Both of those must FAIL for the Gold Frame to be
// truly soulbound. Needs your Helius key (for looking up compressed assets):
//
//   $env:HELIUS_API_KEY="your-key"
//   node scripts/test-soulbound.mjs
import { some, publicKey } from "@metaplex-foundation/umi";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import {
  mintV2, parseLeafFromMintV2Transaction, getAssetWithProof, transferV2, burnV2,
} from "@metaplex-foundation/mpl-bubblegum";
import { makeUmi, publicKeyOf, signerOf, loadState, sleep } from "./lib.mjs";

if (!process.env.HELIUS_API_KEY) {
  console.error('First run:  $env:HELIUS_API_KEY="your-key"   (then run this again)');
  process.exit(1);
}

const NETWORK = "devnet";
const state = loadState(NETWORK);
if (!state.collection || !state.merkleTree) {
  console.error("Run node scripts/setup-devnet.mjs --go first.");
  process.exit(1);
}

const umi = makeUmi(NETWORK, "devnet-deployer").use(dasApi());
const minter = signerOf(umi, "devnet-minter");
const owner = signerOf(umi, "devnet-treasury");
const collection = publicKey(state.collection);
const merkleTree = publicKey(state.merkleTree);

console.log("1) Minting one Gold Frame to the test treasury…");
const { signature } = await mintV2(umi, {
  leafOwner: owner.publicKey,
  merkleTree,
  coreCollection: collection,
  treeCreatorOrDelegate: minter,
  collectionAuthority: minter,
  metadata: {
    name: "1-Earth Gold Frame",
    symbol: "1EARTH",
    uri: "https://1-earth.io/metadata/entry.json",
    sellerFeeBasisPoints: 0,
    collection: some(collection),
    creators: [],
  },
}).sendAndConfirm(umi);

const leaf = await parseLeafFromMintV2Transaction(umi, signature);
const assetId = leaf.id;
console.log(`   Minted. Entry #${Number(leaf.nonce) + 1}  Asset ID: ${assetId}`);

console.log("2) Waiting for Helius to index it…");
let asset;
for (let i = 0; i < 20; i++) {
  try { asset = await getAssetWithProof(umi, assetId, { truncateCanopy: true }); break; }
  catch { await sleep(3000); }
}
if (!asset) { console.error("   Couldn't find the asset yet. Run this script again in a minute."); process.exit(1); }
const own = asset.rpcAsset.ownership;
console.log(`   Owner: ${own.owner}  frozen: ${own.frozen}  non_transferable: ${own.non_transferable ?? "n/a"}`);

let pass = true;

console.log("3) Trying to TRANSFER it (should fail)…");
try {
  await transferV2(umi, {
    ...asset, authority: owner, newLeafOwner: publicKeyOf(umi, "devnet-deployer"), coreCollection: collection,
  }).sendAndConfirm(umi);
  console.log("   ❌ TRANSFER SUCCEEDED. Not soulbound! Stop and report this.");
  pass = false;
} catch (e) {
  console.log(`   ✅ Transfer blocked (${String(e.message).split("\n")[0].slice(0, 120)})`);
}

console.log("4) Trying to BURN it (should fail)…");
try {
  const fresh = await getAssetWithProof(umi, assetId, { truncateCanopy: true });
  await burnV2(umi, { ...fresh, authority: owner, coreCollection: collection }).sendAndConfirm(umi);
  console.log("   ❌ BURN SUCCEEDED. Entries could be destroyed! Stop and report this.");
  pass = false;
} catch (e) {
  console.log(`   ✅ Burn blocked (${String(e.message).split("\n")[0].slice(0, 120)})`);
}

console.log("");
console.log(pass ? "RESULT: PASS. Gold Frames are soulbound." : "RESULT: FAIL. See above.");
console.log(`View it: https://explorer.solana.com/address/${assetId}?cluster=devnet`);
