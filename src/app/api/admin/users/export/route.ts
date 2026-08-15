import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';
import {
  EXPORT_FIELD_IDS, EXPORT_FIELDS, type ExportFormat,
  resolveDateRangePreset, formatDateRangeLabel, type DateRangePreset,
} from '@/lib/export/fields';
import { buildUsersWhere, fetchExportRows } from '@/lib/export/data';
import { generateExportFiles } from '@/lib/export/generate';
import { storeExportFile, deleteExportFile } from '@/lib/export/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

const JOB_TTL_MS = 24 * 60 * 60 * 1000;

const DATE_PRESETS = ['today', 'yesterday', 'last7', 'last30', 'last90', 'thisMonth', 'lastMonth', 'thisYear', 'custom'] as const;

const bodySchema = z.object({
  scope: z.enum(['all', 'filtered', 'selected']),
  filter: z.object({
    search: z.string().optional(),
    plan: z.string().optional(),
    status: z.string().optional(),
  }).optional(),
  selectedIds: z.array(z.string()).max(5000).optional(),
  dateField: z.enum(['createdAt', 'updatedAt']).optional(),
  datePreset: z.enum(DATE_PRESETS).optional(),
  customFrom: z.string().optional(),
  customTo: z.string().optional(),
  fields: z.array(z.string()).min(1),
  formats: z.array(z.enum(['csv', 'xlsx', 'json', 'pdf', 'zip'])).min(1),
});

