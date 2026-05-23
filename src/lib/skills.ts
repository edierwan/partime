import { prisma } from '@/lib/db';

export const SKILL_SEED = [
  {
    slug: 'technical',
    nameMs: 'Teknikal',
    nameId: 'Teknis',
    nameEn: 'Technical',
    skills: ['Wiring', 'Aircond', 'Plumbing', 'Electrical', 'CCTV', 'Networking', 'General repair'],
  },
  {
    slug: 'general-work',
    nameMs: 'Kerja Umum',
    nameId: 'Pekerjaan Umum',
    nameEn: 'General Work',
    skills: ['General Work', 'Event Crew', 'Booth Setup', 'Runner', 'Packing', 'Stock Count', 'Cleaning'],
  },
  {
    slug: 'sales-promotion',
    nameMs: 'Jualan & Promosi',
    nameId: 'Penjualan & Promosi',
    nameEn: 'Sales & Promotion',
    skills: ['Promoter', 'Product Demo', 'Sampling Crew', 'Roadshow Crew', 'Customer Service'],
  },
  {
    slug: 'fb-hospitality',
    nameMs: 'F&B / Hospitaliti',
    nameId: 'F&B / Perhotelan',
    nameEn: 'F&B / Hospitality',
    skills: ['F&B Helper', 'Waiter', 'Kitchen Helper', 'Barista Helper', 'Cashier', 'Event Server'],
  },
  {
    slug: 'warehouse-logistics',
    nameMs: 'Gudang / Logistik',
    nameId: 'Gudang / Logistik',
    nameEn: 'Warehouse / Logistics',
    skills: ['Warehouse', 'Picker/Packer', 'Delivery Assistant', 'Lalamove/Runner Coordination'],
  },
  {
    slug: 'admin-data',
    nameMs: 'Admin / Data',
    nameId: 'Admin / Data',
    nameEn: 'Admin / Data',
    skills: ['Data Entry', 'Registration Counter', 'Queue Management', 'Admin Assistant'],
  },
];

export function skillSlug(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
}

export async function ensureSkillCatalog() {
  for (const [categoryIndex, category] of SKILL_SEED.entries()) {
    const savedCategory = await prisma.skillCategory.upsert({
      where: { slug: category.slug },
      update: {
        nameMs: category.nameMs,
        nameId: category.nameId,
        nameEn: category.nameEn,
        active: true,
        sortOrder: categoryIndex,
      },
      create: {
        slug: category.slug,
        nameMs: category.nameMs,
        nameId: category.nameId,
        nameEn: category.nameEn,
        active: true,
        sortOrder: categoryIndex,
      },
    });

    for (const [skillIndex, skillName] of category.skills.entries()) {
      const slug = skillSlug(skillName);
      await prisma.skill.upsert({
        where: { slug },
        update: {
          categoryId: savedCategory.id,
          nameMs: skillName,
          nameId: skillName,
          nameEn: skillName,
          active: true,
          sortOrder: skillIndex,
        },
        create: {
          categoryId: savedCategory.id,
          slug,
          nameMs: skillName,
          nameId: skillName,
          nameEn: skillName,
          active: true,
          sortOrder: skillIndex,
        },
      });
    }
  }
}

export async function listSkillCatalog() {
  await ensureSkillCatalog();
  return prisma.skillCategory.findMany({
    where: { active: true },
    include: { skills: { where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }] } },
    orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
  });
}

export async function syncPartTimerSkills({
  partTimerId,
  skillIds,
  otherSkillName,
}: {
  partTimerId: string;
  skillIds: string[];
  otherSkillName?: string | null;
}) {
  const uniqueSkillIds = Array.from(new Set(skillIds.filter(Boolean)));

  if (otherSkillName) {
    const category = await prisma.skillCategory.upsert({
      where: { slug: 'other' },
      update: { active: true, nameMs: 'Lain-lain', nameId: 'Lainnya', nameEn: 'Other' },
      create: { slug: 'other', nameMs: 'Lain-lain', nameId: 'Lainnya', nameEn: 'Other', active: true, sortOrder: 999 },
    });
    const slug = `other-${skillSlug(otherSkillName)}`;
    const otherSkill = await prisma.skill.upsert({
      where: { slug },
      update: { active: true, nameMs: otherSkillName, nameId: otherSkillName, nameEn: otherSkillName, categoryId: category.id },
      create: { slug, nameMs: otherSkillName, nameId: otherSkillName, nameEn: otherSkillName, categoryId: category.id, active: true, sortOrder: 999 },
    });
    uniqueSkillIds.push(otherSkill.id);
  }

  await prisma.partTimerSkill.deleteMany({ where: { partTimerId } });
  if (uniqueSkillIds.length > 0) {
    await prisma.partTimerSkill.createMany({
      data: uniqueSkillIds.map((skillId) => ({ partTimerId, skillId })),
      skipDuplicates: true,
    });
  }
}