import { type NextRequest } from 'next/server';
import { ok, err, parseError } from '@/lib/http';
import { requireSession, getUserId } from '@/core/auth/session';
import { putObject } from '@/core/adapters/storage';
import { detectMimeType, MAX_PDF_SIZE } from '@/core/media/pipeline';
import { prisma } from '@/lib/prisma';
import { parseResumePdf } from '@/verticals/jobs/ats/resume-parser';
import { recomputeMatchForApplication } from '@/verticals/jobs/ats/recompute-match';

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

    const profile = await prisma.jobSeekerProfile.upsert({
      where: { userId },
      update: { resumeUrl: key },
      create: { userId, resumeUrl: key },
    });

    // Parse PDF and store extracted text (fire-and-forget after storing profile key)
    try {
      const { rawText, extracted } = await parseResumePdf(buf);
      const extractedJson = extracted as unknown as import("@prisma/client").Prisma.InputJsonValue;
      await prisma.resumeParsed.upsert({
        where: { jobSeekerProfileId: profile.id },
        update: { rawText, extracted: extractedJson, parsedAt: new Date(), source: 'UPLOAD' },
        create: { jobSeekerProfileId: profile.id, rawText, extracted: extractedJson, source: 'UPLOAD' },
      });

      // Recompute match scores for all active applications this candidate has
      const applications = await prisma.application.findMany({
        where: { jobSeekerId: profile.id },
        select: { id: true },
      });
      await Promise.all(applications.map((a) => recomputeMatchForApplication(a.id)));
    } catch (parseErr) {
      console.error('[resume-parse] Failed to parse/match:', parseErr);
      // Non-fatal — upload succeeded, match will recompute on next trigger
    }

    return ok({ key });
  } catch (e) { return parseError(e); }
}
