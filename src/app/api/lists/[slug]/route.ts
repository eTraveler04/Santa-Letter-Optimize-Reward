import { handle, openList, readJson, type SlugCtx } from "@/lib/http";
import { deleteList, getListDTO, updateList } from "@/lib/store";

export function GET(_req: Request, { params }: SlugCtx) {
  return handle(async () => getListDTO((await params).slug));
}

/** Zmiana nazwy lub hasła: { name?, password? }. */
export function PATCH(req: Request, { params }: SlugCtx) {
  return handle(async () => updateList(openList(req, (await params).slug, true), await readJson(req)));
}

/** Usuwa listę razem z prezentami i grupami. */
export function DELETE(req: Request, { params }: SlugCtx) {
  return handle(async () => deleteList(openList(req, (await params).slug, true)));
}
