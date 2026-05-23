import { prisma } from '@/lib/db';

export const MALAYSIA_COUNTRY_NAME = 'Malaysia';

export interface MalaysiaStateOption {
  id: string;
  code: string;
  name: string;
}

export interface MalaysiaCityOption {
  id: string;
  name: string;
}

export interface MalaysiaPostcodeSuggestion {
  postcode: string;
  stateCode: string;
  stateName: string;
  cityId: string | null;
  cityName: string | null;
  placeName: string | null;
  verified: boolean;
}

export interface ValidateMalaysiaLocationInput {
  stateCode?: string | null;
  stateName?: string | null;
  cityName?: string | null;
  postcode?: string | null;
  country?: string | null;
  requireState?: boolean;
  requireCity?: boolean;
  requirePostcode?: boolean;
  requireVerifiedPostcode?: boolean;
  allowCustomCity?: boolean;
}

export type ValidateMalaysiaLocationResult =
  | {
      ok: true;
      data: {
        stateCode: string;
        stateName: string;
        cityName: string;
        postcode: string | null;
        country: string;
        preferredLocation: string | null;
        verifiedPostcode: boolean;
      };
      warning?: string;
    }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      warning?: string;
    };

export function normalizeMalaysiaLocationName(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizePostcode(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '').slice(0, 5);
}

export function buildMalaysiaLocationLabel(input: { cityName?: string | null; stateName?: string | null; postcode?: string | null }): string | null {
  const city = String(input.cityName || '').trim();
  const state = String(input.stateName || '').trim();
  const postcode = String(input.postcode || '').trim();
  const parts = [city, state].filter(Boolean);
  if (postcode) parts.push(postcode);
  return parts.length ? parts.join(', ') : null;
}

export async function listMalaysiaStates(): Promise<MalaysiaStateOption[]> {
  return prisma.malaysiaState.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, code: true, name: true },
  });
}

