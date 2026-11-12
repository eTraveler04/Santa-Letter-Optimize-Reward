import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import type { GiftDTO, GroupDTO, ListDTO } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------- walidacja ----------

type Body = Record<string, unknown>;

function asObject(body: unknown): Body {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Oczekiwano obiektu JSON.");
  }
  return body as Body;
}

function readName(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw new ApiError(400, "Pole name: wymagany niepusty tekst.");
  if (v.trim().length > 200) throw new ApiError(400, "Pole name: najwyżej 200 znaków.");
  return v.trim();
}

function readPriceCents(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    throw new ApiError(400, "Pole price: wymagana liczba większa od 0 (w złotych, np. 199.99).");
  }
  const cents = Math.round(v * 100);
  if (cents <= 0 || Math.abs(cents - v * 100) > 1e-6) {
    throw new ApiError(400, "Pole price: najwyżej dwa miejsca po przecinku.");
  }
  return cents;
}

function readUrl(v: unknown): string {
  try {
    const u = new URL(String(v));
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    return u.toString();
  } catch {
    throw new ApiError(400, "Pole url: wymagany poprawny adres http(s).");
  }
}

function readRank(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new ApiError(400, "Pole rank: wymagana liczba naturalna (0, 1, 2…).");
  }
  return v;
}

function readReason(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") throw new ApiError(400, "Pole reason: tekst albo null.");
  return v.trim() || null;
}

// ---------- listy ----------

export interface ListRow {
  id: number;
  slug: string;
  name: string;
  password_hash: string | null;
  created_at: string;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function passwordMatches(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const given = scryptSync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(given, expected);
}

function readPassword(v: unknown): string {
  if (typeof v !== "string" || v.length < 4 || v.length > 200) {
    throw new ApiError(400, "Pole password: hasło od 4 do 200 znaków.");
  }
  return v;
}

/** Adres listy z nazwy: małe litery bez polskich znaków, reszta zamieniona na myślniki. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "lista";
}

function toListDTO(r: ListRow & { gift_count?: number }): ListDTO {
  return {
    slug: r.slug,
    name: r.name,
    giftCount: r.gift_count ?? 0,
    hasPassword: r.password_hash != null,
    createdAt: r.created_at,
  };
}

export function listLists(): ListDTO[] {
  const rows = db()
    .prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM gifts g WHERE g.list_id = l.id) AS gift_count
       FROM lists l`,
    )
    .all() as (ListRow & { gift_count: number })[];
  return rows.map(toListDTO).sort((a, b) => a.name.localeCompare(b.name, "pl", { sensitivity: "base" }));
}

export function findList(slug: string): ListRow | undefined {
  return db().prepare("SELECT * FROM lists WHERE slug = ?").get(slug) as ListRow | undefined;
}

export function requireList(slug: string): ListRow {
  const list = findList(slug);
  if (!list) throw new ApiError(404, `Nie ma listy „${slug}”.`);
  return list;
}

export function getListDTO(slug: string): ListDTO {
  const dto = listLists().find((l) => l.slug === slug);
  if (!dto) throw new ApiError(404, `Nie ma listy „${slug}”.`);
  return dto;
}

/** Edytować listę może jej hasło albo klucz główny ADMIN_API_KEY. */
export function canWrite(list: ListRow, key: string | null): boolean {
  if (!key) return false;
  const master = process.env.ADMIN_API_KEY;
  if (master) {
    const a = Buffer.from(key);
    const b = Buffer.from(master);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return list.password_hash != null && passwordMatches(key, list.password_hash);
}

export function createList(body: unknown): ListDTO {
  const b = asObject(body);
  const name = readName(b.name);
  const hash = hashPassword(readPassword(b.password));
  const d = db();
  const base = slugify(name);
  const slug = d.transaction(() => {
    let candidate = base;
    for (let n = 2; findList(candidate); n++) candidate = `${base}-${n}`;
    d.prepare("INSERT INTO lists (slug, name, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
      candidate,
      name,
      hash,
      new Date().toISOString(),
    );
    return candidate;
  })();
  return getListDTO(slug);
}

/** Zmiana nazwy lub hasła. Adres listy (slug) zostaje ten sam, żeby stare linki działały. */
export function updateList(list: ListRow, body: unknown): ListDTO {
  const b = asObject(body);
  const d = db();
  if (!("name" in b) && !("password" in b)) throw new ApiError(400, "Brak pól do zmiany.");
  d.transaction(() => {
    if ("name" in b) d.prepare("UPDATE lists SET name = ? WHERE id = ?").run(readName(b.name), list.id);
    if ("password" in b) {
      d.prepare("UPDATE lists SET password_hash = ? WHERE id = ?").run(hashPassword(readPassword(b.password)), list.id);
    }
  })();
  return getListDTO(list.slug);
}

export function deleteList(list: ListRow) {
  const d = db();
  d.transaction(() => {
    d.prepare("DELETE FROM gifts WHERE list_id = ?").run(list.id);
    d.prepare("DELETE FROM santas WHERE list_id = ?").run(list.id);
    d.prepare("DELETE FROM groups WHERE list_id = ?").run(list.id);
    d.prepare("DELETE FROM lists WHERE id = ?").run(list.id);
  })();
}

// ---------- prezenty ----------

interface GiftRow {
  id: number;
  name: string;
  price_cents: number;
  url: string;
  rank: number;
  reason: string | null;
  group_id: number | null;
  group_name: string | null;
  group_reason: string | null;
  chosen: number;
  chosen_by: string | null;
  created_at: string;
}

const GIFT_SELECT = `
  SELECT g.*, gr.name AS group_name, gr.reason AS group_reason
  FROM gifts g LEFT JOIN groups gr ON gr.id = g.group_id`;

function toDTO(r: GiftRow, santaId: string | null): GiftDTO {
  return {
    id: r.id,
    name: r.name,
    price: r.price_cents / 100,
    priceCents: r.price_cents,
    url: r.url,
    rank: r.rank,
    reason: r.reason,
    groupId: r.group_id,
    groupName: r.group_name,
    groupReason: r.group_reason,
    chosen: r.chosen === 1,
    status: r.chosen !== 1 ? "free" : santaId && r.chosen_by === santaId ? "mine" : "taken",
    createdAt: r.created_at,
  };
}

/** Kolejność: ranga malejąco (wyższa = bardziej pożądany), potem alfabetycznie, potem data dodania. */
export function listGifts(listId: number, santaId: string | null = null): GiftDTO[] {
  const rows = db().prepare(`${GIFT_SELECT} WHERE g.list_id = ?`).all(listId) as GiftRow[];
  return rows
    .map((r) => toDTO(r, santaId))
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        a.name.localeCompare(b.name, "pl", { sensitivity: "base" }) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id - b.id,
    );
}

export function getGift(listId: number, id: number): GiftDTO {
  const row = db().prepare(`${GIFT_SELECT} WHERE g.id = ? AND g.list_id = ?`).get(id, listId) as
    | GiftRow
    | undefined;
  if (!row) throw new ApiError(404, `Na tej liście nie ma prezentu o id ${id}.`);
  return toDTO(row, null);
}

function readGroupId(listId: number, v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isInteger(v)) throw new ApiError(400, "Pole groupId: liczba albo null.");
  const exists = db().prepare("SELECT 1 FROM groups WHERE id = ? AND list_id = ?").get(v, listId);
  if (!exists) throw new ApiError(400, `Na tej liście nie ma grupy o id ${v}.`);
  return v;
}

