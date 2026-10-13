import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MAINTENANCE_SETTING_KEY } from '@/lib/maintenance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Vary: 'Cookie',
};

export async function GET() {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: MAINTENANCE_SETTING_KEY },
      select: { value: true },
    });

    return NextResponse.json(
      { ok: true, enabled: setting?.value === 'true' },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('Unable to read maintenance mode.', error);
    // Fail open: a temporary settings-store failure must not make the entire
    // public site unavailable.
    return NextResponse.json(
      { ok: false, enabled: false },
      { headers: NO_STORE_HEADERS },
    );
  }
}
