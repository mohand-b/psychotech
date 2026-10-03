import { EnergyPackId } from '../enums';

export interface EnergyPackDefinition {
  id: EnergyPackId;
  title: string;
  tagline: string;
  energyAmount: number;
  priceCents: number;
}

export const ENERGY_PACKS: readonly EnergyPackDefinition[] = [
  {
    id: EnergyPackId.DISCOVERY,
    title: 'Découverte',
    tagline: 'Pour découvrir le format',
    energyAmount: 15,
    priceCents: 290,
  },
  {
    id: EnergyPackId.PRE_EXAM,
    title: "Avant l'examen",
    tagline: 'Pour une sélection proche',
    energyAmount: 50,
    priceCents: 790,
  },
  {
    id: EnergyPackId.FULL_PREP,
    title: 'Préparation complète',
    tagline: 'Pour plusieurs mois de préparation',
    energyAmount: 120,
    priceCents: 1490,
  },
];

export const ENERGY_PACK_BY_ID: ReadonlyMap<EnergyPackId, EnergyPackDefinition> =
  new Map(ENERGY_PACKS.map((pack) => [pack.id, pack]));

export function energyPackUnitPriceEur(pack: EnergyPackDefinition): number {
  return pack.priceCents / 100 / pack.energyAmount;
}