/** Grupa ma sens tylko przy co najmniej 2 prezentach. Mniejsze rozwiązujemy. */
function pruneGroups() {
  const d = db();
  const small = d
    .prepare(
      `SELECT gr.id FROM groups gr LEFT JOIN gifts g ON g.group_id = gr.id
       GROUP BY gr.id HAVING COUNT(g.id) < 2`,
    )
    .all() as { id: number }[];
  for (const { id } of small) {
    d.prepare("UPDATE gifts SET group_id = NULL WHERE group_id = ?").run(id);
    d.prepare("DELETE FROM groups WHERE id = ?").run(id);
  }
}

function insertGift(listId: number, raw: unknown, forcedGroupId?: number): number {
  const b = asObject(raw);
  const info = db()
    .prepare(
      `INSERT INTO gifts (list_id, name, price_cents, url, rank, reason, group_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      listId,
      readName(b.name),
      readPriceCents(b.price),
      readUrl(b.url),
      readRank(b.rank),
      readReason(b.reason),
      forcedGroupId ?? readGroupId(listId, b.groupId),
      new Date().toISOString(),
    );
  return Number(info.lastInsertRowid);
}

export function createGifts(listId: number, body: unknown): GiftDTO | GiftDTO[] {
  const d = db();
  if (Array.isArray(body)) {
    if (body.length === 0) throw new ApiError(400, "Pusta lista prezentów.");
    const ids = d.transaction(() => body.map((raw) => insertGift(listId, raw)))();
    return ids.map((id) => getGift(listId, id));
  }
  return getGift(listId, insertGift(listId, body));
}

export function updateGift(listId: number, id: number, body: unknown): GiftDTO {
  const b = asObject(body);
  const d = db();
  getGift(listId, id);
  const sets: string[] = [];
  const vals: unknown[] = [];
  if ("name" in b) sets.push("name = ?"), vals.push(readName(b.name));
  if ("price" in b) sets.push("price_cents = ?"), vals.push(readPriceCents(b.price));
  if ("url" in b) sets.push("url = ?"), vals.push(readUrl(b.url));
  if ("rank" in b) sets.push("rank = ?"), vals.push(readRank(b.rank));
  if ("reason" in b) sets.push("reason = ?"), vals.push(readReason(b.reason));
  if ("groupId" in b) sets.push("group_id = ?"), vals.push(readGroupId(listId, b.groupId));
  if ("chosen" in b) {
    if (typeof b.chosen !== "boolean") throw new ApiError(400, "Pole chosen: true albo false.");
    sets.push("chosen = ?", "chosen_by = ?");
    vals.push(b.chosen ? 1 : 0, b.chosen ? "admin" : null);
  }
  if (sets.length === 0) throw new ApiError(400, "Brak pól do zmiany.");
  d.transaction(() => {
    d.prepare(`UPDATE gifts SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    pruneGroups();
  })();
  return getGift(listId, id);
}

