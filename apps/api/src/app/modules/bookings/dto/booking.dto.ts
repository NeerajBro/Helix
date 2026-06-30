import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BookingQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}
