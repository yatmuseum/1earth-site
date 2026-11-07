// "Wallet signs first" support.
//
// The server hands the buyer UNSIGNED transactions plus a signed "ticket" for
// each one. The buyer's wallet signs first (which is what Phantom asks for),
// then the site sends each signed transaction back here. Before the minter key
// adds its signature, the server checks that the transaction still does
// exactly what was approved:
//   - the right buyer paid, and their signature is valid
//   - the USDC payment is exactly price x entries, to the treasury
//   - it mints exactly the reserved number of Gold Frames, unchanged
//   - the minter key is used ONLY by those mint instructions
// Wallets may add their own safety instructions; those are allowed as long as
// they don't touch the minter. Each ticket can only be used once.
import { PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519";

const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmacKey(secret) {
  // Derived from the minter secret, so no extra secret has to be managed.
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`1earth-ticket:${secret}`));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function makeTicket(secret, payload) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64u(sig)}`;
}

export async function readTicket(secret, ticket) {
  const [body, sig] = String(ticket || "").split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), unb64u(sig), enc.encode(body));
  if (!ok) return null;
  try { return JSON.parse(new TextDecoder().decode(unb64u(body))); } catch { return null; }
}

const eqBytes = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// expected: { buyer, minterKp, alt, blockhash, n, bubblegumProgram, coreProgram,
//             tokenProgram, mintData, mintAccounts (base58[]), transferData, transferAccounts (base58[]) }
export function validateAndCosign(signedB64, expected) {
  let tx;
  try { tx = VersionedTransaction.deserialize(Uint8Array.from(atob(signedB64), (c) => c.charCodeAt(0))); }
  catch { return { error: "Unreadable transaction." }; }
  const msg = tx.message;

  if (msg.recentBlockhash !== expected.blockhash) return { error: "Transaction doesn't match this purchase." };

  // Only our own lookup table may be used, so every account can be checked.
  for (const l of msg.addressTableLookups || []) {
    if (!expected.alt || !l.accountKey.equals(expected.alt.key)) return { error: "Unexpected lookup table." };
  }
  let keys;
  try { keys = msg.getAccountKeys({ addressLookupTableAccounts: expected.alt ? [expected.alt] : [] }); }
  catch { return { error: "Couldn't read transaction accounts." }; }
  const key = (i) => keys.get(i).toBase58();

  // Fee payer must be the buyer, and the buyer must have actually signed.
  const statics = msg.staticAccountKeys.map((k) => k.toBase58());
  if (statics[0] !== expected.buyer) return { error: "Wrong buyer." };
  const msgBytes = msg.serialize();
  if (!ed25519.verify(tx.signatures[0], msgBytes, new PublicKey(expected.buyer).toBytes())) {
    return { error: "Missing or invalid wallet signature." };
  }
  const minter = expected.minterKp.publicKey.toBase58();
  const minterIdx = statics.indexOf(minter);
  if (minterIdx < 1 || minterIdx >= msg.header.numRequiredSignatures) return { error: "Minter not a signer." };

  let mints = 0, payments = 0;
  for (const ix of msg.compiledInstructions) {
    const program = key(ix.programIdIndex);
    const accounts = ix.accountKeyIndexes.map(key);
    const data = ix.data;

    if (program === expected.bubblegumProgram) {
      if (!eqBytes(data, expected.mintData)) return { error: "Changed mint instruction." };
      if (accounts.join() !== expected.mintAccounts.join()) return { error: "Changed mint accounts." };
      mints++;
      continue;
    }
    if (program === expected.coreProgram) return { error: "Unexpected collection instruction." };
    if (accounts.includes(minter) || program === minter) return { error: "Minter key used outside minting." };
    if (program === expected.tokenProgram && data[0] === 12 &&
        accounts.join() === expected.transferAccounts.join()) {
      if (!eqBytes(data, expected.transferData)) return { error: "Changed payment amount." };
      payments++;
    }
  }
  if (mints !== expected.n) return { error: "Wrong number of mints." };
  if (payments !== 1) return { error: "Payment missing." };

  tx.sign([expected.minterKp]);
  return { tx: btoa(String.fromCharCode(...tx.serialize())) };
}
