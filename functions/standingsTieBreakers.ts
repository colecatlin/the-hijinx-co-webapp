/**
 * Pure tie-breaker sorting helper for standings rows.
 * Sorts by total points first, then applies tie-breaker rules.
 */
export function sortStandingsWithTieBreakers(rows, tieBreakerOrder) {
  const order = Array.isArray(tieBreakerOrder) && tieBreakerOrder.length
    ? tieBreakerOrder
    : ["wins", "seconds", "thirds", "best_finishes", "latest_finish"];

  const safeNum = (v) => (typeof v === "number" ? v : 0);
  const safeArr = (v) => (Array.isArray(v) ? v : []);

  const compareBestFinishes = (a, b) => {
    const aa = safeArr(a.best_finishes);
    const bb = safeArr(b.best_finishes);
    const len = Math.max(aa.length, bb.length);
    for (let i = 0; i < len; i++) {
      const av = aa[i] ?? 9999;
      const bv = bb[i] ?? 9999;
      if (av !== bv) return av - bv;
    }
    return 0;
  };

  const comparators = {
    wins: (a, b) => safeNum(b.wins) - safeNum(a.wins),
    seconds: (a, b) => safeNum(b.seconds) - safeNum(a.seconds),
    thirds: (a, b) => safeNum(b.thirds) - safeNum(a.thirds),
    best_finishes: (a, b) => compareBestFinishes(a, b),
    most_starts: (a, b) => safeNum(b.starts) - safeNum(a.starts),
    most_entries: (a, b) => safeNum(b.starts) - safeNum(a.starts),
    latest_finish: (a, b) => {
      const av = typeof a.latest_finish === "number" ? a.latest_finish : 9999;
      const bv = typeof b.latest_finish === "number" ? b.latest_finish : 9999;
      return av - bv;
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const pts = safeNum(b.points_total) - safeNum(a.points_total);
    if (pts !== 0) return pts;

    for (const key of order) {
      const cmp = comparators[key];
      if (!cmp) continue;
      const v = cmp(a, b);
      if (v !== 0) return v;
    }

    const an = `${a.last_name || ""}${a.first_name || ""}`.toLowerCase();
    const bn = `${b.last_name || ""}${b.first_name || ""}`.toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });

  return sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));
}