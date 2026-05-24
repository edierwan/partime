import Link from 'next/link';
import { MalaysiaAddressFields } from '@/components/location/MalaysiaAddressFields';
import { prisma } from '@/lib/db';
import { requireEmployerPortalContext } from '@/lib/employer-portal';
import { JOB_CATEGORIES } from '@/lib/marketplace';
import { createEmployerJob } from '../actions';

export default async function NewEmployerJobPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const context = await requireEmployerPortalContext();
  const skills = await prisma.skill.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }], take: 80 });
  const publishLocked = !context.canPublishJobs;

  return (
    <div className="space-y-5">
      <div><Link href="/employer/jobs" className="text-sm text-brand-700 hover:underline">Back to jobs</Link><h1 className="sectiontitle mt-2">Post job</h1><p className="subtitle">Create a public job and keep attendance/payroll ready for confirmed workers.</p></div>
      {searchParams.error === 'invalid' && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Check required fields and try again.</div>}
      {publishLocked ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Job boleh disimpan sebagai draft. Publish hanya dibenarkan selepas akaun majikan diluluskan.</div> : null}
      <form action={createEmployerJob} encType="multipart/form-data" className="card card-pad grid gap-4 md:grid-cols-2">
        <Field label="Job title" name="name" placeholder="Weekend roadshow crew" required />
        <Field label="Venue / location" name="location" placeholder="Mid Valley Megamall" required />
        <div><label className="label">Category</label><select className="input" name="category"><option value="">Select category</option>{JOB_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
        <div className="md:col-span-2">
          <MalaysiaAddressFields
            names={{
              addressLine1: 'address',
              addressLine2: 'addressLine2',
              stateCode: 'stateCode',
              stateName: 'state',
              cityName: 'city',
              postcode: 'postcode',
            }}
            labels={{
              addressLine1: 'Address line 1',
              addressLine2: 'Address line 2 (Optional)',
              state: 'State',
              city: 'City',
              postcode: 'Postcode',
              selectState: 'Select state',
              cityPlaceholder: 'e.g. Klang',
              postcodePlaceholder: 'e.g. 41000',
              customCityHint: 'If the city is missing, type it manually.',
            }}
            placeholders={{ addressLine1: 'Full reporting address', addressLine2: 'Suite, floor, or landmark' }}
            required={{ state: true, city: true, postcode: true }}
            initialValue={{ country: 'Malaysia' }}
            showCountry={false}
          />
        </div>
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
        <div><label className="label">Publish status</label><select className="input" name="jobStatus" defaultValue={publishLocked ? 'DRAFT' : 'OPEN'}><option value="DRAFT">Draft</option><option value="OPEN" disabled={publishLocked}>Open</option></select></div>
        <label className="flex items-center gap-2 self-end rounded-lg border border-ink-200 px-3 py-2 text-sm"><input type="checkbox" name="publicVisible" defaultChecked={!publishLocked} disabled={publishLocked} />Visible on marketplace</label>
        <div className="md:col-span-2 flex justify-end gap-2"><Link href="/employer/jobs" className="btn-ghost">Cancel</Link><button className="btn-primary" type="submit">{publishLocked ? 'Create draft' : 'Create job'}</button></div>
      </form>
    </div>
  );
}

function Field({ label, name, type = 'text', placeholder, required, defaultValue, inputMode }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string; inputMode?: 'text' | 'decimal' | 'numeric' }) {
  return <div><label className="label">{label}{required ? ' *' : ''}</label><input className="input" name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} inputMode={inputMode} /></div>;
}