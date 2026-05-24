import EmployerOtpLoginForm from './EmployerOtpLoginForm';
import LoginForm from './LoginForm';
import { getSession, resolveAuthenticatedHomePath } from '@/lib/auth';
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
  if (s) redirect(searchParams.next || resolveAuthenticatedHomePath(s));
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card card-pad">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">P</span>
            <div>
              <div className="text-lg font-semibold">Partime</div>
              <div className="text-xs text-ink-500">Admin workspace sign in</div>
            </div>
          </div>
          <LoginForm next={searchParams.next} />
        </div>

        <div className="space-y-6">
          <div className="card card-pad">
            <div className="mb-4">
              <div className="text-lg font-semibold text-ink-950">Employer sign in</div>
              <p className="mt-1 text-sm text-ink-600">Use the WhatsApp number registered for your company workspace.</p>
            </div>
            <EmployerOtpLoginForm next={searchParams.next} />
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-ink-700">
            <div className="font-medium text-ink-900">Need a new workspace?</div>
            <p className="mt-1 text-ink-600">Register your company or apply as a part-timer from the public onboarding flow.</p>
            <Link href="/register" className="mt-3 inline-flex font-medium text-brand-700 hover:underline">
              Open registration page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
