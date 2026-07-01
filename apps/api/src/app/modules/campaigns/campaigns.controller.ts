import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/campaign.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { JwtPayload } from '@helix/types';

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions('campaigns:read')
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('campaigns:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignsService.findOne(id);
  }

  @Get(':id/recipients')
  @RequirePermissions('campaigns:read')
  getRecipients(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignsService.getRecipients(id);
  }

  @Post()
  @RequirePermissions('campaigns:create')
  create(@Body() dto: CreateCampaignDto, @Req() req: Request & { user: JwtPayload }) {
    return this.campaignsService.create(dto, req.user.sub);
  }

  @Post(':id/start')
  @RequirePermissions('campaigns:update')
  start(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.campaignsService.start(id, req.user.sub);
  }

  @Post(':id/cancel')
  @RequirePermissions('campaigns:update')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.campaignsService.cancel(id, req.user.sub);
  }
}
