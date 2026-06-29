import {
  ConversationPriority,
  ConversationStatus,
  MessageContentType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  PrismaClient,
} from '@prisma/client';
import { DEPARTMENT_SLUGS } from '@helix/shared';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn',
  'Avery', 'Blake', 'Cameron', 'Dakota', 'Elliot', 'Finley', 'Harper',
  'Indigo', 'Jesse', 'Kai', 'Logan', 'Mason', 'Noah', 'Olivia', 'Parker',
  'Reese', 'Sage', 'Skyler', 'Tatum', 'Uma', 'Violet', 'Wren',
];

const LAST_NAMES = [
  'Anderson', 'Baker', 'Clark', 'Davis', 'Evans', 'Fisher', 'Garcia', 'Harris',
  'Irving', 'Johnson', 'King', 'Lewis', 'Martin', 'Nelson', 'Owens', 'Patel',
  'Quinn', 'Roberts', 'Smith', 'Turner', 'Underwood', 'Vargas', 'Walker',
  'Young', 'Zimmerman', 'Adams', 'Brooks', 'Cooper', 'Edwards', 'Foster',
];

const SUBJECTS = [
  'Flight delay compensation',
  'Hotel booking change',
  'Refund request',
  'Lost baggage',
  'Seat upgrade inquiry',
  'Cancellation policy',
  'Corporate travel booking',
  'Visa assistance',
  'Insurance claim',
  'Loyalty points issue',
];

const INBOUND_MESSAGES = [
  'Hi, I need help with my booking.',
  'My flight was cancelled, what are my options?',
  'Can I get a refund for my hotel reservation?',
  'I have not received my confirmation email.',
  'Please update my travel dates.',
  'I want to speak to an agent.',
  'This is urgent — I travel tomorrow.',
  'Thank you for your help earlier.',
];

const OUTBOUND_MESSAGES = [
  'Hello! I would be happy to help you today.',
  'Let me look into your booking details.',
  'I have found your reservation. One moment please.',
  'I can process that refund for you.',
  'Is there anything else I can assist with?',
  'Your request has been submitted successfully.',
];

const TAG_DEFS = [
  { name: 'VIP', color: '#f9a825' },
  { name: 'Urgent', color: '#e53935' },
  { name: 'Refund', color: '#8e24aa' },
  { name: 'Complaint', color: '#d84315' },
  { name: 'Escalated', color: '#c62828' },
];

const STATUSES: ConversationStatus[] = ['OPEN', 'PENDING', 'WAITING', 'RESOLVED', 'CLOSED'];
const PRIORITIES: ConversationPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL'];

export async function seedPhase4(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.customer.count();
  if (existing >= 100) {
    console.log('  ↷ Phase 4 seed skipped (customers already exist)');
    return;
  }

  console.log('🌱 Seeding Phase 4: customers, conversations, messages...');

  for (const tag of TAG_DEFS) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { color: tag.color },
      create: tag,
    });
  }
  console.log(`  ✓ ${TAG_DEFS.length} tags`);

  const departments = await prisma.department.findMany({ where: { deletedAt: null } });
  const queues = await prisma.queue.findMany({ where: { deletedAt: null } });
  const agents = await prisma.user.findMany({
    where: { deletedAt: null, roles: { some: { role: { slug: 'agent' } } } },
    select: { id: true, departmentId: true },
  });
  const whatsAppNumber = await prisma.whatsAppNumber.findFirst({ where: { isDefault: true } });
  const tags = await prisma.tag.findMany({ where: { deletedAt: null } });

  const customers = [];
  for (let i = 1; i <= 100; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const customer = await prisma.customer.create({
      data: {
        phone: `+1555${String(1000000 + i).slice(1)}`,
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        isVip: i % 10 === 0,
        language: i % 5 === 0 ? 'es' : 'en',
        lastContactedAt: new Date(Date.now() - i * 3600000),
      },
    });
    customers.push(customer);
  }
  console.log('  ✓ 100 customers');

  const conversations = [];
  for (let i = 0; i < 500; i++) {
    const customer = customers[i % customers.length];
    const department = departments[i % departments.length];
    const queue = queues.find((q) => q.departmentId === department?.id) ?? queues[i % queues.length];
    const agent = agents[i % agents.length];
    const status = STATUSES[i % STATUSES.length];
    const priority = PRIORITIES[i % PRIORITIES.length];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (i % 24));

    const conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        departmentId: department?.id,
        queueId: queue?.id,
        assignedAgentId: status === 'OPEN' || status === 'WAITING' ? agent?.id : undefined,
        whatsAppNumberId: whatsAppNumber?.id,
        status,
        priority,
        subject: SUBJECTS[i % SUBJECTS.length],
        botHandled: i % 3 !== 0,
        whatsappExpiresAt: expiresAt,
        firstResponseAt: i % 4 === 0 ? new Date() : undefined,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
        closedAt: status === 'CLOSED' ? new Date() : undefined,
        slaBreached: i % 20 === 0,
        sentimentScore: (i % 10) / 10 - 0.5,
      },
    });
    conversations.push(conversation);

    if (tags.length > 0 && i % 4 === 0) {
      await prisma.conversationTag.create({
        data: {
          conversationId: conversation.id,
          tagId: tags[i % tags.length].id,
        },
      });
    }

    if (i % 7 === 0 && agent) {
      await prisma.conversationAssignment.create({
        data: {
          conversationId: conversation.id,
          agentId: agent.id,
          isAuto: i % 14 === 0,
          reason: i % 14 === 0 ? 'Auto-routed by queue' : 'Manual assignment',
        },
      });
    }
  }
  console.log('  ✓ 500 conversations');

  let messageCount = 0;
  for (let i = 0; i < 1000; i++) {
    const conversation = conversations[i % conversations.length];
    const isInbound = i % 2 === 0;
    const agent = agents[i % agents.length];
    const createdAt = new Date(Date.now() - (1000 - i) * 60000);

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: isInbound ? MessageSenderType.CUSTOMER : MessageSenderType.AGENT,
        agentId: isInbound ? undefined : agent?.id,
        direction: isInbound ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
        contentType: MessageContentType.TEXT,
        content: isInbound
          ? INBOUND_MESSAGES[i % INBOUND_MESSAGES.length]
          : OUTBOUND_MESSAGES[i % OUTBOUND_MESSAGES.length],
        status: MessageStatus.DELIVERED,
        sentAt: createdAt,
        deliveredAt: createdAt,
        createdAt,
      },
    });
    messageCount++;
  }
  console.log(`  ✓ ${messageCount} messages`);

  const flightsDept = departments.find((d) => d.slug === DEPARTMENT_SLUGS.FLIGHTS);
  if (flightsDept && agents[0]) {
    const sampleConvo = conversations[0];
    await prisma.internalNote.create({
      data: {
        conversationId: sampleConvo.id,
        authorId: agents[0].id,
        content: 'Customer is a repeat caller — handle with priority.',
      },
    });
    console.log('  ✓ Sample internal notes');
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seed-phase4.ts');
if (isDirectRun) {
  const prisma = new PrismaClient();
  seedPhase4(prisma)
    .catch((e) => {
      console.error('Phase 4 seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