export function deleteGift(listId: number, id: number) {
  const d = db();
  getGift(listId, id);
  d.transaction(() => {
    d.prepare("DELETE FROM gifts WHERE id = ?").run(id);
    pruneGroups();
  })();
}

// ---------- grupy ----------

export function listGroups(listId: number): GroupDTO[] {
  const d = db();
  const groups = d.prepare("SELECT * FROM groups WHERE list_id = ? ORDER BY id").all(listId) as {
    id: number;
    name: string;
    reason: string | null;
    created_at: string;
  }[];
  const members = d.prepare("SELECT id, price_cents FROM gifts WHERE group_id = ? ORDER BY id");
  return groups.map((g) => {
    const rows = members.all(g.id) as { id: number; price_cents: number }[];
    return {
      id: g.id,
      name: g.name,
      reason: g.reason,
      giftIds: rows.map((r) => r.id),
      totalPrice: rows.reduce((s, r) => s + r.price_cents, 0) / 100,
      createdAt: g.created_at,
    };
  });
}

export function getGroup(listId: number, id: number): GroupDTO {
  const g = listGroups(listId).find((x) => x.id === id);
  if (!g) throw new ApiError(404, `Na tej liście nie ma grupy o id ${id}.`);
  return g;
}

const TOO_FEW = "Grupa musi mieć co najmniej 2 różne prezenty.";

function readGiftIds(listId: number, v: unknown, min = 2): number[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "number" || !Number.isInteger(x))) {
    throw new ApiError(400, "Pole giftIds: wymagana lista id prezentów.");
  }
  const ids = [...new Set(v as number[])];
  if (ids.length < min) throw new ApiError(400, TOO_FEW);
  for (const id of ids) getGift(listId, id);
  return ids;
}

/**
 * Grupa z istniejących prezentów (giftIds), z nowych podanych w treści (gifts)
 * albo z obu naraz. Razem muszą dać co najmniej 2 prezenty.
 */
export function createGroup(listId: number, body: unknown): GroupDTO {
  const b = asObject(body);
  const name = readName(b.name);
  const reason = readReason(b.reason);
  const existing = "giftIds" in b ? readGiftIds(listId, b.giftIds, 0) : [];
  if ("gifts" in b && !Array.isArray(b.gifts)) {
    throw new ApiError(400, "Pole gifts: wymagana lista nowych prezentów.");
  }
  const fresh = (b.gifts as unknown[] | undefined) ?? [];
  if (existing.length + fresh.length < 2) throw new ApiError(400, TOO_FEW);
  const d = db();
  const id = d.transaction(() => {
    const info = d
      .prepare("INSERT INTO groups (list_id, name, reason, created_at) VALUES (?, ?, ?, ?)")
      .run(listId, name, reason, new Date().toISOString());
    const gid = Number(info.lastInsertRowid);
    const set = d.prepare("UPDATE gifts SET group_id = ? WHERE id = ?");
    for (const giftId of existing) set.run(gid, giftId);
    for (const raw of fresh) insertGift(listId, raw, gid);
    pruneGroups();
    return gid;
  })();
  return getGroup(listId, id);
}

export function updateGroup(listId: number, id: number, body: unknown): GroupDTO {
  const b = asObject(body);
  getGroup(listId, id);
  const d = db();
  d.transaction(() => {
    if ("name" in b) d.prepare("UPDATE groups SET name = ? WHERE id = ?").run(readName(b.name), id);
    if ("reason" in b) d.prepare("UPDATE groups SET reason = ? WHERE id = ?").run(readReason(b.reason), id);
    if ("giftIds" in b) {
      const ids = readGiftIds(listId, b.giftIds);
      d.prepare("UPDATE gifts SET group_id = NULL WHERE group_id = ?").run(id);
      const set = d.prepare("UPDATE gifts SET group_id = ? WHERE id = ?");
      for (const giftId of ids) set.run(id, giftId);
      pruneGroups();
    }
  })();
  return getGroup(listId, id);
}

