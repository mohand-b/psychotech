import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EnergyModule } from './energy/energy.module';
import { ScoringModule } from './scoring/scoring.module';
import { SessionsModule } from './sessions/sessions.module';
import { authConfig } from './config/auth.config';
import { validateEnvironment } from './config/environment.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
      load: [authConfig],
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    EnergyModule,
    ScoringModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
