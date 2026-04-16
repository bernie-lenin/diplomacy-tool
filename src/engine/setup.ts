import { Power, UnitType, Unit, Season, Phase, GameState, SerializedGameState } from './types';
import { PROVINCES } from './provinces';

const A = UnitType.Army;
const F = UnitType.Fleet;

export const STARTING_UNITS: Unit[] = [
  // Austria
  { type: A, power: Power.Austria, provinceId: 'vie' },
  { type: A, power: Power.Austria, provinceId: 'bud' },
  { type: F, power: Power.Austria, provinceId: 'tri' },
  // England
  { type: F, power: Power.England, provinceId: 'edi' },
  { type: F, power: Power.England, provinceId: 'lon' },
  { type: A, power: Power.England, provinceId: 'lvp' },
  // France
  { type: F, power: Power.France, provinceId: 'bre' },
  { type: A, power: Power.France, provinceId: 'mar' },
  { type: A, power: Power.France, provinceId: 'par' },
  // Germany
  { type: F, power: Power.Germany, provinceId: 'kie' },
  { type: A, power: Power.Germany, provinceId: 'ber' },
  { type: A, power: Power.Germany, provinceId: 'mun' },
  // Italy
  { type: A, power: Power.Italy, provinceId: 'ven' },
  { type: A, power: Power.Italy, provinceId: 'rom' },
  { type: F, power: Power.Italy, provinceId: 'nap' },
  // Russia
  { type: A, power: Power.Russia, provinceId: 'war' },
  { type: A, power: Power.Russia, provinceId: 'mos' },
  { type: F, power: Power.Russia, provinceId: 'sev' },
  { type: F, power: Power.Russia, provinceId: 'stp', coastId: 'sc' },
  // Turkey
  { type: A, power: Power.Turkey, provinceId: 'con' },
  { type: A, power: Power.Turkey, provinceId: 'smy' },
  { type: F, power: Power.Turkey, provinceId: 'ank' },
];

export function createInitialState(): GameState {
  const supplyCenters = new Map<string, Power>();

  for (const prov of PROVINCES) {
    if (prov.isSupplyCenter && prov.homeOf) {
      supplyCenters.set(prov.id, prov.homeOf);
    }
  }

  return {
    year: 1901,
    season: Season.Spring,
    phase: Phase.Movement,
    units: [...STARTING_UNITS.map(u => ({ ...u }))],
    supplyCenters,
    dislodgedUnits: [],
    standoffs: [],
  };
}

export function serializeState(state: GameState): SerializedGameState {
  return {
    year: state.year,
    season: state.season,
    phase: state.phase,
    units: state.units.map(u => ({ ...u })),
    supplyCenters: Object.fromEntries(state.supplyCenters),
    dislodgedUnits: state.dislodgedUnits.map(d => ({
      unit: { ...d.unit },
      attackerFromProvinceId: d.attackerFromProvinceId,
    })),
    standoffs: [...state.standoffs],
  };
}

export function deserializeState(s: SerializedGameState): GameState {
  return {
    year: s.year,
    season: s.season,
    phase: s.phase,
    units: s.units.map(u => ({ ...u })),
    supplyCenters: new Map(Object.entries(s.supplyCenters)),
    dislodgedUnits: s.dislodgedUnits.map(d => ({
      unit: { ...d.unit },
      attackerFromProvinceId: d.attackerFromProvinceId,
    })),
    standoffs: [...(s.standoffs || [])],
  };
}
