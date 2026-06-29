import { IsString, IsOptional, IsArray, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillDto {
  @ApiProperty({ example: 'Flight Booking' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'flight-booking' })
  @IsString()
  @MinLength(2)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds?: string[];
}

export class UpdateSkillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds?: string[];
}

export class AssignUserSkillDto {
  @ApiProperty()
  @IsUUID()
  skillId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 5 })
  @IsOptional()
  level?: number;
}
