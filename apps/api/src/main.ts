import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { GlobalExceptionFilter } from './app/core/filters/global-exception.filter';
import { LoggingInterceptor } from './app/core/interceptors/logging.interceptor';
import { TransformInterceptor } from './app/core/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';
  const port = configService.get<number>('app.port', 3000);
  const corsOrigin = configService.get<string>('app.corsOrigin', 'http://localhost:4200');

  app.setGlobalPrefix(globalPrefix);
  app.enableCors({ origin: corsOrigin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HELIX API')
    .setDescription('Enterprise Customer Support Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  Logger.log(`HELIX API running at http://localhost:${port}/${globalPrefix}`);
  Logger.log(`Swagger docs at http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
