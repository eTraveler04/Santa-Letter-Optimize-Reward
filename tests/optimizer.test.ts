import test from "node:test";
import assert from "node:assert/strict";
import { optimize, findNudges, type OptItem } from "../src/lib/optimizer.ts";

const zl = (n: number) => Math.round(n * 100);
const item = (id: number, price: number, rank = 1, groupId: number | null = null): OptItem => ({
  id,
  priceCents: zl(price),
  rank,
  groupId,
});
const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);

test("fewest: wydaje jak najwięcej, a przy tej samej sumie bierze mniej sztuk", () => {
  const items = [item(1, 100), item(2, 50), item(3, 50), item(4, 30)];
  const r = optimize(items, { budgetCents: zl(100), respectGroups: true, goal: "fewest" });
  assert.equal(r.spentCents, zl(100));
  assert.deepEqual(r.selectedIds, [1]);
});

test("most: najpierw liczba sztuk, potem suma", () => {
  const items = [item(1, 100), item(2, 50), item(3, 45), item(4, 30), item(5, 20)];
  const r = optimize(items, { budgetCents: zl(100), respectGroups: true, goal: "most" });
  // 3 sztuki: 50+30+20=100 lepsze niż 45+30+20=95
  assert.deepEqual(sorted(r.selectedIds), [2, 4, 5]);
  assert.equal(r.spentCents, zl(100));
});

test("komplet wchodzi w całości albo wcale", () => {
  const items = [item(1, 80, 1, 7), item(2, 80, 1, 7), item(3, 90)];
  const respect = optimize(items, { budgetCents: zl(150), respectGroups: true, goal: "fewest" });
  assert.deepEqual(respect.selectedIds, [3]);
  const ignore = optimize(items, { budgetCents: zl(150), respectGroups: false, goal: "fewest" });
  assert.equal(ignore.spentCents, zl(90)); // 80+80 > 150, 80+90 > 150
  const both = optimize(items, { budgetCents: zl(160), respectGroups: true, goal: "fewest" });
  assert.deepEqual(sorted(both.selectedIds), [1, 2]);
});

test("remis rozstrzyga wyższa ranga", () => {
  const items = [item(1, 100, 1), item(2, 100, 5)];
  for (const goal of ["most", "fewest"] as const) {
    const r = optimize(items, { budgetCents: zl(100), respectGroups: true, goal });
    assert.deepEqual(r.selectedIds, [2], goal);
  }
  // kolejność na liście nie ma znaczenia
  const flipped = optimize([items[1], items[0]], { budgetCents: zl(100), respectGroups: true, goal: "fewest" });
  assert.deepEqual(flipped.selectedIds, [2]);
});

test("grosze i budżet większy niż cała lista", () => {
  const items = [item(1, 19.99), item(2, 0.01), item(3, 5.5)];
  const all = optimize(items, { budgetCents: zl(1000), respectGroups: true, goal: "most" });
  assert.equal(all.selectedIds.length, 3);
  const r = optimize(items, { budgetCents: zl(20), respectGroups: true, goal: "fewest" });
  assert.equal(r.spentCents, zl(20));
  assert.deepEqual(sorted(r.selectedIds), [1, 2]);
});

test("nic się nie mieści", () => {
  const r = optimize([item(1, 100)], { budgetCents: zl(50), respectGroups: true, goal: "most" });
  assert.deepEqual(r, { selectedIds: [], spentCents: 0 });
});

test("zgodność z pełnym przeglądem na losowych danych", () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let round = 0; round < 200; round++) {
    const n = 2 + Math.floor(rnd() * 9);
    const items = Array.from({ length: n }, (_, i) => item(i + 1, 1 + Math.floor(rnd() * 60)));
    const budget = zl(10 + Math.floor(rnd() * 150));
    for (const goal of ["most", "fewest"] as const) {
      let bestCount = 0;
      let bestSum = 0;
      for (let mask = 0; mask < 1 << n; mask++) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < n; i++) if (mask & (1 << i)) (sum += items[i].priceCents), count++;
        if (sum > budget) continue;
        const better =
          goal === "most"
            ? count > bestCount || (count === bestCount && sum > bestSum)
            : sum > bestSum || (sum === bestSum && count < bestCount);
        if (better) (bestCount = count), (bestSum = sum);
      }
      const r = optimize(items, { budgetCents: budget, respectGroups: true, goal });
      assert.equal(r.spentCents, bestSum, `suma, ${goal}, runda ${round}`);
      assert.equal(r.selectedIds.length, bestCount, `sztuki, ${goal}, runda ${round}`);
    }
  }
});

test("zaczepki: tylko to, do czego brakuje niewiele", () => {
  const items = [item(1, 90), item(2, 25), item(3, 400)];
  const nudges = findNudges(items, new Set([1]), zl(100), true);
  assert.equal(nudges.length, 1);
  assert.deepEqual(nudges[0].focusIds, [2]);
  assert.equal(nudges[0].missingCents, zl(15));
  assert.deepEqual(sorted(nudges[0].selectionIds), [1, 2]);
});

test("zaczepki: dokładka nie rusza dotychczasowego wyboru", () => {
  const items = [item(1, 60), item(2, 30), item(3, 25), item(4, 400)];
  const nudges = findNudges(items, new Set([1, 2]), zl(100), true);
  assert.deepEqual(nudges.map((n) => n.focusIds[0]), [3]);
  assert.deepEqual(nudges[0].removeIds, []);
  assert.deepEqual(sorted(nudges[0].selectionIds), [1, 2, 3]);
});

test("zaczepki: gdy nie ma dokładki, podmienia dokładnie jeden prezent", () => {
  const items = [item(1, 379), item(2, 518), item(3, 459), item(4, 80)];
  const nudges = findNudges(items, new Set([1, 2]), zl(900), true);
  // 459 zamiast 379: 518 + 459 = 977, brakuje 77 zł; 80 jako dokładka też brakuje 77 zł
  assert.equal(nudges.length, 1);
  assert.deepEqual(nudges[0].focusIds, [4]);
  assert.deepEqual(nudges[0].removeIds, []);

  const swap = findNudges([item(1, 379), item(2, 518), item(3, 459)], new Set([1, 2]), zl(900), true);
  assert.equal(swap.length, 1);
  assert.deepEqual(swap[0].focusIds, [3]);
  assert.deepEqual(swap[0].removeIds, [1]);
  assert.equal(swap[0].missingCents, zl(77));
  assert.deepEqual(sorted(swap[0].selectionIds), [2, 3]);
});

test("zaczepki: przyjmowanie kolejnych zawsze się kończy i nie wraca do wymienionych", () => {
  const items = [item(1, 379), item(2, 518), item(3, 459), item(4, 610), item(5, 700), item(6, 95)];
  let budget = zl(900);
  let selected = new Set(optimize(items, { budgetCents: budget, respectGroups: true, goal: "fewest" }).selectedIds);
  const skip = new Set<string>();
  const offered: string[] = [];
  for (let step = 0; step < 50; step++) {
    const [n] = findNudges(items, selected, budget, true, 3, skip);
    if (!n) break;
    assert.ok(!skip.has(n.unitKey));
    offered.push(n.unitKey);
    if (n.removeKey) skip.add(n.removeKey);
    budget += n.missingCents;
    selected = new Set(n.selectionIds);
  }
  assert.ok(offered.length < items.length * 2);
  assert.equal(new Set(offered).size, offered.length);
});
