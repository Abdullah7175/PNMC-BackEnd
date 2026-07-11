import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const isProd = config.get('NODE_ENV') === 'production';

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: isProd ? undefined : false,
  }));

  // Limit JSON / form body size (OWASP — DoS protection)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const apiPrefix = config.get('API_PREFIX') ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Files are served via authenticated/signed FilesController — not public static

  if (!isProd || config.get('ENABLE_SWAGGER') === 'true') {
    const swagger = new DocumentBuilder()
      .setTitle('PNMC Field Inspector API')
      .setDescription(
        'Backend API for PNMC Field Inspector mobile app and supervisor portal',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = config.get('PORT') ?? 3001;
  await app.listen(port);
  console.log(`PNMC API running on http://localhost:${port}`);
  if (!isProd || config.get('ENABLE_SWAGGER') === 'true') {
    console.log(`Swagger docs: http://localhost:${port}/docs`);
  }
}
bootstrap();
