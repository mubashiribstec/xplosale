"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_NAME = "xplosale-consent";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getConsent(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setConsent(value: "all" | "essential") {
  document.cookie = `${COOKIE_NAME}=${value};path=/;max-age=${MAX_AGE};SameSite=Lax`;
}

function hasAnalyticsConsent(): boolean {
  return getConsent() === "all";
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function accept() {
    setConsent("all");
    setVisible(false);
  }

  function essential() {
    setConsent("essential");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
    >
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <p className="text-sm text-gray-600 flex-1 leading-relaxed">
          We use cookies to keep you signed in and remember your preferences. Optional analytics
          cookies help us improve the platform.{" "}
          <Link href="/cookies" className="text-blue-600 hover:underline">
            Learn more
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={essential}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
