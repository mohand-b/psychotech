import { networkInterfaces } from 'node:os';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from './app/app.module';

const JSON_BODY_LIMIT = '3mb';
const WEB_DEV_SERVER_PORT = 4200;
const PRIVATE_LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function detectLanAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return null;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const configService = app.get(ConfigService);
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigin = configService.getOrThrow<string>('CORS_ORIGIN');
  app.enableCors({
    origin: isProduction
      ? configuredOrigin
      : [configuredOrigin, PRIVATE_LAN_ORIGIN],
    credentials: true,
  });
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  if (!isProduction) {
    const lanAddress = detectLanAddress();
    if (lanAddress) {
      Logger.log(
        `LAN access: open http://${lanAddress}:${WEB_DEV_SERVER_PORT} on the desktop so the gamepad QR targets the right origin`,
      );
    }
  }
}

bootstrap();
