export function addDays(iso: string, n: number) {
  const d = new Date(iso);
  if (isNaN(+d)) return null;
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
