"use client";

import { useCallback, useEffect, useState } from "react";
import type { GiftDTO, GroupDTO } from "@/lib/types";

const money = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

/** Do wyszukiwania: małe litery bez polskich znaków, żeby „zolw" znalazło „Żółw". */
const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

interface GiftValues {
  name: string;
  price: number;
  url: string;
  rank: number;
  reason: string | null;
  groupId: number | null;
}

interface GroupValues {
  name: string;
  reason: string | null;
  giftIds: number[];
}

function GiftForm({
  initial,
  groups,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: GiftDTO;
  groups: GroupDTO[];
  submitLabel: string;
  onSubmit: (v: GiftValues) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price).replace(".", ",") : "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [rank, setRank] = useState(initial ? String(initial.rank) : "1");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [groupId, setGroupId] = useState(initial?.groupId ? String(initial.groupId) : "");
  const [busy, setBusy] = useState(false);
  const uid = initial ? `g${initial.id}` : "new";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit({
      name,
      price: Number(price.replace(/\s/g, "").replace(",", ".")),
      url,
      rank: Number(rank),
      reason: reason.trim() || null,
      groupId: groupId ? Number(groupId) : null,
    });
    setBusy(false);
    if (ok && !initial) {
      setName("");
      setPrice("");
      setUrl("");
      setReason("");
    }
  }

  return (
    <form className="a-form" onSubmit={submit}>
      <label className="a-wide" htmlFor={`${uid}-name`}>
        Nazwa
        <input id={`${uid}-name`} className="a-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label htmlFor={`${uid}-price`}>
        Cena (zł)
        <input
          id={`${uid}-price`}
          className="a-input"
          inputMode="decimal"
          placeholder="199,99"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      <label htmlFor={`${uid}-rank`}>
        Ranga (wyższa = bardziej pożądany)
        <input
          id={`${uid}-rank`}
          className="a-input"
          type="number"
          min={0}
          step={1}
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          required
        />
      </label>
      <label className="a-wide" htmlFor={`${uid}-url`}>
        Link do sklepu
        <input
          id={`${uid}-url`}
          className="a-input"
          type="url"
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </label>
      <label className="a-wide" htmlFor={`${uid}-reason`}>
        Po co mi to (opcjonalnie)
        <textarea
          id={`${uid}-reason`}
          className="a-input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <label className="a-wide" htmlFor={`${uid}-group`}>
        Komplet
        <select id={`${uid}-group`} className="a-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Bez kompletu</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <div className="a-actions a-wide">
        <button className="btn btn-red" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-plain" onClick={onCancel}>
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}

