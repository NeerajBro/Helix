import { IsString, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MessageContentType, PaginationQuery } from '@helix/types';

export class SimulatorCustomerQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class SimulatorSendMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ enum: MessageContentType })
  @IsOptional()
  @IsEnum(MessageContentType)
  contentType?: MessageContentType;
}

export class SimulatorPresenceDto {
  @ApiProperty()
  @IsBoolean()
  isOnline!: boolean;
}
