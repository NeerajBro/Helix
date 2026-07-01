import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TemplateDto } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<TemplateDto[]> {
    const templates = await this.prisma.template.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return templates.map((t) => this.mapTemplate(t));
  }

  async findOne(id: string): Promise<TemplateDto> {
    const template = await this.prisma.template.findFirst({
      where: { id, deletedAt: null },
    });
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return this.mapTemplate(template);
  }

  async create(dto: CreateTemplateDto, userId?: string): Promise<TemplateDto> {
    const existing = await this.prisma.template.findFirst({
      where: { slug: dto.slug, deletedAt: null },
    });
    if (existing) throw new ConflictException('Template slug already exists');

    const template = await this.prisma.template.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category ?? 'UTILITY',
        language: dto.language ?? 'en',
        header: dto.header,
        body: dto.body,
        footer: dto.footer,
        variables: dto.variables ?? [],
        whatsAppNumberId: dto.whatsAppNumberId,
        status: 'DRAFT',
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entityType: 'template',
      entityId: template.id,
      newValues: { name: template.name, slug: template.slug },
    });

    return this.mapTemplate(template);
  }

  async update(id: string, dto: UpdateTemplateDto, userId?: string): Promise<TemplateDto> {
    const existing = await this.findOne(id);
    const template = await this.prisma.template.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.header !== undefined && { header: dto.header }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.footer !== undefined && { footer: dto.footer }),
        ...(dto.variables !== undefined && { variables: dto.variables }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entityType: 'template',
      entityId: id,
      oldValues: { name: existing.name, status: existing.status },
      newValues: { name: template.name, status: template.status },
    });

    return this.mapTemplate(template);
  }

  async remove(id: string, userId?: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.template.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entityType: 'template',
      entityId: id,
    });
    return { deleted: true };
  }

  private mapTemplate(t: {
    id: string;
    whatsAppNumberId: string | null;
    name: string;
    slug: string;
    category: string;
    language: string;
    header: string | null;
    body: string;
    footer: string | null;
    variables: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): TemplateDto {
    return {
      id: t.id,
      whatsAppNumberId: t.whatsAppNumberId ?? undefined,
      name: t.name,
      slug: t.slug,
      category: t.category as TemplateDto['category'],
      language: t.language,
      header: t.header ?? undefined,
      body: t.body,
      footer: t.footer ?? undefined,
      variables: Array.isArray(t.variables) ? (t.variables as string[]) : undefined,
      status: t.status as TemplateDto['status'],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
