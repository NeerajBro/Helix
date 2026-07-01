import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CannedResponseDto } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateQuickReplyDto, UpdateQuickReplyDto } from './dto/quick-reply.dto';

const SETTING_KEY = 'agent.canned_responses';

interface StoredQuickReply {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class QuickRepliesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(departmentId?: string): Promise<CannedResponseDto[]> {
    const items = await this.readAll();
    return items
      .filter((item) => item.isActive)
      .filter((item) => !departmentId || !item.departmentId || item.departmentId === departmentId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async findAllAdmin(): Promise<CannedResponseDto[]> {
    const items = await this.readAll();
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
  }

  async create(dto: CreateQuickReplyDto): Promise<CannedResponseDto> {
    const items = await this.readAll();
    const shortcut = dto.shortcut.replace(/^\//, '').toLowerCase();
    if (items.some((i) => i.shortcut === shortcut)) {
      throw new ConflictException(`Shortcut /${shortcut} already exists`);
    }

    const now = new Date().toISOString();
    const created: StoredQuickReply = {
      id: randomUUID(),
      title: dto.title,
      shortcut,
      content: dto.content,
      departmentId: dto.departmentId,
      isActive: dto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await this.writeAll([created, ...items]);
    return created;
  }

  async update(id: string, dto: UpdateQuickReplyDto): Promise<CannedResponseDto> {
    const items = await this.readAll();
    const index = items.findIndex((i) => i.id === id);
    if (index < 0) {
      throw new NotFoundException(`Quick reply ${id} not found`);
    }

    const current = items[index];
    const shortcut = dto.shortcut ? dto.shortcut.replace(/^\//, '').toLowerCase() : current.shortcut;
    if (items.some((i) => i.id !== id && i.shortcut === shortcut)) {
      throw new ConflictException(`Shortcut /${shortcut} already exists`);
    }

    const updated: StoredQuickReply = {
      ...current,
      ...dto,
      shortcut,
      updatedAt: new Date().toISOString(),
    };
    items[index] = updated;
    await this.writeAll(items);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const items = await this.readAll();
    const next = items.filter((i) => i.id !== id);
    if (next.length === items.length) {
      throw new NotFoundException(`Quick reply ${id} not found`);
    }
    await this.writeAll(next);
  }

  private async readAll(): Promise<StoredQuickReply[]> {
    const setting = await this.prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!setting || !Array.isArray(setting.value)) {
      return [];
    }
    return setting.value as unknown as StoredQuickReply[];
  }

  private async writeAll(items: StoredQuickReply[]): Promise<void> {
    const value = items as unknown as Prisma.InputJsonValue;
    await this.prisma.setting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value,
        description: 'Agent quick replies for inbox slash commands',
        isPublic: false,
      },
      update: { value },
    });
  }
}
