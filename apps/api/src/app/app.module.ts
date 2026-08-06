import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AxesModule } from './axes/axes.module';
import { BadgesModule } from './badges/badges.module';
import { BillingModule } from './billing/billing.module';
import { CatalogModule } from './catalog/catalog.module';
import { EnergyModule } from './energy/energy.module';
import { GamepadModule } from './gamepad/gamepad.module';
import { ProgressionModule } from './progression/progression.module';
import { ScoringModule } from './scoring/scoring.module';
import { SessionsModule } from './sessions/sessions.module';
import { TrainingsModule } from './trainings/trainings.module';
import { UsersModule } from './users/users.module';
import { authConfig } from './config/auth.config';
import { mailConfig } from './config/mail.config';
import { billingConfig } from './config/billing.config';
import { validateEnvironment } from './config/environment.validation';
import { webAppServingImports } from './config/web-app-serving';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
      load: [authConfig, billingConfig, mailConfig],
      validate: validateEnvironment,
    }),
    ...webAppServingImports(),
    PrismaModule,
    AuthModule,
    BillingModule,
    UsersModule,
    CatalogModule,
    AxesModule,
    EnergyModule,
    GamepadModule,
    ScoringModule,
    SessionsModule,
    TrainingsModule,
    ProgressionModule,
    BadgesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
