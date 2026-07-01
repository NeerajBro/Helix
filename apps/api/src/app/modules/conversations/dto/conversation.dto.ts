import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ConversationPriority, ConversationStatus, PaginationQuery } from '@helix/types';

export enum InboxView {
  ALL = 'all',
  ACTIVE = 'active',
  QUEUE = 'queue',
  WAITING_ON_AGENT = 'waitingOnAgent',
  WAITING_ON_USER = 'waitingOnCustomer',
}

export class ConversationQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ enum: ConversationPriority })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  queueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by bot-handled conversations' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  botHandled?: boolean;

  @ApiPropertyOptional({ enum: InboxView })
  @IsOptional()
  @IsEnum(InboxView)
  inboxView?: InboxView;
}

export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  queueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: ConversationPriority })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;
}

export class UpdateConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: ConversationPriority })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;
}

export class AssignConversationDto {
  @ApiProperty()
  @IsUUID()
  agentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferConversationDto {
  @ApiProperty()
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  queueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddTagDto {
  @ApiProperty()
  @IsUUID()
  tagId!: string;
}

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '#1976d2' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class CreateInternalNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;
}
