import {
  GameState, Order, OrderType, OrderResult, ResolvedOrder,
  MoveOrder, SupportOrder, ConvoyOrder, HoldOrder,
  Unit, UnitType, Season, Phase, DislodgedUnit,
} from './types';
import { canMove, areAdjacent, getValidMoveTargets } from './adjacency';
import { getProvince, PROVINCES } from './provinces';

// Find a unit at a given province
function findUnit(units: Unit[], provinceId: string): Unit | undefined {
  return units.find(u => u.provinceId === provinceId);
}

// Check if there's a valid convoy path for an army move
function hasConvoyPath(
  armyFrom: string,
  armyTo: string,
  convoyOrders: ConvoyOrder[],
  units: Unit[],
  disruptedFleets: Set<string>,
): boolean {
  // Get all fleet provinces that have matching convoy orders and aren't disrupted
  const convoyFleets = new Set<string>();
  for (const co of convoyOrders) {
    if (co.convoyedUnitProvinceId === armyFrom && co.convoyTargetProvinceId === armyTo) {
      if (!disruptedFleets.has(co.unitProvinceId)) {
        convoyFleets.add(co.unitProvinceId);
      }
    }
  }

  if (convoyFleets.size === 0) return false;

  // BFS from army's province to destination through convoy fleets
  const visited = new Set<string>();
  const queue = [armyFrom];
  visited.add(armyFrom);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Check if any convoy fleet is adjacent to current position
    for (const fleetProv of convoyFleets) {
      if (visited.has(fleetProv)) continue;
      if (!areAdjacent(current, fleetProv)) continue;

      visited.add(fleetProv);

      // Check if fleet is adjacent to destination
      if (areAdjacent(fleetProv, armyTo)) {
        return true;
      }

      queue.push(fleetProv);
    }
  }

  return false;
}

// Calculate the strength of a move to a province
function moveStrength(
  targetProvinceId: string,
  moverProvinceId: string,
  orders: Order[],
  units: Unit[],
  disruptedFleets: Set<string>,
  cutSupports: Set<string>,
): number {
  let strength = 1;

  for (const order of orders) {
    if (order.type !== OrderType.Support) continue;
    const support = order as SupportOrder;

    // Support for a move
    if (support.supportedUnitProvinceId === moverProvinceId &&
        support.supportedTargetProvinceId === targetProvinceId) {
      // Check if support is cut
      if (cutSupports.has(support.unitProvinceId)) continue;
      // Check if supporting unit still exists and hasn't been dislodged
      const supportUnit = findUnit(units, support.unitProvinceId);
      if (!supportUnit) continue;
      strength++;
    }
  }

  return strength;
}

// Calculate hold strength of a province
function holdStrength(
  provinceId: string,
  orders: Order[],
  units: Unit[],
  cutSupports: Set<string>,
): number {
  const unit = findUnit(units, provinceId);
  if (!unit) return 0;

  // Check if the unit is moving away
  const unitOrder = orders.find(o =>
    (o.type === OrderType.Move && o.unitProvinceId === provinceId)
  );
  if (unitOrder) return 0; // unit is attempting to move, hold strength is 0

  let strength = 1;

  for (const order of orders) {
    if (order.type !== OrderType.Support) continue;
    const support = order as SupportOrder;

    // Support for a hold (no target province specified)
    if (support.supportedUnitProvinceId === provinceId && !support.supportedTargetProvinceId) {
      if (cutSupports.has(support.unitProvinceId)) continue;
      const supportUnit = findUnit(units, support.unitProvinceId);
      if (!supportUnit) continue;
      strength++;
    }
  }

  return strength;
}

