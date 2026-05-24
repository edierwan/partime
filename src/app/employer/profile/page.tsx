import Link from 'next/link';
import { MalaysiaAddressFields } from '@/components/location/MalaysiaAddressFields';
import { employerStatusMeta, requireEmployerPortalContext } from '@/lib/employer-portal';
import { formatMalaysiaPhoneDisplay } from '@/lib/staff';
import { saveEmployerProfile } from './actions';

const INDUSTRIES = ['Event', 'Retail', 'F&B', 'Construction', 'Maintenance', 'Logistics', 'Warehouse', 'Cleaning', 'Other'];

export default async function EmployerProfilePage(props: { searchParams: Promise<{ saved?: string; resubmitted?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const context = await requireEmployerPortalContext();
  const statusMeta = employerStatusMeta(context.accountStatus);
  const statusToneClass = statusMeta.tone === 'green'
    ? 'bg-emerald-100 text-emerald-900'
    : statusMeta.tone === 'rose'
      ? 'bg-rose-100 text-rose-900'
      : statusMeta.tone === 'ink'
        ? 'bg-ink-100 text-ink-900'
        : 'bg-amber-100 text-amber-900';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="sectiontitle">Company Profile</h1>
          <p className="subtitle">Kemaskini maklumat syarikat dan status kelulusan majikan anda.</p>
        </div>
        <Link href="/employer/dashboard" className="text-sm font-semibold text-brand-700 hover:underline">Back to dashboard</Link>
      </div>

      {searchParams.saved === '1' ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Profil syarikat berjaya dikemas kini.</div> : null}
      {searchParams.resubmitted === '1' ? <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Profil dikemas kini dan dihantar semula untuk semakan.</div> : null}
      {searchParams.error === 'invalid' ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Sila lengkapkan semua medan wajib sebelum menyimpan profil syarikat.</div> : null}
      {searchParams.error === 'email' ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Sila masukkan emel yang sah.</div> : null}
      {searchParams.error === 'location' ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Sila semak semula negeri, bandar, dan poskod syarikat anda.</div> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-ink-200 bg-white p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)]">
          <div className="text-sm font-bold text-ink-500">Approval status</div>
          <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusToneClass}`}>{statusMeta.label}</div>
          <p className="mt-3 text-sm leading-6 text-ink-600">{statusMeta.description}</p>
          {context.registration?.rejectionReason ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Rejection reason: {context.registration.rejectionReason}</div> : null}
          {context.accountStatus === 'REJECTED' ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Kemaskini nama syarikat, nombor pendaftaran, butiran contact, alamat, dan logo jika diminta. Simpan profil untuk hantar semula kepada pasukan semakan.</div> : null}
          <div className="mt-5 space-y-3 rounded-2xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-600">
            <div><span className="font-semibold text-ink-900">Profile completion:</span> {context.profileCompletionPercentage}%</div>
            <div><span className="font-semibold text-ink-900">Contact person:</span> {context.registration?.contactPersonName || '-'}</div>
            <div><span className="font-semibold text-ink-900">Phone:</span> {formatMalaysiaPhoneDisplay(context.tenant.phoneE164 || context.registration?.contactPhoneE164)}</div>
            <div><span className="font-semibold text-ink-900">Email:</span> {context.tenant.email || context.registration?.contactEmail || '-'}</div>
            <div><span className="font-semibold text-ink-900">Logo:</span> {context.tenant.logoUrl ? <a className="font-semibold text-brand-700 hover:underline" href={context.tenant.logoUrl} target="_blank" rel="noreferrer">Current uploaded logo</a> : 'Not uploaded yet'}</div>
          </div>
        </section>

        <form action={saveEmployerProfile} encType="multipart/form-data" className="rounded-3xl border border-ink-200 bg-white p-5 shadow-[0_18px_40px_rgba(20,65,130,0.08)] space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company / Business Name" name="companyName" defaultValue={context.tenant.name} required />
            <Field label="Business Registration No." name="businessRegistrationNo" defaultValue={context.tenant.registrationNo || context.registration?.businessRegistrationNo || ''} />
            <Field label="Contact Person Name" name="contactPersonName" defaultValue={context.registration?.contactPersonName || ''} required />
            <Field label="Contact Phone Number" name="contactPhone" defaultValue={formatMalaysiaPhoneDisplay(context.tenant.phoneE164 || context.registration?.contactPhoneE164)} required />
            <Field label="Contact Email" name="contactEmail" defaultValue={context.tenant.email || context.registration?.contactEmail || ''} />
            <div>
              <label className="label">Industry</label>
              <select className="input" name="industry" defaultValue={context.tenant.businessType || context.registration?.industry || ''}>
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Company Logo</label>
            <input className="input px-3 py-2" name="companyLogo" type="file" accept="image/jpeg,image/png,image/webp" />
            <p className="mt-1 text-xs text-ink-500">Upload JPG, PNG, or WEBP up to 2MB.</p>
          </div>

          <MalaysiaAddressFields
            names={{
              addressLine1: 'addressLine1',
              addressLine2: 'addressLine2',
              stateCode: 'stateCode',
              stateName: 'state',
              cityName: 'city',
              postcode: 'postcode',
              country: 'country',
            }}
            labels={{
              addressLine1: 'Company Address',
              addressLine2: 'Address Line 2 (Optional)',
              state: 'State',
              city: 'City',
              postcode: 'Postcode',
              country: 'Country',
              selectState: 'Select state',
              cityPlaceholder: 'e.g. Shah Alam',
              postcodePlaceholder: 'e.g. 40100',
              customCityHint: 'If the city is missing, type it manually.',
            }}
            required={{ addressLine1: true, state: true, city: true, postcode: true }}
            initialValue={{
              addressLine1: context.tenant.addressLine1 || context.registration?.addressLine1,
              addressLine2: context.tenant.addressLine2 || context.registration?.addressLine2,
              stateCode: context.tenant.stateCode || context.registration?.stateCode,
              stateName: context.tenant.state || context.registration?.state,
              cityName: context.tenant.city || context.registration?.city,
              postcode: context.tenant.postcode || context.registration?.postcode,
              country: context.tenant.country || context.registration?.country || 'Malaysia',
            }}
            titleCaseAddressLines
            disableBrowserAutocomplete
            autocompletePrefix="partimeEmployerProfile"
            autoResolvePostcodeFromCity
          />

          <div className="flex justify-end gap-3">
            <Link href="/employer/dashboard" className="btn-ghost">Cancel</Link>
            <button type="submit" className="btn-primary">Save Company Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, required = false }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return <div><label className="label">{label}{required ? ' *' : ''}</label><input className="input" name={name} defaultValue={defaultValue} required={required} /></div>;
}