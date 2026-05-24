import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PublicLanguageSelector } from '@/components/PublicLanguageSelector';
import { prisma } from '@/lib/db';
import { getSession, resolveAuthenticatedHomePath } from '@/lib/auth';
import { normalizeLocale } from '@/lib/public-i18n';
import { JOB_CATEGORIES, formatJobDate, formatJobRate, jobPublicHref, listPublicJobs } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const popularSearches = ['Event Crew', 'Promoter', 'Wiring', 'Aircond', 'General Work', 'Runner', 'Warehouse', 'Cleaning', 'F&B', 'Customer Service'];

const fallbackImages = [
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
];

const copy = {
  ms: {
    badge: 'Marketplace kerja sambilan dipercayai di Malaysia',
    titleA: 'Cari kerja sambilan',
    titleB: 'berhampiran anda',
    subtitle: 'Kerja fleksibel, peluang sebenar. Bekerja ikut masa anda, terima tawaran melalui WhatsApp, dan clock in di lokasi kerja.',
    location: 'Lokasi',
    locationPlaceholder: 'contoh: Kuala Lumpur',
    skill: 'Kategori / Kemahiran',
    skillPlaceholder: 'contoh: Promoter, Wiring',
    date: 'Tarikh',
    search: 'Cari Kerja',
    activeJobs: 'Kerja Aktif',
    partTimers: 'Pekerja Sambilan',
    employers: 'Majikan Disahkan',
    responseRate: 'Kadar Respons',
    featured: 'Kerja Pilihan',
    viewAll: 'Lihat semua kerja',
    emptyJobs: 'Belum ada kerja dibuka.',
    emptyCta: 'Jadi majikan pertama yang post kerja',
    apply: 'Mohon',
    howTitle: 'Cara kerja untuk pekerja sambilan',
    employerTitle: 'Post jobs. Cari pekerja sambilan yang boleh dipercayai. Pantas.',
    employerSubtitle: 'Post kerja, cari profil sesuai, hantar tawaran WhatsApp dan pantau balasan berminat dalam satu tempat.',
    postJob: 'Post a Job',
    learnMore: 'Learn More',
    login: 'Login',
  },
  id: {
    badge: 'Marketplace kerja paruh waktu tepercaya di Malaysia',
    titleA: 'Cari kerja paruh waktu',
    titleB: 'di sekitar anda',
    subtitle: 'Kerja fleksibel, peluang nyata. Bekerja sesuai jadwal, terima tawaran WhatsApp, dan clock in di lokasi kerja.',
    location: 'Lokasi',
    locationPlaceholder: 'contoh: Kuala Lumpur',
    skill: 'Kategori / Keahlian',
    skillPlaceholder: 'contoh: Promoter, Wiring',
    date: 'Tanggal',
    search: 'Cari Kerja',
    activeJobs: 'Kerja Aktif',
    partTimers: 'Pekerja Paruh Waktu',
    employers: 'Pemberi Kerja Terverifikasi',
    responseRate: 'Tingkat Respons',
    featured: 'Kerja Pilihan',
    viewAll: 'Lihat semua kerja',
    emptyJobs: 'Belum ada kerja terbuka.',
    emptyCta: 'Jadi pemberi kerja pertama yang post kerja',
    apply: 'Lamar',
    howTitle: 'Cara kerja untuk pekerja paruh waktu',
    employerTitle: 'Post jobs. Temukan pekerja paruh waktu tepercaya. Cepat.',
    employerSubtitle: 'Post kerja, temukan profil sesuai, kirim tawaran WhatsApp dan pantau balasan berminat dari satu tempat.',
    postJob: 'Post a Job',
    learnMore: 'Learn More',
    login: 'Login',
  },
  en: {
    badge: "Malaysia's trusted part-time job marketplace",
    titleA: 'Find part-time jobs',
    titleB: 'near you',
    subtitle: 'Flexible jobs. Real opportunities. Work when you want, receive WhatsApp offers, and clock in at the job location.',
    location: 'Location',
    locationPlaceholder: 'e.g. Kuala Lumpur',
    skill: 'Job Category / Skill',
    skillPlaceholder: 'e.g. Promoter, Wiring',
    date: 'Date',
    search: 'Search Jobs',
    activeJobs: 'Active Jobs',
    partTimers: 'Registered Part-timers',
    employers: 'Verified Employers',
    responseRate: 'Avg. Response Rate',
    featured: 'Featured Jobs',
    viewAll: 'View all jobs',
    emptyJobs: 'No open jobs yet.',
    emptyCta: 'Be the first employer to post a job',
    apply: 'Apply',
    howTitle: 'How it works for part-timers',
    employerTitle: 'Post jobs. Find reliable part-timers. Fast.',
    employerSubtitle: 'Post a job, find matching profiles, send WhatsApp offers and track interested replies from one workspace.',
    postJob: 'Post a Job',
    learnMore: 'Learn More',
    login: 'Login',
  },
};

