'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setLocale('en')}
        disabled={isPending}
        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
          currentLocale === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('ur')}
        disabled={isPending}
        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
          currentLocale === 'ur'
            ? 'bg-blue-600 text-white'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        اردو
      </button>
    </div>
  );
}
