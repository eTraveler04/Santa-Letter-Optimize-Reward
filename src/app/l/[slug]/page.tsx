import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SantaApp from "@/components/SantaApp";
import { findList } from "@/lib/store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = findList((await params).slug);
  return { title: list ? `Lista życzeń: ${list.name}` : "Nie ma takiej listy" };
}

export default async function Page({ params }: Props) {
  const list = findList((await params).slug);
  if (!list) notFound();
  return <SantaApp slug={list.slug} listName={list.name} />;
}
