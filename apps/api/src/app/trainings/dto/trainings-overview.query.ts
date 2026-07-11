import { IsEnum } from 'class-validator';
import { Sector } from '@psychotech/shared';

export class TrainingsOverviewQuery {
  @IsEnum(Sector)
  sector!: Sector;
}
