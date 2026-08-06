import { EnergyPackId } from '../enums';

export interface EnergyPackDefinition {
  id: EnergyPackId;
  title: string;
  energyAmount: number;
  priceCents: number;
}

export const ENERGY_PACKS: readonly EnergyPackDefinition[] = [
  {
    id: EnergyPackId.DISCOVERY,
    title: 'Découverte',
    energyAmount: 15,
    priceCents: 290,
  },
  {
    id: EnergyPackId.PRE_EXAM,
    title: "Avant l'examen",
    energyAmount: 50,
    priceCents: 790,
  },
  {
    id: EnergyPackId.FULL_PREP,
    title: 'Préparation complète',
    energyAmount: 120,
    priceCents: 1490,
  },
];

export const ENERGY_PACK_BY_ID: ReadonlyMap<EnergyPackId, EnergyPackDefinition> =
  new Map(ENERGY_PACKS.map((pack) => [pack.id, pack]));

export function energyPackUnitPriceEur(pack: EnergyPackDefinition): number {
  return pack.priceCents / 100 / pack.energyAmount;
}
