import { cookies } from 'next/headers';
import { EmployerRegisterClient } from './EmployerRegisterClient';
import { normalizeLocale } from '@/lib/public-i18n';

export const dynamic = 'force-dynamic';

export default async function EmployerRegisterPage(props: { searchParams: Promise<{ lang?: string }> }) {
  const searchParams = await props.searchParams;
  const locale = normalizeLocale(searchParams.lang || (await cookies()).get('partime_public_lang')?.value);
  return (
    <div className="min-h-screen bg-ink-50 px-6 py-10 md:py-16">
      <EmployerRegisterClient locale={locale} />
    </div>
  );
}