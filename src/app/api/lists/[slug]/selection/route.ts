import { handle, openList, readJson, type SlugCtx } from "@/lib/http";
import { getTruffles, saveSelection } from "@/lib/store";

/** Trufle uzbierane przez Mikołaja z nagłówka x-santa-id. */
export function GET(req: Request, { params }: SlugCtx) {
  return handle(async () => ({
    truffles: getTruffles(openList(req, (await params).slug, false).id, req.headers.get("x-santa-id")),
  }));
}

/** Cichy zapis zaznaczeń Mikołaja: { santaId, giftIds, truffles? }. Zwraca świeżą listę. */
export function PUT(req: Request, { params }: SlugCtx) {
  return handle(async () => ({
    gifts: saveSelection(openList(req, (await params).slug, false).id, await readJson(req)),
  }));
}
