import { PrismaClient, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { seedMalaysiaLocations } from './seed-locations-my';

const prisma = new PrismaClient();

const skillSeed = [
  { slug: 'technical', name: 'Technical', skills: ['Wiring', 'Aircond', 'Plumbing', 'Electrical', 'CCTV', 'Networking', 'General repair'] },
  { slug: 'general-work', name: 'General Work', skills: ['General helper', 'Event crew', 'Booth setup', 'Packing', 'Loading/unloading', 'Cleaning', 'Runner'] },
  { slug: 'sales-promotion', name: 'Sales & Promotion', skills: ['Promoter', 'Product demo', 'Sampling crew', 'Roadshow crew', 'Customer service'] },
  { slug: 'fb-hospitality', name: 'F&B / Hospitality', skills: ['Waiter', 'Kitchen helper', 'Barista helper', 'Cashier', 'Event server'] },
  { slug: 'warehouse-logistics', name: 'Warehouse / Logistics', skills: ['Picker/packer', 'Stock count', 'Delivery assistant', 'Lalamove/runner coordination'] },
  { slug: 'admin-data', name: 'Admin / Data', skills: ['Data entry', 'Registration counter', 'Queue management', 'Admin assistant'] },
];

function token(len = 10) {
  return crypto.randomBytes(len).toString('base64url').slice(0, len).toUpperCase();
}

function mytMidnight(date: Date) {
  // Convert "today in MYT" to a UTC Date at MYT 00:00.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const [y, m, d] = fmt.format(date).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, -8, 0, 0)); // MYT = UTC+8
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  let admin = existing;
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    admin = await prisma.adminUser.create({
      data: { email, passwordHash, name: 'Admin' },
    });
    console.log(`✓ Created admin ${email}`);
  } else {
    console.log(`= Admin ${email} already exists, skipping.`);
  }
  if (admin) await ensureCanonicalAdminAccount(admin);


async function ensureCanonicalAdminAccount(admin: { id: string; email: string; passwordHash: string; name: string | null; createdAt: Date; platformRole: string }) {
  try {
    const userId = `user_admin_${admin.id}`;
    const now = new Date();
    await prisma.userAccount.upsert({
      where: { id: userId },
      update: { displayName: admin.name || admin.email, status: 'ACTIVE' },
      create: {
        id: userId,
        displayName: admin.name || admin.email,
        status: 'ACTIVE',
        preferredLocale: 'ms',
        createdAt: admin.createdAt,
        updatedAt: now,
      },
    });
    await prisma.userIdentity.upsert({
      where: { type_valueNormalized: { type: 'EMAIL', valueNormalized: admin.email.toLowerCase() } },
      update: { userId, valueDisplay: admin.email, isPrimary: true },
      create: {
        userId,
        type: 'EMAIL',
        valueNormalized: admin.email.toLowerCase(),
        valueDisplay: admin.email,
        verifiedAt: admin.createdAt,
        isPrimary: true,
      },
    });
    await prisma.userCredential.upsert({
      where: { userId },
      update: { passwordHash: admin.passwordHash, forcePasswordReset: false, failedLoginCount: 0, lockedUntil: null },
      create: { userId, passwordHash: admin.passwordHash, passwordUpdatedAt: admin.createdAt, forcePasswordReset: false },
    });
    await prisma.platformUserRole.upsert({
      where: { userId_role: { userId, role: 'PLATFORM_ADMIN' } },
      update: {},
      create: { userId, role: 'PLATFORM_ADMIN' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/UserAccount|UserIdentity|UserCredential|PlatformUserRole|does not exist|not exist/i.test(message)) throw error;
    console.log('= Canonical admin account skipped until auth migrations are applied.');
  }
}
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'platform-default' },
    update: {},
    create: {
      name: 'Partime Platform Default',
      slug: 'platform-default',
      phoneE164: '+60000000000',
      email: 'admin@partime.local',
      country: 'Malaysia',
      status: 'ACTIVE',
    },
  });

  await seedMalaysiaLocations(prisma);
  console.log('= Malaysia location master data seeded.');

  for (const [categoryIndex, category] of skillSeed.entries()) {
    const savedCategory = await prisma.skillCategory.upsert({
      where: { slug: category.slug },
      update: { nameMs: category.name, nameId: category.name, nameEn: category.name, active: true, sortOrder: categoryIndex },
      create: { slug: category.slug, nameMs: category.name, nameId: category.name, nameEn: category.name, active: true, sortOrder: categoryIndex },
    });
    for (const [skillIndex, skill] of category.skills.entries()) {
      const slug = skill.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await prisma.skill.upsert({
        where: { slug },
        update: { categoryId: savedCategory.id, nameMs: skill, nameId: skill, nameEn: skill, active: true, sortOrder: skillIndex },
        create: { categoryId: savedCategory.id, slug, nameMs: skill, nameId: skill, nameEn: skill, active: true, sortOrder: skillIndex },
      });
    }
  }

  if (process.env.SEED_SAMPLE_DATA !== 'true') {
    console.log('Sample data skipped (set SEED_SAMPLE_DATA=true to add).');
    return;
  }

  const staffCount = await prisma.staff.count();
  if (staffCount > 0) {
    console.log('= Staff already exist, sample data skipped.');
    return;
  }

  const sampleStaff = [
    {
      payName: 'aiman.h',
      aliasPanggilan: 'AIMANHK01',
      fullName: 'Aiman Hakim',
      gender: 'LELAKI' as const,
      phoneE164: '+60123456789',
      phoneDisplay: '+60 12-345 6789',
      bankCode: 'MAYBANK',
      bankName: 'Maybank',
      bankAccountNumber: '512345678901',
      approvalStatus: 'APPROVED' as const,
      status: 'ACTIVE' as const,
      nationality: 'Malaysia',
      state: 'Kuala Lumpur',
      city: 'Kuala Lumpur',
      bio: 'Experienced in roadshows, registration counters and event setup.',
      experienceSummary: 'Roadshows, booth setup, queue management',
      expectedRateCents: 1800,
      publicProfile: true,
      active: true,
    },
    {
      payName: 'nur.sya',
      aliasPanggilan: 'NURSYA01',
      fullName: 'Nur Syafiqah',
      gender: 'PEREMPUAN' as const,
      phoneE164: '+60132233445',
      phoneDisplay: '+60 13-223 3445',
      bankCode: 'CIMB',
      bankName: 'CIMB Bank',
      bankAccountNumber: '860123456789',
      approvalStatus: 'APPROVED' as const,
      status: 'ACTIVE' as const,
      nationality: 'Malaysia',
      state: 'Selangor',
      city: 'Petaling Jaya',
      bio: 'Friendly promoter and product sampling crew for mall activations.',
      experienceSummary: 'Product demo, sampling, customer service',
      expectedRateCents: 1700,
      publicProfile: true,
      active: true,
    },
    {
      payName: 'daniel.l',
      aliasPanggilan: 'DANIEL02',
      fullName: 'Daniel Lee',
      gender: 'LELAKI' as const,
      phoneE164: '+60169876543',
      phoneDisplay: '+60 16-987 6543',
      bankCode: 'MAYBANK',
      bankName: 'Maybank',
      bankAccountNumber: '514433221100',
      approvalStatus: 'APPROVED' as const,
      status: 'ACTIVE' as const,
      nationality: 'Malaysia',
      state: 'Kuala Lumpur',
      city: 'Cheras',
      bio: 'Reliable runner and warehouse assistant for weekend shifts.',
      experienceSummary: 'Picker/packer, runner, loading/unloading',
      expectedRateCents: 1600,
      publicProfile: true,
      active: true,
    },
    {
      payName: 'siti.a',
      aliasPanggilan: 'SITIA03',
      fullName: 'Siti Aisyah',
      gender: 'PEREMPUAN' as const,
      phoneE164: '+60112233445',
      phoneDisplay: '+60 11-2233 3445',
      bankCode: 'BANK_ISLAM',
      bankName: 'Bank Islam',
      bankAccountNumber: '860112233344',
      approvalStatus: 'APPROVED' as const,
      status: 'ACTIVE' as const,
      nationality: 'Malaysia',
      state: 'Selangor',
      city: 'Shah Alam',
      bio: 'F&B and hospitality support with registration counter experience.',
      experienceSummary: 'Event server, cashier, registration counter',
      expectedRateCents: 1600,
      publicProfile: true,
      active: true,
    },
    {
      payName: 'arif.d',
      aliasPanggilan: 'ARIFD04',
      fullName: 'Arif Danial',
      gender: 'LELAKI' as const,
      phoneE164: '+60177889900',
      phoneDisplay: '+60 17-788 9900',
      approvalStatus: 'PENDING_REVIEW' as const,
      status: 'PENDING_REVIEW' as const,
      nationality: 'Malaysia',
      state: 'Selangor',
      city: 'Subang Jaya',
      bio: 'New applicant pending review.',
      expectedRateCents: 1500,
      publicProfile: false,
      active: true,
    },
  ];
  await prisma.staff.createMany({ data: sampleStaff });
  console.log(`✓ Inserted ${sampleStaff.length} sample staff`);

  const today = mytMidnight(new Date());
  const promoterSkill = await prisma.skill.findUnique({ where: { slug: 'promoter' } });
  const eventCrewSkill = await prisma.skill.findUnique({ where: { slug: 'event-crew' } });
  const setupSkill = await prisma.skill.findUnique({ where: { slug: 'booth-setup' } });
  const event = await prisma.workEvent.create({
    data: {
      name: 'Mid Valley Promo',
      slug: 'mid-valley-promo',
      tenantId: tenant.id,
      location: 'Mid Valley Megamall, KL',
      state: 'Kuala Lumpur',
      city: 'Kuala Lumpur',
      category: 'Promotions',
      summary: 'Weekend product promoter for a mall activation booth.',
      description: 'Assist product demo, sampling, visitor engagement and booth closing checklist. Black pants and plain dark shoes required.',
      jobType: 'EVENT',
      jobStatus: 'OPEN',
      workDate: today,
      startTime: '10:00',
      endTime: '22:00',
      headcount: 6,
      payType: 'HOURLY',
      defaultRateCents: 2000,
      minRateCents: 1800,
      maxRateCents: 2200,
      publicVisible: true,
      autoBreakRule: true,
      active: true,
      scanToken: token(10),
      notes: 'Sample seeded event',
      skills: {
        create: [promoterSkill, eventCrewSkill, setupSkill].filter(Boolean).map((skill) => ({ skillId: skill!.id })),
      },
    },
  });
  console.log(`✓ Created sample event "${event.name}" — token ${event.scanToken}`);

  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const warehouseSkill = await prisma.skill.findUnique({ where: { slug: 'picker-packer' } });
  const runnerSkill = await prisma.skill.findUnique({ where: { slug: 'runner' } });
  const warehouseJob = await prisma.workEvent.create({
    data: {
      name: 'Shah Alam Warehouse Packing Crew',
      slug: 'shah-alam-warehouse-packing-crew',
      tenantId: tenant.id,
      location: 'Seksyen 15, Shah Alam',
      state: 'Selangor',
      city: 'Shah Alam',
      category: 'Warehouse',
      summary: 'Packing and stock count crew for a one-day warehouse shift.',
      description: 'Support packing, stock count, label checks and light loading. Safety briefing provided on arrival.',
      jobType: 'SHIFT',
      jobStatus: 'OPEN',
      workDate: tomorrow,
      startTime: '09:00',
      endTime: '18:00',
      headcount: 8,
      payType: 'DAILY',
      defaultRateCents: 12000,
      minRateCents: 12000,
      maxRateCents: 14000,
      publicVisible: true,
      autoBreakRule: true,
      active: true,
      scanToken: token(10),
      notes: 'Sample marketplace warehouse job',
      skills: {
        create: [warehouseSkill, runnerSkill].filter(Boolean).map((skill) => ({ skillId: skill!.id })),
      },
    },
  });
  console.log(`✓ Created sample marketplace job "${warehouseJob.name}" — token ${warehouseJob.scanToken}`);

  // One completed attendance for the first staff
  const first = await prisma.staff.findFirst();
  if (first) {
    const clockIn = new Date(today.getTime() + 1 * 60 * 60 * 1000); // MYT 09:00
    const clockOut = new Date(clockIn.getTime() + 9 * 60 * 60 * 1000); // 9h later
    const grossMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);
    const breakDeductMinutes = 60;
    const payableMinutes = grossMinutes - breakDeductMinutes;
    const totalPayCents = Math.round((payableMinutes / 60) * event.defaultRateCents);
    await prisma.attendanceSession.create({
      data: {
        eventId: event.id,
        tenantId: tenant.id,
        staffId: first.id,
        workDate: today,
        clockInAt: clockIn,
        clockOutAt: clockOut,
        grossMinutes,
        breakDeductMinutes,
        payableMinutes,
        hourlyRateSnapshotCents: event.defaultRateCents,
        totalPayCents,
        status: AttendanceStatus.COMPLETED,
      },
    });
    console.log('✓ Created sample completed attendance');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
