import { UnitType } from './types';

// Adjacency entry: [provinceA, provinceB, allowedUnitTypes]
// For split-coast provinces, use 'stp/nc', 'stp/sc', 'bul/ec', 'bul/sc', 'spa/nc', 'spa/sc'
// The base province (e.g., 'stp') is used for army adjacency
type AdjEntry = [string, string, UnitType[]];

const A = UnitType.Army;
const F = UnitType.Fleet;
const AF = [A, F];
const AO = [A]; // army only
const FO = [F]; // fleet only

const ADJACENCY_DATA: AdjEntry[] = [
  // Bohemia
  ['boh', 'mun', AO], ['boh', 'sil', AO], ['boh', 'gal', AO],
  ['boh', 'vie', AO], ['boh', 'tyr', AO],
  // Budapest
  ['bud', 'vie', AO], ['bud', 'gal', AO], ['bud', 'rum', AO],
  ['bud', 'ser', AO], ['bud', 'tri', AO],
  // Galicia
  ['gal', 'war', AO], ['gal', 'ukr', AO], ['gal', 'rum', AO], ['gal', 'vie', AO],
  // Trieste
  ['tri', 'tyr', AO], ['tri', 'vie', AO], ['tri', 'ser', AO],
  ['tri', 'alb', AF], ['tri', 'adr', FO], ['tri', 'ven', AF],
  // Tyrolia
  ['tyr', 'mun', AO], ['tyr', 'vie', AO], ['tyr', 'ven', AO], ['tyr', 'pie', AO],
  // Clyde
  ['cly', 'nat', FO], ['cly', 'nrg', FO], ['cly', 'edi', AF], ['cly', 'lvp', AF],
  // Edinburgh
  ['edi', 'nrg', FO], ['edi', 'nth', FO], ['edi', 'yor', AF], ['edi', 'lvp', AO],
  // Liverpool
  ['lvp', 'iri', FO], ['lvp', 'yor', AO], ['lvp', 'wal', AF], ['lvp', 'nat', FO],
  // London
  ['lon', 'wal', AF], ['lon', 'yor', AF], ['lon', 'nth', FO], ['lon', 'eng', FO],
  // Wales
  ['wal', 'iri', FO], ['wal', 'yor', AO], ['wal', 'eng', FO],
  // Yorkshire
  ['yor', 'nth', FO],
  // Brest
  ['bre', 'eng', FO], ['bre', 'pic', AF], ['bre', 'par', AO],
  ['bre', 'gas', AF], ['bre', 'mid', FO],
  // Burgundy
  ['bur', 'par', AO], ['bur', 'pic', AO], ['bur', 'bel', AO],
  ['bur', 'ruh', AO], ['bur', 'mun', AO], ['bur', 'mar', AO], ['bur', 'gas', AO],
  // Gascony
  ['gas', 'mid', FO], ['gas', 'par', AO], ['gas', 'mar', AO],
  ['gas', 'spa', AO], ['gas', 'spa/nc', FO],
  // Marseilles
  ['mar', 'spa', AO], ['mar', 'spa/sc', FO], ['mar', 'gol', FO], ['mar', 'pie', AF],
  // Paris
  ['par', 'pic', AO],
  // Picardy
  ['pic', 'eng', FO], ['pic', 'bel', AF],
  // Berlin
  ['ber', 'kie', AF], ['ber', 'bal', FO], ['ber', 'pru', AF],
  ['ber', 'sil', AO], ['ber', 'mun', AO],
  // Kiel
  ['kie', 'hel', FO], ['kie', 'den', AF], ['kie', 'mun', AO],
  ['kie', 'ruh', AO], ['kie', 'hol', AF],
  // Munich
  ['mun', 'ruh', AO], ['mun', 'sil', AO],
  // Prussia
  ['pru', 'bal', FO], ['pru', 'lvn', AF], ['pru', 'war', AO], ['pru', 'sil', AO],
  // Ruhr
  ['ruh', 'bel', AO], ['ruh', 'hol', AO],
  // Silesia
  ['sil', 'war', AO],
  // Apulia
  ['apu', 'ven', AF], ['apu', 'adr', FO], ['apu', 'ion', FO],
  ['apu', 'nap', AF], ['apu', 'rom', AO],
  // Naples
  ['nap', 'rom', AF], ['nap', 'ion', FO], ['nap', 'tyn', FO],
  // Piedmont
  ['pie', 'ven', AO], ['pie', 'tus', AF], ['pie', 'gol', FO],
  // Rome
  ['rom', 'tus', AF], ['rom', 'ven', AO], ['rom', 'tyn', FO],
  // Tuscany
  ['tus', 'gol', FO], ['tus', 'ven', AO], ['tus', 'tyn', FO],
  // Venice
  ['ven', 'adr', FO],
  // Finland
  ['fin', 'nwy', AO], ['fin', 'swe', AF], ['fin', 'bot', FO],
  ['fin', 'stp', AO], ['fin', 'stp/sc', FO],
  // Livonia
  ['lvn', 'bot', FO], ['lvn', 'stp', AO], ['lvn', 'stp/sc', FO],
  ['lvn', 'mos', AO], ['lvn', 'war', AO], ['lvn', 'bal', FO],
  // Moscow
  ['mos', 'stp', AO], ['mos', 'sev', AO], ['mos', 'ukr', AO], ['mos', 'war', AO],
  // Sevastopol
  ['sev', 'ukr', AO], ['sev', 'arm', AF], ['sev', 'bla', FO], ['sev', 'rum', AF],
  // St. Petersburg (army uses base 'stp')
  ['stp', 'nwy', AO],
  ['stp/nc', 'nwy', FO], ['stp/nc', 'bar', FO],
  ['stp/sc', 'bot', FO],
  // Ukraine
  ['ukr', 'war', AO], ['ukr', 'rum', AO],
  // Ankara
  ['ank', 'bla', FO], ['ank', 'arm', AF], ['ank', 'smy', AO], ['ank', 'con', AF],
  // Armenia
  ['arm', 'bla', FO], ['arm', 'syr', AO], ['arm', 'smy', AO],
  // Constantinople
  ['con', 'bul', AO], ['con', 'bul/ec', FO], ['con', 'bul/sc', FO],
  ['con', 'bla', FO], ['con', 'smy', AF], ['con', 'aeg', FO],
  // Smyrna
  ['smy', 'syr', AF], ['smy', 'eas', FO], ['smy', 'aeg', FO],
  // Syria
  ['syr', 'eas', FO],
  // Albania
  ['alb', 'ser', AO], ['alb', 'gre', AF], ['alb', 'ion', FO],
  // Belgium
  ['bel', 'eng', FO], ['bel', 'nth', FO], ['bel', 'hol', AF],
  // Bulgaria (army uses base 'bul')
  ['bul', 'ser', AO], ['bul', 'rum', AO], ['bul', 'gre', AO],
  ['bul/ec', 'rum', FO], ['bul/ec', 'bla', FO],
  ['bul/sc', 'gre', FO], ['bul/sc', 'aeg', FO],
  // Denmark
  ['den', 'nth', FO], ['den', 'ska', FO], ['den', 'bal', FO], ['den', 'hel', FO],
  // Greece
  ['gre', 'ser', AO], ['gre', 'aeg', FO], ['gre', 'ion', FO],
  // Holland
  ['hol', 'nth', FO], ['hol', 'hel', FO],
  // Norway
  ['nwy', 'nrg', FO], ['nwy', 'bar', FO], ['nwy', 'swe', AF],
  ['nwy', 'ska', FO], ['nwy', 'nth', FO],
  // Portugal
  ['por', 'mid', FO], ['por', 'spa', AO],
  ['por', 'spa/nc', FO], ['por', 'spa/sc', FO],
  // Rumania
  ['rum', 'ser', AO], ['rum', 'bla', FO],
  // Spain
  ['spa/nc', 'mid', FO],
  ['spa/sc', 'mid', FO], ['spa/sc', 'gol', FO], ['spa/sc', 'wes', FO],
  // Sweden
  ['swe', 'ska', FO], ['swe', 'bal', FO], ['swe', 'bot', FO], ['swe', 'den', AF],
  // Tunis
  ['tun', 'wes', FO], ['tun', 'tyn', FO], ['tun', 'ion', FO], ['tun', 'naf', AF],
  // North Africa
  ['naf', 'wes', FO], ['naf', 'mid', FO],
  // Sea-to-sea adjacencies
  ['adr', 'ion', FO],
  ['aeg', 'eas', FO], ['aeg', 'ion', FO],
  ['bal', 'bot', FO],
  ['bar', 'nrg', FO],
  ['eas', 'ion', FO],
  ['eng', 'iri', FO], ['eng', 'nth', FO], ['eng', 'mid', FO],
  ['gol', 'tyn', FO], ['gol', 'wes', FO],
  ['hel', 'nth', FO],
  ['ion', 'tyn', FO],
  ['iri', 'nat', FO], ['iri', 'mid', FO],
  ['mid', 'naf', FO], ['mid', 'wes', FO], ['mid', 'nat', FO],
  ['nat', 'nrg', FO],
  ['nth', 'nrg', FO],
  ['tyn', 'wes', FO],
];

