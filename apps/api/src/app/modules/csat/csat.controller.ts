import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CsatService } from './csat.service';
import { SubmitCsatDto } from './dto/csat.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('csat')
@ApiBearerAuth()
@Controller('csat')
export class CsatController {
  constructor(private readonly csatService: CsatService) {}

  @Post()
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Submit CSAT rating for a conversation' })
  submit(@Body() dto: SubmitCsatDto) {
    return this.csatService.submit(dto);
  }

  @Get('conversations/:conversationId')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Get CSAT survey for a conversation' })
  getForConversation(@Param('conversationId', ParseUUIDPipe) conversationId: string) {
    return this.csatService.getForConversation(conversationId);
  }
}
