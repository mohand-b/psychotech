import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AxisType,
  ScoreBand,
  Sector,
  TrainingsAxisOverviewDto,
  TrainingsLastSimulationDto,
  TrainingsOverviewDto,
  isVeryCriticalAxisCoefficient,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { TrainingsRepository } from './trainings.repository';

@Injectable()
export class TrainingsService {
  constructor(private readonly repository: TrainingsRepository) {}

  async getOverview(
    userId: string,
    sector: Sector,
  ): Promise<TrainingsOverviewDto> {
    const config = await this.repository.findSectorConfig(sector);
    if (!config) {
      throw new BadRequestException('The requested sector is not available');
    }
    const [lastSession, bests] = await Promise.all([
      this.repository.findLastCompletedFullSession(userId, sector),
      this.repository.findAxisBests(userId),
    ]);
    const bestByAxis = new Map(
      bests.map((best) => [mapEnumValue(AxisType, best.axis), best.bestScore]),
    );
    const axes: TrainingsAxisOverviewDto[] = [...config.weights]
      .sort((a, b) => a.order - b.order)
      .map((weight) => {
        const bestScore = bestByAxis.get(weight.axis) ?? null;
        return {
          axis: weight.axis,
          bestScore,
          neverPlayed: bestScore === null,
          isCriticalAxis: isVeryCriticalAxisCoefficient(weight.coefficient),
          needsWork:
            bestScore !== null && bestScore < config.vigilanceThreshold,
        };
      });
    return {
      lastSimulation: this.toLastSimulation(lastSession),
      vigilanceThreshold: config.vigilanceThreshold,
      axes,
    };
  }

  private toLastSimulation(
    session: Awaited<
      ReturnType<TrainingsRepository['findLastCompletedFullSession']>
    >,
  ): TrainingsLastSimulationDto | null {
    if (
      !session ||
      session.globalScore === null ||
      session.globalBand === null ||
      session.completedAt === null
    ) {
      return null;
    }
    return {
      sessionId: session.id,
      globalScore: session.globalScore,
      globalBand: mapEnumValue(ScoreBand, session.globalBand),
      isAdmissible: session.isAdmissible ?? false,
      isEliminated: session.isEliminated ?? false,
      sectorThreshold: session.sectorThreshold,
      completedAt: session.completedAt.toISOString(),
    };
  }
}
