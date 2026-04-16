// Unit placement positions for each province
// Coordinates are in the SVG viewBox coordinate system (0-1835 x 0-1360)
// Extracted from jDip/diplomacy-engine SVG province data

export interface Position {
  x: number;
  y: number;
}

export const UNIT_POSITIONS: Record<string, Position> = {
  // Sea zones
  adr: { x: 793, y: 1048 },
  aeg: { x: 1043, y: 1230 },
  bal: { x: 878, y: 610 },
  bar: { x: 1162, y: 73 },
  bla: { x: 1233, y: 1000 },
  eas: { x: 1218, y: 1311 },
  eng: { x: 394, y: 751 },
  bot: { x: 941, y: 485 },
  gol: { x: 556, y: 1060 },
  hel: { x: 651, y: 631 },
  ion: { x: 846, y: 1286 },
  iri: { x: 335, y: 661 },
  mid: { x: 126, y: 902 },
  nat: { x: 238, y: 427 },
  nth: { x: 553, y: 560 },
  nrg: { x: 605, y: 250 },
  ska: { x: 733, y: 530 },
  tyn: { x: 690, y: 1190 },
  wes: { x: 474, y: 1230 },

  // Austria
  boh: { x: 806, y: 814 },
  bud: { x: 950, y: 904 },
  gal: { x: 999, y: 831 },
  tri: { x: 820, y: 969 },
  tyr: { x: 726, y: 893 },
  vie: { x: 844, y: 877 },

  // England
  cly: { x: 436, y: 492 },
  edi: { x: 473, y: 514 },
  lvp: { x: 450, y: 576 },
  lon: { x: 488, y: 675 },
  wal: { x: 434, y: 650 },
  yor: { x: 490, y: 610 },

  // France
  bre: { x: 404, y: 819 },
  bur: { x: 559, y: 871 },
  gas: { x: 422, y: 912 },
  mar: { x: 524, y: 975 },
  par: { x: 487, y: 858 },
  pic: { x: 500, y: 775 },

  // Germany
  ber: { x: 771, y: 690 },
  kie: { x: 683, y: 701 },
  mun: { x: 693, y: 828 },
  pru: { x: 895, y: 664 },
  ruh: { x: 624, y: 795 },
  sil: { x: 855, y: 758 },

  // Italy
  apu: { x: 791, y: 1106 },
  nap: { x: 806, y: 1170 },
  pie: { x: 598, y: 960 },
  rom: { x: 715, y: 1085 },
  tus: { x: 662, y: 1025 },
  ven: { x: 713, y: 963 },

  // Russia
  fin: { x: 988, y: 380 },
  lvn: { x: 1025, y: 567 },
  mos: { x: 1200, y: 590 },
  sev: { x: 1313, y: 887 },
  stp: { x: 1114, y: 387 },
  'stp/nc': { x: 1139, y: 166 },
  'stp/sc': { x: 1020, y: 480 },
  ukr: { x: 1092, y: 802 },
  war: { x: 938, y: 730 },

  // Turkey
  ank: { x: 1301, y: 1110 },
  arm: { x: 1484, y: 1090 },
  con: { x: 1145, y: 1137 },
  smy: { x: 1240, y: 1210 },
  syr: { x: 1473, y: 1247 },

  // Neutral
  alb: { x: 906, y: 1113 },
  bel: { x: 561, y: 753 },
  bul: { x: 1048, y: 1068 },
  'bul/ec': { x: 1127, y: 1067 },
  'bul/sc': { x: 1070, y: 1140 },
  den: { x: 703, y: 587 },
  gre: { x: 966, y: 1190 },
  hol: { x: 596, y: 711 },
  nwy: { x: 698, y: 388 },
  por: { x: 277, y: 1060 },
  rum: { x: 1068, y: 958 },
  ser: { x: 932, y: 1022 },
  spa: { x: 366, y: 1074 },
  'spa/nc': { x: 344, y: 979 },
  'spa/sc': { x: 400, y: 1145 },
  swe: { x: 823, y: 432 },
  tun: { x: 587, y: 1296 },
  naf: { x: 325, y: 1281 },
};

// Label positions (slightly offset from unit positions for readability)
export const LABEL_POSITIONS: Record<string, Position> = {
  ...UNIT_POSITIONS,
};

// Supply center marker positions (same as unit positions mostly)
export const SC_POSITIONS: Record<string, Position> = {
  ...UNIT_POSITIONS,
};
