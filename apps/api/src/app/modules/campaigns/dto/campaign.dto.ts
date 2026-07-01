import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CampaignRecipientInputDto {
  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  variables?: Record<string, string>;
}

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  whatsAppNumberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ type: [CampaignRecipientInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignRecipientInputDto)
  recipients!: CampaignRecipientInputDto[];
}
