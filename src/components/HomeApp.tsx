"use client";

import { useState } from "react";
import SleighIntro from "./SleighIntro";
import type { ListDTO } from "@/lib/types";

const WRAPS = ["#e5383b", "#1e8e5a", "#3d6fe0", "#8b5cf6", "#e0569a"];

function giftsLabel(n: number) {
  if (n === 0) return "jeszcze pusta";
  if (n === 1) return "1 prezent";
  const d = n % 10;
  const h = n % 100;
  return `${n} ${d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? "prezenty" : "prezentów"}`;
}

export default function HomeApp({ lists }: { lists: ListDTO[] }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Wpisz, czyja to lista, np. swoje imię.");
    if (password.length < 4) return setError("Hasło musi mieć co najmniej 4 znaki.");
    setBusy(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Nie udało się założyć listy.");
      try {
        localStorage.setItem(`listKey:${data.slug}`, password);
      } catch {}
      window.location.href = `/l/${data.slug}/admin`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się założyć listy.");
      setBusy(false);
    }
  }

  return (
    <>
      <header className="sky">
        <SleighIntro />
        <div className="sky-text">
          <h1>Listy życzeń pod choinkę</h1>
          <p>Wybierz, komu chcesz zrobić prezent, albo załóż własną listę.</p>
        </div>
        <div className="hill" aria-hidden="true" />
      </header>

      <main className="home">
        <section aria-label="Listy życzeń">
          {lists.length === 0 ? (
            <p className="empty">Nie ma jeszcze żadnej listy. Załóż pierwszą poniżej.</p>
          ) : (
            <ul className="home-lists">
              {lists.map((l, i) => (
                <li
                  key={l.slug}
                  className="gift wrapped home-list"
                  style={{ "--wrap": WRAPS[i % WRAPS.length] } as React.CSSProperties}
                >
                  <a href={`/l/${l.slug}`}>{l.name}</a>
                  <span className="muted">{giftsLabel(l.giftCount)}</span>
                  <a className="home-edit" href={`/l/${l.slug}/admin`}>
                    Edytuj<span className="sr-only"> listę {l.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="a-card">
          <h2>Załóż swoją listę</h2>
          <form className="a-form" onSubmit={create} noValidate>
            <label htmlFor="new-list-name">
              Czyja to lista?
              <input
                id="new-list-name"
                className="a-input"
                placeholder="np. Ania"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label htmlFor="new-list-password">
              Hasło do edycji
              <input
                id="new-list-password"
                className="a-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <p className="muted a-wide">
              Hasło będzie potrzebne do dodawania i zmieniania prezentów. Mikołajowie oglądają listę bez hasła.
            </p>
            {error && (
              <p className="field-error a-wide" role="alert">
                {error}
              </p>
            )}
            <div className="a-actions a-wide">
              <button className="btn btn-red" disabled={busy}>
                Załóż listę
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