export function deleteGroup(listId: number, id: number) {
  getGroup(listId, id);
  const d = db();
  d.transaction(() => {
    d.prepare("UPDATE gifts SET group_id = NULL WHERE group_id = ?").run(id);
    d.prepare("DELETE FROM groups WHERE id = ?").run(id);
  })();
}

// ---------- wybory Mikołaja ----------

/** Zapisuje aktualne zaznaczenia jednego Mikołaja na jednej liście. Cudzych wyborów nie rusza. */
export function saveSelection(listId: number, body: unknown): GiftDTO[] {
  const b = asObject(body);
  const santaId = b.santaId;
  if (typeof santaId !== "string" || santaId.length < 8 || santaId.length > 64 || santaId === "admin") {
    throw new ApiError(400, "Pole santaId: wymagany identyfikator (8–64 znaki).");
  }
  const ids = b.giftIds;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "number" || !Number.isInteger(x))) {
    throw new ApiError(400, "Pole giftIds: wymagana lista id prezentów.");
  }
  const truffles = b.truffles;
  if (truffles !== undefined && (typeof truffles !== "number" || !Number.isInteger(truffles) || truffles < 0)) {
    throw new ApiError(400, "Pole truffles: wymagana liczba całkowita od zera.");
  }
  const wanted = new Set(ids as number[]);
  const d = db();
  d.transaction(() => {
    const mine = d.prepare("SELECT id FROM gifts WHERE chosen_by = ? AND list_id = ?").all(santaId, listId) as {
      id: number;
    }[];
    const release = d.prepare("UPDATE gifts SET chosen = 0, chosen_by = NULL WHERE id = ? AND chosen_by = ?");
    let released = 0;
    for (const { id } of mine) if (!wanted.has(id)) released += release.run(id, santaId).changes;
    const claim = d.prepare("UPDATE gifts SET chosen = 1, chosen_by = ? WHERE id = ? AND list_id = ? AND chosen = 0");
    for (const id of wanted) claim.run(santaId, id, listId);

    // Trufle: strona listy podaje własny licznik. Gdy go nie ma (np. „Jednak nie kupię”
    // w podsumowaniu), każdy zwolniony prezent zabiera jedno opakowanie.
    // Nigdy więcej opakowań niż prezentów, które ten Mikołaj faktycznie ma.
    const { n } = d.prepare("SELECT COUNT(*) AS n FROM gifts WHERE chosen_by = ? AND list_id = ?").get(santaId, listId) as {
      n: number;
    };
    const row = d.prepare("SELECT truffles FROM santas WHERE list_id = ? AND santa_id = ?").get(listId, santaId) as
      | { truffles: number }
      | undefined;
    if (truffles !== undefined || row) {
      const value = Math.min((truffles as number | undefined) ?? Math.max(0, row!.truffles - released), n);
      d.prepare(
        `INSERT INTO santas (list_id, santa_id, truffles, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (list_id, santa_id) DO UPDATE SET truffles = excluded.truffles, updated_at = excluded.updated_at`,
      ).run(listId, santaId, value, new Date().toISOString());
    }
  })();
  return listGifts(listId, santaId);
}

/** Ile opakowań trufli uzbierał ten Mikołaj na tej liście. */
export function getTruffles(listId: number, santaId: string | null): number {
  if (!santaId) return 0;
  const row = db().prepare("SELECT truffles FROM santas WHERE list_id = ? AND santa_id = ?").get(listId, santaId) as
    | { truffles: number }
    | undefined;
  return row?.truffles ?? 0;
}

export interface SantaTruffles {
  /** kolejny numer Mikołaja na tej liście (bez ujawniania identyfikatora przeglądarki) */
  santa: number;
  truffles: number;
  gifts: number;
  updatedAt: string;
}

/** Zestawienie dla właściciela listy: Mikołajowie, którym należą się trufle. */
export function listTruffles(listId: number): SantaTruffles[] {
  const rows = db()
    .prepare(
      `SELECT s.truffles, s.updated_at AS updatedAt,
              (SELECT COUNT(*) FROM gifts g WHERE g.list_id = s.list_id AND g.chosen_by = s.santa_id) AS gifts
       FROM santas s WHERE s.list_id = ? AND s.truffles > 0 ORDER BY s.rowid`,
    )
    .all(listId) as Omit<SantaTruffles, "santa">[];
  return rows.map((r, i) => ({ santa: i + 1, ...r }));
}
