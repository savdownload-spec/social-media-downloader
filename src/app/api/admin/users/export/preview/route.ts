import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildUsersWhere, countUsersForExport } from '@/lib/export/data';
import { resolveDateRangePreset, type DateRangePreset } from '@/lib/export/fields';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

/** Live "N users" preview for the export drawer — same where-clause logic the actual export will use, minus the row fetch. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const sp = req.nextUrl.searchParams;
  const scope = (sp.get('scope') ?? 'all') as 'all' | 'filtered' | 'selected';
  const dateField = (sp.get('dateField') ?? 'createdAt') as 'createdAt' | 'updatedAt';
  const datePreset = sp.get('datePreset') as DateRangePreset | null;
  const customFrom = sp.get('customFrom') ?? undefined;
  const customTo = sp.get('customTo') ?? undefined;

  const { from, to } = datePreset ? resolveDateRangePreset(datePreset, customFrom, customTo) : { from: null, to: null };

  if (scope === 'selected') {
    const ids = sp.get('selectedIds')?.split(',').filter(Boolean) ?? [];
    return NextResponse.json({ ok: true, data: { count: ids.length } });
  }

  const where = buildUsersWhere({
    scope,
    filter: { search: sp.get('search') ?? undefined, plan: sp.get('plan') ?? undefined, status: sp.get('status') ?? undefined },
    dateField,
    dateFrom: from,
    dateTo: to,
  });
  const count = await countUsersForExport(where);
  return NextResponse.json({ ok: true, data: { count } });
}
