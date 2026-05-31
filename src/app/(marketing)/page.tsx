import { getTranslations, getLocale } from 'next-intl/server';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

export default async function MarketingHome() {
  const t = await getTranslations('common');
  const nav = await getTranslations('nav');
  const locale = await getLocale();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="font-bold text-lg">{t('appName')}</span>
        <LanguageSwitcher currentLocale={locale} />
      </header>
      <section className="flex flex-col items-center justify-center flex-1 gap-6 px-4 text-center">
        <h1 className="text-4xl font-bold">{t('appName')}</h1>
        <p className="text-xl text-gray-600">{t('tagline')}</p>
        <nav className="flex flex-wrap gap-4 justify-center mt-4">
          <a href="/marketplace" className="text-blue-600 hover:underline">{nav('marketplace')}</a>
          <a href="/jobs" className="text-blue-600 hover:underline">{nav('jobs')}</a>
          <a href="/network" className="text-blue-600 hover:underline">{nav('network')}</a>
        </nav>
      </section>
    </main>
  );
}
