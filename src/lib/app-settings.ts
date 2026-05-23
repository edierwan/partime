import { prisma } from '@/lib/db';

export const ALLOW_PENDING_CLOCK_IN_KEY = 'allow_pending_staff_clock_in';

export async function getBooleanAppSetting(key: string, fallback = false): Promise<boolean> {
  const value = await prisma.appSetting.findUnique({ where: { key }, select: { value: true } });
  if (!value?.value) return fallback;
  return value.value === 'true';
}

export async function setBooleanAppSetting(key: string, value: boolean) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: value ? 'true' : 'false' },
    create: { key, value: value ? 'true' : 'false' },
  });
}