import { Injectable } from '@nestjs/common';
import {
  AxisScore,
  SessionEvaluation,
  SessionThresholds,
  evaluateSession,
} from './scoring.logic';

@Injectable()
export class ScoringService {
  evaluateSession(
    scores: AxisScore[],
    thresholds: SessionThresholds,
  ): SessionEvaluation {
    return evaluateSession(scores, thresholds);
  }
}
