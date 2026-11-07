// Uploads the Gold Frame image to Arweave (permanent storage, paid in SOL by
// the deployer), then points the site's metadata files at the permanent link.
//
//   node scripts/upload-image.mjs            shows the price, uploads nothing
//   node scripts/upload-image.mjs --go       uploads and updates the files
// Afterwards: git add . ; git commit -m "Permanent Gold Frame image" ; git push
import fs from "node:fs";
import { createGenericFile } from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { makeUmi, loadState, saveState } from "./lib.mjs";

const go = process.argv.includes("--go");
const IMAGE = "public/metadata/entry.png";
const FILES = ["public/f.json", "public/metadata/entry.json", "public/metadata/collection.json"];

const umi = makeUmi("mainnet-beta", "mainnet-deployer").use(irysUploader());
const bytes = fs.readFileSync(IMAGE);
const file = createGenericFile(bytes, "gold-frame.png", { contentType: "image/png" });
const price = await umi.uploader.getUploadPrice([file]);
const balance = Number((await umi.rpc.getBalance(umi.identity.publicKey)).basisPoints) / 1e9;

console.log(`Image:    ${IMAGE} (${(bytes.length / 1024).toFixed(0)} KB)`);
console.log(`Cost:     about ${Number(price.basisPoints) / 1e9} SOL`);
console.log(`Deployer: ${umi.identity.publicKey} (${balance} SOL)`);
if (!go) { console.log("\nNothing uploaded yet. Run again with --go to upload."); process.exit(0); }

const [uri] = await umi.uploader.upload([file]);
console.log(`\nUploaded. Permanent link: ${uri}`);

for (const f of FILES) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  j.image = uri;
  if (j.properties?.files) j.properties.files = [{ uri, type: "image/png" }];
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
  console.log(`Updated ${f}`);
}
const st = loadState("mainnet-beta");
st.imageUri = uri;
saveState("mainnet-beta", st);
console.log('\nNow run:  git add .   then   git commit -m "Permanent Gold Frame image"   then   git push');
