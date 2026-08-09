import {
  ENERGY_PACKS,
  ENERGY_PACK_BY_ID,
  energyPackUnitPriceEur,
} from './energy-packs';
import { SESSION_ENERGY_COST, SIGNUP_ENERGY_GRANT } from './energy-rules';
import { EnergyPackId, SessionMode } from '../enums';

describe('energy rules', () => {
  it('prices the session modes at 5, 1 and 0 energies', () => {
    expect(SESSION_ENERGY_COST[SessionMode.FULL]).toBe(5);
    expect(SESSION_ENERGY_COST[SessionMode.TARGETED]).toBe(1);
    expect(SESSION_ENERGY_COST[SessionMode.TUTORIAL]).toBe(0);
  });

  it('grants three credits at account creation', () => {
    expect(SIGNUP_ENERGY_GRANT).toBe(3);
  });
});

describe('energy packs', () => {
  it('sells the three one-time packs at the agreed prices', () => {
    expect(ENERGY_PACKS).toHaveLength(3);
    expect(ENERGY_PACK_BY_ID.get(EnergyPackId.DISCOVERY)).toMatchObject({
      title: 'Découverte',
      energyAmount: 15,
      priceCents: 290,
    });
    expect(ENERGY_PACK_BY_ID.get(EnergyPackId.PRE_EXAM)).toMatchObject({
      title: "Avant l'examen",
      energyAmount: 50,
      priceCents: 790,
    });
    expect(ENERGY_PACK_BY_ID.get(EnergyPackId.FULL_PREP)).toMatchObject({
      title: 'Préparation complète',
      energyAmount: 120,
      priceCents: 1490,
    });
  });

  it('discounts the unit price as the pack grows', () => {
    const [discovery, preExam, fullPrep] = ENERGY_PACKS;
    expect(energyPackUnitPriceEur(discovery)).toBeCloseTo(0.19, 2);
    expect(energyPackUnitPriceEur(preExam)).toBeCloseTo(0.16, 2);
    expect(energyPackUnitPriceEur(fullPrep)).toBeCloseTo(0.12, 2);
    expect(energyPackUnitPriceEur(discovery)).toBeGreaterThan(
      energyPackUnitPriceEur(preExam),
    );
    expect(energyPackUnitPriceEur(preExam)).toBeGreaterThan(
      energyPackUnitPriceEur(fullPrep),
    );
  });
});
