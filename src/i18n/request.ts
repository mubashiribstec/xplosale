import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const LOCALES = ['en', 'ur', 'ar', 'hi', 'fr', 'es', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const RTL_LOCALES: readonly string[] = ['ur', 'ar'];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value ?? 'en';
  const locale: Locale = (LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : 'en';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
