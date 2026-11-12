// Dobór prezentów do budżetu. Czysta logika, bez zależności (używana w przeglądarce i w testach).

export interface OptItem {
  id: number;
  priceCents: number;
  rank: number;
  groupId: number | null;
}

/** most = najpierw liczba prezentów, potem suma; fewest = najpierw suma, potem jak najmniej sztuk */
export type Goal = "most" | "fewest";

export interface OptOptions {
  budgetCents: number;
  respectGroups: boolean;
  goal: Goal;
}

/** Jednostka zakupu: pojedynczy prezent albo cały komplet. */
export interface Unit {
  key: string;
  itemIds: number[];
  priceCents: number;
  rankSum: number;
  groupId: number | null;
}

export interface OptResult {
  selectedIds: number[];
  spentCents: number;
}

export function buildUnits(items: OptItem[], respectGroups: boolean): Unit[] {
  const units: Unit[] = [];
  const byGroup = new Map<number, Unit>();
  for (const it of items) {
    if (respectGroups && it.groupId != null) {
      let u = byGroup.get(it.groupId);
      if (!u) {
        u = { key: `g${it.groupId}`, itemIds: [], priceCents: 0, rankSum: 0, groupId: it.groupId };
        byGroup.set(it.groupId, u);
        units.push(u);
      }
      u.itemIds.push(it.id);
      u.priceCents += it.priceCents;
      u.rankSum += it.rank;
    } else {
      units.push({
        key: `i${it.id}`,
        itemIds: [it.id],
        priceCents: it.priceCents,
        rankSum: it.rank,
        groupId: it.groupId,
      });
    }
  }
  return units;
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/**
 * Dokładny plecak 0/1 po kwotach. Dla każdej osiągalnej sumy pamiętamy najlepszą
 * liczbę sztuk (max albo min, zależnie od celu), a przy remisie wyższą sumę rang
 * (wyższa ranga = bardziej pożądany prezent).
 */
export function optimize(items: OptItem[], opts: OptOptions): OptResult {
  const budget = Math.floor(opts.budgetCents);
  const units = buildUnits(items, opts.respectGroups).filter(
    (u) => u.priceCents > 0 && u.priceCents <= budget,
  );
  if (units.length === 0) return { selectedIds: [], spentCents: 0 };

  const total = units.reduce((s, u) => s + u.priceCents, 0);
  if (total <= budget) {
    return { selectedIds: units.flatMap((u) => u.itemIds), spentCents: total };
  }

  const g = units.reduce((acc, u) => gcd(acc, u.priceCents), 0);
  const cap = Math.floor(budget / g);
  const n = units.length;
  const words = Math.ceil((cap + 1) / 32);
  const take = new Uint32Array(n * words);
  const cnt = new Int32Array(cap + 1).fill(-1);
  const rk = new Float64Array(cap + 1);
  cnt[0] = 0;
  const most = opts.goal === "most";

  for (let i = 0; i < n; i++) {
    const w = units[i].priceCents / g;
    const c = units[i].itemIds.length;
    const r = units[i].rankSum;
    const base = i * words;
    for (let s = cap; s >= w; s--) {
      const prev = cnt[s - w];
      if (prev < 0) continue;
      const candC = prev + c;
      const candR = rk[s - w] + r;
      const cur = cnt[s];
      const better =
        cur < 0 ||
        (most ? candC > cur : candC < cur) ||
        (candC === cur && candR > rk[s]);
      if (better) {
        cnt[s] = candC;
        rk[s] = candR;
        take[base + (s >>> 5)] |= 1 << (s & 31);
      }
    }
  }

  let best = 0;
  if (most) {
    for (let s = 1; s <= cap; s++) {
      if (cnt[s] >= 0 && cnt[s] >= cnt[best]) best = s;
    }
  } else {
    for (let s = cap; s > 0; s--) {
      if (cnt[s] >= 0) {
        best = s;
        break;
      }
    }
  }

  const selectedIds: number[] = [];
  let s = best;
  for (let i = n - 1; i >= 0 && s > 0; i--) {
    if (take[i * words + (s >>> 5)] & (1 << (s & 31))) {
      selectedIds.push(...units[i].itemIds);
      s -= units[i].priceCents / g;
    }
  }
  return { selectedIds, spentCents: best * g };
}

export interface Nudge {
  unitKey: string;
  /** prezent lub komplet, o który toczy się gra */
  focusIds: number[];
  isBundle: boolean;
  /** ile trzeba dołożyć do budżetu */
  missingCents: number;
  /** pełny zestaw po dołożeniu: dotychczasowy wybór plus focusIds, bez removeIds */
  selectionIds: number[];
  /** podmiana: jedyny prezent (komplet), który wypada z wyboru; puste przy zwykłej dokładce */
  removeIds: number[];
  removeKey: string | null;
}

/**
 * Zaczepki nigdy nie przebudowują wyboru. Są dwa rodzaje:
 *  - dokładka: dotychczasowy wybór zostaje, dochodzi jeden prezent (komplet),
 *  - podmiana: dokładnie jeden wybrany prezent ustępuje miejsca droższemu.
 * Podmiany pokazujemy tylko wtedy, gdy zabraknie dokładek. Dopłata mieści się
 * w 25% budżetu (tolerancja nie mniejsza niż 30 zł). skipKeys to jednostki,
 * o które już nie zaczepiamy (np. wymienione wcześniej), więc nie ma kręcenia się w kółko.
 */
export function findNudges(
  items: OptItem[],
  selected: ReadonlySet<number>,
  budgetCents: number,
  respectGroups: boolean,
  limit = 3,
  skipKeys: ReadonlySet<string> = new Set(),
): Nudge[] {
  const priceById = new Map(items.map((i) => [i.id, i.priceCents]));
  let spent = 0;
  for (const id of selected) spent += priceById.get(id) ?? 0;
  if (spent > budgetCents) return [];

  const units = buildUnits(items, respectGroups).filter((u) => u.priceCents > 0);
  const threshold = Math.floor(Math.max(budgetCents * 0.25, 3000));
  const chosen = units.filter((u) => u.itemIds.every((id) => selected.has(id)));
  const current = [...selected].filter((id) => priceById.has(id));

  const adds: Nudge[] = [];
  const swaps: Nudge[] = [];
  for (const u of units) {
    if (skipKeys.has(u.key)) continue;
    const addIds = u.itemIds.filter((id) => !selected.has(id));
    if (addIds.length === 0) continue;
    const addPrice = addIds.reduce((s, id) => s + (priceById.get(id) ?? 0), 0);
    const base = {
      unitKey: u.key,
      focusIds: u.itemIds,
      isBundle: u.itemIds.length > 1,
    };
    const missing = spent + addPrice - budgetCents;
    if (missing <= 0) continue; // mieści się bez dopłaty, to nie zaczepka
    if (missing <= threshold) {
      adds.push({ ...base, missingCents: missing, selectionIds: [...current, ...addIds], removeIds: [], removeKey: null });
      continue;
    }
    // podmiana jeden za jeden: najmniejsza dodatnia dopłata
    let best: Unit | null = null;
    let bestMissing = Infinity;
    for (const v of chosen) {
      const m = missing - v.priceCents;
      if (m > 0 && m <= threshold && m < bestMissing) {
        best = v;
        bestMissing = m;
      }
    }
    if (best) {
      const out = new Set(best.itemIds);
      swaps.push({
        ...base,
        missingCents: bestMissing,
        selectionIds: [...current.filter((id) => !out.has(id)), ...addIds],
        removeIds: best.itemIds,
        removeKey: best.key,
      });
    }
  }
  adds.sort((a, b) => a.missingCents - b.missingCents);
  if (adds.length > 0) return adds.slice(0, limit);
  swaps.sort((a, b) => a.missingCents - b.missingCents);
  // jeden wybrany prezent może wypaść tylko w jednej propozycji naraz
  const seen = new Set<string>();
  const out: Nudge[] = [];
  for (const n of swaps) {
    if (seen.has(n.removeKey!)) continue;
    seen.add(n.removeKey!);
    out.push(n);
    if (out.length >= Math.min(limit, 1)) break;
  }
  return out;
}
