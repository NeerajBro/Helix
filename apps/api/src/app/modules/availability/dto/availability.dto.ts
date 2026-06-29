import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentAvailabilityStatus } from '@prisma/client';

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: AgentAvailabilityStatus })
  @IsEnum(AgentAvailabilityStatus)
  status!: AgentAvailabilityStatus;

  @ApiPropertyOptional({ description: 'Reason for status change (e.g. break type)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
