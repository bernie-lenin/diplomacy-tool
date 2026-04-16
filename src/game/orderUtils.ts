import { Order, OrderType, GameState, Unit, UnitType } from '../engine/types';
import { getProvince, PROVINCE_MAP } from '../engine/provinces';
import { getValidMoveTargets } from '../engine/adjacency';

// Format an order as readable text with full province names
export function formatOrder(order: Order): string {
  const pName = (id: string) => {
    const p = PROVINCE_MAP.get(id);
    return p ? p.name : id;
  };

  switch (order.type) {
    case OrderType.Hold:
      return `${pName(order.unitProvinceId)} Holds`;
    case OrderType.Move: {
      const coast = order.targetCoastId ? ` (${coastName(order.targetCoastId)})` : '';
      return `${pName(order.unitProvinceId)} → ${pName(order.targetProvinceId)}${coast}`;
    }
    case OrderType.Support: {
      if (order.supportedTargetProvinceId) {
        return `${pName(order.unitProvinceId)} Supports ${pName(order.supportedUnitProvinceId)} → ${pName(order.supportedTargetProvinceId)}`;
      }
      return `${pName(order.unitProvinceId)} Supports ${pName(order.supportedUnitProvinceId)} Hold`;
    }
    case OrderType.Convoy:
      return `${pName(order.unitProvinceId)} Convoys ${pName(order.convoyedUnitProvinceId)} → ${pName(order.convoyTargetProvinceId)}`;
    case OrderType.Retreat: {
      const coast = order.targetCoastId ? ` (${coastName(order.targetCoastId)})` : '';
      return `${pName(order.unitProvinceId)} Retreats → ${pName(order.targetProvinceId)}${coast}`;
    }
    case OrderType.Disband:
      return `${pName(order.unitProvinceId)} Disbanded`;
    case OrderType.Build: {
      const coast = order.coastId ? ` (${coastName(order.coastId)})` : '';
      return `Build ${order.unitType} at ${pName(order.provinceId)}${coast}`;
    }
  }
}

function coastName(coastId: string): string {
  switch (coastId) {
    case 'nc': return 'North Coast';
    case 'sc': return 'South Coast';
    case 'ec': return 'East Coast';
    default: return coastId;
  }
}

// Get valid targets for a unit's order type
export function getTargetsForOrder(
  state: GameState,
  unit: Unit,
  orderType: 'Move' | 'Support' | 'Convoy',
): string[] {
  if (orderType === 'Move') {
    const targets = getValidMoveTargets(unit.type, unit.provinceId, unit.coastId);
    return targets.map(t => t.provinceId);
  }

  if (orderType === 'Support') {
    // Can support any adjacent unit's hold or move
    const targets = getValidMoveTargets(unit.type, unit.provinceId, unit.coastId);
    return targets.map(t => t.provinceId);
  }

  if (orderType === 'Convoy') {
    // Fleet can convoy — highlight all provinces
    return [];
  }

  return [];
}

// Get the unit icon character
export function unitIcon(type: UnitType): string {
  return type === UnitType.Army ? 'A' : 'F';
}
