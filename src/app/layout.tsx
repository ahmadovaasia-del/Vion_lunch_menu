import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getLocale } from "@/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Обеды / Prânzuri",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
