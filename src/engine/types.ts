export enum Power {
  Austria = 'Austria',
  England = 'England',
  France = 'France',
  Germany = 'Germany',
  Italy = 'Italy',
  Russia = 'Russia',
  Turkey = 'Turkey',
}

export const ALL_POWERS: Power[] = [
  Power.Austria, Power.England, Power.France, Power.Germany,
  Power.Italy, Power.Russia, Power.Turkey,
];

export enum UnitType {
  Army = 'Army',
  Fleet = 'Fleet',
}

export enum Season {
  Spring = 'Spring',
  Fall = 'Fall',
}

export enum Phase {
  Movement = 'Movement',
  Retreat = 'Retreat',
  Build = 'Build',
}

export enum ProvinceType {
  Land = 'Land',
  Coast = 'Coast',
  Sea = 'Sea',
}

export interface Coast {
  id: string;
  name: string;
}

export interface Province {
  id: string;
  name: string;
  type: ProvinceType;
  isSupplyCenter: boolean;
  homeOf: Power | null;
  coasts?: Coast[];
}

export interface Unit {
  type: UnitType;
  power: Power;
  provinceId: string;
  coastId?: string; // for fleets on split-coast provinces
}

export enum OrderType {
  Hold = 'Hold',
  Move = 'Move',
  Support = 'Support',
  Convoy = 'Convoy',
  Retreat = 'Retreat',
  Disband = 'Disband',
  Build = 'Build',
}

export interface HoldOrder {
  type: OrderType.Hold;
  unitProvinceId: string;
}

export interface MoveOrder {
  type: OrderType.Move;
  unitProvinceId: string;
  targetProvinceId: string;
  targetCoastId?: string;
  viaConvoy?: boolean;
}

export interface SupportOrder {
  type: OrderType.Support;
  unitProvinceId: string;
  supportedUnitProvinceId: string;
  supportedTargetProvinceId?: string; // if supporting a move; omit for support-hold
}

export interface ConvoyOrder {
  type: OrderType.Convoy;
  unitProvinceId: string;
  convoyedUnitProvinceId: string;
  convoyTargetProvinceId: string;
}

export interface RetreatOrder {
  type: OrderType.Retreat;
  unitProvinceId: string;
  targetProvinceId: string;
  targetCoastId?: string;
}

export interface DisbandOrder {
  type: OrderType.Disband;
  unitProvinceId: string;
}

export interface BuildOrder {
  type: OrderType.Build;
  provinceId: string;
  unitType: UnitType;
  coastId?: string;
  power: Power;
}

export type Order = HoldOrder | MoveOrder | SupportOrder | ConvoyOrder | RetreatOrder | DisbandOrder | BuildOrder;

export enum OrderResult {
  Success = 'Success',
  Bounced = 'Bounced',
  Cut = 'Cut',
  Dislodged = 'Dislodged',
  NoConvoy = 'NoConvoy',
  Invalid = 'Invalid',
}

export interface ResolvedOrder {
  order: Order;
  result: OrderResult;
}

export interface DislodgedUnit {
  unit: Unit;
  attackerFromProvinceId: string;
}

export interface GameState {
  year: number;
  season: Season;
  phase: Phase;
  units: Unit[];
  supplyCenters: Map<string, Power>; // provinceId -> controlling power
  dislodgedUnits: DislodgedUnit[];
  standoffs: string[]; // province IDs where standoffs occurred this turn
}

export interface TurnRecord {
  year: number;
  season: Season;
  phase: Phase;
  orders: Order[];
  results: ResolvedOrder[];
  stateBefore: SerializedGameState;
  stateAfter: SerializedGameState;
}

export interface SerializedGameState {
  year: number;
  season: Season;
  phase: Phase;
  units: Unit[];
  supplyCenters: Record<string, Power>;
  dislodgedUnits: DislodgedUnit[];
  standoffs: string[];
}

export interface Campaign {
  version: number;
  name: string;
  created: string;
  lastModified: string;
  currentTurnIndex: number;
  turns: TurnRecord[];
  currentState: SerializedGameState;
}