export function resolveMovement(state: GameState, orders: Order[]): {
  results: ResolvedOrder[];
  newState: GameState;
} {
  const units = [...state.units];

  // Assign default hold orders to units without orders
  const orderedUnits = new Set(orders.map(o => {
    if (o.type === OrderType.Build) return '';
    return o.unitProvinceId;
  }).filter(Boolean));

  for (const unit of units) {
    if (!orderedUnits.has(unit.provinceId)) {
      orders.push({ type: OrderType.Hold, unitProvinceId: unit.provinceId });
    }
  }

  const moveOrders = orders.filter(o => o.type === OrderType.Move) as MoveOrder[];
  const supportOrders = orders.filter(o => o.type === OrderType.Support) as SupportOrder[];
  const convoyOrders = orders.filter(o => o.type === OrderType.Convoy) as ConvoyOrder[];

  // Step 1: Determine which supports are cut
  // A support is cut if the supporting unit is attacked from a province
  // other than the one it's supporting to
  const cutSupports = new Set<string>();

  for (const move of moveOrders) {
    for (const support of supportOrders) {
      if (move.targetProvinceId === support.unitProvinceId) {
        // Support is cut UNLESS the attack comes from the province
        // the support is directed at
        if (move.unitProvinceId !== support.supportedTargetProvinceId &&
            move.unitProvinceId !== support.supportedUnitProvinceId) {
          // Also, support is not cut by a power's own units
          const attacker = findUnit(units, move.unitProvinceId);
          const supporter = findUnit(units, support.unitProvinceId);
          if (attacker && supporter && attacker.power !== supporter.power) {
            cutSupports.add(support.unitProvinceId);
          }
        }
      }
    }
  }

  // Step 2: Determine convoy disruptions
  // A convoy is disrupted if the convoying fleet is dislodged
  // We need iterative resolution for this
  const disruptedFleets = new Set<string>();

  // Step 3: Resolve moves iteratively
  // Group moves by target province
  const movesByTarget = new Map<string, MoveOrder[]>();
  for (const move of moveOrders) {
    if (!movesByTarget.has(move.targetProvinceId)) {
      movesByTarget.set(move.targetProvinceId, []);
    }
    movesByTarget.get(move.targetProvinceId)!.push(move);
  }

  const results = new Map<string, OrderResult>(); // unitProvinceId -> result
  const successfulMoves = new Set<string>(); // provinces that were successfully moved into
  const dislodgedUnits: DislodgedUnit[] = [];
  const standoffs: string[] = [];

  // Check for head-to-head battles first
  const headToHead = new Set<string>(); // moves involved in head-to-head
  for (const move of moveOrders) {
    const counterMove = moveOrders.find(m =>
      m.unitProvinceId === move.targetProvinceId &&
      m.targetProvinceId === move.unitProvinceId
    );
    if (counterMove) {
      headToHead.add(move.unitProvinceId);
      headToHead.add(counterMove.unitProvinceId);
    }
  }

  // Resolve each target province
  for (const [targetId, movesTo] of movesByTarget) {
    const targetUnit = findUnit(units, targetId);

    // Check validity of each move
    const validMoves: MoveOrder[] = [];
    for (const move of movesTo) {
      const unit = findUnit(units, move.unitProvinceId);
      if (!unit) {
        results.set(move.unitProvinceId, OrderResult.Invalid);
        continue;
      }

      // Check if move is valid (adjacent or via convoy)
      let isValid = false;
      if (move.viaConvoy || (unit.type === UnitType.Army && !canMove(unit.type, unit.provinceId, unit.coastId, targetId, move.targetCoastId))) {
        // Try convoy
        isValid = hasConvoyPath(unit.provinceId, targetId, convoyOrders, units, disruptedFleets);
        if (!isValid) {
          results.set(move.unitProvinceId, OrderResult.NoConvoy);
          continue;
        }
      } else {
        isValid = canMove(unit.type, unit.provinceId, unit.coastId, targetId, move.targetCoastId);
      }

      if (!isValid) {
        results.set(move.unitProvinceId, OrderResult.Invalid);
        continue;
      }

      validMoves.push(move);
    }

    if (validMoves.length === 0) continue;

    // Calculate move strengths
    const moveStrengths = validMoves.map(move => ({
      move,
      strength: moveStrength(targetId, move.unitProvinceId, orders, units, disruptedFleets, cutSupports),
    }));

    // Sort by strength descending
    moveStrengths.sort((a, b) => b.strength - a.strength);

    const strongest = moveStrengths[0];

    // Is there a unit in the target that's NOT moving away?
    const targetIsMoving = moveOrders.some(m => m.unitProvinceId === targetId);
    const targetIsInHeadToHead = headToHead.has(targetId);

    if (validMoves.length === 1) {
      // Single move to this province
      const move = strongest.move;
      const attackStrength = strongest.strength;

      if (targetUnit && !targetIsMoving) {
        // Target is holding — compare attack strength vs hold strength
        const hStrength = holdStrength(targetId, orders, units, cutSupports);

        // Can't dislodge own unit
        const attacker = findUnit(units, move.unitProvinceId);
        if (attacker && targetUnit.power === attacker.power) {
          results.set(move.unitProvinceId, OrderResult.Bounced);
          continue;
        }

        if (attackStrength > hStrength) {
          // Successful attack — target is dislodged
          results.set(move.unitProvinceId, OrderResult.Success);
          successfulMoves.add(targetId);
          dislodgedUnits.push({
            unit: { ...targetUnit },
            attackerFromProvinceId: move.unitProvinceId,
          });
        } else {
          results.set(move.unitProvinceId, OrderResult.Bounced);
        }
      } else if (targetUnit && targetIsMoving) {
        if (targetIsInHeadToHead) {
          // Head-to-head: compare attack strengths
          const counterMove = moveOrders.find(m =>
            m.unitProvinceId === targetId && m.targetProvinceId === move.unitProvinceId
          );

          if (counterMove) {
            const counterStrength = moveStrength(
              move.unitProvinceId, targetId, orders, units, disruptedFleets, cutSupports
            );

            const attacker = findUnit(units, move.unitProvinceId);
            if (attacker && targetUnit.power === attacker.power) {
              results.set(move.unitProvinceId, OrderResult.Bounced);
              continue;
            }

            if (attackStrength > counterStrength) {
              results.set(move.unitProvinceId, OrderResult.Success);
              successfulMoves.add(targetId);
              // Counter move fails, unit is dislodged
              dislodgedUnits.push({
                unit: { ...targetUnit },
                attackerFromProvinceId: move.unitProvinceId,
              });
              results.set(counterMove.unitProvinceId, OrderResult.Dislodged);
            } else if (counterStrength > attackStrength) {
              results.set(move.unitProvinceId, OrderResult.Bounced);
              // Counter move succeeds (will be resolved when processing that target)
            } else {
              // Equal strength — both bounce
              results.set(move.unitProvinceId, OrderResult.Bounced);
              results.set(counterMove.unitProvinceId, OrderResult.Bounced);
            }
          } else {
            // Target is moving elsewhere — treat as empty if their move succeeds
            // For now, assume move succeeds (resolved later)
            results.set(move.unitProvinceId, OrderResult.Success);
            successfulMoves.add(targetId);
          }
        } else {
          // Target is moving away (not head-to-head)
          // Move succeeds if target's move also succeeds (province becomes empty)
          // We'll handle this in a second pass
          results.set(move.unitProvinceId, OrderResult.Success);
          successfulMoves.add(targetId);
        }
      } else {
        // Empty province — move succeeds
        results.set(move.unitProvinceId, OrderResult.Success);
        successfulMoves.add(targetId);
      }
    } else {
      // Multiple moves to the same province — standoff potential
      if (moveStrengths[0].strength > moveStrengths[1].strength) {
        // Strongest move wins
        const winner = moveStrengths[0];

        if (targetUnit) {
          const attacker = findUnit(units, winner.move.unitProvinceId);
          if (attacker && targetUnit.power === attacker.power) {
            // Can't dislodge own unit — everyone bounces
            for (const ms of moveStrengths) {
              results.set(ms.move.unitProvinceId, OrderResult.Bounced);
            }
            standoffs.push(targetId);
            continue;
          }

          if (!targetIsMoving) {
            const hStrength = holdStrength(targetId, orders, units, cutSupports);
            if (winner.strength > hStrength) {
              results.set(winner.move.unitProvinceId, OrderResult.Success);
              successfulMoves.add(targetId);
              dislodgedUnits.push({
                unit: { ...targetUnit },
                attackerFromProvinceId: winner.move.unitProvinceId,
              });
            } else {
              results.set(winner.move.unitProvinceId, OrderResult.Bounced);
            }
          } else {
            results.set(winner.move.unitProvinceId, OrderResult.Success);
            successfulMoves.add(targetId);
          }
        } else {
          results.set(winner.move.unitProvinceId, OrderResult.Success);
          successfulMoves.add(targetId);
        }

        // Losers bounce
        for (let i = 1; i < moveStrengths.length; i++) {
          results.set(moveStrengths[i].move.unitProvinceId, OrderResult.Bounced);
        }
      } else {
        // Tie — everyone bounces, standoff
        for (const ms of moveStrengths) {
          results.set(ms.move.unitProvinceId, OrderResult.Bounced);
        }
        standoffs.push(targetId);
      }
    }
  }

  // Second pass: handle moves to provinces where the occupant is moving away
  // If the occupant's move failed (bounced), the province is NOT empty
  for (const move of moveOrders) {
    if (results.get(move.unitProvinceId) !== OrderResult.Success) continue;

    const targetUnit = findUnit(units, move.targetProvinceId);
    if (!targetUnit) continue;

    // Check if target unit's move succeeded
    const targetResult = results.get(targetUnit.provinceId);
    if (targetResult === OrderResult.Bounced || targetResult === OrderResult.Invalid || targetResult === OrderResult.NoConvoy) {
      // Target didn't move — we need to check if we can dislodge
      const attacker = findUnit(units, move.unitProvinceId);
      if (attacker && targetUnit.power === attacker.power) {
        results.set(move.unitProvinceId, OrderResult.Bounced);
        successfulMoves.delete(move.targetProvinceId);
        continue;
      }

      const attackStr = moveStrength(move.targetProvinceId, move.unitProvinceId, orders, units, disruptedFleets, cutSupports);
      const hStr = holdStrength(move.targetProvinceId, orders, units, cutSupports);

      if (attackStr <= hStr) {
        results.set(move.unitProvinceId, OrderResult.Bounced);
        successfulMoves.delete(move.targetProvinceId);
      } else {
        // Dislodge the unit
        const alreadyDislodged = dislodgedUnits.some(d => d.unit.provinceId === targetUnit.provinceId);
        if (!alreadyDislodged) {
          dislodgedUnits.push({
            unit: { ...targetUnit },
            attackerFromProvinceId: move.unitProvinceId,
          });
        }
      }
    }
  }

  // Build results for all orders
  const resolvedOrders: ResolvedOrder[] = [];

  for (const order of orders) {
    let unitProvId = '';
    if (order.type === OrderType.Hold || order.type === OrderType.Move ||
        order.type === OrderType.Support || order.type === OrderType.Convoy) {
      unitProvId = order.unitProvinceId;
    }

    if (order.type === OrderType.Support) {
      if (cutSupports.has(order.unitProvinceId)) {
        resolvedOrders.push({ order, result: OrderResult.Cut });
        continue;
      }
    }

    const result = results.get(unitProvId);
    if (result) {
      resolvedOrders.push({ order, result });
    } else {
      // Hold, convoy, uncontested support — success
      resolvedOrders.push({ order, result: OrderResult.Success });
    }
  }

  // Mark dislodged units' orders
  for (const d of dislodgedUnits) {
    const existing = resolvedOrders.find(r => {
      if (r.order.type === OrderType.Hold || r.order.type === OrderType.Move ||
          r.order.type === OrderType.Support || r.order.type === OrderType.Convoy) {
        return r.order.unitProvinceId === d.unit.provinceId;
      }
      return false;
    });
    if (existing) {
      existing.result = OrderResult.Dislodged;
    }
  }

  // Apply results to create new state
  const newUnits: Unit[] = [];

  for (const unit of units) {
    const moveOrder = moveOrders.find(m => m.unitProvinceId === unit.provinceId);
    const result = results.get(unit.provinceId);
    const isDislodged = dislodgedUnits.some(d => d.unit.provinceId === unit.provinceId);

    if (isDislodged) {
      // Unit is dislodged — will need retreat orders
      continue;
    }

    if (moveOrder && result === OrderResult.Success) {
      // Unit moved successfully
      newUnits.push({
        ...unit,
        provinceId: moveOrder.targetProvinceId,
        coastId: moveOrder.targetCoastId,
      });
    } else {
      // Unit stays put
      newUnits.push({ ...unit });
    }
  }

  // Determine next phase
  let nextPhase: Phase;
  let nextSeason = state.season;
  let nextYear = state.year;

  if (dislodgedUnits.length > 0) {
    nextPhase = Phase.Retreat;
  } else if (state.season === Season.Fall) {
    nextPhase = Phase.Build;
  } else {
    nextPhase = Phase.Movement;
    nextSeason = Season.Fall;
  }

  const newState: GameState = {
    year: nextYear,
    season: nextSeason,
    phase: nextPhase,
    units: newUnits,
    supplyCenters: new Map(state.supplyCenters),
    dislodgedUnits,
    standoffs,
  };

  return { results: resolvedOrders, newState };
}

