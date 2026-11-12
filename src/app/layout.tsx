import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";

const body = Baloo_2({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Lista życzeń pod choinkę",
  description: "Mikołaju, wpisz budżet, a dobierzemy prezenty co do złotówki.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#232b6b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={body.variable}>
      <body>{children}</body>
    </html>
  );
}
