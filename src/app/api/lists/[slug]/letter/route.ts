import { handle, openList, readJson, type SlugCtx } from "@/lib/http";
import { writeLetter } from "@/lib/letter";
import { ApiError, getTruffles, listGifts } from "@/lib/store";

/**
 * List z podziękowaniami dla Mikołaja: { santaId, fresh? }.
 * Prezenty bierzemy z bazy (to, co ten Mikołaj ma zaznaczone), nie z treści żądania.
 */
export function POST(req: Request, { params }: SlugCtx) {
  return handle(async () => {
    const list = openList(req, (await params).slug, false);
    const body = (await readJson(req)) as { santaId?: unknown; fresh?: unknown } | null;
    const santaId = body?.santaId;
    if (typeof santaId !== "string" || santaId.length < 8 || santaId.length > 64) {
      throw new ApiError(400, "Pole santaId: wymagany identyfikator (8–64 znaki).");
    }
    const gifts = listGifts(list.id, santaId).filter((g) => g.status === "mine");
    if (gifts.length === 0) return { gifts: [], letter: null, source: null, truffles: 0 };
    const letter = await writeLetter(list.id, list.name, santaId, gifts, body?.fresh === true);
    return { gifts, letter: letter.text, source: letter.source, truffles: getTruffles(list.id, santaId) };
  });
}
