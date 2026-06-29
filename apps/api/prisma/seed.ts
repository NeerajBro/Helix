import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSION_MODULES, DEPARTMENT_SLUGS, ROLE_SLUGS, SKILL_SLUGS } from '@helix/shared';

const prisma = new PrismaClient();

const PERMISSIONS = [
  ...PERMISSION_MODULES.flatMap((module) => [
    { name: `Read ${module}`, slug: `${module}:read`, module },
    { name: `Create ${module}`, slug: `${module}:create`, module },
    { name: `Update ${module}`, slug: `${module}:update`, module },
    { name: `Delete ${module}`, slug: `${module}:delete`, module },
  ]),
  { name: 'Assign conversations', slug: 'conversations:assign', module: 'conversations' },
  { name: 'Transfer conversations', slug: 'conversations:transfer', module: 'conversations' },
];

const ROLES = [
  {
    name: 'Super Admin',
    slug: ROLE_SLUGS.SUPER_ADMIN,
    description: 'Full system access',
    isSystem: true,
    permissions: ['*'],
  },
  {
    name: 'Admin',
    slug: ROLE_SLUGS.ADMIN,
    description: 'Administrative access',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.slug),
  },
  {
    name: 'Supervisor',
    slug: ROLE_SLUGS.SUPERVISOR,
    description: 'Team supervision and reporting',
    isSystem: true,
    permissions: [
      'conversations:read', 'conversations:update', 'conversations:assign', 'conversations:transfer',
      'messages:read', 'messages:create',
      'reports:read', 'users:read', 'departments:read', 'queues:read', 'skills:read',
    ],
  },
  {
    name: 'Agent',
    slug: ROLE_SLUGS.AGENT,
    description: 'Customer support agent',
    isSystem: true,
    permissions: [
      'conversations:read', 'conversations:update',
      'messages:read', 'messages:create',
    ],
  },
  {
    name: 'Viewer',
    slug: ROLE_SLUGS.VIEWER,
    description: 'Read-only access',
    isSystem: true,
    permissions: [
      'conversations:read', 'messages:read', 'reports:read',
    ],
  },
];

