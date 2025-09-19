export const dynamic = "force-dynamic";
export async function GET() {
  const duffelConfigured = !!(process.env.USE_DUFFEL === "1");
  const duffelKey = process.env.DUFFEL_KEY || process.env.DUFFEL_API_KEY || "";
  const duffelReady = duffelConfigured && /^duffel_/.test(duffelKey);
  return Response.json({
    ok: true,
    duffelConfigured,
    duffelReady,
    duffelVersion: process.env.DUFFEL_VERSION || "v2",
  });
}
