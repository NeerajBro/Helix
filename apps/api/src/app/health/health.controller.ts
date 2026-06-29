import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { Public } from '../core/decorators/auth.decorators';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let database = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'error';
    }

    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'helix-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        database,
      },
    };
  }
}
