'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const LANGUAGE_OPTIONS = [
  { locale: 'en', label: 'EN' },
  { locale: 'ur', label: 'اردو' },
  { locale: 'ar', label: 'AR' },
  { locale: 'hi', label: 'HI' },
  { locale: 'fr', label: 'FR' },
  { locale: 'es', label: 'ES' },
  { locale: 'zh', label: '中文' },
] as const;

function getLocaleCookie(): string {
  if (typeof document === 'undefined') return 'en';
  return document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] ?? 'en';
}

export default function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState('en');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    setCurrentLocale(getLocaleCookie());
  }, []);

  function setLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
    setCurrentLocale(locale);
    // Persist preference to DB so it survives across devices for logged-in users
    if (session) {
      void fetch('/api/account/language', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      }).catch(() => null);
    }
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={currentLocale}
        onChange={(e) => setLocale(e.target.value)}
        disabled={isPending}
        aria-label="Select language"
        style={{
          appearance: 'none',
          background: 'transparent',
          border: '1.5px solid var(--line)',
          borderRadius: 8,
          padding: '5px 24px 5px 10px',
          fontSize: 13,
          fontFamily: 'var(--body)',
          color: 'var(--ink-soft)',
          cursor: 'pointer',
          outline: 'none',
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {LANGUAGE_OPTIONS.map(({ locale, label }) => (
          <option key={locale} value={locale}>{label}</option>
        ))}
      </select>
      <svg
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}
