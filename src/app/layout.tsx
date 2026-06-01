import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import { AuthSessionProvider } from "@/components/shared/session-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import ServiceWorkerRegistration from "@/components/shared/ServiceWorkerRegistration";
import { RTL_LOCALES } from "@/i18n/request";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Non-Latin script fonts — instantiated at module level, applied conditionally via CSS var
const notoArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic"], display: "swap" });
const notoDevanagari = Noto_Sans_Devanagari({ variable: "--font-noto-devanagari", subsets: ["devanagari"], display: "swap" });

export const metadata: Metadata = {
  title: "Xplosale",
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
      className={`${geistSans.variable} ${geistMono.variable} ${scriptFontVar} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Xplosale" />
      </head>
      <body className="min-h-full flex flex-col">
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
