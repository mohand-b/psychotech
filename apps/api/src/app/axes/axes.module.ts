import { Module } from '@nestjs/common';
import { AxesController } from './axes.controller';
import { AxesRepository } from './axes.repository';
import { AxesService } from './axes.service';

@Module({
  controllers: [AxesController],
  providers: [AxesService, AxesRepository],
})
export class AxesModule {}
