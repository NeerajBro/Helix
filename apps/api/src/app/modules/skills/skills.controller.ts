import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto, UpdateSkillDto, AssignUserSkillDto } from './dto/skill.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('skills')
@ApiBearerAuth()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @RequirePermissions('skills:read')
  @ApiOperation({ summary: 'List all skills' })
  findAll() {
    return this.skillsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('skills:read')
  @ApiOperation({ summary: 'Get skill by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.skillsService.findOne(id);
  }

  @Post()
  @RequirePermissions('skills:create')
  @ApiOperation({ summary: 'Create skill' })
  create(@Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('skills:update')
  @ApiOperation({ summary: 'Update skill' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('skills:delete')
  @ApiOperation({ summary: 'Soft delete skill' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.skillsService.remove(id);
  }

  @Post('users/:userId/assign')
  @RequirePermissions('skills:update')
  @ApiOperation({ summary: 'Assign skill to user' })
  assignToUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignUserSkillDto,
  ) {
    return this.skillsService.assignToUser(userId, dto);
  }

  @Delete('users/:userId/:skillId')
  @RequirePermissions('skills:update')
  @ApiOperation({ summary: 'Remove skill from user' })
  removeFromUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
  ) {
    return this.skillsService.removeFromUser(userId, skillId);
  }
}
