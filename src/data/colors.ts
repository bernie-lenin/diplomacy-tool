import { Power } from '../engine/types';

export const POWER_COLORS: Record<Power, string> = {
  [Power.Austria]: '#EF9A9A',
  [Power.England]: '#90CAF9',
  [Power.France]: '#80DEEA',
  [Power.Germany]: '#BDBDBD',
  [Power.Italy]: '#A5D6A7',
  [Power.Russia]: '#CE93D8',
  [Power.Turkey]: '#FFE082',
};

export const POWER_DARK_COLORS: Record<Power, string> = {
  [Power.Austria]: '#C62828',
  [Power.England]: '#1565C0',
  [Power.France]: '#00838F',
  [Power.Germany]: '#424242',
  [Power.Italy]: '#2E7D32',
  [Power.Russia]: '#6A1B9A',
  [Power.Turkey]: '#F57F17',
};

export const NEUTRAL_SC_COLOR = '#C8E6C9';
export const LAND_COLOR = '#F5F5DC';
export const SEA_COLOR = '#D6EAF8';
export const BORDER_COLOR = '#333333';
export const UNCONTROLLED_SC_COLOR = '#E8E8E8';
