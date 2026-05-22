import LoginForm from './LoginForm';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
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
      </div>
    </div>
  );
}
