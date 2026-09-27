import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { PrismaService } from './common/prisma/prisma.service';
import { requestLoggingMiddleware } from './common/http/request-logging.middleware';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  const allowedOrigins = configService.get<string[]>('CORS_ALLOWED_ORIGINS') ?? [];
  const trustProxyHeaders = configService.get<string>('TRUST_PROXY_HEADERS') === 'true';
  const expressApp = app.getHttpAdapter().getInstance();

  if (trustProxyHeaders) {
    expressApp.set('trust proxy', true);
  }

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLoggingMiddleware);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await prismaService.enableShutdownHooks(app);
  await app.listen(configService.get<number>('PORT') ?? 3004);
}

bootstrap();
