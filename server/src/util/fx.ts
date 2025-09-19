// server/src/util/fx.ts
let rates: Record<string, number> = { USD: 1 };
let last = 0;

export async function ensureFx() {
  if (Date.now() - last < 12 * 3600e3) return;
  const r = await fetch("https://api.exchangerate.host/latest?base=USD");
  const j = await r.json().catch(() => ({}));
  rates = j?.rates || { USD: 1 };
  last = Date.now();
}

export async function convertUsd(amountUsd: number, to: string) {
  await ensureFx();
  const k = (rates[to] ?? 1);
  return Math.round(amountUsd * k * 100) / 100;
}
