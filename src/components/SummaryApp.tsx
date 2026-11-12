"use client";

import { useCallback, useEffect, useState } from "react";
import ElfLoader from "./ElfLoader";
import { shyTotal } from "@/lib/totalCopy";
import { letterToPng } from "@/lib/letterImage";
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

type State =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "empty" }
  | { phase: "ready"; gifts: GiftDTO[]; letter: string; truffles: number };

function packs_pl(n: number) {
  if (n === 1) return "opakowanie";
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? "opakowania" : "opakowań";
}

export default function SummaryApp({
  slug,
  listName,
  farewell = false,
}: {
  slug: string;
  listName: string;
  /** widok po „Koniec na dziś”: podziękowania, lista i list, już bez zmieniania wyboru */
  farewell?: boolean;
}) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [confirmedKey, setConfirmedKey] = useState("");
  const [removing, setRemoving] = useState<number | null>(null);
  const [listNote, setListNote] = useState("");

  const load = useCallback(
    async () => {
      let santaId = "";
      try {
        santaId = localStorage.getItem("santaId") ?? "";
      } catch {}
      if (!santaId) return setState({ phase: "empty" });
      try {
        const res = await fetch(`/api/lists/${encodeURIComponent(slug)}/letter`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ santaId }),
        });
        if (!res.ok) throw new Error();
        const data: { gifts: GiftDTO[]; letter: string | null; truffles?: number } = await res.json();
        if (!data.letter || data.gifts.length === 0) return setState({ phase: "empty" });
        setState({ phase: "ready", gifts: data.gifts, letter: data.letter, truffles: data.truffles ?? 0 });
      } catch {
        setState({ phase: "error" });
      }
    },
    [slug],
  );

  useEffect(() => {
    load();
    try {
      setConfirmedKey(localStorage.getItem(`confirmed:${slug}`) ?? "");
    } catch {}
  }, [load, slug]);

  const selectionKey = (gifts: GiftDTO[]) =>
    gifts
      .map((g) => g.id)
      .sort((a, b) => a - b)
      .join(",");

  function confirmAll(gifts: GiftDTO[]) {
    const key = selectionKey(gifts);
    setConfirmedKey(key);
    try {
      localStorage.setItem(`confirmed:${slug}`, key);
    } catch {}
  }

  /** „Jednak nie kupię": zwalnia prezent dla innych Mikołajów i pisze list od nowa, już bez niego. */
  async function release(gifts: GiftDTO[], id: number) {
    setRemoving(id);
    setListNote("");
    try {
      const res = await fetch(`/api/lists/${encodeURIComponent(slug)}/selection`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          santaId: localStorage.getItem("santaId") ?? "",
          giftIds: gifts.filter((g) => g.id !== id).map((g) => g.id),
        }),
      });
      if (!res.ok) throw new Error();
      setState({ phase: "loading" });
      await load();
    } catch {
      setListNote("Nie udało się zwolnić prezentu. Spróbuj ponownie.");
    } finally {
      setRemoving(null);
    }
  }

  /** Lista zakupów zwykłym tekstem: nazwa, cena i link, do wklejenia w notatki. */
  function listAsText(gifts: GiftDTO[], truffles = state.phase === "ready" ? state.truffles : 0) {
    const rows = gifts.map((g, i) => `${i + 1}. ${g.name} (${zl(g.priceCents)})\n   ${g.url}`);
    const cents = gifts.reduce((sum, g) => sum + g.priceCents, 0);
    const shy = shyTotal(cents);
    const total = shy ? `${shy.shown} ${shy.line}` : zl(cents);
    const bonus = truffles > 0 ? `Trufle dla Mikołaja: ${truffles} ${packs_pl(truffles)}\n` : "";
    return `Prezenty do kupienia: ${listName}\n\n${rows.join("\n\n")}\n\nRazem: ${total}\n${bonus}`;
  }

  /** Starsza metoda kopiowania: działa też bez https i gdy przeglądarka odmówi dostępu do schowka. */
  function copyViaTextarea(text: string): boolean {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    area.remove();
    return ok;
  }

  async function copyList(gifts: GiftDTO[]) {
    const text = listAsText(gifts);
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {}
    }
    if (!ok) ok = copyViaTextarea(text);
    setListNote(
      ok
        ? "Lista skopiowana. Wklej ją w notatkach albo w wiadomości do siebie."
        : "Nie udało się skopiować. Użyj „Zapisz jako plik”.",
    );
  }

  function saveList(gifts: GiftDTO[]) {
    const url = URL.createObjectURL(new Blob([listAsText(gifts)], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "prezenty-do-kupienia.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setListNote("Plik prezenty-do-kupienia.txt zapisany na urządzeniu.");
  }

  /** Robi z listu obrazek i otwiera systemowe udostępnianie; gdzie go nie ma, zapisuje plik. */
  async function share(letter: string) {
    setSharing(true);
    setShareNote("");
    try {
      const blob = await letterToPng(letter);
      const file = new File([blob], "list-do-mikolaja.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "List do Mikołaja" });
        } catch (e) {
          // zamknięcie okna udostępniania to nie błąd
          if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setShareNote("Obrazek z listem zapisany na urządzeniu. Możesz go teraz wysłać dalej.");
      }
    } catch {
      setShareNote("Nie udało się przygotować obrazka. Spróbuj ponownie.");
    } finally {
      setSharing(false);
    }
  }

  const back = (
    <a className="btn btn-gold help-back" href={`/l/${slug}`}>
      Wróć do listy
    </a>
  );

  // W widoku „Koniec na dziś” to tylko dalsza część tamtej strony: bez własnego nagłówka i nawigacji.
  const Shell = farewell ? "div" : "main";

  return (
    <Shell className={farewell ? "summary-page farewell-rest" : "admin summary-page"}>
      {!farewell && (
        <header className="a-head">
          <h1>Wybrane!</h1>
          {back}
        </header>
      )}

      {state.phase === "loading" && (
        <ElfLoader text="Elfy maczają pióro w atramencie i piszą list z podziękowaniami…" />
      )}

      {state.phase === "error" && (
        <div className="empty">
          <p>Nie udało się przygotować podsumowania. Twój wybór jest zapisany.</p>
          <button type="button" className="btn btn-red" onClick={() => load()}>
            Spróbuj ponownie
          </button>
        </div>
      )}

      {state.phase === "empty" && (
        <div className="empty">
          <p>Nie masz jeszcze wybranych prezentów na tej liście.</p>
          {!farewell && back}
        </div>
      )}

      {state.phase === "ready" && (
        <>
          {!farewell && (
            <p className="summary-lead">
              Twój wybór jest zapisany. Inni Mikołajowie widzą te prezenty jako zaklepane, więc nikt nie kupi tego samego.
            </p>
          )}

          <article className="letter" aria-label={`List z podziękowaniami: ${listName}`}>
            <div className="confetti" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <i key={i} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </div>
            {state.letter.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </article>
          <div className="share-row">
            <button type="button" className="btn btn-green" onClick={() => share(state.letter)} disabled={sharing}>
              {sharing && <span className="spinner" aria-hidden="true" />}
              Udostępnij list jako obrazek
            </button>
            {shareNote && (
              <p className="muted" role="status">
                {shareNote}
              </p>
            )}
          </div>

          <section className="a-card">
            <h2>Do kupienia</h2>
            {farewell ? null : confirmedKey === selectionKey(state.gifts) ? (
              <p className="confirm-box is-done" role="status">
                Potwierdzone: kupujesz wszystkie prezenty z tej listy.
              </p>
            ) : (
              <div className="confirm-box">
                <p>
                  <strong>Na pewno kupisz wszystkie te prezenty?</strong> Inni Mikołajowie nie mogą ich już wybrać,
                  więc jeśli któregoś jednak nie kupisz, zwolnij go przyciskiem „Jednak nie kupię”.
                </p>
                <button type="button" className="btn btn-green btn-small" onClick={() => confirmAll(state.gifts)}>
                  Tak, kupuję wszystkie
                </button>
              </div>
            )}
            <ul className="summary-list">
              {state.gifts.map((g) => (
                <li key={g.id}>
                  <div className="summary-item">
                    <a href={g.url} target="_blank" rel="noopener noreferrer">
                      {g.name}
                    </a>
                    {!farewell && (
                      <button
                        type="button"
                        className="btn btn-plain btn-small"
                        disabled={removing !== null}
                        onClick={() => release(state.gifts, g.id)}
                      >
                        {removing === g.id && <span className="spinner" aria-hidden="true" />}
                        Jednak nie kupię<span className="sr-only">: {g.name}</span>
                      </button>
                    )}
                  </div>
                  <span className="price">{zl(g.priceCents)}</span>
                </li>
              ))}
            </ul>
            {(() => {
              const cents = state.gifts.reduce((s, g) => s + g.priceCents, 0);
              const shy = shyTotal(cents);
              return (
                <p className={`summary-total${shy ? " is-shy" : ""}`}>
                  Razem <strong>{shy ? shy.shown : zl(cents)}</strong>
                  {shy && <span>{shy.line}</span>}
                </p>
              );
            })()}
            {state.truffles > 0 && (
              <p className="summary-truffles">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/trufle-wawel.png" alt="" width={424} height={589} />
                <span>
                  W podziękowaniu dostajesz{" "}
                  <strong>
                    {state.truffles} {packs_pl(state.truffles)} trufli
                  </strong>
                  .
                </span>
              </p>
            )}
            <div className="a-actions">
              <button type="button" className="btn btn-gold btn-small" onClick={() => copyList(state.gifts)}>
                Skopiuj listę
              </button>
              <button type="button" className="btn btn-plain btn-small" onClick={() => saveList(state.gifts)}>
                Zapisz jako plik
              </button>
            </div>
            <p className="muted list-hint">Lista zawiera nazwy, ceny i linki do sklepów.</p>
            {listNote && (
              <p className="muted" role="status">
                {listNote}
              </p>
            )}
          </section>

          {!farewell && (
            <div className="head-actions">
              {back}
              <a className="btn btn-green help-back" href={`/l/${slug}/koniec`}>
                Koniec na dziś
              </a>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