export async function listMalaysiaCities(stateCode: string): Promise<MalaysiaCityOption[]> {
  const code = String(stateCode || '').trim().toUpperCase();
  if (!code) return [];

  const state = await prisma.malaysiaState.findUnique({ where: { code }, select: { id: true } });
  if (!state) return [];

  return prisma.malaysiaCity.findMany({
    where: { stateId: state.id, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

export async function searchMalaysiaPostcodes({
  query,
  stateCode,
  cityName,
  limit = 10,
}: {
  query?: string | null;
  stateCode?: string | null;
  cityName?: string | null;
  limit?: number;
}): Promise<MalaysiaPostcodeSuggestion[]> {
  const postcodeQuery = normalizePostcode(query);
  const trimmedStateCode = String(stateCode || '').trim().toUpperCase();
  const normalizedCityName = normalizeMalaysiaLocationName(String(cityName || ''));
  if (!postcodeQuery && !(trimmedStateCode && normalizedCityName)) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 20);

  const where: any = {
    active: true,
  };

  if (postcodeQuery) {
    where.postcode = { startsWith: postcodeQuery };
  }

  if (trimmedStateCode) {
    where.state = { code: trimmedStateCode };
  }

  if (normalizedCityName) {
    where.OR = [
      { city: { normalizedName: normalizedCityName } },
      { placeName: { contains: String(cityName || '').trim(), mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.malaysiaPostcode.findMany({
    where,
    orderBy: { postcode: 'asc' },
    take: safeLimit,
    select: {
      postcode: true,
      placeName: true,
      state: { select: { code: true, name: true } },
      city: { select: { id: true, name: true } },
    },
  });

  return rows.map((row) => ({
    postcode: row.postcode,
    stateCode: row.state.code,
    stateName: row.state.name,
    cityId: row.city?.id || null,
    cityName: row.city?.name || null,
    placeName: row.placeName || null,
    verified: true,
  }));
}

export async function validateMalaysiaLocation(input: ValidateMalaysiaLocationInput): Promise<ValidateMalaysiaLocationResult> {
  const requireState = input.requireState ?? true;
  const requireCity = input.requireCity ?? true;
  const requirePostcode = input.requirePostcode ?? true;
  const requireVerifiedPostcode = input.requireVerifiedPostcode ?? false;
  const allowCustomCity = input.allowCustomCity ?? true;

  const fieldErrors: Record<string, string> = {};
  const trimmedStateCode = String(input.stateCode || '').trim().toUpperCase();
  const trimmedStateName = String(input.stateName || '').trim();
  const trimmedCityName = String(input.cityName || '').trim();
  const postcode = normalizePostcode(input.postcode);

  if (requireState && !trimmedStateCode) {
    const message = trimmedCityName ? 'Please select a valid state before choosing city.' : 'Select a valid Malaysian state';
    fieldErrors.stateCode = message;
    fieldErrors.state = message;
  }

  let stateRecord = trimmedStateCode
    ? await prisma.malaysiaState.findUnique({ where: { code: trimmedStateCode }, select: { code: true, name: true, id: true } })
    : null;

  if (trimmedStateCode && !stateRecord) {
    fieldErrors.stateCode = 'Select a valid Malaysian state';
    fieldErrors.state = 'Select a valid Malaysian state';
  }

  let resolvedCityName = trimmedCityName;
  if (requireCity && !trimmedCityName && !postcode) {
    fieldErrors.city = 'City is required';
  }

  let cityRecord: { id: string; name: string } | null = null;
  if (stateRecord && trimmedCityName) {
    cityRecord = await prisma.malaysiaCity.findFirst({
      where: { stateId: stateRecord.id, normalizedName: normalizeMalaysiaLocationName(trimmedCityName), active: true },
      select: { id: true, name: true },
    });
    if (cityRecord) {
      resolvedCityName = cityRecord.name;
    } else if (!allowCustomCity) {
      fieldErrors.city = 'City does not match the selected state.';
    }
  }

  if (requirePostcode && !postcode) {
    fieldErrors.postcode = 'Postcode is required';
  } else if (postcode && postcode.length !== 5) {
    fieldErrors.postcode = 'Postcode must be 5 digits';
  }

  let warning: string | undefined;
  let verifiedPostcode = false;
  if (postcode && postcode.length === 5) {
    const postcodeRecord = await prisma.malaysiaPostcode.findUnique({
      where: { postcode },
      select: {
        postcode: true,
        placeName: true,
        state: { select: { code: true, name: true } },
        city: { select: { name: true } },
      },
    });

    if (postcodeRecord) {
      verifiedPostcode = true;
      if (stateRecord && postcodeRecord.state.code !== stateRecord.code) {
        fieldErrors.postcode = 'Postcode does not match the selected state';
      }
      if (!stateRecord) {
        stateRecord = { code: postcodeRecord.state.code, name: postcodeRecord.state.name, id: '' };
      }

      const postcodeCityName = postcodeRecord.city?.name || postcodeRecord.placeName || '';
      if (trimmedCityName) {
        const normalizedSelectedCity = normalizeMalaysiaLocationName(trimmedCityName);
        const normalizedPostcodeCity = normalizeMalaysiaLocationName(postcodeCityName);
        if (postcodeCityName && normalizedSelectedCity !== normalizedPostcodeCity) {
          fieldErrors.postcode = fieldErrors.postcode || buildInvalidPostcodeMessage(trimmedCityName, stateRecord?.name || trimmedStateName || postcodeRecord.state.name);
        }
      } else if (postcodeCityName) {
        resolvedCityName = postcodeCityName;
      }
    } else {
      if (requireVerifiedPostcode) {
        fieldErrors.postcode = 'Postcode is not in the verified Malaysia postcode list.';
      } else {
        warning = 'Postcode is not in the verified Malaysia postcode list yet. It will be saved as entered.';
      }
    }
  }

  if (requireCity && !resolvedCityName) {
    fieldErrors.city = fieldErrors.city || 'City is required';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, warning };
  }

  const stateName = stateRecord?.name || trimmedStateName;
  return {
    ok: true,
    data: {
      stateCode: stateRecord?.code || trimmedStateCode,
      stateName,
      cityName: resolvedCityName,
      postcode: postcode || null,
      country: MALAYSIA_COUNTRY_NAME,
      preferredLocation: buildMalaysiaLocationLabel({ cityName: resolvedCityName, stateName, postcode }),
      verifiedPostcode,
    },
    warning,
  };
}

function buildInvalidPostcodeMessage(cityName: string, stateName: string): string {
  const location = [String(cityName || '').trim(), String(stateName || '').trim()].filter(Boolean).join(', ');
  return location ? `Please select a valid postcode for ${location}.` : 'Please select a valid postcode for the selected location.';
}