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
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto, UpdateQuickReplyDto } from './dto/quick-reply.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('quick-replies')
@ApiBearerAuth()
@Controller('quick-replies')
export class QuickRepliesController {
  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  @Get()
  @RequirePermissions('messages:read')
  @ApiOperation({ summary: 'List active quick replies for agents' })
  findAll(@Query('departmentId') departmentId?: string) {
    return this.quickRepliesService.findAll(departmentId);
  }

  @Get('admin')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List all quick replies (admin)' })
  findAllAdmin() {
    return this.quickRepliesService.findAllAdmin();
  }

  @Post()
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Create quick reply' })
  create(@Body() dto: CreateQuickReplyDto) {
    return this.quickRepliesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Update quick reply' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuickReplyDto) {
    return this.quickRepliesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Delete quick reply' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.quickRepliesService.remove(id);
  }
}
