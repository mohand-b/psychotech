import { Module } from '@nestjs/common';
import { ProgressionController } from './progression.controller';
import { ProgressionRepository } from './progression.repository';
import { ProgressionService } from './progression.service';

@Module({
  controllers: [ProgressionController],
  providers: [ProgressionService, ProgressionRepository],
})
export class ProgressionModule {}
