import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminLocationsPage() {
  const [states, cityCount, postcodeCount] = await Promise.all([
    prisma.malaysiaState.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            cities: true,
            postcodes: true,
          },
        },
      },
    }),
    prisma.malaysiaCity.count({ where: { active: true } }),
    prisma.malaysiaPostcode.count({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sectiontitle">Malaysia locations</h1>
        <p className="subtitle">Read-only master data used by employer registration, part-timer registration, job posting, and postcode autocomplete.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="States" value={String(states.length)} />
        <StatCard label="Cities" value={String(cityCount)} />
        <StatCard label="Postcodes" value={String(postcodeCount)} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 p-4 font-semibold">Seeded coverage</div>
        <table className="table-base">
          <thead>
            <tr>
              <th>State code</th>
              <th>State name</th>
              <th>Cities</th>
              <th>Postcodes</th>
            </tr>
          </thead>
          <tbody>
            {states.map((state) => (
              <tr key={state.id}>
                <td>{state.code}</td>
                <td>{state.name}</td>
                <td>{state._count.cities}</td>
                <td>{state._count.postcodes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card card-pad space-y-1">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="text-3xl font-semibold text-ink-950">{value}</div>
    </div>
  );
}