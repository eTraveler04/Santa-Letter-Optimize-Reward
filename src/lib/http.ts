import { NextResponse } from "next/server";
import { ApiError, canWrite, requireList, type ListRow } from "./store";

export type SlugCtx = { params: Promise<{ slug: string }> };
export type SlugIdCtx = { params: Promise<{ slug: string; id: string }> };

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Treść żądania nie jest poprawnym JSON-em.");
  }
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Niepoprawne id.");
  return id;
}

/**
 * Znajduje listę z adresu. Przy write sprawdza nagłówek x-api-key:
 * pasuje hasło tej listy albo klucz główny ADMIN_API_KEY.
 */
export function openList(req: Request, slug: string, write: boolean): ListRow {
  const list = requireList(slug);
  if (write && !canWrite(list, req.headers.get("x-api-key"))) {
    throw new ApiError(401, "Złe albo brakujące hasło listy (nagłówek x-api-key).");
  }
  return list;
}

export async function handle(fn: () => unknown | Promise<unknown>, status = 200): Promise<Response> {
  try {
    const out = await fn();
    if (out === undefined) return new NextResponse(null, { status: 204 });
    return NextResponse.json(out, { status });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 });
  }
}
