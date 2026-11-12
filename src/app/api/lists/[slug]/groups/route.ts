import { handle, openList, readJson, type SlugCtx } from "@/lib/http";
import { createGroup, listGroups } from "@/lib/store";

export function GET(req: Request, { params }: SlugCtx) {
  return handle(async () => listGroups(openList(req, (await params).slug, false).id));
}

export function POST(req: Request, { params }: SlugCtx) {
  return handle(
    async () => createGroup(openList(req, (await params).slug, true).id, await readJson(req)),
    201,
  );
}
