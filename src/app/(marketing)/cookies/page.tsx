"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_NAME = "xplosale-consent";
const MAX_AGE = 60 * 60 * 24 * 365;

function getConsent(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function saveConsent(value: "all" | "essential") {
  document.cookie = `${COOKIE_NAME}=${value};path=/;max-age=${MAX_AGE};SameSite=Lax`;
}

export default function CookiesPage() {
  const [consent, setConsent] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConsent(getConsent());
  }, []);

  function handleSave(value: "all" | "essential") {
    saveConsent(value);
    setConsent(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const analyticsEnabled = consent === "all";

  return (
    <main className="max-w-3xl mx-auto px-5 py-16 text-gray-800">
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-8 inline-block">
        ← Back to home
      </Link>
      <h1 className="text-3xl font-bold mb-2">Cookie Preferences</h1>
      <p className="text-sm text-gray-400 mb-10">
        Manage which cookies Xplosale stores on your device.
      </p>

      <div className="space-y-6">
        {/* Essential cookies — always on */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-semibold text-gray-900">Essential cookies</h2>
              <p className="text-sm text-gray-500 mt-0.5">Always active</p>
            </div>
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              Required
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            These cookies are necessary for the platform to function. They keep you signed in,
            remember your language preference, and protect against cross-site request forgery. They
            cannot be disabled.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-gray-500">
            <li>
              <code className="font-mono bg-gray-200 px-1 rounded">next-auth.session-token</code> —
              keeps you signed in
            </li>
            <li>
              <code className="font-mono bg-gray-200 px-1 rounded">NEXT_LOCALE</code> — remembers
              your language choice
            </li>
            <li>
              <code className="font-mono bg-gray-200 px-1 rounded">xplosale-consent</code> — stores
              your cookie preference
            </li>
          </ul>
        </div>

        {/* Analytics cookies — optional */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-semibold text-gray-900">Analytics cookies</h2>
              <p className="text-sm text-gray-500 mt-0.5">Optional</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {analyticsEnabled ? "Enabled" : "Disabled"}
              </span>
              <button
                onClick={() => handleSave(analyticsEnabled ? "essential" : "all")}
                role="switch"
                aria-checked={analyticsEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 ${
                  analyticsEnabled ? "bg-gray-900" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    analyticsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            These cookies help us understand how visitors use Xplosale so we can improve the
            experience. No personal data is shared with third parties for advertising.
          </p>
        </div>

        {saved && (
          <p className="text-sm text-green-700 font-medium text-center">
            Preferences saved.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleSave("essential")}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={() => handleSave("all")}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Accept all cookies
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center pt-2">
          For more detail on how we use your data, see our{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
