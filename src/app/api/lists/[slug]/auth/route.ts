import { handle, openList, type SlugCtx } from "@/lib/http";

/** Sprawdza hasło z nagłówka x-api-key. 200 gdy pasuje, 401 gdy nie. */
export function POST(req: Request, { params }: SlugCtx) {
  return handle(async () => {
    openList(req, (await params).slug, true);
    return { ok: true };
  });
}
