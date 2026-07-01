import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SettingDto, WhiteLabelSettings } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { UpdateSettingDto, UpdateWhiteLabelDto } from './dto/settings.dto';

const WHITE_LABEL_KEYS = {
  appName: 'brand.name',
  logoUrl: 'brand.logo_url',
  primaryColor: 'brand.primary_color',
  supportEmail: 'brand.support_email',
  tagline: 'brand.tagline',
} as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<SettingDto[]> {
    const settings = await this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    return settings.map((s) => this.mapSetting(s));
  }

  async getPublic(): Promise<Record<string, unknown>> {
    const settings = await this.prisma.setting.findMany({ where: { isPublic: true } });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async getWhiteLabel(): Promise<WhiteLabelSettings> {
    const keys = Object.values(WHITE_LABEL_KEYS);
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = new Map(settings.map((s) => [s.key, s.value]));
    return {
      appName: String(map.get(WHITE_LABEL_KEYS.appName) ?? 'HELIX'),
      logoUrl: map.get(WHITE_LABEL_KEYS.logoUrl) as string | undefined,
      primaryColor: String(map.get(WHITE_LABEL_KEYS.primaryColor) ?? '#1565c0'),
      supportEmail: map.get(WHITE_LABEL_KEYS.supportEmail) as string | undefined,
      tagline: map.get(WHITE_LABEL_KEYS.tagline) as string | undefined,
    };
  }

  async updateWhiteLabel(dto: UpdateWhiteLabelDto, userId?: string): Promise<WhiteLabelSettings> {
    const updates: { key: string; value: unknown }[] = [];
    if (dto.appName !== undefined) updates.push({ key: WHITE_LABEL_KEYS.appName, value: dto.appName });
    if (dto.logoUrl !== undefined) updates.push({ key: WHITE_LABEL_KEYS.logoUrl, value: dto.logoUrl });
    if (dto.primaryColor !== undefined) updates.push({ key: WHITE_LABEL_KEYS.primaryColor, value: dto.primaryColor });
    if (dto.supportEmail !== undefined) updates.push({ key: WHITE_LABEL_KEYS.supportEmail, value: dto.supportEmail });
    if (dto.tagline !== undefined) updates.push({ key: WHITE_LABEL_KEYS.tagline, value: dto.tagline });

    for (const u of updates) {
      const value = u.value as Prisma.InputJsonValue;
      await this.prisma.setting.upsert({
        where: { key: u.key },
        create: { key: u.key, value, isPublic: true },
        update: { value },
      });
    }

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entityType: 'white_label',
      newValues: dto as Record<string, unknown>,
    });

    return this.getWhiteLabel();
  }

  async update(key: string, dto: UpdateSettingDto, userId?: string): Promise<SettingDto> {
    const existing = await this.prisma.setting.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Setting ${key} not found`);
    }

    const updated = await this.prisma.setting.update({
      where: { key },
      data: {
        ...(dto.value !== undefined && { value: dto.value as Prisma.InputJsonValue }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entityType: 'setting',
      entityId: updated.id,
      oldValues: { value: existing.value },
      newValues: { value: updated.value },
    });

    return this.mapSetting(updated);
  }

  private mapSetting(s: {
    id: string;
    key: string;
    value: unknown;
    description: string | null;
    isPublic: boolean;
    updatedAt: Date;
  }): SettingDto {
    return {
      id: s.id,
      key: s.key,
      value: s.value,
      description: s.description ?? undefined,
      isPublic: s.isPublic,
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
