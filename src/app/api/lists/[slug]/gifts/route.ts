import { handle, openList, readJson, type SlugCtx } from "@/lib/http";
import { createGifts, listGifts } from "@/lib/store";

export function GET(req: Request, { params }: SlugCtx) {
  return handle(async () =>
    listGifts(openList(req, (await params).slug, false).id, req.headers.get("x-santa-id")),
  );
}

/** Jeden prezent (obiekt) albo kilka naraz (tablica). */
export function POST(req: Request, { params }: SlugCtx) {
  return handle(
    async () => createGifts(openList(req, (await params).slug, true).id, await readJson(req)),
    201,
  );
}
