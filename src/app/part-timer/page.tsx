import Link from 'next/link';
import { prisma } from '@/lib/db';
import { normalizeMalaysiaPhone } from '@/lib/staff';
import { PartTimerLookup } from './PartTimerLookup';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PartTimerHomePage(props: { searchParams: Promise<{ phone?: string }> }) {
  const searchParams = await props.searchParams;
  const phone = normalizeMalaysiaPhone(searchParams.phone || '');
  const partTimer = phone ? await prisma.staff.findUnique({ where: { phoneE164: phone }, include: { portfolioMedia: true, offerRecipients: true, jobInterests: true, sessions: true } }) : null;
  return (
    <PartTimerLookup phone={phone || searchParams.phone}>
      {!partTimer ? <Empty phone={phone || searchParams.phone} /> : (
        <div className="space-y-5">
          <div className="card card-pad"><h1 className="sectiontitle">Hi, {partTimer.fullName}</h1><p className="subtitle">Your Partime profile, offers, jobs and attendance history.</p></div>
          <div className="grid gap-4 md:grid-cols-4"><Metric label="Portfolio media" value={partTimer.portfolioMedia.length} /><Metric label="Offers" value={partTimer.offerRecipients.length} /><Metric label="Job interests" value={partTimer.jobInterests.length} /><Metric label="Attendance" value={partTimer.sessions.length} /></div>
          <div className="grid gap-4 md:grid-cols-2"><Link href={`/part-timer/jobs?phone=${encodeURIComponent(phone)}`} className="card card-pad hover:bg-ink-50"><div className="font-semibold text-ink-950">Browse jobs</div><div className="mt-1 text-sm text-ink-500">Find open marketplace jobs.</div></Link><Link href={`/part-timer/portfolio?phone=${encodeURIComponent(phone)}`} className="card card-pad hover:bg-ink-50"><div className="font-semibold text-ink-950">Update portfolio</div><div className="mt-1 text-sm text-ink-500">Upload image or video samples.</div></Link></div>
        </div>
      )}
    </PartTimerLookup>
  );
}

function Empty({ phone }: { phone?: string }) {
  const registerHref = `/register/part-timer${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`;
  return <div className="card card-pad"><h1 className="sectiontitle">Part-timer portal</h1><p className="subtitle">Enter your WhatsApp number to open your profile.</p><Link href={registerHref} className="btn-primary mt-4 bg-[#b46f22] hover:bg-[#945816]">Create profile</Link></div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card card-pad"><div className="text-sm text-ink-500">{label}</div><div className="mt-2 text-3xl font-semibold text-ink-950">{value}</div></div>;
}