import { PrismaClient } from '@prisma/client';

export async function seedPhase11(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.csatSurvey.count();
  if (existing > 0) {
    console.log('  ⏭ CSAT surveys already seeded');
    return;
  }

  const resolved = await prisma.conversation.findMany({
    where: { deletedAt: null, status: { in: ['RESOLVED', 'CLOSED'] } },
    include: { assignedAgent: { select: { id: true } } },
    take: 40,
    orderBy: { resolvedAt: 'desc' },
  });

  const ratings = [5, 4, 5, 3, 4, 5, 2, 4, 5, 3, 4, 5, 1, 4, 5];
  const comments = [
    'Great support, very helpful!',
    'Quick resolution, thank you.',
    'Agent was professional.',
    'Took a while but got sorted.',
    'Excellent service.',
    undefined,
    'Could be faster.',
    'Good experience overall.',
  ];

  let count = 0;
  for (let i = 0; i < resolved.length; i++) {
    const convo = resolved[i];
    const rating = ratings[i % ratings.length];
    await prisma.csatSurvey.create({
      data: {
        conversationId: convo.id,
        customerId: convo.customerId,
        agentId: convo.assignedAgentId,
        rating,
        comment: comments[i % comments.length],
        createdAt: convo.resolvedAt ?? convo.closedAt ?? new Date(),
      },
    });
    count++;
  }
  console.log(`  ✓ ${count} CSAT surveys`);
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seed-phase11.ts');
if (isDirectRun) {
  const prisma = new PrismaClient();
  seedPhase11(prisma)
    .catch((e) => {
      console.error('Phase 11 seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