// Parse province ID and coast from combined format like 'stp/nc'
function parseLocId(locId: string): { provinceId: string; coastId?: string } {
  const parts = locId.split('/');
  if (parts.length === 2) {
    return { provinceId: parts[0], coastId: parts[1] };
  }
  return { provinceId: parts[0] };
}

export interface AdjacencyInfo {
  provinceId: string;
  coastId?: string;
  unitTypes: UnitType[];
}

// Build adjacency lookup: for a given location, what locations can it reach?
// Key format: 'provinceId' or 'provinceId/coastId'
const adjMap = new Map<string, AdjacencyInfo[]>();

function addAdj(from: string, to: string, types: UnitType[]) {
  if (!adjMap.has(from)) adjMap.set(from, []);
  const parsed = parseLocId(to);
  adjMap.get(from)!.push({ provinceId: parsed.provinceId, coastId: parsed.coastId, unitTypes: types });
}

for (const [a, b, types] of ADJACENCY_DATA) {
  addAdj(a, b, types);
  addAdj(b, a, types);
}

export function getAdjacencies(locId: string): AdjacencyInfo[] {
  return adjMap.get(locId) || [];
}

// Check if a unit of the given type can move from one location to another
export function canMove(
  unitType: UnitType,
  fromProvinceId: string,
  fromCoastId: string | undefined,
  toProvinceId: string,
  toCoastId: string | undefined,
): boolean {
  // For fleets on split-coast provinces, use the coast-specific adjacency
  const fromKey = unitType === UnitType.Fleet && fromCoastId
    ? `${fromProvinceId}/${fromCoastId}`
    : fromProvinceId;

  const adjs = getAdjacencies(fromKey);

  for (const adj of adjs) {
    if (!adj.unitTypes.includes(unitType)) continue;

    if (adj.provinceId === toProvinceId) {
      // If targeting a coast, make sure it matches
      if (toCoastId && adj.coastId && adj.coastId !== toCoastId) continue;
      // If adj specifies a coast but we're not targeting one, and this is a fleet, we need the coast
      if (adj.coastId && !toCoastId && unitType === UnitType.Fleet) continue;
      // If we're targeting a coast but adj doesn't specify one, check if we can reach the base
      if (toCoastId && !adj.coastId) continue;
      return true;
    }
  }
  return false;
}

// Get all valid move destinations for a unit
export function getValidMoveTargets(
  unitType: UnitType,
  fromProvinceId: string,
  fromCoastId?: string,
): { provinceId: string; coastId?: string }[] {
  const fromKey = unitType === UnitType.Fleet && fromCoastId
    ? `${fromProvinceId}/${fromCoastId}`
    : fromProvinceId;

  const adjs = getAdjacencies(fromKey);
  const targets: { provinceId: string; coastId?: string }[] = [];

  for (const adj of adjs) {
    if (!adj.unitTypes.includes(unitType)) continue;
    targets.push({ provinceId: adj.provinceId, coastId: adj.coastId });
  }

  return targets;
}

// Check if two provinces are adjacent for any unit type
export function areAdjacent(a: string, b: string): boolean {
  const adjs = getAdjacencies(a);
  return adjs.some(adj => adj.provinceId === b);
}
