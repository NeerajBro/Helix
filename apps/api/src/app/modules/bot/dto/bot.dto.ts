import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BOT_INTENTS, BotIntent } from '@helix/types';

const VALID_INTENTS = [...Object.values(BOT_INTENTS), 'unknown'] as const;

export class BotHandoffDto {
  @ApiPropertyOptional({ enum: VALID_INTENTS })
  @IsOptional()
  @IsIn(VALID_INTENTS as unknown as string[])
  intent?: BotIntent;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
