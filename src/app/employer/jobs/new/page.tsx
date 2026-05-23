import Link from 'next/link';
import { prisma } from '@/lib/db';
import { JOB_CATEGORIES, MALAYSIA_STATES } from '@/lib/marketplace';
import { createEmployerJob } from '../actions';

export default async function NewEmployerJobPage({ searchParams }: { searchParams: { error?: string } }) {
  const skills = await prisma.skill.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }], take: 80 });
  return (
    <div className="space-y-5">
      <div><Link href="/employer/jobs" className="text-sm text-brand-700 hover:underline">Back to jobs</Link><h1 className="sectiontitle mt-2">Post job</h1><p className="subtitle">Create a public job and keep attendance/payroll ready for confirmed workers.</p></div>
      {searchParams.error === 'invalid' && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Check required fields and try again.</div>}
      <form action={createEmployerJob} encType="multipart/form-data" className="card card-pad grid gap-4 md:grid-cols-2">
        <Field label="Job title" name="name" placeholder="Weekend roadshow crew" required />
        <Field label="Venue / location" name="location" placeholder="Mid Valley Megamall" required />
        <div><label className="label">Category</label><select className="input" name="category"><option value="">Select category</option>{JOB_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
        <div><label className="label">State</label><select className="input" name="state"><option value="">Select state</option>{MALAYSIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></div>
        <Field label="City" name="city" placeholder="Kuala Lumpur" />
        <Field label="Address" name="address" placeholder="Full reporting address" />
        <Field label="Work date" name="workDate" type="date" required />
        <Field label="Start time" name="startTime" type="time" />
        <Field label="End time" name="endTime" type="time" />
        <Field label="Headcount" name="headcount" type="number" defaultValue="1" required />
        <div><label className="label">Pay type</label><select className="input" name="payType" defaultValue="HOURLY"><option value="HOURLY">Hourly</option><option value="DAILY">Daily</option><option value="FIXED">Fixed</option></select></div>
        <Field label="Rate (RM)" name="defaultRate" inputMode="decimal" placeholder="15.00" required />
        <div className="md:col-span-2"><label className="label">Summary</label><input className="input" name="summary" maxLength={220} placeholder="Short card summary for marketplace search" /></div>
        <div className="md:col-span-2"><label className="label">Description</label><textarea className="input min-h-[140px]" name="description" placeholder="Role details, requirements, reporting notes" /></div>
        <div><label className="label">Dress code</label><input className="input" name="dressCode" placeholder="Black shirt, long pants, covered shoes" /></div>
        <div><label className="label">Tools needed</label><input className="input" name="toolsNeeded" placeholder="Bring IC, safety boots, own phone" /></div>
        <div><label className="label">Cover image</label><input className="input" name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" /></div>
        <div><label className="label">Gallery media</label><input className="input" name="galleryMedia" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple /></div>
        <div className="md:col-span-2"><label className="label">Skills</label><div className="grid gap-2 rounded-lg border border-ink-200 p-3 sm:grid-cols-2 lg:grid-cols-3">{skills.map((skill) => <label key={skill.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="skillIds" value={skill.id} />{skill.nameEn}</label>)}</div></div>
        <div><label className="label">Publish status</label><select className="input" name="jobStatus" defaultValue="OPEN"><option value="OPEN">Open</option><option value="DRAFT">Draft</option></select></div>
        <label className="flex items-center gap-2 self-end rounded-lg border border-ink-200 px-3 py-2 text-sm"><input type="checkbox" name="publicVisible" defaultChecked />Visible on marketplace</label>
        <div className="md:col-span-2 flex justify-end gap-2"><Link href="/employer/jobs" className="btn-ghost">Cancel</Link><button className="btn-primary" type="submit">Create job</button></div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', placeholder, required, defaultValue, inputMode }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string; inputMode?: 'text' | 'decimal' | 'numeric' }) {
  return <div><label className="label">{label}{required ? ' *' : ''}</label><input className="input" name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} inputMode={inputMode} /></div>;
}