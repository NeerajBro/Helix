import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import {
  AddTagDto,
  AssignConversationDto,
  ConversationQueryDto,
  CreateConversationDto,
  CreateInternalNoteDto,
  CreateTagDto,
  TransferConversationDto,
  UpdateConversationDto,
} from './dto/conversation.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtPayload } from '@helix/types';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List conversations' })
  findAll(@Query() query: ConversationQueryDto) {
    return this.conversationsService.findAll(query);
  }

  @Get('tags')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List conversation tags' })
  findTags() {
    return this.conversationsService.findTags();
  }

  @Post('tags')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Create tag' })
  createTag(@Body() dto: CreateTagDto) {
    return this.conversationsService.createTag(dto);
  }

  @Get(':id')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Get conversation detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.findOne(id);
  }

  @Post()
  @RequirePermissions('conversations:create')
  @ApiOperation({ summary: 'Create conversation' })
  create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Update conversation' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConversationDto) {
    return this.conversationsService.update(id, dto);
  }

  @Patch(':id/assign')
  @RequirePermissions('conversations:assign')
  @ApiOperation({ summary: 'Assign conversation to agent' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignConversationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.conversationsService.assign(id, dto, user);
  }

  @Patch(':id/transfer')
  @RequirePermissions('conversations:transfer')
  @ApiOperation({ summary: 'Transfer conversation' })
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferConversationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.conversationsService.transfer(id, dto, user);
  }

  @Patch(':id/resolve')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Resolve conversation' })
  resolve(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.resolve(id);
  }

  @Patch(':id/close')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Close conversation' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.close(id);
  }

  @Patch(':id/lock')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Lock conversation for editing' })
  lock(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.conversationsService.lock(id, user);
  }

  @Patch(':id/unlock')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Unlock conversation' })
  unlock(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.conversationsService.unlock(id, user);
  }

  @Post(':id/tags')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Add tag to conversation' })
  addTag(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddTagDto) {
    return this.conversationsService.addTag(id, dto);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Remove tag from conversation' })
  removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.conversationsService.removeTag(id, tagId);
  }

  @Get(':id/notes')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List internal notes' })
  findNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.findNotes(id);
  }

  @Post(':id/notes')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Add internal note' })
  createNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInternalNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.conversationsService.createNote(id, dto, user);
  }
}
