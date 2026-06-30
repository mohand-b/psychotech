import { Injectable } from '@nestjs/common';
import { AxisBest } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AxesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAxisBests(userId: string): Promise<AxisBest[]> {
    return this.prisma.axisBest.findMany({ where: { userId } });
  }
}
