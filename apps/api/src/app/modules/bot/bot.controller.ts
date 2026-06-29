import { Controller, Get, Param, ParseUUIDPipe, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { BotHandoffDto } from './dto/bot.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { BOT_INTENTS } from '@helix/types';

@ApiTags('bot')
@ApiBearerAuth()
@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Get('intents')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List bot intent rules and queue mappings' })
  listIntents() {
    return this.botService.listIntents();
  }

  @Post('conversations/:id/handoff')
  @RequirePermissions('conversations:transfer')
  @ApiOperation({ summary: 'Manually trigger bot-to-human handoff' })
  handoff(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BotHandoffDto) {
    return this.botService.handoffToHuman(
      id,
      dto.intent ?? BOT_INTENTS.GENERAL,
      dto.reason ?? 'Manual handoff',
    );
  }

  @Post('conversations/:id/summary')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Regenerate AI conversation summary' })
  regenerateSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.botService.regenerateSummary(id);
  }
}
