import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MessageContentType, PaginationQuery } from '@helix/types';

export class MessageQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ enum: MessageContentType, default: MessageContentType.TEXT })
  @IsOptional()
  @IsEnum(MessageContentType)
  contentType?: MessageContentType;
}
