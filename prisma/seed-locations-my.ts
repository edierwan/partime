import type { PrismaClient } from '@prisma/client';

type PostcodeSeed = string | { postcode: string; placeName?: string };
type CitySeed = { name: string; postcodes: PostcodeSeed[] };
type StateSeed = { code: string; name: string; cities: CitySeed[] };

const MALAYSIA_LOCATION_SEED: StateSeed[] = [
  {
    code: 'JHR',
    name: 'Johor',
    cities: [
      { name: 'Johor Bahru', postcodes: ['80000', '80100', '80200', '80300'] },
      { name: 'Skudai', postcodes: ['81300'] },
      { name: 'Kulai', postcodes: ['81000'] },
      { name: 'Pasir Gudang', postcodes: ['81700'] },
      { name: 'Batu Pahat', postcodes: ['83000'] },
      { name: 'Muar', postcodes: ['84000'] },
      { name: 'Kluang', postcodes: ['86000'] },
    ],
  },
  {
    code: 'KDH',
    name: 'Kedah',
    cities: [
      { name: 'Alor Setar', postcodes: ['05000', '05100'] },
      { name: 'Sungai Petani', postcodes: ['08000', '08010'] },
      { name: 'Kulim', postcodes: ['09000'] },
      { name: 'Langkawi', postcodes: ['07000'] },
    ],
  },
  {
    code: 'KTN',
    name: 'Kelantan',
    cities: [
      { name: 'Kota Bharu', postcodes: ['15000', '15150', '15200'] },
      { name: 'Pasir Mas', postcodes: ['17000'] },
      { name: 'Kuala Krai', postcodes: ['18000'] },
    ],
  },
  {
    code: 'MLK',
    name: 'Melaka',
    cities: [
      { name: 'Melaka City', postcodes: ['75000', '75200', '75300'] },
      { name: 'Ayer Keroh', postcodes: ['75450'] },
      { name: 'Alor Gajah', postcodes: ['78000'] },
    ],
  },
  {
    code: 'NSN',
    name: 'Negeri Sembilan',
    cities: [
      { name: 'Seremban', postcodes: ['70000', '70200', '70300'] },
      { name: 'Nilai', postcodes: ['71800'] },
      { name: 'Port Dickson', postcodes: ['71000'] },
    ],
  },
  {
    code: 'PHG',
    name: 'Pahang',
    cities: [
      { name: 'Kuantan', postcodes: ['25000', '25200', '25300'] },
      { name: 'Temerloh', postcodes: ['28000'] },
      { name: 'Bentong', postcodes: ['28700'] },
    ],
  },
  {
    code: 'PRK',
    name: 'Perak',
    cities: [
      { name: 'Ipoh', postcodes: ['30000', '30100', '30200', '31400'] },
      { name: 'Taiping', postcodes: ['34000'] },
      { name: 'Teluk Intan', postcodes: ['36000'] },
      { name: 'Seri Manjung', postcodes: ['32040'] },
    ],
  },
  {
    code: 'PLS',
    name: 'Perlis',
    cities: [
      { name: 'Kangar', postcodes: ['01000'] },
      { name: 'Arau', postcodes: ['02600'] },
    ],
  },
  {
    code: 'PNG',
    name: 'Pulau Pinang',
    cities: [
      { name: 'George Town', postcodes: ['10000', '10100', '10200', '10400'] },
      { name: 'Bayan Lepas', postcodes: ['11900', '11950'] },
      { name: 'Butterworth', postcodes: ['12000', '12100'] },
      { name: 'Bukit Mertajam', postcodes: ['14000'] },
    ],
  },
  {
    code: 'SBH',
    name: 'Sabah',
    cities: [
      { name: 'Kota Kinabalu', postcodes: ['88000', '88300'] },
      { name: 'Sandakan', postcodes: ['90000'] },
      { name: 'Tawau', postcodes: ['91000'] },
      { name: 'Lahad Datu', postcodes: ['91100'] },
    ],
  },
  {
    code: 'SWK',
    name: 'Sarawak',
    cities: [
      { name: 'Kuching', postcodes: ['93000', '93100'] },
      { name: 'Sibu', postcodes: ['96000'] },
      { name: 'Bintulu', postcodes: ['97000'] },
      { name: 'Miri', postcodes: ['98000'] },
    ],
  },
  {
    code: 'SGR',
    name: 'Selangor',
    cities: [
      { name: 'Shah Alam', postcodes: ['40000', '40100', '40400', { postcode: '40604', placeName: 'Seksyen 14' }] },
      { name: 'Klang', postcodes: ['41000', '41100', '41200', '41300'] },
      { name: 'Petaling Jaya', postcodes: ['46000', '46150', '46200', '46300'] },
      { name: 'Subang Jaya', postcodes: ['47500', '47600'] },
      { name: 'Puchong', postcodes: ['47100', '47110', '47120'] },
      { name: 'Kajang', postcodes: ['43000', '43200'] },
      { name: 'Rawang', postcodes: ['48000'] },
      { name: 'Sepang', postcodes: ['43900'] },
      { name: 'Batu Caves', postcodes: ['68100'] },
      { name: 'Cyberjaya', postcodes: ['63000'] },
    ],
  },
  {
    code: 'TRG',
    name: 'Terengganu',
    cities: [
      { name: 'Kuala Terengganu', postcodes: ['20000', '20100', '20200'] },
      { name: 'Dungun', postcodes: ['23000'] },
      { name: 'Kemaman', postcodes: ['24000'] },
    ],
  },
  {
    code: 'KUL',
    name: 'Kuala Lumpur',
    cities: [
      { name: 'Kuala Lumpur', postcodes: ['50000', '50100', '50200', '50450', '50782'] },
      { name: 'Brickfields', postcodes: ['50470'] },
      { name: 'Cheras', postcodes: ['56000'] },
      { name: 'Setapak', postcodes: ['53300'] },
      { name: 'Kepong', postcodes: ['52100'] },
    ],
  },
  {
    code: 'PJY',
    name: 'Putrajaya',
    cities: [
      { name: 'Putrajaya', postcodes: ['62000', '62100', '62250', '62300', '62502'] },
    ],
  },
  {
    code: 'LBN',
    name: 'Labuan',
    cities: [
      { name: 'Labuan', postcodes: ['87000', '87010'] },
    ],
  },
];

export function normalizeMalaysiaLocationName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export async function seedMalaysiaLocations(prisma: PrismaClient) {
  for (const [stateIndex, state] of MALAYSIA_LOCATION_SEED.entries()) {
    const savedState = await prisma.malaysiaState.upsert({
      where: { code: state.code },
      update: { name: state.name, sortOrder: stateIndex, active: true },
      create: { code: state.code, name: state.name, sortOrder: stateIndex, active: true },
      select: { id: true },
    });

    for (const city of state.cities) {
      const normalizedName = normalizeMalaysiaLocationName(city.name);
      const savedCity = await prisma.malaysiaCity.upsert({
        where: { stateId_normalizedName: { stateId: savedState.id, normalizedName } },
        update: { name: city.name, active: true },
        create: { stateId: savedState.id, name: city.name, normalizedName, active: true },
        select: { id: true },
      });

      for (const entry of city.postcodes) {
        const postcode = typeof entry === 'string' ? entry : entry.postcode;
        const placeName = typeof entry === 'string' ? city.name : entry.placeName || city.name;
        await prisma.malaysiaPostcode.upsert({
          where: { postcode },
          update: { stateId: savedState.id, cityId: savedCity.id, placeName, active: true },
          create: { stateId: savedState.id, cityId: savedCity.id, postcode, placeName, active: true },
        });
      }
    }
  }
}