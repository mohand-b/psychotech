import {
  ENERGY_PACKS,
  EnergyPackDefinition,
  EnergyPackId,
  SESSION_ENERGY_COST,
  SESSION_MODE_LABELS_LOWER,
  SessionMode,
  energyPackUnitPriceEur,
  fullSessionCountLabel,
  targetedSessionCountLabel,
} from '@psychotech/shared';
import { formatEuroAmount } from './format-euro';

export interface EnergyPackOffer {
  id: EnergyPackId;
  title: string;
  tagline: string;
  credits: number;
  priceLabel: string;
  unitPriceLabel: string;
  discountLabel: string | null;
  examCountLabel: string;
  targetedCountLabel: string;
  featured: boolean;
}

export interface SessionCreditCost {
  cost: number;
  label: string;
}

const FEATURED_ENERGY_PACK = EnergyPackId.PRE_EXAM;

const REFERENCE_UNIT_PRICE_EUR = Math.max(
  ...ENERGY_PACKS.map(energyPackUnitPriceEur),
);

function formatEuroPrice(amountEur: number): string {
  return `${formatEuroAmount(amountEur)}\u00A0€`;
}

function buildDiscountLabel(pack: EnergyPackDefinition): string | null {
  const percent = Math.round(
    (1 - energyPackUnitPriceEur(pack) / REFERENCE_UNIT_PRICE_EUR) * 100,
  );
  return percent > 0 ? `\u2212${percent}\u00A0%` : null;
}

function buildEnergyPackOffer(pack: EnergyPackDefinition): EnergyPackOffer {
  const examCount = Math.floor(
    pack.energyAmount / SESSION_ENERGY_COST[SessionMode.FULL],
  );
  const targetedCount = Math.floor(
    pack.energyAmount / SESSION_ENERGY_COST[SessionMode.TARGETED],
  );
  return {
    id: pack.id,
    title: pack.title,
    tagline: pack.tagline,
    credits: pack.energyAmount,
    priceLabel: formatEuroPrice(pack.priceCents / 100),
    unitPriceLabel: formatEuroPrice(energyPackUnitPriceEur(pack)),
    discountLabel: buildDiscountLabel(pack),
    examCountLabel: `${examCount} ${fullSessionCountLabel(examCount)}`,
    targetedCountLabel: `${targetedCount} ${targetedSessionCountLabel(targetedCount)}`,
    featured: pack.id === FEATURED_ENERGY_PACK,
  };
}

export const ENERGY_PACK_OFFERS: readonly EnergyPackOffer[] =
  ENERGY_PACKS.map(buildEnergyPackOffer);

export const SESSION_CREDIT_COSTS: readonly SessionCreditCost[] = [
  {
    cost: SESSION_ENERGY_COST[SessionMode.TARGETED],
    label: `un ${SESSION_MODE_LABELS_LOWER[SessionMode.TARGETED]}`,
  },
  {
    cost: SESSION_ENERGY_COST[SessionMode.FULL],
    label: `un ${SESSION_MODE_LABELS_LOWER[SessionMode.FULL]} complet`,
  },
];
