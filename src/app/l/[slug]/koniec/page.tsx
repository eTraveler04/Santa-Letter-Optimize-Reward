import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FarewellApp from "@/components/FarewellApp";
import { findList } from "@/lib/store";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Koniec na dziś" };

export default async function Page({ params }: Props) {
  const list = findList((await params).slug);
  if (!list) notFound();
  return <FarewellApp slug={list.slug} listName={list.name} />;
}
