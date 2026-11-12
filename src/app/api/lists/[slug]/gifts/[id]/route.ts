import { handle, openList, parseId, readJson, type SlugIdCtx } from "@/lib/http";
import { deleteGift, getGift, updateGift } from "@/lib/store";

export function GET(req: Request, { params }: SlugIdCtx) {
  return handle(async () => {
    const { slug, id } = await params;
    return getGift(openList(req, slug, false).id, parseId(id));
  });
}

export function PATCH(req: Request, { params }: SlugIdCtx) {
  return handle(async () => {
    const { slug, id } = await params;
    return updateGift(openList(req, slug, true).id, parseId(id), await readJson(req));
  });
}

export function DELETE(req: Request, { params }: SlugIdCtx) {
  return handle(async () => {
    const { slug, id } = await params;
    return deleteGift(openList(req, slug, true).id, parseId(id));
  });
}