export function resolveRetreats(state: GameState, orders: Order[]): {
  results: ResolvedOrder[];
  newState: GameState;
} {
  const resolvedOrders: ResolvedOrder[] = [];
  const newUnits = [...state.units];

  // Group retreat orders by target to detect conflicts
  const retreatsByTarget = new Map<string, Order[]>();

  for (const order of orders) {
    if (order.type === OrderType.Retreat) {
      if (!retreatsByTarget.has(order.targetProvinceId)) {
        retreatsByTarget.set(order.targetProvinceId, []);
      }
      retreatsByTarget.get(order.targetProvinceId)!.push(order);
    }
  }

  for (const order of orders) {
    if (order.type === OrderType.Disband) {
      // Unit is disbanded — just remove it (don't add to newUnits)
      resolvedOrders.push({ order, result: OrderResult.Success });
      continue;
    }

    if (order.type === OrderType.Retreat) {
      const retreat = order;
      const retreatsToSame = retreatsByTarget.get(retreat.targetProvinceId)!;

      // Check if province is occupied
      const occupied = newUnits.some(u => u.provinceId === retreat.targetProvinceId);
      // Check if it was a standoff location
      const wasStandoff = state.standoffs.includes(retreat.targetProvinceId);
      // Check if multiple units retreat to the same place
      const multipleRetreats = retreatsToSame.length > 1;

      if (occupied || wasStandoff || multipleRetreats) {
        // Retreat fails — unit is disbanded
        resolvedOrders.push({ order, result: OrderResult.Bounced });
        continue;
      }

      // Find the dislodged unit
      const dislodged = state.dislodgedUnits.find(d => d.unit.provinceId === retreat.unitProvinceId);
      if (!dislodged) {
        resolvedOrders.push({ order, result: OrderResult.Invalid });
        continue;
      }

      // Can't retreat to where the attacker came from
      if (retreat.targetProvinceId === dislodged.attackerFromProvinceId) {
        resolvedOrders.push({ order, result: OrderResult.Bounced });
        continue;
      }

      // Valid retreat
      newUnits.push({
        ...dislodged.unit,
        provinceId: retreat.targetProvinceId,
        coastId: retreat.targetCoastId,
      });
      resolvedOrders.push({ order, result: OrderResult.Success });
    }
  }

  // Any dislodged units without orders are disbanded
  for (const d of state.dislodgedUnits) {
    const hasOrder = orders.some(o =>
      (o.type === OrderType.Retreat || o.type === OrderType.Disband) &&
      o.unitProvinceId === d.unit.provinceId
    );
    if (!hasOrder) {
      resolvedOrders.push({
        order: { type: OrderType.Disband, unitProvinceId: d.unit.provinceId },
        result: OrderResult.Success,
      });
    }
  }

  // Determine next phase
  let nextPhase: Phase;
  let nextSeason = state.season;
  let nextYear = state.year;

  if (state.season === Season.Fall) {
    nextPhase = Phase.Build;
  } else {
    nextPhase = Phase.Movement;
    nextSeason = Season.Fall;
  }

  return {
    results: resolvedOrders,
    newState: {
      year: nextYear,
      season: nextSeason,
      phase: nextPhase,
      units: newUnits,
      supplyCenters: new Map(state.supplyCenters),
      dislodgedUnits: [],
      standoffs: [],
    },
  };
}

