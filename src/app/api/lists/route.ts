import { handle, readJson } from "@/lib/http";
import { createList, listLists } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(() => listLists());
}

/** Zakłada nową listę: { name, password }. Otwarte dla każdego. */
export function POST(req: Request) {
  return handle(async () => createList(await readJson(req)), 201);
}