const DEPARTMENTS = [
  { name: 'Flights', slug: DEPARTMENT_SLUGS.FLIGHTS, color: '#1565c0', description: 'Flight bookings and travel support' },
  { name: 'Hotels', slug: DEPARTMENT_SLUGS.HOTELS, color: '#6a1b9a', description: 'Hotel reservations and accommodations' },
  { name: 'Finance', slug: DEPARTMENT_SLUGS.FINANCE, color: '#2e7d32', description: 'Refunds, billing, and payments' },
  { name: 'Complaints', slug: DEPARTMENT_SLUGS.COMPLAINTS, color: '#c62828', description: 'Customer complaints and escalations' },
  { name: 'Corporate', slug: DEPARTMENT_SLUGS.CORPORATE, color: '#37474f', description: 'Corporate and B2B accounts' },
  { name: 'General', slug: DEPARTMENT_SLUGS.GENERAL, color: '#757575', description: 'General inquiries' },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding HELIX database...');

  // Permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: perm,
    });
  }
  console.log(`  ✓ ${PERMISSIONS.length} permissions`);

  // Roles with permissions
  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { slug: roleData.slug },
      update: {},
      create: {
        name: roleData.name,
        slug: roleData.slug,
        description: roleData.description,
        isSystem: roleData.isSystem,
      },
    });

    if (roleData.permissions.includes('*')) {
      const allPerms = await prisma.permission.findMany({ where: { deletedAt: null } });
      for (const perm of allPerms) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    } else {
      for (const permSlug of roleData.permissions) {
        const perm = await prisma.permission.findUnique({ where: { slug: permSlug } });
        if (perm) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
            update: {},
            create: { roleId: role.id, permissionId: perm.id },
          });
        }
      }
    }
  }
  console.log(`  ✓ ${ROLES.length} roles`);

  // Departments
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { slug: dept.slug },
      update: {},
      create: dept,
    });
  }
  console.log(`  ✓ ${DEPARTMENTS.length} departments`);

  // Skills
  const SKILLS = [
    { name: 'Flight Booking', slug: SKILL_SLUGS.FLIGHT_BOOKING, description: 'Flight reservations and changes', dept: DEPARTMENT_SLUGS.FLIGHTS },
    { name: 'Hotel Booking', slug: SKILL_SLUGS.HOTEL_BOOKING, description: 'Hotel reservations and accommodations', dept: DEPARTMENT_SLUGS.HOTELS },
    { name: 'Refunds & Finance', slug: SKILL_SLUGS.REFUNDS, description: 'Refunds, billing, and payments', dept: DEPARTMENT_SLUGS.FINANCE },
    { name: 'Complaints Handling', slug: SKILL_SLUGS.COMPLAINTS, description: 'Customer complaints and escalations', dept: DEPARTMENT_SLUGS.COMPLAINTS },
    { name: 'Corporate Accounts', slug: SKILL_SLUGS.CORPORATE, description: 'B2B and corporate support', dept: DEPARTMENT_SLUGS.CORPORATE },
    { name: 'General Support', slug: SKILL_SLUGS.GENERAL, description: 'General customer inquiries', dept: DEPARTMENT_SLUGS.GENERAL },
  ];

  for (const skillData of SKILLS) {
    const dept = await prisma.department.findUnique({ where: { slug: skillData.dept } });
    const skill = await prisma.skill.upsert({
      where: { slug: skillData.slug },
      update: {},
      create: { name: skillData.name, slug: skillData.slug, description: skillData.description },
    });
    if (dept) {
      await prisma.departmentSkill.upsert({
        where: { departmentId_skillId: { departmentId: dept.id, skillId: skill.id } },
        update: {},
        create: { departmentId: dept.id, skillId: skill.id },
      });
    }
  }
  console.log(`  ✓ ${SKILLS.length} skills`);

  // Queues (one per department)
  const QUEUES = [
    { name: 'Flights Queue', slug: 'flights-queue', dept: DEPARTMENT_SLUGS.FLIGHTS, skill: SKILL_SLUGS.FLIGHT_BOOKING, strategy: 'SKILL_BASED' as const, slaFirst: 10, slaRes: 120 },
    { name: 'Hotels Queue', slug: 'hotels-queue', dept: DEPARTMENT_SLUGS.HOTELS, skill: SKILL_SLUGS.HOTEL_BOOKING, strategy: 'SKILL_BASED' as const, slaFirst: 10, slaRes: 120 },
    { name: 'Finance Queue', slug: 'finance-queue', dept: DEPARTMENT_SLUGS.FINANCE, skill: SKILL_SLUGS.REFUNDS, strategy: 'PRIORITY' as const, slaFirst: 5, slaRes: 60 },
    { name: 'Complaints Queue', slug: 'complaints-queue', dept: DEPARTMENT_SLUGS.COMPLAINTS, skill: SKILL_SLUGS.COMPLAINTS, strategy: 'PRIORITY' as const, slaFirst: 5, slaRes: 90 },
    { name: 'Corporate Queue', slug: 'corporate-queue', dept: DEPARTMENT_SLUGS.CORPORATE, skill: SKILL_SLUGS.CORPORATE, strategy: 'LEAST_BUSY' as const, slaFirst: 15, slaRes: 180 },
    { name: 'General Queue', slug: 'general-queue', dept: DEPARTMENT_SLUGS.GENERAL, skill: SKILL_SLUGS.GENERAL, strategy: 'ROUND_ROBIN' as const, slaFirst: 15, slaRes: 240 },
  ];

  for (const queueData of QUEUES) {
    const dept = await prisma.department.findUnique({ where: { slug: queueData.dept } });
    const skill = await prisma.skill.findUnique({ where: { slug: queueData.skill } });
    if (dept) {
      await prisma.queue.upsert({
        where: { slug: queueData.slug },
        update: {},
        create: {
          name: queueData.name,
          slug: queueData.slug,
          departmentId: dept.id,
          skillId: skill?.id,
          routingStrategy: queueData.strategy,
          priority: queueData.dept === DEPARTMENT_SLUGS.COMPLAINTS ? 10 : 5,
          slaFirstResponse: queueData.slaFirst,
          slaResolution: queueData.slaRes,
        },
      });
    }
  }
  console.log(`  ✓ ${QUEUES.length} queues`);

  // Business hours (Mon–Fri 09:00–17:00 UTC per department)
  const allDepts = await prisma.department.findMany({ where: { deletedAt: null } });
  for (const dept of allDepts) {
    for (let day = 1; day <= 5; day++) {
      const existing = await prisma.businessHour.findFirst({
        where: { departmentId: dept.id, dayOfWeek: day },
      });
      if (!existing) {
        await prisma.businessHour.create({
          data: { departmentId: dept.id, dayOfWeek: day, openTime: '09:00', closeTime: '17:00', timezone: 'UTC' },
        });
      }
    }
  }
  console.log(`  ✓ Business hours for ${allDepts.length} departments`);

  // Sample agents (5 per key departments)
  const agentRole = await prisma.role.findUnique({ where: { slug: ROLE_SLUGS.AGENT } });
  const agentDepts = [
    DEPARTMENT_SLUGS.FLIGHTS,
    DEPARTMENT_SLUGS.HOTELS,
    DEPARTMENT_SLUGS.FINANCE,
    DEPARTMENT_SLUGS.COMPLAINTS,
    DEPARTMENT_SLUGS.GENERAL,
  ];
  const agentNames = [
    { first: 'Sarah', last: 'Mitchell', email: 'sarah.mitchell@helix.com', dept: DEPARTMENT_SLUGS.FLIGHTS, skill: SKILL_SLUGS.FLIGHT_BOOKING },
    { first: 'James', last: 'Chen', email: 'james.chen@helix.com', dept: DEPARTMENT_SLUGS.FLIGHTS, skill: SKILL_SLUGS.FLIGHT_BOOKING },
    { first: 'Emily', last: 'Rodriguez', email: 'emily.rodriguez@helix.com', dept: DEPARTMENT_SLUGS.HOTELS, skill: SKILL_SLUGS.HOTEL_BOOKING },
    { first: 'Michael', last: 'Thompson', email: 'michael.thompson@helix.com', dept: DEPARTMENT_SLUGS.HOTELS, skill: SKILL_SLUGS.HOTEL_BOOKING },
    { first: 'Lisa', last: 'Park', email: 'lisa.park@helix.com', dept: DEPARTMENT_SLUGS.FINANCE, skill: SKILL_SLUGS.REFUNDS },
    { first: 'David', last: 'Wilson', email: 'david.wilson@helix.com', dept: DEPARTMENT_SLUGS.FINANCE, skill: SKILL_SLUGS.REFUNDS },
    { first: 'Anna', last: 'Kowalski', email: 'anna.kowalski@helix.com', dept: DEPARTMENT_SLUGS.COMPLAINTS, skill: SKILL_SLUGS.COMPLAINTS },
    { first: 'Robert', last: 'Taylor', email: 'robert.taylor@helix.com', dept: DEPARTMENT_SLUGS.COMPLAINTS, skill: SKILL_SLUGS.COMPLAINTS },
    { first: 'Maria', last: 'Garcia', email: 'maria.garcia@helix.com', dept: DEPARTMENT_SLUGS.GENERAL, skill: SKILL_SLUGS.GENERAL },
    { first: 'Kevin', last: 'Brown', email: 'kevin.brown@helix.com', dept: DEPARTMENT_SLUGS.GENERAL, skill: SKILL_SLUGS.GENERAL },
  ];

  const agentPassword = await bcrypt.hash('Agent123!', 12);
  for (const agent of agentNames) {
    const dept = await prisma.department.findUnique({ where: { slug: agent.dept } });
    const skill = await prisma.skill.findUnique({ where: { slug: agent.skill } });
    const statuses = ['ONLINE', 'ONLINE', 'ONLINE', 'BUSY', 'ON_BREAK', 'AWAY', 'OFFLINE'] as const;
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: {},
      create: {
        email: agent.email,
        passwordHash: agentPassword,
        firstName: agent.first,
        lastName: agent.last,
        status: 'ACTIVE',
        departmentId: dept?.id,
        maxCapacity: 5,
        roles: agentRole ? { create: [{ roleId: agentRole.id }] } : undefined,
        availability: { create: { status } },
        skills: skill ? { create: [{ skillId: skill.id, level: 3 }] } : undefined,
      },
    });
    void user;
  }
  console.log(`  ✓ ${agentNames.length} sample agents (password: Agent123!)`);

  // Admin user
  const adminRole = await prisma.role.findUnique({ where: { slug: ROLE_SLUGS.SUPER_ADMIN } });
  const generalDept = await prisma.department.findUnique({ where: { slug: DEPARTMENT_SLUGS.GENERAL } });
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@helix.com' },
    update: {},
    create: {
      email: 'admin@helix.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      status: 'ACTIVE',
      departmentId: generalDept?.id,
      maxCapacity: 10,
      roles: adminRole ? { create: [{ roleId: adminRole.id }] } : undefined,
      availability: { create: { status: 'ONLINE' } },
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (password: Admin123!)`);

  // Default settings
  const settings = [
    { key: 'app.name', value: 'HELIX', description: 'Application name', isPublic: true },
    { key: 'app.timezone', value: 'UTC', description: 'Default timezone', isPublic: true },
    { key: 'sla.first_response_minutes', value: 15, description: 'SLA first response target (minutes)' },
    { key: 'sla.resolution_minutes', value: 240, description: 'SLA resolution target (minutes)' },
    { key: 'bot.enabled', value: true, description: 'AI bot enabled' },
    { key: 'whatsapp.session_window_hours', value: 24, description: 'WhatsApp 24h session window' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`  ✓ ${settings.length} settings`);

  // Default WhatsApp number
  await prisma.whatsAppNumber.upsert({
    where: { phoneNumber: '+15550001000' },
    update: {},
    create: {
      phoneNumber: '+15550001000',
      displayName: 'HELIX Support',
      businessName: 'HELIX Travel',
      isActive: true,
      isDefault: true,
    },
  });
  console.log('  ✓ Default WhatsApp number');

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
