import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { AuthSessionProvider } from "@/components/shared/session-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import ServiceWorkerRegistration from "@/components/shared/ServiceWorkerRegistration";
import SupportChatWidget from "@/components/shared/SupportChatWidget";
import ScrollLoginPrompt from "@/components/shared/ScrollLoginPrompt";
import CookieBanner from "@/components/shared/CookieBanner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import ClientErrorSetup from "@/components/shared/ClientErrorSetup";
import { RTL_LOCALES } from "@/i18n/request";
import { getSession } from "@/core/auth/session";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.xplosale.com"),
  title: "Xplosale — Sell. Hire. Connect. Verified.",
  description:
    "Xplosale is Pakistan's verified marketplace and jobs platform. Buy and sell property, vehicles, and goods with escrow protection. Find verified jobs and hire trusted talent.",
  openGraph: {
    title: "Xplosale — Sell. Hire. Connect. Verified.",
    description:
      "Pakistan's verified marketplace and jobs platform. Escrow-protected transactions, identity-verified sellers, and trusted hiring.",
    type: "website",
    siteName: "Xplosale",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xplosale — Sell. Hire. Connect. Verified.",
    description:
      "Pakistan's verified marketplace and jobs platform. Escrow-protected transactions, identity-verified sellers, and trusted hiring.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages, session, cookieStore] = await Promise.all([
    getLocale(),
    getMessages(),
    getSession(),
    cookies(),
  ]);
  const isAuthenticated = !!session;
  const isRTL = RTL_LOCALES.includes(locale);
  const themeCookie = cookieStore.get("xplosale-theme")?.value;
  const theme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : undefined;

  const scriptFontVar =
    locale === "ar" || locale === "ur" ? notoArabic.variable
    : locale === "hi" ? notoDevanagari.variable
    : "";

  return (
    <html
      lang={locale}
      dir={isRTL ? "rtl" : "ltr"}
      data-theme={theme}
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
          <AuthSessionProvider session={session}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <CookieBanner />
            <SupportChatWidget />
            <ScrollLoginPrompt isAuthenticated={isAuthenticated} />
            <ServiceWorkerRegistration />
            <ClientErrorSetup />
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
