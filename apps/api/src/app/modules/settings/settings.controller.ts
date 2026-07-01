import { Controller, Get, Patch, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { UpdateSettingDto, UpdateWhiteLabelDto } from './dto/settings.dto';
import { RequirePermissions, Public } from '../../core/decorators/auth.decorators';
import { JwtPayload } from '@helix/types';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get public settings (white-label, etc.)' })
  getPublic() {
    return this.settingsService.getPublic();
  }

  @Get('white-label')
  @Public()
  @ApiOperation({ summary: 'Get white-label branding settings' })
  getWhiteLabel() {
    return this.settingsService.getWhiteLabel();
  }

  @Get()
  @RequirePermissions('settings:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Patch('white-label')
  @RequirePermissions('settings:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update white-label settings' })
  updateWhiteLabel(@Body() dto: UpdateWhiteLabelDto, @Req() req: Request & { user: JwtPayload }) {
    return this.settingsService.updateWhiteLabel(dto, req.user.sub);
  }

  @Patch(':key')
  @RequirePermissions('settings:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a setting by key' })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.settingsService.update(key, dto, req.user.sub);
  }
}
