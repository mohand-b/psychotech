import { EnergyPackId } from '../enums';
import { ENERGY_PACKS } from './energy-packs';

export const GOOGLE_PLAY_PACKAGE_NAME = 'com.psychotechtraining.app';

export const GOOGLE_PLAY_BILLING_METHOD = 'https://play.google.com/billing';

export const GOOGLE_PLAY_PRODUCT_IDS: Readonly<Record<EnergyPackId, string>> = {
  [EnergyPackId.DISCOVERY]: 'pack_discovery',
  [EnergyPackId.PRE_EXAM]: 'pack_pre_exam',
  [EnergyPackId.FULL_PREP]: 'pack_full_prep',
};

export const ENERGY_PACK_ID_BY_GOOGLE_PLAY_PRODUCT_ID: ReadonlyMap<
  string,
  EnergyPackId
> = new Map(
  ENERGY_PACKS.map((pack) => [GOOGLE_PLAY_PRODUCT_IDS[pack.id], pack.id]),
);
