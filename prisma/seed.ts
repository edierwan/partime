import { PrismaClient, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

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
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.adminUser.create({
      data: { email, passwordHash, name: 'Admin' },
    });
    console.log(`✓ Created admin ${email}`);
  } else {
    console.log(`= Admin ${email} already exists, skipping.`);
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
    { payName: 'aiman.h',  alias: 'AIMANHK01', fullName: 'Aiman Hakim',          phone: '+60123456789', bankName: 'Maybank',   bankAccount: '512345678901', hourlyRateCents: 2000 },
    { payName: 'nur.sya',  alias: 'NURSYA01',  fullName: 'Nur Syafiqah',         phone: '+60132233445', bankName: 'CIMB Bank', bankAccount: '860123456789', hourlyRateCents: 1800 },
    { payName: 'daniel.l', alias: 'DANIEL02',  fullName: 'Daniel Lee',           phone: '+60169876543', bankName: 'Maybank',   bankAccount: '514433221100', hourlyRateCents: 2000 },
    { payName: 'siti.a',   alias: 'SITIA03',   fullName: 'Siti Aisyah',          phone: '+60112233445', bankName: 'Bank Islam',bankAccount: '860112233344', hourlyRateCents: 1750 },
    { payName: 'arif.d',   alias: 'ARIFD04',   fullName: 'Arif Danial',          phone: '+60177889900', bankName: null,        bankAccount: null,           hourlyRateCents: 1600 },
  ];
  await prisma.staff.createMany({ data: sampleStaff });
  console.log(`✓ Inserted ${sampleStaff.length} sample staff`);

  const today = mytMidnight(new Date());
  const event = await prisma.workEvent.create({
    data: {
      name: 'Mid Valley Promo',
      location: 'Mid Valley Megamall, KL',
      workDate: today,
      defaultRateCents: 2000,
      autoBreakRule: true,
      active: true,
      scanToken: token(10),
      notes: 'Sample seeded event',
    },
  });
  console.log(`✓ Created sample event "${event.name}" — token ${event.scanToken}`);

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
