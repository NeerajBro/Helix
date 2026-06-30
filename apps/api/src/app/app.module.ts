import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { SkillsModule } from './modules/skills/skills.module';
import { QueuesModule } from './modules/queues/queues.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SimulatorModule } from './modules/simulator/simulator.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { SocketModule } from './infrastructure/socket/socket.module';
import { WhatsAppAdapterModule } from './adapters/whatsapp/whatsapp.module';
import { BotAdapterModule } from './adapters/bot/bot.module';
import { AiAdapterModule } from './adapters/ai/ai.module';
import { BotModule } from './modules/bot/bot.module';
import { SalesforceAdapterModule } from './adapters/salesforce/salesforce.module';
import { BookingAdapterModule } from './adapters/booking/booking.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { PermissionsGuard } from './core/guards/permissions.guard';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  minioConfig,
  redisConfig,
} from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, minioConfig],
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    StorageModule,
    SocketModule,
    WhatsAppAdapterModule,
    BotAdapterModule,
    AiAdapterModule,
    SalesforceAdapterModule,
    BookingAdapterModule,
    IntegrationsModule,
    BookingsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    SkillsModule,
    QueuesModule,
    AvailabilityModule,
    CustomersModule,
    ConversationsModule,
    DashboardModule,
    SimulatorModule,
    BotModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
