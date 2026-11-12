"use client";

import { useEffect, useRef, useState } from "react";
import type { GiftDTO } from "@/lib/types";
import SummaryApp from "@/components/SummaryApp";

const COLORS = ["#e5383b", "#1e8e5a", "#3d6fe0", "#ff8fb1", "#8b5cf6"];

type Phase = "loading" | "error" | "empty" | "game" | "flying" | "done";

function gifts_pl(n: number) {
  if (n === 1) return "prezent";
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? "prezenty" : "prezentów";
}

/** Renifer z pustymi saniami; prezenty dokłada osobna warstwa nad saniami. */
function Team() {
  return (
    <svg viewBox="0 0 330 130" aria-hidden="true">
      <g stroke="#1b1640" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M166 56 Q200 74 236 62" fill="none" />
        <g className="load-deer">
          <path d="M236 76 L230 100 M250 78 L250 102 M268 78 L274 100 M282 74 L292 94" fill="none" />
          <ellipse cx="258" cy="66" rx="28" ry="14" fill="#b9793c" />
          <path d="M230 62 Q224 56 226 50" fill="none" />
          <path d="M278 58 Q284 44 294 40" fill="none" strokeWidth="9" stroke="#1b1640" />
          <path d="M278 58 Q284 44 294 40" fill="none" strokeWidth="5" stroke="#b9793c" />
          <circle cx="298" cy="36" r="12" fill="#b9793c" />
          <path d="M292 26 L286 10 M289 18 L280 14 M300 24 L304 8 M302 16 L311 12" fill="none" />
          <circle cx="301" cy="33" r="1.8" fill="#1b1640" stroke="none" />
          <circle cx="310" cy="39" r="5.5" fill="#e5383b" />
        </g>
        <path d="M24 62 H140 Q156 62 156 46 V42 H166 V70 Q166 92 144 92 H48 Q24 92 24 70 Z" fill="#e5383b" />
        <path d="M34 74 H150" stroke="#ffc53d" strokeWidth="4" />
        <path d="M54 92 V106 M130 92 V106" fill="none" />
        <path d="M22 108 H160 Q178 108 178 92" fill="none" stroke="#1b1640" strokeWidth="8" />
        <path d="M22 108 H160 Q178 108 178 92" fill="none" stroke="#ffc53d" strokeWidth="4" />
      </g>
    </svg>
  );
}

/**
 * „Koniec na dziś”: Mikołaj przeciąga swoje prezenty do sań (myszką lub palcem),
 * sanie odjeżdżają, a potem zostają podziękowania, lista i list.
 * To tylko zabawa: niczego nie zapisuje i niczego nie zmienia w wyborze.
 */
