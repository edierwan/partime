import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let s;
  try {
    s = await requireAdminSession();
  } catch {
    redirect('/login');
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar adminName={s.name} adminEmail={s.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
