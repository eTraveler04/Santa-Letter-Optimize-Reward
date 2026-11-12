import { handle, openList, parseId, readJson, type SlugIdCtx } from "@/lib/http";
import { deleteGroup, getGroup, updateGroup } from "@/lib/store";

export function GET(req: Request, { params }: SlugIdCtx) {
  return handle(async () => {
    const { slug, id } = await params;
    return getGroup(openList(req, slug, false).id, parseId(id));
  });
}

export function PATCH(req: Request, { params }: SlugIdCtx) {
  return handle(async () => {
    const { slug, id } = await params;
    return updateGroup(openList(req, slug, true).id, parseId(id), await readJson(req));
  });
}

/** Rozwiązuje grupę. Prezenty zostają na liście. */
export function DELETE(req: Request, { params }: SlugIdCtx) {
  return handle(async () => {
    const { slug, id } = await params;
    return deleteGroup(openList(req, slug, true).id, parseId(id));
  });
}
