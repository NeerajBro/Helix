import { PrismaClient } from '@prisma/client';

export async function seedPhase12(prisma: PrismaClient): Promise<void> {
  const brandSettings = [
    { key: 'brand.name', value: 'HELIX', description: 'Application display name', isPublic: true },
    { key: 'brand.logo_url', value: '', description: 'Logo URL', isPublic: true },
    { key: 'brand.primary_color', value: '#1565c0', description: 'Primary brand color', isPublic: true },
    { key: 'brand.support_email', value: 'support@helix.com', description: 'Support email', isPublic: true },
    { key: 'brand.tagline', value: 'Enterprise Customer Support', description: 'Brand tagline', isPublic: true },
  ];

  for (const s of brandSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, isPublic: s.isPublic },
      create: s,
    });
  }
  console.log('  ✓ White-label settings');

  const existingTemplates = await prisma.template.count({ where: { deletedAt: null } });
  if (existingTemplates === 0) {
    const defaultNumber = await prisma.whatsAppNumber.findFirst({
      where: { isDefault: true, deletedAt: null },
    });

    const templates = [
      {
        name: 'Booking Confirmation',
        slug: 'booking_confirmation',
        category: 'UTILITY' as const,
        body: 'Hello {{1}}, your booking {{2}} is confirmed. Thank you for choosing HELIX Travel.',
        variables: ['customer_name', 'booking_ref'],
        status: 'APPROVED' as const,
      },
      {
        name: 'Flight Delay Update',
        slug: 'flight_delay_update',
        category: 'UTILITY' as const,
        body: 'Hi {{1}}, your flight {{2}} has been delayed. Our team is here to help.',
        variables: ['customer_name', 'flight_number'],
        status: 'APPROVED' as const,
      },
      {
        name: 'Promotional Offer',
        slug: 'promo_summer',
        category: 'MARKETING' as const,
        body: 'Exclusive offer for {{1}}! Save 20% on your next booking. Reply STOP to opt out.',
        variables: ['customer_name'],
        status: 'APPROVED' as const,
      },
    ];

    for (const t of templates) {
      await prisma.template.create({
        data: {
          ...t,
          whatsAppNumberId: defaultNumber?.id,
          language: 'en',
          footer: 'HELIX Travel Support',
        },
      });
    }
    console.log(`  ✓ ${templates.length} message templates`);
  } else {
    console.log('  ⏭ Templates already seeded');
  }

  const extraNumber = await prisma.whatsAppNumber.findFirst({
    where: { phoneNumber: '+15550001001', deletedAt: null },
  });
  if (!extraNumber) {
    await prisma.whatsAppNumber.create({
      data: {
        phoneNumber: '+15550001001',
        displayName: 'HELIX VIP Line',
        businessName: 'HELIX Travel VIP',
        isActive: true,
        isDefault: false,
      },
    });
    console.log('  ✓ Extra WhatsApp number');
  }

  const admin = await prisma.user.findFirst({
    where: { email: 'admin@helix.com', deletedAt: null },
  });

  if (admin) {
    const auditCount = await prisma.auditLog.count();
    if (auditCount < 5) {
      const logs = [
        { action: 'LOGIN' as const, entityType: 'user', entityId: admin.id },
        { action: 'CREATE' as const, entityType: 'template', entityId: null, newValues: { name: 'Booking Confirmation' } },
        { action: 'UPDATE' as const, entityType: 'setting', entityId: null, newValues: { key: 'brand.primary_color' } },
        { action: 'CREATE' as const, entityType: 'campaign', entityId: null, newValues: { name: 'Summer Promo' } },
      ];
      for (const log of logs) {
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId ?? undefined,
            newValues: log.newValues ?? undefined,
          },
        });
      }
      console.log(`  ✓ ${logs.length} sample audit logs`);
    }
  }

  const campaignCount = await prisma.campaign.count({ where: { deletedAt: null } });
  if (campaignCount === 0) {
    const template = await prisma.template.findFirst({
      where: { slug: 'promo_summer', deletedAt: null },
    });
    const defaultNumber = await prisma.whatsAppNumber.findFirst({
      where: { isDefault: true, deletedAt: null },
    });
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      take: 5,
      select: { phone: true },
    });

    if (customers.length) {
      await prisma.campaign.create({
        data: {
          name: 'Summer Promo Blast',
          templateId: template?.id,
          whatsAppNumberId: defaultNumber?.id,
          status: 'DRAFT',
          totalRecipients: customers.length,
          recipients: {
            create: customers.map((c) => ({
              phone: c.phone,
              variables: { customer_name: 'Valued Customer' },
            })),
          },
        },
      });
      console.log('  ✓ Sample draft campaign');
    }
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seed-phase12.ts');
if (isDirectRun) {
  const prisma = new PrismaClient();
  seedPhase12(prisma)
    .catch((e) => {
      console.error('Phase 12 seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
