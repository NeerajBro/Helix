import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { DashboardModule } from '../../modules/dashboard/dashboard.module';
import { EventsGateway } from './events.gateway';
import { RealtimeService } from './realtime.service';
import { SocketAuthService } from './socket-auth.service';

@Global()
@Module({
  imports: [AuthModule, DashboardModule],
  providers: [EventsGateway, SocketAuthService, RealtimeService],
  exports: [RealtimeService, EventsGateway],
})
export class SocketModule {}