function GroupForm({
  initial,
  gifts,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: GroupDTO;
  gifts: GiftDTO[];
  submitLabel: string;
  onSubmit: (v: GroupValues) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [picked, setPicked] = useState<Set<number>>(new Set(initial?.giftIds ?? []));
  const [busy, setBusy] = useState(false);
  const uid = initial ? `gr${initial.id}` : "newgr";
  // prezenty z innych kompletów nie są do wyboru; przy edycji zostają te z tego kompletu
  const free = gifts.filter((g) => g.groupId == null || g.groupId === initial?.id);

  function flip(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit({ name, reason: reason.trim() || null, giftIds: [...picked] });
    setBusy(false);
    if (ok && !initial) {
      setName("");
      setReason("");
      setPicked(new Set());
    }
  }

  return (
    <form className="a-form" onSubmit={submit}>
      <label className="a-wide" htmlFor={`${uid}-name`}>
        Nazwa kompletu
        <input id={`${uid}-name`} className="a-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="a-wide" htmlFor={`${uid}-reason`}>
        Po co mi to (opcjonalnie)
        <textarea
          id={`${uid}-reason`}
          className="a-input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <fieldset className="a-wide a-picks">
        <legend>Prezenty w komplecie (co najmniej 2)</legend>
        {gifts.length === 0 && <p className="muted">Najpierw dodaj prezenty.</p>}
        {gifts.length > 0 && free.length === 0 && (
          <p className="muted">Wszystkie prezenty są już w kompletach.</p>
        )}
        {free.map((g) => (
          <label key={g.id}>
            <input type="checkbox" checked={picked.has(g.id)} onChange={() => flip(g.id)} />
            <span>
              {g.name} <span className="muted">{money.format(g.price)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="a-actions a-wide">
        <button className="btn btn-red" disabled={busy || picked.size < 2}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-plain" onClick={onCancel}>
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}

export default function AdminApp({
  slug,
  initialName,
  hasPassword,
}: {
  slug: string;
  initialName: string;
  hasPassword: boolean;
}) {
  const api = `/api/lists/${encodeURIComponent(slug)}`;
  const storageKey = `listKey:${slug}`;
  const [listName, setListName] = useState(initialName);
  const [nameDraft, setNameDraft] = useState(initialName);
  const [newPassword, setNewPassword] = useState("");
  const [phase, setPhase] = useState<"checking" | "locked" | "open">("checking");
  const [loginError, setLoginError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [gifts, setGifts] = useState<GiftDTO[]>([]);
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editGift, setEditGift] = useState<number | null>(null);
  const [editGroup, setEditGroup] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [giftQuery, setGiftQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [truffleRows, setTruffleRows] = useState<{ santa: number; truffles: number; gifts: number; updatedAt: string }[]>([]);

  const reload = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch(`${api}/gifts`, { cache: "no-store" }),
        fetch(`${api}/groups`, { cache: "no-store" }),
      ]);
      if (!a.ok || !b.ok) throw new Error();
      setGifts(await a.json());
      setGroups(await b.json());
    } catch {
      setMsg({ ok: false, text: "Nie udało się pobrać listy. Odśwież stronę." });
    }
  }, [api]);

  /** Pyta serwer, czy hasło pasuje do tej listy. */
  const verify = useCallback(
    async (key: string): Promise<boolean | null> => {
      try {
        const res = await fetch(`${api}/auth`, { method: "POST", headers: { "x-api-key": key } });
        return res.ok ? true : res.status === 401 ? false : null;
      } catch {
        return null;
      }
    },
    [api],
  );

  // Panel otwiera się dopiero po potwierdzeniu hasła przez serwer.
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(storageKey) ?? "";
    } catch {}
    if (!saved) {
      setPhase("locked");
      return;
    }
    verify(saved).then((ok) => {
      if (ok) {
        setApiKey(saved);
        setPhase("open");
        reload();
      } else {
        setPhase("locked");
      }
    });
  }, [reload, storageKey, verify]);

  // Trufle obiecane Mikołajom: tylko dla zalogowanego właściciela.
  useEffect(() => {
    if (phase !== "open" || !apiKey) return;
    fetch(`${api}/truffles`, { headers: { "x-api-key": apiKey }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTruffleRows)
      .catch(() => {});
  }, [phase, apiKey, api, gifts]);

  async function logIn(e: React.FormEvent) {
    e.preventDefault();
    const k = keyDraft;
    if (!k) return setLoginError("Wpisz hasło.");
    setLoginError("");
    const ok = await verify(k);
    if (ok === null) return setLoginError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    if (!ok) return setLoginError("To hasło nie pasuje do tej listy.");
    try {
      localStorage.setItem(storageKey, k);
    } catch {}
    setApiKey(k);
    setKeyDraft("");
    setPhase("open");
    reload();
  }

  /** Kopiuje adres strony Mikołaja tej listy (ten sam adres bez /admin). */
  async function copySantaLink() {
    const link = `${window.location.origin}/l/${slug}`;
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(link);
        ok = true;
      } catch {}
    }
    if (!ok) {
      // starsza metoda: działa też bez https
      const area = document.createElement("textarea");
      area.value = link;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {}
      area.remove();
    }
    setMsg(
      ok
        ? { ok: true, text: `Skopiowano link dla Mikołaja: ${link}` }
        : { ok: false, text: `Nie udało się skopiować. Link dla Mikołaja: ${link}` },
    );
  }

  function logOut() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setApiKey("");
    setGifts([]);
    setGroups([]);
    setMsg(null);
    setPhase("locked");
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const body: { name?: string; password?: string } = {};
    if (nameDraft.trim() && nameDraft.trim() !== listName) body.name = nameDraft.trim();
    if (newPassword) body.password = newPassword;
    if (!body.name && !body.password) {
      setMsg({ ok: false, text: "Nic się nie zmieniło: wpisz nową nazwę albo nowe hasło." });
      return;
    }
    const ok = await send("PATCH", "", body, "Zapisano ustawienia listy.");
    if (!ok) return;
    if (body.name) setListName(body.name);
    if (body.password) {
      // nowe hasło od razu staje się hasłem tej przeglądarki
      setApiKey(body.password);
      setNewPassword("");
      try {
        localStorage.setItem(storageKey, body.password);
      } catch {}
    }
  }

  async function removeList() {
    const ok = await send("DELETE", "", undefined, "Lista usunięta.");
    if (ok) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      window.location.href = "/";
    }
  }

  /** Wysyła zmianę, odświeża listę i pokazuje komunikat. Zwraca true, gdy się udało. */
  async function send(method: string, path: string, body: unknown, done: string): Promise<boolean> {
    try {
      const res = await fetch(api + path, {
        method,
        headers: { "content-type": "application/json", "x-api-key": apiKey },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Błąd ${res.status}.`);
      }
      setMsg({ ok: true, text: done });
      setConfirm(null);
      if (!(method === "DELETE" && path === "")) await reload();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Coś poszło nie tak." });
      return false;
    }
  }

  /** Przycisk usuwania z drugim kliknięciem jako potwierdzeniem. */
  function removeButton(id: string, label: string, sure: string, action: () => void) {
    return confirm === id ? (
      <button type="button" className="btn btn-small btn-red" onClick={action}>
        {sure}
      </button>
    ) : (
      <button type="button" className="btn btn-small btn-plain" onClick={() => setConfirm(id)}>
        {label}
      </button>
    );
  }

  // Wyszukiwanie działa tylko w tej przeglądarce i niczego nie zmienia na liście.
  const giftNeedle = plain(giftQuery.trim());
  const shownGifts = giftNeedle ? gifts.filter((g) => plain(g.name).includes(giftNeedle)) : gifts;
  const groupNeedle = plain(groupQuery.trim());
  const shownGroups = groupNeedle
    ? groups.filter(
        (gr) =>
          plain(gr.name).includes(groupNeedle) ||
          gifts.some((g) => g.groupId === gr.id && plain(g.name).includes(groupNeedle)),
      )
    : groups;

  if (phase !== "open") {
    return (
      <main className="admin">
        <header className="a-head">
          <h1>{listName}: zarządzanie</h1>
          <a href={`/l/${slug}`}>Zobacz stronę Mikołaja</a>
        </header>
        {phase === "checking" ? (
          <p className="muted" role="status">
            <span className="spinner" aria-hidden="true" />
            Sprawdzam hasło…
          </p>
        ) : (
          <section className="a-card">
            <h2>Podaj hasło listy</h2>
            <form className="a-key" onSubmit={logIn}>
              <label className="sr-only" htmlFor="api-key">
                Hasło listy
              </label>
              <input
                id="api-key"
                className="a-input"
                type="password"
                autoComplete="current-password"
                placeholder="Hasło podane przy zakładaniu listy"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                aria-invalid={!!loginError}
              />
              <button className="btn btn-red">Otwórz panel</button>
            </form>
            {loginError && (
              <p className="field-error" role="alert">
                {loginError}
              </p>
            )}
            {!hasPassword && (
              <p className="muted">
                Ta lista nie ma jeszcze własnego hasła. Wpisz klucz główny (ADMIN_API_KEY), a potem ustaw hasło w
                ustawieniach listy.
              </p>
            )}
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="a-head">
        <h1>{listName}: zarządzanie</h1>
        <div className="a-actions">
          <a href={`/l/${slug}`}>Zobacz stronę Mikołaja</a>
          <button type="button" className="btn btn-small btn-gold" onClick={copySantaLink}>
            Skopiuj link dla Mikołaja
          </button>
          <button type="button" className="btn btn-small btn-plain" onClick={logOut}>
            Wyloguj
          </button>
        </div>
      </header>

      {msg && (
        <p className={`a-msg ${msg.ok ? "is-ok" : "is-bad"}`} role="status">
          {msg.text}
        </p>
      )}

      <details className="a-card a-fold">
        <summary>
          <h2>Dodaj prezent</h2>
        </summary>
        <GiftForm
          groups={groups}
          submitLabel="Dodaj prezent"
          onSubmit={(v) => send("POST", "/gifts", v, `Dodano „${v.name}”.`)}
        />
      </details>

      <details className="a-card a-fold">
        <summary>
          <h2>Utwórz komplet</h2>
        </summary>
        <GroupForm
          gifts={gifts}
          submitLabel="Utwórz komplet"
          onSubmit={(v) => send("POST", "/groups", v, `Utworzono komplet „${v.name}”.`)}
        />
      </details>

      <details className="a-card a-fold">
        <summary>
          <h2>
          Komplety ({groupNeedle ? `${shownGroups.length} z ${groups.length}` : groups.length})
          </h2>
        </summary>
        {groups.length === 0 && <p className="muted">Nie ma jeszcze żadnego kompletu.</p>}
        {groups.length > 0 && (
          <div className="a-search">
            <label className="sr-only" htmlFor="group-search">
              Szukaj kompletu po nazwie
            </label>
            <input
              id="group-search"
              className="a-input"
              type="search"
              placeholder="Szukaj kompletu po nazwie lub prezencie w środku"
              value={groupQuery}
              onChange={(e) => setGroupQuery(e.target.value)}
            />
          </div>
        )}
        {groups.length > 0 && shownGroups.length === 0 && (
          <p className="muted">Żaden komplet nie pasuje do „{groupQuery.trim()}”.</p>
        )}
        <ul className="a-list">
          {shownGroups.map((gr) => (
            <li key={gr.id}>
              {editGroup === gr.id ? (
                <GroupForm
                  initial={gr}
                  gifts={gifts}
                  submitLabel="Zapisz komplet"
                  onCancel={() => setEditGroup(null)}
                  onSubmit={async (v) => {
                    const ok = await send("PATCH", `/groups/${gr.id}`, v, `Zapisano komplet „${v.name}”.`);
                    if (ok) setEditGroup(null);
                    return ok;
                  }}
                />
              ) : (
                <div className="a-row">
                  <div>
                    <strong>{gr.name}</strong> <span className="muted">{money.format(gr.totalPrice)}</span>
                    {gr.reason && <p className="muted">{gr.reason}</p>}
                    <p>
                      {gr.giftIds
                        .map((id) => gifts.find((g) => g.id === id)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="a-actions">
                    <button type="button" className="btn btn-small btn-gold" onClick={() => setEditGroup(gr.id)}>
                      Edytuj
                    </button>
                    {removeButton(`group-${gr.id}`, "Rozwiąż", "Na pewno rozwiązać?", () =>
                      send("DELETE", `/groups/${gr.id}`, undefined, `Rozwiązano komplet „${gr.name}”. Prezenty zostały.`),
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </details>

      <details className="a-card a-fold">
        <summary>
          <h2>
          Prezenty ({giftNeedle ? `${shownGifts.length} z ${gifts.length}` : gifts.length})
          </h2>
        </summary>
        {gifts.length === 0 && <p className="muted">Lista jest pusta. Dodaj pierwszy prezent powyżej.</p>}
        {gifts.length > 0 && (
          <div className="a-search">
            <label className="sr-only" htmlFor="gift-search">
              Szukaj prezentu po nazwie
            </label>
            <input
              id="gift-search"
              className="a-input"
              type="search"
              placeholder="Szukaj prezentu po nazwie"
              value={giftQuery}
              onChange={(e) => setGiftQuery(e.target.value)}
            />
          </div>
        )}
        {gifts.length > 0 && shownGifts.length === 0 && (
          <p className="muted">Żaden prezent nie pasuje do „{giftQuery.trim()}”.</p>
        )}
        <ul className="a-list">
          {shownGifts.map((g) => (
            <li key={g.id}>
              {editGift === g.id ? (
                <GiftForm
                  initial={g}
                  groups={groups}
                  submitLabel="Zapisz prezent"
                  onCancel={() => setEditGift(null)}
                  onSubmit={async (v) => {
                    const ok = await send("PATCH", `/gifts/${g.id}`, v, `Zapisano „${v.name}”.`);
                    if (ok) setEditGift(null);
                    return ok;
                  }}
                />
              ) : (
                <div className="a-row">
                  <div>
                    <strong>{g.name}</strong> <span className="muted">{money.format(g.price)}</span>
                    <p className="muted">
                      id {g.id}, ranga {g.rank}
                      {g.groupName && <>, komplet „{g.groupName}”</>}
                      {g.chosen && <strong className="a-chosen"> zaklepany</strong>}
                    </p>
                    {g.reason && <p className="muted">{g.reason}</p>}
                    <a href={g.url} target="_blank" rel="noopener noreferrer">
                      {g.url}
                    </a>
                  </div>
                  <div className="a-actions">
                    <button type="button" className="btn btn-small btn-gold" onClick={() => setEditGift(g.id)}>
                      Edytuj
                    </button>
                    {g.chosen && (
                      <button
                        type="button"
                        className="btn btn-small btn-plain"
                        onClick={() =>
                          send("PATCH", `/gifts/${g.id}`, { chosen: false }, `Odblokowano „${g.name}”.`)
                        }
                      >
                        Odblokuj
                      </button>
                    )}
                    {removeButton(`gift-${g.id}`, "Usuń", "Na pewno usunąć?", () =>
                      send("DELETE", `/gifts/${g.id}`, undefined, `Usunięto „${g.name}”.`),
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </details>

      <details className="a-card a-fold">
        <summary>
          <h2>Trufle dla Mikołajów ({truffleRows.reduce((s, r) => s + r.truffles, 0)})</h2>
        </summary>
        {truffleRows.length === 0 ? (
          <p className="muted">Na razie żaden Mikołaj nie uzbierał trufli.</p>
        ) : (
          <ul className="a-list">
            {truffleRows.map((r) => (
              <li key={r.santa}>
                <strong>Mikołaj {r.santa}</strong>: opakowań trufli {r.truffles}, wybranych prezentów {r.gifts}
                <span className="muted"> (zmiana {new Date(r.updatedAt).toLocaleString("pl-PL")})</span>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="a-card a-fold">
        <summary>
          <h2>Ustawienia listy</h2>
        </summary>
        <form className="a-form" onSubmit={saveSettings}>
          <label className="a-wide" htmlFor="list-name">
            Nazwa listy
            <input id="list-name" className="a-input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          </label>
          <label className="a-wide" htmlFor="list-password">
            Nowe hasło (zostaw puste, żeby nie zmieniać)
            <input
              id="list-password"
              className="a-input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <p className="muted a-wide">Adres listy (/l/{slug}) nie zmienia się po zmianie nazwy.</p>
          <div className="a-actions a-wide">
            <button className="btn btn-red">Zapisz ustawienia</button>
            {removeButton("list", "Usuń całą listę", "Na pewno usunąć listę i wszystkie prezenty?", removeList)}
          </div>
        </form>
      </details>
    </main>
  );
}
