import { Controller, Get, Param } from '@nestjs/common';
import {
  AxisCatalogDto,
  SectorReferentialDto,
  SectorSummaryDto,
} from '@psychotech/shared';
import { Public } from '../auth/decorators/public.decorator';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get('sectors')
  getSectors(): Promise<SectorSummaryDto[]> {
    return this.catalogService.getSectors();
  }

  @Public()
  @Get('sectors/:code')
  getSector(@Param('code') code: string): Promise<SectorReferentialDto> {
    return this.catalogService.getSectorReferential(code);
  }

  @Public()
  @Get('axes')
  getAxes(): AxisCatalogDto[] {
    return this.catalogService.getAxes();
  }
}
