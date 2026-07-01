import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WhatsAppNumberDto } from '@helix/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { CreateWhatsAppNumberDto, UpdateWhatsAppNumberDto } from './dto/whatsapp-number.dto';

@Injectable()
export class WhatsAppNumbersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<WhatsAppNumberDto[]> {
    const numbers = await this.prisma.whatsAppNumber.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return numbers.map((n) => this.mapNumber(n));
  }

  async findOne(id: string): Promise<WhatsAppNumberDto> {
    const number = await this.prisma.whatsAppNumber.findFirst({
      where: { id, deletedAt: null },
    });
    if (!number) throw new NotFoundException(`WhatsApp number ${id} not found`);
    return this.mapNumber(number);
  }

  async create(dto: CreateWhatsAppNumberDto, userId?: string): Promise<WhatsAppNumberDto> {
    const existing = await this.prisma.whatsAppNumber.findFirst({
      where: { phoneNumber: dto.phoneNumber, deletedAt: null },
    });
    if (existing) throw new ConflictException('Phone number already registered');

    if (dto.isDefault) {
      await this.prisma.whatsAppNumber.updateMany({
        where: { isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const number = await this.prisma.whatsAppNumber.create({
      data: {
        phoneNumber: dto.phoneNumber,
        displayName: dto.displayName,
        businessName: dto.businessName,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entityType: 'whatsapp_number',
      entityId: number.id,
      newValues: { phoneNumber: number.phoneNumber },
    });

    return this.mapNumber(number);
  }

  async update(id: string, dto: UpdateWhatsAppNumberDto, userId?: string): Promise<WhatsAppNumberDto> {
    await this.findOne(id);

    if (dto.isDefault) {
      await this.prisma.whatsAppNumber.updateMany({
        where: { isDefault: true, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const number = await this.prisma.whatsAppNumber.update({
      where: { id },
      data: dto,
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entityType: 'whatsapp_number',
      entityId: id,
      newValues: dto as Record<string, unknown>,
    });

    return this.mapNumber(number);
  }

  async remove(id: string, userId?: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.whatsAppNumber.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, isDefault: false },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entityType: 'whatsapp_number',
      entityId: id,
    });
    return { deleted: true };
  }

  private mapNumber(n: {
    id: string;
    phoneNumber: string;
    displayName: string;
    businessName: string | null;
    isActive: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): WhatsAppNumberDto {
    return {
      id: n.id,
      phoneNumber: n.phoneNumber,
      displayName: n.displayName,
      businessName: n.businessName ?? undefined,
      isActive: n.isActive,
      isDefault: n.isDefault,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }
}
