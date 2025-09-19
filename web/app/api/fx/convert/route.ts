import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount ?? 0);
    if (!isFinite(amount)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const from = String(body?.from || "USD").toUpperCase();
    const to = String(body?.to || "USD").toUpperCase();

    const r = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amount}`);
    if (!r.ok) return NextResponse.json({ error: "FX upstream failed" }, { status: 502 });
    const j: any = await r.json();

    const converted = typeof j.result === "number" ? j.result : amount;
    const rate = typeof j.info?.rate === "number" ? j.info.rate : amount ? converted / amount : 1;
    return NextResponse.json({ amount, from, to, rate, converted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "FX error" }, { status: 500 });
  }
}
