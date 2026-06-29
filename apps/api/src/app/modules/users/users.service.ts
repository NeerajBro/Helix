import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { buildPaginatedResponse, parsePagination } from '@helix/utils';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserQueryDto) {
    const { skip, take, page, pageSize } = parsePagination(query);
    const where = {
      deletedAt: null,
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
      ...(query.departmentId && { departmentId: query.departmentId }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: { include: { role: true } },
          department: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((user) => this.mapUser(user));
    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        department: true,
        skills: { include: { skill: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.mapUserDetail(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        departmentId: dto.departmentId,
        maxCapacity: dto.maxCapacity ?? 5,
        roles: dto.roleIds
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: {
        roles: { include: { role: true } },
        department: true,
      },
    });

    return this.mapUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };
    delete data['roleIds'];

    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, 12);
      delete data['password'];
    }

    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        roles: { include: { role: true } },
        department: true,
      },
    });

    return this.mapUser(user);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private mapUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    phone: string | null;
    status: string;
    departmentId: string | null;
    maxCapacity: number;
    createdAt: Date;
    updatedAt: Date;
    roles: { role: { slug: string; name: string } }[];
    department?: { name: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      status: user.status,
      departmentId: user.departmentId,
      departmentName: user.department?.name,
      maxCapacity: user.maxCapacity,
      roles: user.roles.map((r) => r.role.slug),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private mapUserDetail(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    phone: string | null;
    status: string;
    departmentId: string | null;
    maxCapacity: number;
    createdAt: Date;
    updatedAt: Date;
    roles: { role: { slug: string; name: string; permissions: { permission: { slug: string } }[] } }[];
    department?: { name: string } | null;
    skills: { skill: { slug: string; name: string }; level: number }[];
  }) {
    return {
      ...this.mapUser(user),
      permissions: [
        ...new Set(
          user.roles.flatMap((r) =>
            r.role.permissions.map((p) => p.permission.slug),
          ),
        ),
      ],
      skills: user.skills.map((s) => ({
        slug: s.skill.slug,
        name: s.skill.name,
        level: s.level,
      })),
    };
  }
}
