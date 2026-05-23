import Link from 'next/link';

export default function EmployerReportsPage() {
  return <div className="space-y-5"><div><h1 className="sectiontitle">Reports</h1><p className="subtitle">Attendance and payroll reporting remain available in the admin reports area.</p></div><div className="grid gap-4 md:grid-cols-2"><Link href="/admin/reports/daily" className="card card-pad hover:bg-ink-50"><div className="font-semibold text-ink-950">Daily attendance</div><div className="mt-1 text-sm text-ink-500">Clock-in/out and payable time.</div></Link><Link href="/admin/reports/weekly-payroll" className="card card-pad hover:bg-ink-50"><div className="font-semibold text-ink-950">Weekly payroll</div><div className="mt-1 text-sm text-ink-500">Manual payout-ready report.</div></Link></div></div>;
}