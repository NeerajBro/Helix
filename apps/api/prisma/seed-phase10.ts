import { PrismaClient, BookingType } from '@prisma/client';

const BOOKING_TEMPLATES: {
  type: BookingType;
  prefix: string;
  description: string;
  status: string;
  amount: number;
}[] = [
  { type: 'FLIGHT', prefix: 'FLT', description: 'Round-trip flight booking', status: 'confirmed', amount: 850 },
  { type: 'FLIGHT', prefix: 'FLT', description: 'One-way economy flight', status: 'confirmed', amount: 420 },
  { type: 'HOTEL', prefix: 'HTL', description: 'City centre hotel — 3 nights', status: 'confirmed', amount: 540 },
  { type: 'HOTEL', prefix: 'HTL', description: 'Resort package — 5 nights', status: 'pending', amount: 1200 },
  { type: 'PACKAGE', prefix: 'PKG', description: 'Flight + hotel bundle', status: 'confirmed', amount: 1890 },
  { type: 'OTHER', prefix: 'SRV', description: 'Airport transfer service', status: 'completed', amount: 75 },
];

export async function seedPhase10(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.booking.count();
  if (existing > 0) {
    console.log('  ⏭ Bookings already seeded');
    return;
  }

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    take: 60,
    orderBy: { createdAt: 'asc' },
  });

  if (!customers.length) {
    console.log('  ⏭ No customers for booking seed');
    return;
  }

  let bookingCount = 0;
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const numBookings = i % 5 === 0 ? 2 : 1;
    for (let j = 0; j < numBookings; j++) {
      const template = BOOKING_TEMPLATES[(i + j) % BOOKING_TEMPLATES.length];
      const reference = `${template.prefix}-${String(100000 + i * 10 + j).padStart(6, '0')}`;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (i % 30) - 10);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (template.type === 'HOTEL' ? 3 : 1));

      await prisma.booking.create({
        data: {
          customerId: customer.id,
          type: template.type,
          reference,
          description: template.description,
          status: template.status,
          startDate,
          endDate,
          amount: template.amount,
          currency: 'USD',
        },
      });
      bookingCount++;
    }
  }
  console.log(`  ✓ ${bookingCount} bookings`);

  const conversations = await prisma.conversation.findMany({
    where: { deletedAt: null, status: { in: ['OPEN', 'WAITING', 'RESOLVED'] } },
    take: 15,
    include: { customer: true, department: true },
    orderBy: { createdAt: 'asc' },
  });

  let caseCount = 0;
  for (const [idx, convo] of conversations.entries()) {
    const customer = convo.customer.name ?? convo.customer.phone;
    const dept = convo.department?.name ?? 'Support';
    await prisma.salesforceCase.create({
      data: {
        conversationId: convo.id,
        salesforceCaseId: `500${String(80000000 + idx).padStart(8, '0')}`,
        caseNumber: String(200000 + idx),
        subject: convo.subject ?? `WhatsApp: ${customer} — ${dept}`,
        status: convo.status === 'RESOLVED' ? 'Resolved' : 'Working',
        priority: convo.priority === 'HIGH' ? 'High' : 'Medium',
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
      },
    });
    caseCount++;
  }
  console.log(`  ✓ ${caseCount} Salesforce cases`);
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seed-phase10.ts');
if (isDirectRun) {
  const prisma = new PrismaClient();
  seedPhase10(prisma)
    .catch((e) => {
      console.error('Phase 10 seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
