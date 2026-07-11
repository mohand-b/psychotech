import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AxesModule } from './axes/axes.module';
import { BadgesModule } from './badges/badges.module';
import { CatalogModule } from './catalog/catalog.module';
import { EnergyModule } from './energy/energy.module';
import { GamepadModule } from './gamepad/gamepad.module';
import { ProgressionModule } from './progression/progression.module';
import { ScoringModule } from './scoring/scoring.module';
import { SessionsModule } from './sessions/sessions.module';
import { TrainingsModule } from './trainings/trainings.module';
import { UsersModule } from './users/users.module';
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
  providers: [AppService],
})
export class AppModule {}
