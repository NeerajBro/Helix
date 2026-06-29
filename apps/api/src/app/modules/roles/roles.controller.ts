import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all roles with permissions' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all permissions grouped by module' })
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }
}
