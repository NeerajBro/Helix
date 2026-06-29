import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Flights' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'flights' })
  @IsString()
  @MinLength(2)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#1565c0' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBusinessHourDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0=Sunday, 6=Saturday' })
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  openTime!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  closeTime!: string;

  @ApiPropertyOptional({ default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBusinessHourDto {
  @ApiPropertyOptional()
  @IsOptional()
  openTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  closeTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
