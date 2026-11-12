import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SummaryApp from "@/components/SummaryApp";
import { findList } from "@/lib/store";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "List do Mikołaja" };

export default async function Page({ params }: Props) {
  const list = findList((await params).slug);
  if (!list) notFound();
  return <SummaryApp slug={list.slug} listName={list.name} />;
}
