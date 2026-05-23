import { redirect } from 'next/navigation';

export default async function EmployerRegistrationsAliasPage(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> }
) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  redirect(`/admin/employers${params.size ? `?${params.toString()}` : ''}`);
}
