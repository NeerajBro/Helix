import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        slug: rp.permission.slug,
        module: rp.permission.module,
      })),
    }));
  }

  async findAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });

    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push({
          id: perm.id,
          name: perm.name,
          slug: perm.slug,
          description: perm.description,
        });
        return acc;
      },
      {} as Record<string, { id: string; name: string; slug: string; description: string | null }[]>,
    );

    return grouped;
  }
}
