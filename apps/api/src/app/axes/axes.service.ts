import { Injectable } from '@nestjs/common';
import { AxisBest } from '@prisma/client';
import { AxisBestDto, AxisType, ScoreBand } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { AxesRepository } from './axes.repository';

@Injectable()
export class AxesService {
  constructor(private readonly repository: AxesRepository) {}

  async getBestScores(userId: string): Promise<AxisBestDto[]> {
    const bests = await this.repository.findAxisBests(userId);
    return bests.map((best) => this.toDto(best));
  }

  private toDto(best: AxisBest): AxisBestDto {
    return {
      axis: mapEnumValue(AxisType, best.axis),
      bestScore: best.bestScore,
      band: mapEnumValue(ScoreBand, best.band),
      achievedAt: best.achievedAt.toISOString(),
    };
  }
}
