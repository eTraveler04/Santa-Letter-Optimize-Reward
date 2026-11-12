import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminApp from "@/components/AdminApp";
import { findList } from "@/lib/store";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Lista życzeń: zarządzanie", robots: { index: false } };

export default async function Page({ params }: Props) {
  const list = findList((await params).slug);
  if (!list) notFound();
  return <AdminApp slug={list.slug} initialName={list.name} hasPassword={list.password_hash != null} />;
}
