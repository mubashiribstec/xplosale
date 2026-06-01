'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

const LANGUAGE_OPTIONS = [
  { locale: 'en', label: 'English' },
  { locale: 'ur', label: 'اردو' },
  { locale: 'ar', label: 'العربية' },
  { locale: 'hi', label: 'हिन्दी' },
  { locale: 'fr', label: 'Français' },
  { locale: 'es', label: 'Español' },
  { locale: 'zh', label: '中文' },
] as const;

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative inline-block">
      <select
        value={currentLocale}
        onChange={(e) => setLocale(e.target.value)}
        disabled={isPending}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        aria-label="Select language"
      >
        {LANGUAGE_OPTIONS.map(({ locale, label }) => (
          <option key={locale} value={locale}>{label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>
  );
}
