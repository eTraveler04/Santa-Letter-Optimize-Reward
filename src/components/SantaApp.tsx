"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SleighIntro from "./SleighIntro";
import GiftPile from "./GiftPile";
import { buildUnits, findNudges, optimize, type Goal } from "@/lib/optimizer";
import { distinctSeeds, nudgeLine, swapLine } from "@/lib/nudgeCopy";
import type { GiftDTO } from "@/lib/types";

const fmt = (digits: number) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const whole = fmt(0);
const withGrosze = fmt(2);
const zl = (cents: number) => (cents % 100 === 0 ? whole : withGrosze).format(cents / 100);

function gifts_pl(n: number) {
  if (n === 1) return "prezent";
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? "prezenty" : "prezentów";
}

function packs_pl(n: number) {
  if (n === 1) return "opakowanie";
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? "opakowania" : "opakowań";
}

function getSantaId(): string {
  const fresh = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `santa-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const saved = localStorage.getItem("santaId");
    if (saved) return saved;
    const id = fresh();
    localStorage.setItem("santaId", id);
    return id;
  } catch {
    return fresh();
  }
}

const WRAPS = ["#e5383b", "#1e8e5a", "#3d6fe0", "#8b5cf6", "#e0569a"];

const keyOf = (ids: Iterable<number>) => [...ids].sort((a, b) => a - b).join(",");

type Block =
  | { kind: "single"; gift: GiftDTO }
  | { kind: "bundle"; groupId: number; name: string; reason: string | null; gifts: GiftDTO[] };

export default function SantaApp({ slug, listName }: { slug: string; listName: string }) {
  const api = `/api/lists/${encodeURIComponent(slug)}`;
  const [gifts, setGifts] = useState<GiftDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [budgetText, setBudgetText] = useState("");
  const [budgetCents, setBudgetCents] = useState<number | null>(null);
  const [budgetError, setBudgetError] = useState("");
  const [respectGroups, setRespectGroups] = useState(true);
  const [goal, setGoal] = useState<Goal>("fewest");
  const [notice, setNotice] = useState("");

  const santaId = useRef("");
  const savedKey = useRef("");
  const [leaving, setLeaving] = useState(false);
  // liczba prezentów, od której liczą się trufle; każdy prezent ponad nią to jedno opakowanie
  const [truffleBase, setTruffleBase] = useState<number | null>(null);
  const truffles = truffleBase == null ? null : Math.max(0, selected.size - truffleBase);
  const promoRef = useRef<HTMLDialogElement>(null);
  const promoShown = useRef(false);
  const [promoStage, setPromoStage] = useState<"wrapped" | "opening" | "open">("wrapped");

  /** Przyjmuje listę z serwera i wyrzuca z moich zaznaczeń to, co ktoś zdążył zaklepać. */
  const applyServer = useCallback((list: GiftDTO[]) => {
    setGifts(list);
    const taken = new Set(list.filter((g) => g.status === "taken").map((g) => g.id));
    const alive = new Set(list.map((g) => g.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => alive.has(id) && !taken.has(id)));
      if (next.size === prev.size) return prev;
      setNotice("Inny Mikołaj był szybszy i zaklepał część prezentów. Zaktualizowaliśmy listę.");
      return next;
    });
  }, []);

  const load = useCallback(
    async (first: boolean) => {
      try {
        const res = await fetch(`${api}/gifts`, {
          headers: { "x-santa-id": santaId.current },
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const list: GiftDTO[] = await res.json();
        if (first) {
          const mine = list.filter((g) => g.status === "mine").map((g) => g.id);
          savedKey.current = keyOf(mine);
          setSelected(new Set(mine));
          // licznik trufli: z pamięci sesji, a w nowej sesji z tego, co zapisane w bazie
          let base: number | null = null;
          try {
            const raw = sessionStorage.getItem(`truffleBase:${slug}`);
            if (raw != null && Number.isFinite(Number(raw))) base = Number(raw);
          } catch {}
          if (base == null) {
            const t = await fetch(`${api}/selection`, {
              headers: { "x-santa-id": santaId.current },
              cache: "no-store",
            })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null);
            if (t?.truffles > 0) base = Math.max(0, mine.length - t.truffles);
          }
          if (base != null) {
            setTruffleBase(base);
            savedKey.current += `|${Math.max(0, mine.length - base)}`;
          }
          setGifts(list);
          setLoaded(true);
        } else {
          applyServer(list);
        }
        setLoadError(false);
      } catch {
        if (first) setLoadError(true);
      }
    },
    [applyServer, api, slug],
  );

  useEffect(() => {
    santaId.current = getSantaId();
    load(true);
    const onFocus = () => load(false);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Cichy zapis: każda zmiana zaznaczeń trafia na serwer.
  useEffect(() => {
    if (!loaded) return;
    const ids = [...selected].sort((a, b) => a - b);
    const key = ids.join(",") + (truffles == null ? "" : `|${truffles}`);
    if (key === savedKey.current) return;
    const timer = setTimeout(async () => {
      savedKey.current = key;
      try {
        const res = await fetch(`${api}/selection`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ santaId: santaId.current, giftIds: ids, truffles: truffles ?? undefined }),
          keepalive: true,
        });
        if (!res.ok) throw new Error();
        applyServer((await res.json()).gifts);
      } catch {
        savedKey.current = "?";
        setNotice("Nie udało się zapisać wyboru. Sprawdź połączenie, spróbujemy przy następnej zmianie.");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [selected, truffles, loaded, applyServer, api]);

  const available = useMemo(() => gifts.filter((g) => g.status !== "taken"), [gifts]);
  const byId = useMemo(() => new Map(gifts.map((g) => [g.id, g])), [gifts]);

  const blocks = useMemo(() => {
    const out: Block[] = [];
    const seen = new Map<number, Extract<Block, { kind: "bundle" }>>();
    for (const g of gifts) {
      if (g.groupId == null) {
        out.push({ kind: "single", gift: g });
        continue;
      }
      let b = seen.get(g.groupId);
      if (!b) {
        b = { kind: "bundle", groupId: g.groupId, name: g.groupName ?? "Komplet", reason: g.groupReason, gifts: [] };
        seen.set(g.groupId, b);
        out.push(b);
      }
      b.gifts.push(g);
    }
    return out;
  }, [gifts]);

  const spentCents = useMemo(
    () => [...selected].reduce((s, id) => s + (byId.get(id)?.priceCents ?? 0), 0),
    [selected, byId],
  );
  const leftover = budgetCents == null ? null : budgetCents - spentCents;
  const cheapest = useMemo(() => {
    const prices = buildUnits(available, respectGroups).map((u) => u.priceCents);
    return prices.length ? Math.min(...prices) : null;
  }, [available, respectGroups]);

  // prezenty wymienione przez zaczepkę: o nie już nie zaczepiamy, żeby wybór nie skakał tam i z powrotem
  const [nudgeSkip, setNudgeSkip] = useState<ReadonlySet<string>>(new Set());

  const nudges = useMemo(
    () => (budgetCents == null ? [] : findNudges(available, selected, budgetCents, respectGroups, 3, nudgeSkip)),
    [available, selected, budgetCents, respectGroups, nudgeSkip],
  );

  const nudgeSeeds = useMemo(
    () =>
      distinctSeeds(
        nudges.map((n) => n.focusIds[0] + n.focusIds.length),
        nudges.map((n) => n.removeIds.length > 0),
      ),
    [nudges],
  );

  function run(budget: number, groups: boolean, g: Goal) {
    const result = optimize(available, { budgetCents: budget, respectGroups: groups, goal: g });
    setSelected(new Set(result.selectedIds));
    setNudgeSkip(new Set());
    setNotice("");
  }

  function submitBudget(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(budgetText.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setBudgetError("Wpisz kwotę większą od zera, np. 500.");
      return;
    }
    if (value > 1_000_000) {
      setBudgetError("Aż tyle? Wpisz najwyżej milion złotych.");
      return;
    }
    setBudgetError("");
    const cents = Math.round(value * 100);
    setBudgetCents(cents);
    run(cents, respectGroups, goal);
  }

  function changeGroups(value: boolean) {
    setRespectGroups(value);
    if (budgetCents != null) run(budgetCents, value, goal);
  }

  function changeGoal(value: Goal) {
    setGoal(value);
    if (budgetCents != null) run(budgetCents, respectGroups, value);
  }

  function toggle(gift: GiftDTO) {
    if (gift.status === "taken") return;
    const ids =
      respectGroups && gift.groupId != null
        ? available.filter((g) => g.groupId === gift.groupId).map((g) => g.id)
        : [gift.id];
    setSelected((prev) => {
      const next = new Set(prev);
      const turnOn = !prev.has(gift.id);
      for (const id of ids) turnOn ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function acceptNudge(selectionIds: number[], missingCents: number, removeKey: string | null) {
    if (budgetCents == null) return;
    if (removeKey) setNudgeSkip((prev) => new Set(prev).add(removeKey));
    const next = budgetCents + missingCents;
    setBudgetCents(next);
    setBudgetText(String(next / 100).replace(".", ","));
    setSelected(new Set(selectionIds));
  }

  /** Wiadomość o truflach: raz na sesję przeglądarki, przy pierwszym „Wybieram”. */
  function pressChoose() {
    const key = `truffles:${slug}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      // bez pamięci sesji pokazujemy wiadomość najwyżej raz na załadowanie strony
      seen = promoShown.current;
    }
    if (seen || !promoRef.current) {
      void choose();
      return;
    }
    promoShown.current = true;
    setPromoStage("wrapped");
    promoRef.current.showModal();
  }

  function pickMore() {
    promoRef.current?.close();
    // wcześniej uzbierane opakowania zostają
    const base = truffleBase ?? selected.size;
    setTruffleBase(base);
    try {
      sessionStorage.setItem(`truffleBase:${slug}`, String(base));
    } catch {}
  }

  /** Wieczko odlatuje, a po chwili pokazuje się zawartość prezentu. */
  function openPromoGift() {
    if (promoStage !== "wrapped") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPromoStage("open");
      return;
    }
    setPromoStage("opening");
    window.setTimeout(() => setPromoStage("open"), 750);
  }

  /** Dopisuje ostatnie zmiany na serwerze (nie czekając na cichy zapis) i przechodzi do podsumowania. */
  async function choose() {
    setLeaving(true);
    const ids = [...selected].sort((a, b) => a - b);
    try {
      const res = await fetch(`${api}/selection`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ santaId: santaId.current, giftIds: ids, truffles: truffles ?? undefined }),
      });
      if (!res.ok) throw new Error();
      savedKey.current = ids.join(",") + (truffles == null ? "" : `|${truffles}`);
      window.location.href = `/l/${slug}/podsumowanie`;
    } catch {
      setLeaving(false);
      setNotice("Nie udało się zapisać wyboru. Sprawdź połączenie i spróbuj ponownie.");
    }
  }

  const chosenGifts = gifts.filter((g) => selected.has(g.id));
  const maxPriceCents = gifts.reduce((m, g) => Math.max(m, g.priceCents), 0);
  const count = selected.size;
  const allTaken = loaded && gifts.length > 0 && available.length === 0;

  /** wrapped: prezent rysowany jako zapakowana paczka (pojedynczy albo wybrany osobno z kompletu) */
  function row(g: GiftDTO, showReason: boolean, wrapped: boolean) {
    const taken = g.status === "taken";
    const on = selected.has(g.id);
    return (
      <li
        key={g.id}
        className={`gift${wrapped ? " wrapped" : ""}${on ? " is-on" : ""}${taken ? " is-taken" : ""}`}
        style={wrapped && !taken ? ({ "--wrap": WRAPS[g.id % WRAPS.length] } as React.CSSProperties) : undefined}
      >
        <label className="gift-pick">
          <input type="checkbox" checked={on || taken} disabled={taken} onChange={() => toggle(g)} />
          <span className="box" aria-hidden="true" />
          <span className="gift-text">
            <span className="gift-name">{g.name}</span>
            {showReason && g.reason && <span className="reason">{g.reason}</span>}
            {taken && <span className="stamp">Zaklepane przez innego Mikołaja</span>}
          </span>
        </label>
        <div className="gift-side">
          <span className="price">{zl(g.priceCents)}</span>
          <a href={g.url} target="_blank" rel="noopener noreferrer">
            Zobacz w sklepie<span className="sr-only">: {g.name}</span>
          </a>
        </div>
      </li>
    );
  }

  return (
    <>
      {truffles != null && (
        <div className="truffle-bar" role="status">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trufle-wawel.png" alt="" width={424} height={589} />
          <span>
            Twoje trufle:{" "}
            <strong key={truffles} className="truffle-count">
              {truffles} {packs_pl(truffles)}
            </strong>
            {truffles === 0 && <small>Dobierz prezent, a wpadnie pierwsze opakowanie.</small>}
          </span>
        </div>
      )}
      <header className="sky">
        <a className="btn btn-gold btn-small sky-help" href={`/l/${slug}/jak-to-dziala`}>
          Jak to działa?
        </a>
        <SleighIntro />
        <div className="sky-text">
          <h1>Lista życzeń: {listName}</h1>
          <p>Powiedz, ile masz w worku, a dobierzemy prezenty tak, żeby nie zmarnowała się ani złotówka.</p>
        </div>
        <div className="hill" aria-hidden="true" />
      </header>

      <main className="layout">
        <section className="panel" aria-label="Budżet i ustawienia">
          <form onSubmit={submitBudget} noValidate>
            <label className="field-label" htmlFor="budget">
              Ile masz w worku?
            </label>
            <div className="budget-row">
              <div className="money-input">
                <input
                  id="budget"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="500"
                  value={budgetText}
                  onChange={(e) => setBudgetText(e.target.value)}
                  aria-invalid={!!budgetError}
                  aria-describedby={budgetError ? "budget-error" : undefined}
                />
                <span aria-hidden="true">zł</span>
              </div>
              <button type="submit" className="btn btn-red" disabled={!loaded || available.length === 0}>
                Dobierz prezenty
              </button>
            </div>
            {budgetError && (
              <p id="budget-error" className="field-error" role="alert">
                {budgetError}
              </p>
            )}
          </form>

          <fieldset className="filters">
            <legend className="field-label">Jak dobierać?</legend>
            <div className="segmented" role="radiogroup" aria-label="Cel">
              <label>
                <input type="radio" name="goal" checked={goal === "fewest"} onChange={() => changeGoal("fewest")} />
                <span>Najmniej prezentów</span>
              </label>
              <label>
                <input type="radio" name="goal" checked={goal === "most"} onChange={() => changeGoal("most")} />
                <span>Najwięcej prezentów</span>
              </label>
            </div>
            <p className="hint">
              {goal === "fewest"
                ? "Wydajemy możliwie cały budżet na jak najmniej, za to większych prezentów."
                : "Najpierw liczy się liczba paczek, potem to, żeby wydać jak najwięcej."}
            </p>
            <label className="switch">
              <input type="checkbox" checked={respectGroups} onChange={(e) => changeGroups(e.target.checked)} />
              <span className="track" aria-hidden="true" />
              <span>Komplety kupuj w całości</span>
            </label>
          </fieldset>

          <div className="result" aria-live="polite">
            {budgetCents == null ? (
              count > 0 ? (
                <p>
                  Masz zaznaczone {count} {gifts_pl(count)} za <strong>{zl(spentCents)}</strong>.
                </p>
              ) : (
                <p className="muted">Wpisz kwotę albo zaznacz prezenty ręcznie na liście.</p>
              )
            ) : count === 0 ? (
              <p>
                Za {zl(budgetCents)} nic się nie mieści.
                {cheapest != null && <> Najtańsza wolna opcja kosztuje {zl(cheapest)}.</>}
              </p>
            ) : (
              <p>
                {count} {gifts_pl(count)} za <strong>{zl(spentCents)}</strong>.{" "}
                {leftover! > 0 && <>W worku zostaje {zl(leftover!)}.</>}
                {leftover === 0 && <>Budżet wydany co do grosza!</>}
                {leftover! < 0 && <span className="over">Przekraczasz budżet o {zl(-leftover!)}.</span>}
              </p>
            )}
            {notice && <p className="notice">{notice}</p>}
          </div>

          <GiftPile gifts={chosenGifts} maxPriceCents={maxPriceCents} />

          {nudges.length > 0 && (
            <ul className="nudges">
              {nudges.map((n, i) => {
                const first = byId.get(n.focusIds[0]);
                if (!first) return null;
                const what = n.isBundle ? `komplet „${first.groupName}”` : `„${first.name}”`;
                const gone = byId.get(n.removeIds[0]);
                const instead = !gone
                  ? null
                  : n.removeIds.length > 1
                    ? `kompletu „${gone.groupName}”`
                    : `„${gone.name}”`;
                return (
                  <li key={n.unitKey} className="nudge">
                    <p>
                      {instead
                        ? swapLine(nudgeSeeds[i], what, instead, zl(n.missingCents))
                        : nudgeLine(nudgeSeeds[i], what, zl(n.missingCents))}
                    </p>
                    <button
                      type="button"
                      className="btn btn-gold"
                      onClick={() => acceptNudge(n.selectionIds, n.missingCents, n.removeKey)}
                    >
                      {instead ? `Zamieniam i dorzucam ${zl(n.missingCents)}` : `No dobrze, dorzucam ${zl(n.missingCents)}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            className="btn btn-green buy-desktop"
            disabled={count === 0}
            onClick={pressChoose}
          >
            Wybieram
          </button>
        </section>

        <section className="list" aria-label="Prezenty">
          {!loaded && !loadError && (
            <p className="empty empty-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              Elfy niosą listę…
            </p>
          )}
          {loadError && (
            <div className="empty">
              <p>Nie udało się pobrać listy prezentów.</p>
              <button type="button" className="btn btn-red" onClick={() => load(true)}>
                Spróbuj ponownie
              </button>
            </div>
          )}
          {loaded && gifts.length === 0 && (
            <p className="empty">Lista jest jeszcze pusta. Zajrzyj później, ktoś właśnie pisze list do Mikołaja.</p>
          )}
          {allTaken && <p className="empty">Wszystko już zaklepane. Inni Mikołajowie byli szybsi!</p>}

          <ul className="blocks">
            {blocks.map((b) =>
              b.kind === "single" ? (
                row(b.gift, true, true)
              ) : (
                <li key={`g${b.groupId}`} className="bundle wrapped">
                  <div className="bundle-head">
                    <h2>{b.name}</h2>
                    <span className="price">{zl(b.gifts.reduce((s, g) => s + g.priceCents, 0))}</span>
                  </div>
                  <p className="bundle-note">Komplet: ma sens tylko w całości.</p>
                  {b.reason && <p className="reason">{b.reason}</p>}
                  <ul>
                    {b.gifts.map((g) =>
                      // w komplecie paczką jest cały komplet; pojedynczy prezent dostaje własne
                      // opakowanie tylko wtedy, gdy wybrano go osobno, bez reszty kompletu
                      row(g, false, selected.has(g.id) && !b.gifts.every((x) => selected.has(x.id) || x.status === "taken")),
                    )}
                  </ul>
                </li>
              ),
            )}
          </ul>
        </section>
      </main>

      <div className="buy-bar">
        <span>
          {count === 0 ? "Nic nie wybrano" : `${count} ${gifts_pl(count)} za ${zl(spentCents)}`}
        </span>
        <button type="button" className="btn btn-green" disabled={count === 0 || leaving} onClick={pressChoose}>
          {leaving && <span className="spinner" aria-hidden="true" />}
          Wybieram
        </button>
      </div>

      <dialog ref={promoRef} className="promo" aria-labelledby="promo-title">
        {promoStage !== "open" ? (
          <>
            <h2 id="promo-title">Mikołaju, ktoś zostawił tu coś dla Ciebie</h2>
            <button
              type="button"
              className={`promo-gift${promoStage === "opening" ? " is-opening" : ""}`}
              onClick={openPromoGift}
              aria-label="Otwórz prezent z napisem Dla Ciebie"
            >
              <span className="promo-lid" aria-hidden="true">
                <span className="promo-bow" />
              </span>
              <span className="promo-box" aria-hidden="true">
                <span className="promo-tag">Dla Ciebie</span>
              </span>
            </button>
            <p className="promo-hint">Kliknij prezent, żeby go otworzyć</p>
          </>
        ) : (
          <div className="promo-inside">
            <p className="promo-flash">Wiadomość z ostatniej chwili</p>
            <h2 id="promo-title">Za każdy dodatkowy prezent dostajesz teraz opakowanie trufli</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/trufle-wawel.png" alt="Opakowanie trufli z Wawelu" width={424} height={589} />
            <div className="promo-actions">
              <button type="button" className="btn btn-gold" onClick={pickMore}>
                Dobieram jeszcze
              </button>
              <button
                type="button"
                className="btn btn-green"
                onClick={() => {
                  promoRef.current?.close();
                  void choose();
                }}
              >
                Wybieram
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
