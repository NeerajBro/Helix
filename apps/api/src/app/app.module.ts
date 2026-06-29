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
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    SkillsModule,
    QueuesModule,
    AvailabilityModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
