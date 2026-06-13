import { Injectable } from '@nestjs/common';
import { AxisMetrics, ScoreBand } from '@psychotech/shared';
import {
  AxisScore,
  SessionEvaluation,
  SessionThresholds,
  evaluateSession,
  normalizeAxis,
  scoreBand,
} from './scoring.logic';

export interface AxisScoreResult {
  normalizedScore: number;
  band: ScoreBand;
}

@Injectable()
export class ScoringService {
  scoreAxis(metrics: AxisMetrics): AxisScoreResult {
    const normalizedScore = normalizeAxis(metrics);
    return { normalizedScore, band: scoreBand(normalizedScore) };
  }

  evaluateSession(
    scores: AxisScore[],
    thresholds: SessionThresholds,
  ): SessionEvaluation {
    return evaluateSession(scores, thresholds);
  }
}
