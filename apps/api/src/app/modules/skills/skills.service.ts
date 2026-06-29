import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateSkillDto, UpdateSkillDto, AssignUserSkillDto } from './dto/skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const skills = await this.prisma.skill.findMany({
      where: { deletedAt: null },
      include: {
        departments: { include: { department: true } },
        _count: { select: { users: true, queues: true } },
      },
      orderBy: { name: 'asc' },
    });

    return skills.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      departmentIds: s.departments.map((d) => d.departmentId),
      departments: s.departments.map((d) => ({
        id: d.department.id,
        name: d.department.name,
      })),
      userCount: s._count.users,
      queueCount: s._count.queues,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const skill = await this.prisma.skill.findFirst({
      where: { id, deletedAt: null },
      include: {
        departments: { include: { department: true } },
        users: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });

    if (!skill) {
      throw new NotFoundException(`Skill ${id} not found`);
    }

    return {
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      departments: skill.departments.map((d) => ({
        id: d.department.id,
        name: d.department.name,
      })),
      users: skill.users.map((us) => ({
        id: us.user.id,
        name: `${us.user.firstName} ${us.user.lastName}`,
        email: us.user.email,
        level: us.level,
      })),
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateSkillDto) {
    const existing = await this.prisma.skill.findFirst({
      where: { OR: [{ slug: dto.slug }, { name: dto.name }], deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Skill with this name or slug already exists');
    }

    const skill = await this.prisma.skill.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        departments: dto.departmentIds
          ? { create: dto.departmentIds.map((departmentId) => ({ departmentId })) }
          : undefined,
      },
    });

    return this.findOne(skill.id);
  }

  async update(id: string, dto: UpdateSkillDto) {
    await this.findOne(id);

    if (dto.departmentIds) {
      await this.prisma.departmentSkill.deleteMany({ where: { skillId: id } });
      await this.prisma.departmentSkill.createMany({
        data: dto.departmentIds.map((departmentId) => ({ departmentId, skillId: id })),
      });
    }

    const { departmentIds: _, ...data } = dto;
    await this.prisma.skill.update({ where: { id }, data });

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.skill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async assignToUser(userId: string, dto: AssignUserSkillDto) {
    await this.findOne(dto.skillId);

    await this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: dto.skillId } },
      update: { level: dto.level ?? 1 },
      create: { userId, skillId: dto.skillId, level: dto.level ?? 1 },
    });

    return { assigned: true };
  }

  async removeFromUser(userId: string, skillId: string) {
    await this.prisma.userSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });
    return { removed: true };
  }
}
