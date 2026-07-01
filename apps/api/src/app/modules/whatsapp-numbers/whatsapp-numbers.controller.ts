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
import { WhatsAppNumbersService } from './whatsapp-numbers.service';
import { CreateWhatsAppNumberDto, UpdateWhatsAppNumberDto } from './dto/whatsapp-number.dto';
import { RequirePermissions } from '../../core/decorators/auth.decorators';
import { JwtPayload } from '@helix/types';

@ApiTags('whatsapp-numbers')
@ApiBearerAuth()
@Controller('whatsapp-numbers')
export class WhatsAppNumbersController {
  constructor(private readonly numbersService: WhatsAppNumbersService) {}

  @Get()
  @RequirePermissions('settings:read')
  findAll() {
    return this.numbersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('settings:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.numbersService.findOne(id);
  }

  @Post()
  @RequirePermissions('settings:update')
  create(@Body() dto: CreateWhatsAppNumberDto, @Req() req: Request & { user: JwtPayload }) {
    return this.numbersService.create(dto, req.user.sub);
  }

  @Patch(':id')
  @RequirePermissions('settings:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWhatsAppNumberDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.numbersService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('settings:update')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.numbersService.remove(id, req.user.sub);
  }
}