export function resolveBuilds(state: GameState, orders: Order[]): {
  results: ResolvedOrder[];
  newState: GameState;
} {
  // Update supply center ownership based on current unit positions
  const newSupplyCenters = new Map(state.supplyCenters);

  for (const prov of PROVINCES) {
    if (!prov.isSupplyCenter) continue;
    const unit = state.units.find(u => u.provinceId === prov.id);
    if (unit) {
      newSupplyCenters.set(prov.id, unit.power);
    }
  }

  const resolvedOrders: ResolvedOrder[] = [];
  const newUnits = [...state.units];

  for (const order of orders) {
    if (order.type === OrderType.Build) {
      const prov = getProvince(order.provinceId);
      // Verify it's a home SC, controlled by the power, and empty
      const occupied = newUnits.some(u => u.provinceId === order.provinceId);
      const controlled = newSupplyCenters.get(order.provinceId) === order.power;
      const isHome = prov.homeOf === order.power;

      if (!occupied && controlled && isHome) {
        newUnits.push({
          type: order.unitType,
          power: order.power,
          provinceId: order.provinceId,
          coastId: order.coastId,
        });
        resolvedOrders.push({ order, result: OrderResult.Success });
      } else {
        resolvedOrders.push({ order, result: OrderResult.Invalid });
      }
    } else if (order.type === OrderType.Disband) {
      const idx = newUnits.findIndex(u => u.provinceId === order.unitProvinceId);
      if (idx >= 0) {
        newUnits.splice(idx, 1);
        resolvedOrders.push({ order, result: OrderResult.Success });
      } else {
        resolvedOrders.push({ order, result: OrderResult.Invalid });
      }
    }
  }

  return {
    results: resolvedOrders,
    newState: {
      year: state.year + 1,
      season: Season.Spring,
      phase: Phase.Movement,
      units: newUnits,
      supplyCenters: newSupplyCenters,
      dislodgedUnits: [],
      standoffs: [],
    },
  };
}

// Get the build/disband requirements for each power after a Fall turn
export function getBuildCounts(state: GameState): Map<string, number> {
  const counts = new Map<string, number>();

  for (const power of ['Austria', 'England', 'France', 'Germany', 'Italy', 'Russia', 'Turkey']) {
    const unitCount = state.units.filter(u => u.power === power).length;
    const scCount = [...state.supplyCenters.values()].filter(p => p === power).length;
    counts.set(power, scCount - unitCount); // positive = builds, negative = disbands
  }

  return counts;
}

// Check victory condition
export function checkVictory(state: GameState): string | null {
  for (const power of ['Austria', 'England', 'France', 'Germany', 'Italy', 'Russia', 'Turkey']) {
    const scCount = [...state.supplyCenters.values()].filter(p => p === power).length;
    if (scCount >= 18) return power;
  }
  return null;
}

// Main resolve function — delegates to the right phase resolver
export function resolve(state: GameState, orders: Order[]): {
  results: ResolvedOrder[];
  newState: GameState;
} {
  switch (state.phase) {
    case Phase.Movement:
      return resolveMovement(state, orders);
    case Phase.Retreat:
      return resolveRetreats(state, orders);
    case Phase.Build:
      return resolveBuilds(state, orders);
  }
}
