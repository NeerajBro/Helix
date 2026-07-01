import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { JwtPayload } from '@helix/types';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @RequirePermissions('templates:read')
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('templates:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  @RequirePermissions('templates:create')
  create(@Body() dto: CreateTemplateDto, @Req() req: Request & { user: JwtPayload }) {
    return this.templatesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @RequirePermissions('templates:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.templatesService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('templates:delete')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.templatesService.remove(id, req.user.sub);
  }
}
