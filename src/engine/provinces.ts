import { Province, ProvinceType, Power } from './types';

const L = ProvinceType.Land;
const C = ProvinceType.Coast;
const S = ProvinceType.Sea;

function p(id: string, name: string, type: ProvinceType, isSupplyCenter: boolean, homeOf: Power | null, coasts?: { id: string; name: string }[]): Province {
  return { id, name, type, isSupplyCenter, homeOf, coasts };
}

export const PROVINCES: Province[] = [
  // Austria
  p('boh', 'Bohemia', L, false, Power.Austria),
  p('bud', 'Budapest', L, true, Power.Austria),
  p('gal', 'Galicia', L, false, Power.Austria),
  p('tri', 'Trieste', C, true, Power.Austria),
  p('tyr', 'Tyrolia', L, false, Power.Austria),
  p('vie', 'Vienna', L, true, Power.Austria),

  // England
  p('cly', 'Clyde', C, false, Power.England),
  p('edi', 'Edinburgh', C, true, Power.England),
  p('lvp', 'Liverpool', C, true, Power.England),
  p('lon', 'London', C, true, Power.England),
  p('wal', 'Wales', C, false, Power.England),
  p('yor', 'Yorkshire', C, false, Power.England),

  // France
  p('bre', 'Brest', C, true, Power.France),
  p('bur', 'Burgundy', L, false, Power.France),
  p('gas', 'Gascony', C, false, Power.France),
  p('mar', 'Marseilles', C, true, Power.France),
  p('par', 'Paris', L, true, Power.France),
  p('pic', 'Picardy', C, false, Power.France),

  // Germany
  p('ber', 'Berlin', C, true, Power.Germany),
  p('kie', 'Kiel', C, true, Power.Germany),
  p('mun', 'Munich', L, true, Power.Germany),
  p('pru', 'Prussia', C, false, Power.Germany),
  p('ruh', 'Ruhr', L, false, Power.Germany),
  p('sil', 'Silesia', L, false, Power.Germany),

  // Italy
  p('apu', 'Apulia', C, false, Power.Italy),
  p('nap', 'Naples', C, true, Power.Italy),
  p('pie', 'Piedmont', C, false, Power.Italy),
  p('rom', 'Rome', C, true, Power.Italy),
  p('tus', 'Tuscany', C, false, Power.Italy),
  p('ven', 'Venice', C, true, Power.Italy),

  // Russia
  p('fin', 'Finland', C, false, Power.Russia),
  p('lvn', 'Livonia', C, false, Power.Russia),
  p('mos', 'Moscow', L, true, Power.Russia),
  p('sev', 'Sevastopol', C, true, Power.Russia),
  p('stp', 'St. Petersburg', C, true, Power.Russia, [
    { id: 'nc', name: 'North Coast' },
    { id: 'sc', name: 'South Coast' },
  ]),
  p('ukr', 'Ukraine', L, false, Power.Russia),
  p('war', 'Warsaw', L, true, Power.Russia),

  // Turkey
  p('ank', 'Ankara', C, true, Power.Turkey),
  p('arm', 'Armenia', C, false, Power.Turkey),
  p('con', 'Constantinople', C, true, Power.Turkey),
  p('smy', 'Smyrna', C, true, Power.Turkey),
  p('syr', 'Syria', C, false, Power.Turkey),

  // Neutral
  p('alb', 'Albania', C, false, null),
  p('bel', 'Belgium', C, true, null),
  p('bul', 'Bulgaria', C, true, null, [
    { id: 'ec', name: 'East Coast' },
    { id: 'sc', name: 'South Coast' },
  ]),
  p('den', 'Denmark', C, true, null),
  p('gre', 'Greece', C, true, null),
  p('hol', 'Holland', C, true, null),
  p('nwy', 'Norway', C, true, null),
  p('por', 'Portugal', C, true, null),
  p('rum', 'Rumania', C, true, null),
  p('ser', 'Serbia', L, true, null),
  p('spa', 'Spain', C, true, null, [
    { id: 'nc', name: 'North Coast' },
    { id: 'sc', name: 'South Coast' },
  ]),
  p('swe', 'Sweden', C, true, null),
  p('tun', 'Tunis', C, true, null),
  p('naf', 'North Africa', C, false, null),

  // Sea zones
  p('adr', 'Adriatic Sea', S, false, null),
  p('aeg', 'Aegean Sea', S, false, null),
  p('bal', 'Baltic Sea', S, false, null),
  p('bar', 'Barents Sea', S, false, null),
  p('bla', 'Black Sea', S, false, null),
  p('eas', 'Eastern Mediterranean', S, false, null),
  p('eng', 'English Channel', S, false, null),
  p('bot', 'Gulf of Bothnia', S, false, null),
  p('gol', 'Gulf of Lyon', S, false, null),
  p('hel', 'Helgoland Bight', S, false, null),
  p('ion', 'Ionian Sea', S, false, null),
  p('iri', 'Irish Sea', S, false, null),
  p('mid', 'Mid-Atlantic Ocean', S, false, null),
  p('nat', 'North Atlantic Ocean', S, false, null),
  p('nth', 'North Sea', S, false, null),
  p('nrg', 'Norwegian Sea', S, false, null),
  p('ska', 'Skagerrak', S, false, null),
  p('tyn', 'Tyrrhenian Sea', S, false, null),
  p('wes', 'Western Mediterranean', S, false, null),
];

export const PROVINCE_MAP = new Map<string, Province>(PROVINCES.map(p => [p.id, p]));

export function getProvince(id: string): Province {
  const prov = PROVINCE_MAP.get(id);
  if (!prov) throw new Error(`Unknown province: ${id}`);
  return prov;
}
