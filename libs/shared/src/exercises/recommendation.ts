import { RecommendationPriority } from '../enums';

export interface TrainingRecommendation {
  id: string;
  label: string;
  priority: RecommendationPriority;
}
