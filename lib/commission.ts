export function calcCommissionTotale(fixe: unknown, extra: unknown): number {
  const f = Number.isFinite(parseFloat(String(fixe))) ? parseFloat(String(fixe)) : 0;
  const e = Number.isFinite(parseFloat(String(extra))) ? parseFloat(String(extra)) : 0;
  return f + e;
}
