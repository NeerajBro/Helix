import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { UploadableFile } from '../../infrastructure/storage/minio.service';
import { CreateMessageDto, MessageQueryDto } from './dto/message.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtPayload } from '@helix/types';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @RequirePermissions('messages:read')
  @ApiOperation({ summary: 'List conversation messages' })
  findAll(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.conversationsService.findMessages(conversationId, query);
  }

  @Post()
  @RequirePermissions('messages:create')
  @ApiOperation({ summary: 'Send message (text or with attachment)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: UploadableFile,
  ) {
    return this.conversationsService.createMessage(conversationId, dto, user, file);
  }
}
