import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  IsEnum,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueueRoutingStrategy } from '@prisma/client';

export class CreateQueueDto {
  @ApiProperty({ example: 'Flights Queue' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'flights-queue' })
  @IsString()
  @MinLength(2)
  slug!: string;

  @ApiProperty()
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  skillId?: string;

  @ApiPropertyOptional({ enum: QueueRoutingStrategy, default: 'ROUND_ROBIN' })
  @IsOptional()
  @IsEnum(QueueRoutingStrategy)
  routingStrategy?: QueueRoutingStrategy;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'SLA first response in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaFirstResponse?: number;

  @ApiPropertyOptional({ description: 'SLA resolution in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaResolution?: number;
}

export class UpdateQueueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  skillId?: string;

  @ApiPropertyOptional({ enum: QueueRoutingStrategy })
  @IsOptional()
  @IsEnum(QueueRoutingStrategy)
  routingStrategy?: QueueRoutingStrategy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  slaFirstResponse?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  slaResolution?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CalculatePriorityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isComplaint?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUrgentTravel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  sentimentScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  waitingMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappExpiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  slaBreached?: boolean;
}
