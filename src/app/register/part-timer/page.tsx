import { cookies } from 'next/headers';
import { PartTimerRegisterClient } from './PartTimerRegisterClient';
import { normalizeLocale } from '@/lib/public-i18n';
import { listSkillCatalog } from '@/lib/skills';

export const dynamic = 'force-dynamic';

export default async function PartTimerRegisterPage(props: { searchParams: Promise<{ lang?: string }> }) {
  const searchParams = await props.searchParams;
  const locale = normalizeLocale(searchParams.lang || (await cookies()).get('partime_public_lang')?.value);
  const skillCatalog = await listSkillCatalog();
  return (
    <div className="min-h-screen bg-ink-50 px-6 py-10 md:py-16">
      <PartTimerRegisterClient locale={locale} skillCatalog={skillCatalog} />
    </div>
  );
}