import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import localFont from "next/font/local";
import { AuthSessionProvider } from "@/components/shared/session-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import ServiceWorkerRegistration from "@/components/shared/ServiceWorkerRegistration";
import { RTL_LOCALES } from "@/i18n/request";
import "./globals.css";

const zodiak = localFont({
  src: [
    { path: "../../public/fonts/Zodiak-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Zodiak-700.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/Zodiak-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-zodiak",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Non-Latin script fonts — instantiated at module level, applied conditionally via CSS var
const notoArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic"], display: "swap" });
const notoDevanagari = Noto_Sans_Devanagari({ variable: "--font-noto-devanagari", subsets: ["devanagari"], display: "swap" });

export const metadata: Metadata = {
  title: "Xplosale — Sell. Hire. Connect. Verified.",
  description: "Sell. Hire. Connect. Verified.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRTL = RTL_LOCALES.includes(locale);

  const scriptFontVar =
    locale === "ar" || locale === "ur" ? notoArabic.variable
    : locale === "hi" ? notoDevanagari.variable
    : "";

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      className={`${zodiak.variable} ${plusJakartaSans.variable} ${scriptFontVar} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#F4F2EC" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Xplosale" />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--body)" }}>
        <NextIntlClientProvider messages={messages}>
          <AuthSessionProvider>
            {children}
            <ServiceWorkerRegistration />
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
