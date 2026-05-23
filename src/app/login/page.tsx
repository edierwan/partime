import LoginForm from './LoginForm';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LoginPage(
  props: {
    searchParams: Promise<{ next?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const s = await getSession();
  if (s) redirect(searchParams.next || '/admin');
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-50">
      <div className="w-full max-w-md card card-pad">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">P</span>
          <div>
            <div className="text-lg font-semibold">Partime</div>
            <div className="text-xs text-ink-500">Admin sign in</div>
          </div>
        </div>
        <LoginForm next={searchParams.next} />
        <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-ink-700">
          <div className="font-medium text-ink-900">Part-timer or employer registration</div>
          <p className="mt-1 text-ink-600">Apply as a part-timer or register your company workspace.</p>
          <Link href="/register" className="mt-3 inline-flex text-brand-700 font-medium hover:underline">
            Open registration page
          </Link>
        </div>
      </div>
    </div>
  );
}