function sse(obj: unknown) {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();
  if (!admin.id || !admin.email) return forbidden();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid export request' }, { status: 400 });
  }
  const body = parsed.data;

  const fields = EXPORT_FIELDS.filter((f) => body.fields.includes(f.id));
  if (fields.length === 0) {
    return NextResponse.json({ ok: false, error: 'No valid fields selected' }, { status: 400 });
  }
  const invalidFields = body.fields.filter((id) => !EXPORT_FIELD_IDS.includes(id));
  if (invalidFields.length > 0) {
    return NextResponse.json({ ok: false, error: `Unknown fields: ${invalidFields.join(', ')}` }, { status: 400 });
  }

  const preset = (body.datePreset ?? 'custom') as DateRangePreset;
  const { from, to } = body.datePreset
    ? resolveDateRangePreset(preset, body.customFrom, body.customTo)
    : { from: null, to: null };

  if (from && to && from > to) {
    return NextResponse.json({ ok: false, error: 'Start date must be before end date' }, { status: 400 });
  }

  const where = buildUsersWhere({
    scope: body.scope,
    filter: body.filter,
    selectedIds: body.selectedIds,
    dateField: body.dateField,
    dateFrom: from,
    dateTo: to,
  });

  const ip = req.headers.get('x-forwarded-for') ?? undefined;
  const dateRangeLabel = formatDateRangeLabel(preset, from, to);

  const stream = new ReadableStream({
    async start(controller) {
      const job = await prisma.userExportJob.create({
        data: {
          adminId: admin.id!,
          adminEmail: admin.email!,
          status: 'PROCESSING',
          scope: body.scope,
          dateField: body.dateField ?? null,
          dateFrom: from,
          dateTo: to,
          fieldsJson: fields.map((f) => f.id),
          formatsJson: body.formats,
          expiresAt: new Date(Date.now() + JOB_TTL_MS),
        },
      });

      try {
        controller.enqueue(sse({ phase: 'preparing', message: 'Preparing export...', jobId: job.id }));

        const rows = await fetchExportRows(where, (fetched, total) => {
          controller.enqueue(sse({ phase: 'preparing', message: `Fetching users... ${fetched.toLocaleString()} / ${total.toLocaleString()}`, jobId: job.id }));
        });

        controller.enqueue(sse({ phase: 'generating', message: `Generating ${body.formats.filter((f) => f !== 'zip').join(', ') || 'files'}...`, jobId: job.id }));

        if (body.formats.includes('zip')) {
          controller.enqueue(sse({ phase: 'packaging', message: 'Packaging ZIP...', jobId: job.id }));
        }

        const meta = {
          exportedAt: new Date().toLocaleString('en-US'),
          exportedBy: admin.email!,
          userCount: rows.length,
          dateRange: dateRangeLabel,
        };

        const files = await generateExportFiles(rows, fields, body.formats as ExportFormat[], meta, 'savdown-users', from, to);

        // A zip already bundles every other requested format, so only it
        // needs to be stored. Otherwise each requested format is a
        // separately downloadable file — none of them get silently dropped.
        const filesToStore = files.some((f) => f.format === 'zip')
          ? files.filter((f) => f.format === 'zip')
          : files;

        const storedFiles = await Promise.all(filesToStore.map(async (f) => {
          const stored = await storeExportFile(job.id, f.name, f.buffer);
          return { format: f.format, name: f.name, url: stored.url, size: stored.size };
        }));
        const primary = storedFiles[0];

        const updated = await prisma.userExportJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            userCount: rows.length,
            fileName: primary.name,
            fileUrl: primary.url,
            fileSize: primary.size,
            filesJson: storedFiles,
            completedAt: new Date(),
          },
        });

        await writeAuditLog({
          adminId: admin.id!,
          adminEmail: admin.email!,
          action: 'users.export',
          targetType: 'User',
          targetId: job.id,
          ip,
          detail: {
            scope: body.scope,
            dateRange: dateRangeLabel,
            fields: fields.map((f) => f.id),
            formats: body.formats,
            recordCount: rows.length,
          },
        });

        controller.enqueue(sse({
          phase: 'done',
          message: 'Ready to download',
          job: {
            id: updated.id,
            fileName: updated.fileName,
            fileSize: updated.fileSize,
            userCount: updated.userCount,
            downloadUrl: `/api/admin/users/export/${updated.id}/download`,
            files: storedFiles.map((f) => ({
              format: f.format,
              name: f.name,
              size: f.size,
              downloadUrl: `/api/admin/users/export/${updated.id}/download?format=${f.format}`,
            })),
          },
        }));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Export failed';
        await prisma.userExportJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: message } }).catch(() => {});
        controller.enqueue(sse({ phase: 'error', message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
}

/** Export history, newest first. Lazily expires + deletes files past their TTL. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '10', 10));

  const expired = await prisma.userExportJob.findMany({
    where: { status: 'COMPLETED', expiresAt: { lt: new Date() } },
    select: { id: true, fileUrl: true, filesJson: true },
    take: 100,
  });
  if (expired.length > 0) {
    await Promise.all(expired.map((j) => {
      const urls = new Set<string>();
      if (j.fileUrl) urls.add(j.fileUrl);
      if (Array.isArray(j.filesJson)) {
        for (const f of j.filesJson as { url?: string }[]) if (f.url) urls.add(f.url);
      }
      return Promise.all([...urls].map(deleteExportFile));
    }));
    await prisma.userExportJob.updateMany({
      where: { id: { in: expired.map((j) => j.id) } },
      data: { status: 'EXPIRED', fileUrl: null },
    });
  }

  const [jobs, total] = await Promise.all([
    prisma.userExportJob.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.userExportJob.count(),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      jobs: jobs.map((j) => ({
        id: j.id,
        fileName: j.fileName,
        adminEmail: j.adminEmail,
        status: j.status,
        userCount: j.userCount,
        scope: j.scope,
        dateFrom: j.dateFrom?.toISOString() ?? null,
        dateTo: j.dateTo?.toISOString() ?? null,
        formats: j.formatsJson,
        createdAt: j.createdAt.toISOString(),
        expiresAt: j.expiresAt.toISOString(),
        error: j.error,
        downloadUrl: j.status === 'COMPLETED' ? `/api/admin/users/export/${j.id}/download` : null,
        files: j.status === 'COMPLETED' && Array.isArray(j.filesJson)
          ? (j.filesJson as { format: string; name: string; size: number }[]).map((f) => ({
              format: f.format, name: f.name, size: f.size,
              downloadUrl: `/api/admin/users/export/${j.id}/download?format=${f.format}`,
            }))
          : [],
      })),
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
