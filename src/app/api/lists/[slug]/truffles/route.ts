import { handle, openList, type SlugCtx } from "@/lib/http";
import { listTruffles } from "@/lib/store";

/** Zestawienie trufli dla właściciela listy. Wymaga hasła listy (x-api-key). */
export function GET(req: Request, { params }: SlugCtx) {
  return handle(async () => listTruffles(openList(req, (await params).slug, true).id));
}
