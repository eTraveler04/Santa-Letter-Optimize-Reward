import HomeApp from "@/components/HomeApp";
import { listLists } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function Page() {
  return <HomeApp lists={listLists()} />;
}
