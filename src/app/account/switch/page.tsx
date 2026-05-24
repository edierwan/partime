import { redirect } from 'next/navigation';
import { getSession, getUserAccessOptions, resolveAuthenticatedHomePath } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AccountSwitchPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const options = await getUserAccessOptions(session.sub);
  if (options.length === 0) redirect('/register');
  if (options.length === 1) redirect(resolveAuthenticatedHomePath({ ...session, role: options[0].role, tenantId: options[0].tenantId ?? null }));

  return (
    <div className="min-h-screen bg-ink-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Partime</div>
          <h1 className="mt-3 text-3xl font-semibold text-ink-950">Pilih peranan atau workspace</h1>
          <p className="mt-2 text-sm text-ink-600">Akaun anda mempunyai lebih daripada satu akses. Pilih destinasi untuk sesi ini.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {options.map((option) => (
            <form key={`${option.role}:${option.tenantId || 'platform'}`} action="/api/auth/select-role" method="post" className="card card-pad space-y-4">
              <input type="hidden" name="role" value={option.role} />
              {option.tenantId ? <input type="hidden" name="tenantId" value={option.tenantId} /> : null}
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">{roleLabel(option.role)}</div>
                <div className="mt-2 text-xl font-semibold text-ink-950">{option.label}</div>
                {option.tenantName ? <div className="mt-1 text-sm text-ink-500">{option.tenantName}</div> : null}
              </div>
              <button type="submit" className="btn-primary w-full">Teruskan</button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}

function roleLabel(role: string): string {
  if (role === 'ADMIN') return 'Admin platform';
  if (role === 'EMPLOYER') return 'Majikan';
  return 'Pekerja';
}