export default function FarewellApp({ slug, listName }: { slug: string; listName: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [gifts, setGifts] = useState<GiftDTO[]>([]);
  const [loadedIds, setLoadedIds] = useState<number[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let santaId = "";
    try {
      santaId = localStorage.getItem("santaId") ?? "";
    } catch {}
    if (!santaId) return setPhase("empty");
    fetch(`/api/lists/${encodeURIComponent(slug)}/gifts`, { headers: { "x-santa-id": santaId }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: GiftDTO[]) => {
        const mine = list.filter((g) => g.status === "mine");
        setGifts(mine);
        setPhase(mine.length ? "game" : "empty");
      })
      .catch(() => setPhase("error"));
  }, [slug]);

  // Wszystko w saniach: odjazd, a po nim podziękowania.
  useEffect(() => {
    if (phase !== "game" || gifts.length === 0 || loadedIds.length < gifts.length) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = setTimeout(() => setPhase("flying"), calm ? 0 : 500);
    const end = setTimeout(() => setPhase("done"), calm ? 300 : 2600);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
    // faza zmienia się w trakcie, więc pilnujemy tylko liczby załadowanych
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedIds.length, gifts.length]);

  function inSleigh(x: number, y: number) {
    const r = dropRef.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 24; // wybaczamy niecelne rzuty
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  function put(id: number) {
    setLoadedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function onDown(e: React.PointerEvent<HTMLButtonElement>, id: number) {
    if (phase !== "game") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
    drag.current = { id, x: e.clientX, y: e.clientY };
    setDragId(id);
  }

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    e.currentTarget.style.transform = `translate(${e.clientX - d.x}px, ${e.clientY - d.y}px) scale(1.1)`;
    const hit = inSleigh(e.clientX, e.clientY);
    setOver((prev) => (prev === hit ? prev : hit));
  }

  function onUp(e: React.PointerEvent<HTMLButtonElement>, cancelled = false) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragId(null);
    setOver(false);
    const el = e.currentTarget;
    if (!cancelled && inSleigh(e.clientX, e.clientY)) {
      put(d.id);
    } else {
      // nie trafił: prezent wraca na swoje miejsce
      el.style.transition = "transform 0.25s";
      el.style.transform = "";
    }
  }

  const back = (
    <a className="btn btn-gold help-back" href={`/l/${slug}/podsumowanie`}>
      Wróć do podsumowania
    </a>
  );

  if (phase === "loading" || phase === "error" || phase === "empty") {
    return (
      <main className="admin">
        <header className="a-head">
          <h1>Koniec na dziś</h1>
          {back}
        </header>
        {phase === "loading" && <p className="muted">Renifer już biegnie…</p>}
        {phase === "error" && (
          <div className="empty">
            <p>Nie udało się wczytać Twoich prezentów. Twój wybór jest zapisany.</p>
          </div>
        )}
        {phase === "empty" && (
          <div className="empty">
            <p>Nie masz jeszcze wybranych prezentów na tej liście.</p>
          </div>
        )}
      </main>
    );
  }

  const done = phase === "done";
  const n = gifts.length;
  const maxPrice = Math.max(...gifts.map((g) => g.priceCents), 1);
  const cargoSize = n <= 4 ? 9.5 : n <= 8 ? 8 : 6.5;
  const flying = phase === "flying";

  return (
    <main className="admin farewell">
      <header className="a-head">
        <h1>{done ? "Dziękujemy, Mikołaju!" : "Załaduj prezenty do sań"}</h1>
        {!done && (
          <button type="button" className="btn btn-plain btn-small" onClick={() => setPhase("done")}>
            Pomiń
          </button>
        )}
      </header>
      <p className="summary-lead" role="status">
        {done
          ? "Sanie odjechały z Twoimi prezentami. Poniżej zostawiamy Ci list i listę zakupów, żeby nic nie zginęło po drodze."
          : flying
            ? "Wszystko załadowane. W drogę!"
            : `Przeciągnij każdy prezent do sań. W saniach: ${loadedIds.length} z ${n}.`}
      </p>

      <div className={`load-scene${flying ? " is-flying" : ""}${done ? " is-done" : ""}`}>
        <div className="load-sky">
          {done && <p className="load-thanks">Wesołych Świąt!</p>}
          <div className="load-team">
            <Team />
            <div ref={dropRef} className={`load-drop${over ? " is-over" : ""}${dragId != null ? " is-armed" : ""}`}>
              <div className="load-cargo">
                {loadedIds.map((id) => (
                  <span
                    key={id}
                    className="parcel"
                    style={
                      {
                        "--size": `${cargoSize}cqw`,
                        "--color": COLORS[id % COLORS.length],
                        "--tilt": `${((id * 37) % 13) - 6}deg`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="load-floor" hidden={done}>
          {gifts.map((g) => {
            const gone = loadedIds.includes(g.id);
            const size = 52 + 26 * Math.sqrt(g.priceCents / maxPrice);
            return (
              <button
                key={g.id}
                type="button"
                className={`load-gift${dragId === g.id ? " is-dragging" : ""}${gone ? " is-gone" : ""}`}
                aria-label={`${g.name}: włóż do sań`}
                disabled={gone || flying}
                onPointerDown={(e) => onDown(e, g.id)}
                onPointerMove={onMove}
                onPointerUp={(e) => onUp(e)}
                onPointerCancel={(e) => onUp(e, true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    put(g.id);
                  }
                }}
              >
                <span
                  className="parcel"
                  style={
                    {
                      "--size": `${size.toFixed(0)}px`,
                      "--color": COLORS[g.id % COLORS.length],
                      "--tilt": `${((g.id * 37) % 13) - 6}deg`,
                    } as React.CSSProperties
                  }
                />
              </button>
            );
          })}
        </div>
      </div>
      {!done && (
        <p className="muted">
          {n} {gifts_pl(n)} do załadowania. Na klawiaturze: Tab i Enter.
        </p>
      )}

      {/* list i lista w tym samym widoku; wczytują się już podczas odjazdu sań */}
      {(flying || done) && (
        <div hidden={!done}>
          <SummaryApp slug={slug} listName={listName} farewell />
        </div>
      )}
      {done && (
        <div className="head-actions">
          <a className="btn btn-gold help-back" href={`/l/${slug}`}>
            Wróć do listy
          </a>
        </div>
      )}
    </main>
  );
}
