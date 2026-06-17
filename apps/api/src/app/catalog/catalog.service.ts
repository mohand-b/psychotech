import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AxisCatalogDto,
  SectorReferentialDto,
  SectorSummaryDto,
} from '@psychotech/shared';
import {
  buildAxisCatalog,
  buildSectorReferential,
  buildSectorSummaries,
  isKnownSector,
} from './catalog.logic';
import { CatalogRepository } from './catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async getSectors(): Promise<SectorSummaryDto[]> {
    return buildSectorSummaries(await this.repository.findAllSectors());
  }

  async getSectorReferential(code: string): Promise<SectorReferentialDto> {
    if (!isKnownSector(code)) {
      throw new NotFoundException('Sector not found');
    }
    const sector = await this.repository.findSectorReferential(code);
    if (!sector) {
      throw new NotFoundException('Sector not found');
    }
    return buildSectorReferential(sector);
  }

  getAxes(): AxisCatalogDto[] {
    return buildAxisCatalog();
  }
}
