import { GameState, Order, Phase, Power, ALL_POWERS } from '../engine/types';
import { PROVINCE_MAP } from '../engine/provinces';
import { formatOrder } from '../game/orderUtils';
import { getBuildCounts } from '../engine/resolver';
import { Campaign } from '../engine/types';

interface SidebarProps {
  gameState: GameState;
  orders: Order[];
  turnHistory: Campaign['turns'];
  campaignName: string;
  selectedUnit: string | null;
  orderMode: string | null;
  viewingTurn: number | null;
  onSetViewingTurn: (turn: number | null) => void;
  onHold: () => void;
  onMove: () => void;
  onSupport: () => void;
  onConvoy: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onRemoveOrder: (index: number) => void;
  onSave: () => void;
  onMenu: () => void;
  onDisband?: () => void;
  gamePhase: Phase;
}

export function Sidebar({
  gameState, orders, turnHistory, campaignName, selectedUnit, orderMode,
  viewingTurn, onSetViewingTurn,
  onHold, onMove, onSupport, onConvoy, onCancel, onSubmit,
  onRemoveOrder, onSave, onMenu, onDisband, gamePhase,
}: SidebarProps) {
  // Supply center counts
  const scCounts = new Map<Power, number>();
  for (const power of ALL_POWERS) {
    scCounts.set(power, 0);
  }
  for (const [, power] of gameState.supplyCenters) {
    scCounts.set(power, (scCounts.get(power) || 0) + 1);
  }
  const sortedPowers = [...scCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Unit counts
  const unitCounts = new Map<Power, number>();
  for (const unit of gameState.units) {
    unitCounts.set(unit.power, (unitCounts.get(unit.power) || 0) + 1);
  }

  // Build counts (for build phase)
  const buildCounts = gamePhase === Phase.Build ? getBuildCounts(gameState) : null;

  // Selected unit info
  const selectedUnitObj = selectedUnit
    ? gameState.units.find(u => u.provinceId === selectedUnit) ||
      gameState.dislodgedUnits.find(d => d.unit.provinceId === selectedUnit)?.unit
    : null;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2>{campaignName}</h2>
        <div className="turn-info">
          {gameState.season} {gameState.year} — {gameState.phase}
        </div>
      </div>

      {/* Viewing history notice */}
      {viewingTurn !== null && (
        <div className="history-notice">
          Viewing turn {viewingTurn + 1} of {turnHistory.length}
          <button onClick={() => onSetViewingTurn(null)}>Back to current</button>
        </div>
      )}

      {/* Selected unit info */}
      {selectedUnitObj && viewingTurn === null && (
        <div className="selected-unit">
          <div className="unit-info">
            <strong>{selectedUnitObj.type}</strong> ({selectedUnitObj.power}) at{' '}
            {PROVINCE_MAP.get(selectedUnit!)?.name}
          </div>

          {gamePhase === Phase.Movement && (
            <div className="order-buttons">
              <button className={orderMode === 'move' ? 'active' : ''} onClick={onMove}>
                Move (M)
              </button>
              <button onClick={onHold}>Hold (H)</button>
              <button className={orderMode === 'support' ? 'active' : ''} onClick={onSupport}>
                Support (S)
              </button>
              {selectedUnitObj.type === 'Fleet' && (
                <button className={orderMode === 'convoy' ? 'active' : ''} onClick={onConvoy}>
                  Convoy (C)
                </button>
              )}
              <button className="cancel-btn" onClick={onCancel}>Cancel (Esc)</button>
            </div>
          )}

          {gamePhase === Phase.Retreat && (
            <div className="order-buttons">
              <button className={orderMode === 'retreat' ? 'active' : ''} onClick={() => {}}>
                Click destination to retreat
              </button>
              {onDisband && <button onClick={onDisband}>Disband</button>}
              <button className="cancel-btn" onClick={onCancel}>Cancel (Esc)</button>
            </div>
          )}

          {gamePhase === Phase.Build && (
            <div className="order-buttons">
              {onDisband && <button onClick={onDisband}>Disband this unit</button>}
            </div>
          )}

          {orderMode && (
            <div className="mode-hint">
              {orderMode === 'move' && 'Click a destination province'}
              {orderMode === 'support' && 'Click the unit to support, then its target'}
              {orderMode === 'convoy' && 'Click the army to convoy, then its destination'}
              {orderMode === 'retreat' && 'Click a valid retreat destination'}
            </div>
          )}
        </div>
      )}

      {/* Build phase info */}
      {gamePhase === Phase.Build && buildCounts && viewingTurn === null && (
        <div className="build-info">
          <h3>Builds &amp; Disbands</h3>
          {ALL_POWERS.map(p => {
            const count = buildCounts.get(p) || 0;
            if (count === 0) return null;
            return (
              <div key={p} className="build-item">
                {p}: {count > 0 ? `${count} build(s)` : `${Math.abs(count)} disband(s)`}
              </div>
            );
          })}
          <p className="hint">Click empty home SCs to build. Click units to disband.</p>
        </div>
      )}

      {/* Current orders */}
      {viewingTurn === null && orders.length > 0 && (
        <div className="orders-list">
          <h3>Orders ({orders.length})</h3>
          {orders.map((order, i) => (
            <div key={i} className="order-item">
              <span>{formatOrder(order)}</span>
              <button className="remove-btn" onClick={() => onRemoveOrder(i)}>x</button>
            </div>
          ))}
        </div>
      )}

      {/* Historical turn orders */}
      {viewingTurn !== null && turnHistory[viewingTurn] && (
        <div className="orders-list">
          <h3>Orders — {turnHistory[viewingTurn].season} {turnHistory[viewingTurn].year}</h3>
          {turnHistory[viewingTurn].results.map((r, i) => (
            <div key={i} className={`order-item result-${r.result.toLowerCase()}`}>
              <span>{formatOrder(r.order)}</span>
              <span className="result-badge">{r.result}</span>
            </div>
          ))}
        </div>
      )}

      {/* Supply center counts */}
      <div className="sc-counts">
        <h3>Supply Centers</h3>
        <table>
          <thead>
            <tr><th>Power</th><th>SCs</th><th>Units</th></tr>
          </thead>
          <tbody>
            {sortedPowers.map(([power, count]) => (
              <tr key={power} className={count === 0 ? 'eliminated' : ''}>
                <td>
                  <span className="power-dot" style={{ background: power ? undefined : '#999' }} data-power={power} />
                  {power}
                </td>
                <td>{count}</td>
                <td>{unitCounts.get(power) || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="victory-line">Victory: 18 supply centers</div>
      </div>

      {/* Turn history navigation */}
      {turnHistory.length > 0 && (
        <div className="turn-history">
          <h3>History</h3>
          <div className="history-buttons">
            {turnHistory.map((turn, i) => (
              <button
                key={i}
                className={viewingTurn === i ? 'active' : ''}
                onClick={() => onSetViewingTurn(viewingTurn === i ? null : i)}
              >
                {turn.season.substring(0, 1)}{turn.year.toString().substring(2)} {turn.phase.substring(0, 1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {viewingTurn === null && (
        <div className="action-buttons">
          <button className="submit-btn" onClick={onSubmit}>
            Submit {gamePhase === Phase.Movement ? 'Moves' : gamePhase === Phase.Retreat ? 'Retreats' : 'Builds'}
          </button>
          <button onClick={onSave}>Save Game</button>
          <button onClick={() => window.print()}>Print Map</button>
          <button onClick={onMenu}>Menu</button>
        </div>
      )}
    </div>
  );
}
