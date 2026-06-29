import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto, CreateBusinessHourDto, UpdateBusinessHourDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { users: true, queues: true } },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      description: d.description,
      color: d.color,
      isActive: d.isActive,
      agentCount: d._count.users,
      queueCount: d._count.queues,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        queues: { where: { deletedAt: null } },
        skills: { include: { skill: true } },
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { users: true } },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    return {
      id: department.id,
      name: department.name,
      slug: department.slug,
      description: department.description,
      color: department.color,
      isActive: department.isActive,
      agentCount: department._count.users,
      queues: department.queues.map((q) => ({
        id: q.id,
        name: q.name,
        slug: q.slug,
        routingStrategy: q.routingStrategy,
        isActive: q.isActive,
      })),
      skills: department.skills.map((ds) => ({
        id: ds.skill.id,
        name: ds.skill.name,
        slug: ds.skill.slug,
      })),
      businessHours: department.businessHours.map((bh) => this.mapBusinessHour(bh)),
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: { OR: [{ slug: dto.slug }, { name: dto.name }], deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Department with this name or slug already exists');
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        color: dto.color ?? '#1976d2',
      },
    });

    return this.findOne(department.id);
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    await this.prisma.department.update({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { deleted: true };
  }

  async getBusinessHours(departmentId: string) {
    await this.findOne(departmentId);
    const hours = await this.prisma.businessHour.findMany({
      where: { departmentId },
      orderBy: { dayOfWeek: 'asc' },
    });
    return hours.map((bh) => this.mapBusinessHour(bh));
  }

  async addBusinessHour(departmentId: string, dto: CreateBusinessHourDto) {
    await this.findOne(departmentId);
    const hour = await this.prisma.businessHour.create({
      data: {
        departmentId,
        dayOfWeek: dto.dayOfWeek,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        timezone: dto.timezone ?? 'UTC',
        isActive: dto.isActive ?? true,
      },
    });
    return this.mapBusinessHour(hour);
  }

  async updateBusinessHour(departmentId: string, hourId: string, dto: UpdateBusinessHourDto) {
    const hour = await this.prisma.businessHour.findFirst({
      where: { id: hourId, departmentId },
    });
    if (!hour) {
      throw new NotFoundException('Business hour not found');
    }
    const updated = await this.prisma.businessHour.update({
      where: { id: hourId },
      data: dto,
    });
    return this.mapBusinessHour(updated);
  }

  async removeBusinessHour(departmentId: string, hourId: string) {
    const hour = await this.prisma.businessHour.findFirst({
      where: { id: hourId, departmentId },
    });
    if (!hour) {
      throw new NotFoundException('Business hour not found');
    }
    await this.prisma.businessHour.delete({ where: { id: hourId } });
    return { deleted: true };
  }

  private mapBusinessHour(bh: {
    id: string;
    departmentId: string | null;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    timezone: string;
    isActive: boolean;
  }) {
    return {
      id: bh.id,
      departmentId: bh.departmentId ?? undefined,
      dayOfWeek: bh.dayOfWeek,
      openTime: bh.openTime,
      closeTime: bh.closeTime,
      timezone: bh.timezone,
      isActive: bh.isActive,
    };
  }
}
