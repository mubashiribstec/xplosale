import { type NextRequest } from 'next/server';
import { ok, err, parseError } from '@/lib/http';
import { requireSession, getUserId } from '@/core/auth/session';
import { putObject } from '@/core/adapters/storage';
import { detectMimeType, MAX_PDF_SIZE } from '@/core/media/pipeline';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err('Unauthorized', 401);
    const userId = getUserId(session);

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return err('No file provided', 422);

    if (file.size > MAX_PDF_SIZE) return err('File exceeds 5 MB limit', 422);

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = detectMimeType(buf);
    if (mime !== 'application/pdf') return err('File must be a PDF', 422);

    const key = `resumes/${userId}/${crypto.randomUUID()}.pdf`;
    await putObject('private', key, buf, 'application/pdf');

    await prisma.jobSeekerProfile.upsert({
      where: { userId },
      update: { resumeUrl: key },
      create: { userId, resumeUrl: key },
    });

    return ok({ key });
  } catch (e) { return parseError(e); }
}
