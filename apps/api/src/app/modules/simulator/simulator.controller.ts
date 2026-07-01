import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { SimulatorService } from './simulator.service';
import {
  SimulatorCustomerQueryDto,
  SimulatorPresenceDto,
  SimulatorSendMessageDto,
} from './dto/simulator.dto';
import { UploadableFile } from '../../infrastructure/storage/minio.service';
import { RequirePermissions } from '../../core/decorators/auth.decorators';

@ApiTags('simulator')
@ApiBearerAuth()
@Controller('simulator')
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Get('customers')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'List customers for WhatsApp simulator' })
  listCustomers(@Query() query: SimulatorCustomerQueryDto) {
    return this.simulatorService.listCustomers(query);
  }

  @Get('customers/:id')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Get customer simulator state' })
  getCustomerState(@Param('id', ParseUUIDPipe) id: string) {
    return this.simulatorService.getCustomerState(id);
  }

  @Get('customers/:id/messages')
  @RequirePermissions('messages:read')
  @ApiOperation({ summary: 'List messages in customer active conversation' })
  getMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.simulatorService.getMessages(id);
  }

  @Post('customers/:id/messages')
  @RequirePermissions('messages:create')
  @ApiOperation({ summary: 'Send message as customer (simulator)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file'))
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SimulatorSendMessageDto,
    @UploadedFile() file?: UploadableFile,
  ) {
    return this.simulatorService.sendCustomerMessage(id, dto, file);
  }

  @Patch('customers/:id/presence')
  @RequirePermissions('conversations:update')
  @ApiOperation({ summary: 'Set customer online/offline status' })
  setPresence(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SimulatorPresenceDto) {
    return this.simulatorService.setPresence(id, dto);
  }

  @Post('customers/:id/read')
  @RequirePermissions('messages:read')
  @ApiOperation({ summary: 'Mark agent messages as read (seen ticks)' })
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.simulatorService.markMessagesRead(id);
  }

  @Post('customers/:id/csat')
  @RequirePermissions('conversations:read')
  @ApiOperation({ summary: 'Submit CSAT rating from simulator' })
  submitCsat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.simulatorService.submitCsat(id, body.rating, body.comment);
  }
}

