import { z } from 'zod';
import { ok, err, parseError } from '@/lib/http';
import { requireSession, getUserId } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const LanguageSchema = z.object({
  locale: z.enum(['en', 'ur']),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err('Unauthorized', 401);
    const userId = getUserId(session);

    const body = await request.json();
    const { locale } = LanguageSchema.parse(body);

    await prisma.user.update({
      where: { id: userId },
      data: { languagePref: locale },
    });

    const response = ok({ locale });
    response.headers.set(
      'Set-Cookie',
      `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
    );
    return response;
  } catch (e) {
    return parseError(e);
  }
}
