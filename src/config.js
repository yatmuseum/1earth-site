// All the numbers and dates shown on the site live here, so they can be
// changed in one place. Times are stored in UTC.
// 11:11 EST = 16:11 UTC (US clocks are on standard time in November).

export const MINT = {
  priceUsdc: 20,
  supply: 1000,
  oddsLabel: "1 in 1,000",
  opensAt: new Date("2026-11-11T16:11:00Z"),
  opensLabel: "November 11th @ 11:11 AM EST",
  drawingLabel: "November 27th @ 11:11 AM EST",
  // Per-wallet limits by phase, counted from the moment the mint opens.
  phases: [
    { hours: 216, max: 5 },   // until Nov 20 @ 11:11 AM EST
    { hours: 336, max: 10 },  // until Nov 25 @ 11:11 AM EST
    { hours: Infinity, max: 100 },
  ],
  // Stays false until the mint program is built, tested and audited.
  // While false, the buy button can never send a transaction.
  live: false,
};

// 1 winner, 10,000 USDC.
export const PRIZES = [["Grand prize", "10,000"]];

export function currentMax(now = new Date()) {
  const hoursIn = (now - MINT.opensAt) / 36e5;
  if (hoursIn < 0) return MINT.phases[0].max;
  return MINT.phases.find((p) => hoursIn < p.hours).max;
}