const steps = [
  ['Register Profile', 'Create your profile for free in minutes.'],
  ['Search & Receive Offers', 'Find jobs near you and get offers from employers.'],
  ['Clock In & Work', 'Check in at the job location and do your best.'],
  ['Get Paid Manually', 'Get paid directly by the employer after the job.'],
];

export default async function Home(
  props: { searchParams: Promise<{ lang?: string; location?: string; skill?: string; date?: string }> }
) {
  const searchParams = await props.searchParams;
  const session = await getSession();
  if (session) redirect(resolveAuthenticatedHomePath(session));
  const locale = normalizeLocale(searchParams.lang || (await cookies()).get('partime_public_lang')?.value);
  const t = copy[locale];
  const [jobs, activeJobs, partTimers, employers, offerRecipients, repliedRecipients] = await Promise.all([
    listPublicJobs({ location: searchParams.location, skill: searchParams.skill, date: searchParams.date }, 8),
    prisma.workEvent.count({ where: { active: true, publicVisible: true, jobStatus: { in: ['OPEN', 'OFFERING'] } } }),
    prisma.staff.count({ where: { status: { in: ['ACTIVE', 'PENDING_REVIEW'] } } }),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.jobOfferRecipient.count(),
    prisma.jobOfferRecipient.count({ where: { status: { in: ['INTERESTED', 'NOT_INTERESTED', 'SHORTLISTED', 'CONFIRMED'] } } }),
  ]);
  const responseRate = offerRecipients > 0 ? Math.round((repliedRecipients / offerRecipients) * 100) : 0;
  const langQuery = `lang=${locale}`;

  return (
    <main className="min-h-screen bg-[#f4f8ff] text-[#081638]">
      <header className="sticky top-0 z-30 border-b border-blue-950/10 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href={`/?${langQuery}`} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b63f6] text-lg font-black text-white shadow-sm">P</span>
            <span className="leading-tight">
              <span className="block text-xl font-black text-[#092152]">Partime</span>
              <span className="hidden text-xs font-semibold text-[#54709f] sm:block">Part-time jobs, made simple.</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-bold text-[#142957] md:flex">
            <Link href="/jobs">Jobs</Link>
            <a href="#how-it-works">How it Works</a>
            <a href="#for-employers">For Employers</a>
          </div>
          <div className="flex items-center gap-2">
            <PublicLanguageSelector locale={locale} />
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-[#142957] sm:inline-flex">{t.login}</Link>
            <Link href="/register/employer" className="rounded-lg bg-[#075bf2] px-3 py-2 text-sm font-bold text-white shadow-sm sm:px-4">{t.postJob}</Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-blue-100 bg-[linear-gradient(180deg,#f7fbff_0%,#eaf4ff_78%,#ffffff_100%)] px-4 pb-8 pt-7 md:px-8 md:pb-12 md:pt-12">
        <div className="absolute inset-x-0 top-10 hidden h-64 bg-[radial-gradient(circle_at_65%_40%,rgba(11,99,246,0.16),transparent_34%),linear-gradient(115deg,transparent_0%,transparent_45%,rgba(11,99,246,0.08)_45%,rgba(11,99,246,0.08)_47%,transparent_47%,transparent_100%)] md:block" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t.badge}</div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] text-[#07163a] sm:text-5xl md:text-6xl">
              {t.titleA}<br /><span className="text-[#075bf2]">{t.titleB}</span><span className="ml-2 inline-block h-3 w-3 rounded-full bg-[#075bf2] align-middle" />
            </h1>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[#405b8d] md:text-lg">{t.subtitle}</p>
          </div>

          <form action="/jobs" className="mt-7 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_18px_50px_rgba(20,65,130,0.14)] lg:max-w-5xl">
            <input type="hidden" name="lang" value={locale} />
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.75fr_auto]">
              <SearchField label={t.location} name="location" placeholder={t.locationPlaceholder} defaultValue={searchParams.location || ''} />
              <SearchField label={t.skill} name="skill" placeholder={t.skillPlaceholder} defaultValue={searchParams.skill || ''} />
              <div>
                <label className="text-xs font-bold text-[#213964]">{t.date}</label>
                <input className="input mt-1 border-blue-100 bg-white" type="date" name="date" defaultValue={searchParams.date || ''} />
              </div>
              <button className="mt-0 rounded-xl bg-[#075bf2] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#064bd0] md:mt-6" type="submit">{t.search}</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#60749b]">
              <span>Popular searches:</span>
              {popularSearches.map((item) => (
                <Link key={item} href={`/jobs?skill=${encodeURIComponent(item)}&${langQuery}`} className="rounded-full bg-[#eef5ff] px-3 py-1 text-[#075bf2] ring-1 ring-blue-100">{item}</Link>
              ))}
            </div>
          </form>
        </div>
      </section>

      <section className="px-4 md:px-8">
        <div className="mx-auto -mt-5 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t.activeJobs} value={activeJobs} accent="blue" />
          <Stat label={t.partTimers} value={partTimers} accent="green" />
          <Stat label={t.employers} value={employers} accent="orange" />
          <Stat label={t.responseRate} value={`${responseRate}%`} accent="violet" hint={responseRate > 0 ? 'Excellent' : undefined} />
        </div>
      </section>

      <section className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-[#092152]">{t.featured}</h2>
            <Link href={`/jobs?${langQuery}`} className="text-sm font-bold text-[#075bf2]">{t.viewAll} -&gt;</Link>
          </div>
          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-8 text-center shadow-sm">
              <div className="text-xl font-black text-[#092152]">{t.emptyJobs}</div>
              <Link href="/register/employer" className="mt-4 inline-flex rounded-xl bg-[#075bf2] px-5 py-3 text-sm font-black text-white">{t.emptyCta}</Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {jobs.slice(0, 4).map((job, index) => (
                <article key={job.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(20,65,130,0.14)]">
                  <Link href={`${jobPublicHref(job)}?${langQuery}`} className="block">
                    <div className="relative aspect-[16/9] bg-blue-100">
                      <img src={jobImage(job, index)} alt={job.name} className="h-full w-full object-cover" />
                      <span className="absolute left-3 top-3 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">NEW</span>
                      <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-1 text-xs font-black text-[#075bf2]">Save</span>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-base font-black text-[#092152]">{job.name}</h3>
                      <p className="mt-1 text-xs font-semibold text-[#60749b]">{job.tenant.name}</p>
                      <div className="mt-3 space-y-1 text-xs font-semibold text-[#50658a]">
                        <div>Location: {job.location}</div>
                        <div>Date: {formatJobDate(job.workDate)} {job.startTime ? `- ${job.startTime}` : ''}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(job.skills.length ? job.skills.slice(0, 2).map(({ skill }) => skill.nameEn) : [job.category || 'Part-time']).map((tag) => <span key={tag} className="rounded-md bg-[#eef5ff] px-2 py-1 text-[11px] font-bold text-[#075bf2]">{tag}</span>)}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-[#092152]">{formatJobRate(job)}</span>
                        <span className="rounded-lg bg-[#075bf2] px-4 py-2 text-xs font-black text-white">{t.apply}</span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="px-4 pb-8 md:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#092152]">{t.howTitle}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {steps.map(([title, body], index) => (
              <div key={title} className="grid gap-3 rounded-xl bg-[#f8fbff] p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f1ff] text-sm font-black text-[#075bf2]">{index + 1}</div>
                <div className="text-sm font-black text-[#092152]">{title}</div>
                <p className="text-xs font-semibold leading-5 text-[#60749b]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="for-employers" className="px-4 pb-10 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-[#075bf2]">For Employers</p>
            <h2 className="mt-2 max-w-xl text-3xl font-black leading-tight text-[#092152]">{t.employerTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#60749b]">{t.employerSubtitle}</p>
            <div className="mt-4 grid gap-2 text-sm font-bold text-[#1b3c72] sm:grid-cols-2">
              {['Post a job in minutes', 'Reach thousands of part-timers', 'Send WhatsApp offers', 'Track interested replies'].map((item) => <div key={item}>+ {item}</div>)}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register/employer" className="rounded-xl bg-[#075bf2] px-5 py-3 text-sm font-black text-white">{t.postJob}</Link>
              <Link href="/employer" className="rounded-xl border border-blue-200 px-5 py-3 text-sm font-black text-[#075bf2]">{t.learnMore}</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-[#eaf4ff] p-6 shadow-sm">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-3 h-3 w-24 rounded-full bg-blue-100" />
              {JOB_CATEGORIES.slice(0, 5).map((category, index) => (
                <div key={category} className="mb-3 flex items-center gap-3 rounded-xl border border-blue-50 p-3">
                  <div className="h-10 w-10 rounded-full bg-[#eef5ff]" />
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded-full bg-[#d9e8ff]" />
                    <div className="mt-2 h-2 w-20 rounded-full bg-[#edf4ff]" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{index + 2}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#021a4a] px-4 py-8 text-white md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_1fr_1fr_1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2 text-xl font-black"><span className="rounded-lg bg-[#075bf2] px-2 py-1">P</span>Partime</div>
            <p className="mt-3 text-sm text-blue-100">Connecting part-timers with real opportunities, and employers with reliable talent.</p>
            <div className="mt-4 flex gap-3 text-sm font-black text-blue-100">fb x in</div>
          </div>
          <FooterGroup title="For Part-timers" links={['Browse Jobs', 'How it Works', 'Safety Tips', 'Help Center']} />
          <FooterGroup title="For Employers" links={['Post a Job', 'How it Works', 'Pricing', 'Employer Resources']} />
          <FooterGroup title="Company" links={['About Us', 'Careers', 'Blog', 'Contact Us']} />
          <div>
            <div className="text-sm font-black">Stay updated</div>
            <p className="mt-2 text-sm text-blue-100">Subscribe to get the latest jobs and career tips.</p>
            <form className="mt-3 flex gap-2">
              <input className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-blue-100" placeholder="Enter your email" />
              <button className="rounded-lg bg-[#075bf2] px-4 py-2 text-sm font-black" type="button">Subscribe</button>
            </form>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SearchField({ label, name, placeholder, defaultValue }: { label: string; name: string; placeholder: string; defaultValue: string }) {
  return (
    <div>
      <label className="text-xs font-bold text-[#213964]">{label}</label>
      <input className="input mt-1 border-blue-100 bg-white" name={name} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}

function Stat({ label, value, accent, hint }: { label: string; value: number | string; accent: 'blue' | 'green' | 'orange' | 'violet'; hint?: string }) {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', orange: 'bg-orange-50 text-orange-700', violet: 'bg-violet-50 text-violet-700' };
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`h-10 w-10 rounded-xl ${colors[accent]}`} />
        <span>
          <span className="block text-2xl font-black text-[#092152]">{typeof value === 'number' ? formatCount(value) : value}</span>
          <span className="block text-xs font-bold text-[#60749b]">{label}</span>
        </span>
        {hint && <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{hint}</span>}
      </div>
    </div>
  );
}

function FooterGroup({ title, links }: { title: string; links: string[] }) {
  return <div><div className="text-sm font-black">{title}</div><div className="mt-3 grid gap-2 text-sm text-blue-100">{links.map((link) => <span key={link}>{link}</span>)}</div></div>;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-MY').format(value);
}

function jobImage(job: Awaited<ReturnType<typeof listPublicJobs>>[number], index: number): string {
  return job.coverImageUrl || job.media.find((media) => media.mediaType === 'IMAGE')?.url || fallbackImages[index % fallbackImages.length];
}
