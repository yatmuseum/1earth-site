// The drawing math, kept separate so anyone can read and re-run it.
//
// Given the 32-byte random value from Switchboard and the number of entries N,
// winners are picked like this:
//   for k = 0, 1, 2, ...:
//     h = SHA-256( seed || "1-Earth 50/50 draw" || k as 4-byte big-endian )
//     treat h as a 256-bit number x
//     if x falls in the uneven "remainder" at the very top of the range, skip it
//       (this keeps every entry's chance exactly equal)
//     entry = (x mod N) + 1
//     skip entries already picked
//   until enough winners are found.
import { createHash } from "node:crypto";

const LABEL = Buffer.from("1-Earth 50/50 draw", "utf8");

export function pickWinners(seed, entries, count) {
  if (!Buffer.isBuffer(seed) || seed.length !== 32) throw new Error("Seed must be 32 bytes");
  if (!Number.isInteger(entries) || entries < 1) throw new Error("No entries");
  if (count > entries) throw new Error("More winners than entries");
  const n = BigInt(entries);
  const limit = (2n ** 256n / n) * n; // largest multiple of N below 2^256
  const winners = [];
  const seen = new Set();
  for (let k = 0; winners.length < count; k++) {
    const kb = Buffer.alloc(4);
    kb.writeUInt32BE(k);
    const h = createHash("sha256").update(Buffer.concat([seed, LABEL, kb])).digest("hex");
    const x = BigInt("0x" + h);
    if (x >= limit) continue;
    const entry = Number(x % n) + 1;
    if (seen.has(entry)) continue;
    seen.add(entry);
    winners.push(entry);
  }
  return winners;
}

// Snapshot of every entry: "entry,owner,asset" per line, in entry order.
export function snapshotText(rows) {
  return rows.map((r) => `${r.entry},${r.owner},${r.asset}`).join("\n") + "\n";
}
export function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
