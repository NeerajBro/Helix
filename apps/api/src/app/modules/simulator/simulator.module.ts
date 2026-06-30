import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { BotModule } from '../bot/bot.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [BotModule, IntegrationsModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
