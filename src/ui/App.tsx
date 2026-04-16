import { useState, useCallback, useEffect } from 'react';
import {
  GameState, Order, OrderType, Phase, Season, Power, UnitType,
  Unit, Campaign, MoveOrder, HoldOrder, SupportOrder, ConvoyOrder,
  RetreatOrder, DisbandOrder, BuildOrder, SerializedGameState,
  ALL_POWERS,
} from '../engine/types';
import { createInitialState, serializeState, deserializeState } from '../engine/setup';
import { resolve, getBuildCounts, checkVictory } from '../engine/resolver';
import { PROVINCE_MAP, PROVINCES } from '../engine/provinces';
import { getValidMoveTargets } from '../engine/adjacency';
import { MapView } from '../map/MapView';
import { Sidebar } from './Sidebar';
import { formatOrder } from '../game/orderUtils';
import './App.css';

type OrderMode = null | 'move' | 'support' | 'convoy' | 'retreat' | 'build';

interface SetupUnit {
  provinceId: string;
  type: UnitType;
  power: Power;
  coastId?: string;
}

export function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>(null);
  const [validTargets, setValidTargets] = useState<string[]>([]);
  const [supportTarget, setSupportTarget] = useState<string | null>(null);
  const [convoyArmy, setConvoyArmy] = useState<string | null>(null);
  const [turnHistory, setTurnHistory] = useState<Campaign['turns']>([]);
  const [campaignName, setCampaignName] = useState('New Campaign');
  const [showMenu, setShowMenu] = useState(true);
  const [viewingTurn, setViewingTurn] = useState<number | null>(null);
  const [coastPrompt, setCoastPrompt] = useState<{
    provinceId: string;
    coasts: { id: string; name: string }[];
    callback: (coastId: string) => void;
  } | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [setupUnits, setSetupUnits] = useState<SetupUnit[]>([]);
  const [setupPower, setSetupPower] = useState<Power>(Power.Austria);
  const [setupUnitType, setSetupUnitType] = useState<UnitType>(UnitType.Army);
  const [setupYear, setSetupYear] = useState(1901);
  const [message, setMessage] = useState<string | null>(null);

  // Show temporary messages
  const flash = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (coastPrompt) return;
      if (showMenu) return;

      if (e.key === 'h' || e.key === 'H') {
        if (selectedUnit) handleHold();
      } else if (e.key === 'm' || e.key === 'M') {
        if (selectedUnit) startMove();
      } else if (e.key === 's' || e.key === 'S') {
        if (selectedUnit) startSupport();
      } else if (e.key === 'c' || e.key === 'C') {
        if (selectedUnit) startConvoy();
      } else if (e.key === 'Escape') {
        cancelOrder();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Cancel current order mode
  const cancelOrder = useCallback(() => {
    setSelectedUnit(null);
    setOrderMode(null);
    setValidTargets([]);
    setSupportTarget(null);
    setConvoyArmy(null);
  }, []);

  // Province click handler
  const onProvinceClick = useCallback((provinceId: string) => {
    if (setupMode) {
      handleSetupClick(provinceId);
      return;
    }

    if (coastPrompt) return;

    const state = gameState;

    // Build phase
    if (state.phase === Phase.Build) {
      handleBuildClick(provinceId);
      return;
    }

    // Retreat phase
    if (state.phase === Phase.Retreat) {
      handleRetreatClick(provinceId);
      return;
    }

    // Movement phase
    if (orderMode === 'move' && selectedUnit) {
      // Clicking a target province for a move
      if (validTargets.includes(provinceId)) {
        completeMoveOrder(provinceId);
      } else {
        flash('Invalid move target');
      }
      return;
    }

    if (orderMode === 'support' && selectedUnit) {
      if (!supportTarget) {
        // First click: select the unit being supported
        const unit = state.units.find(u => u.provinceId === provinceId);
        if (unit) {
          setSupportTarget(provinceId);
          // Now valid targets = adjacent provinces the supported unit can reach + its own province (for hold)
          const targets = getValidMoveTargets(unit.type, unit.provinceId, unit.coastId)
            .map(t => t.provinceId);
          targets.push(provinceId); // Support hold
          // Filter to only include provinces the supporting unit can also reach
          const supporterTargets = getValidMoveTargets(
            state.units.find(u => u.provinceId === selectedUnit)!.type,
            selectedUnit,
            state.units.find(u => u.provinceId === selectedUnit)!.coastId,
          ).map(t => t.provinceId);
          const intersection = targets.filter(t => supporterTargets.includes(t) || t === provinceId);
          setValidTargets(intersection);
        } else {
          flash('No unit there to support');
        }
      } else {
        // Second click: select where the support is directed
        if (provinceId === supportTarget) {
          // Support hold
          completeOrder({
            type: OrderType.Support,
            unitProvinceId: selectedUnit,
            supportedUnitProvinceId: supportTarget,
          });
        } else if (validTargets.includes(provinceId)) {
          completeOrder({
            type: OrderType.Support,
            unitProvinceId: selectedUnit,
            supportedUnitProvinceId: supportTarget,
            supportedTargetProvinceId: provinceId,
          });
        } else {
          flash('Invalid support target');
        }
      }
      return;
    }

    if (orderMode === 'convoy' && selectedUnit) {
      if (!convoyArmy) {
        // First click: select the army being convoyed
        const unit = state.units.find(u => u.provinceId === provinceId);
        if (unit && unit.type === UnitType.Army) {
          setConvoyArmy(provinceId);
          flash('Now click the army\'s destination');
        } else {
          flash('Must select an army to convoy');
        }
      } else {
        // Second click: select destination
        completeOrder({
          type: OrderType.Convoy,
          unitProvinceId: selectedUnit,
          convoyedUnitProvinceId: convoyArmy,
          convoyTargetProvinceId: provinceId,
        });
      }
      return;
    }

    // No active order mode: select a unit
    const unit = state.units.find(u => u.provinceId === provinceId);
    if (unit) {
      setSelectedUnit(provinceId);
      setOrderMode(null);
      setValidTargets([]);
      setSupportTarget(null);
      setConvoyArmy(null);
    } else {
      cancelOrder();
    }
  }, [gameState, orderMode, selectedUnit, validTargets, supportTarget, convoyArmy, coastPrompt, setupMode, flash, cancelOrder]);

  // Order actions
  function handleHold() {
    if (!selectedUnit) return;
    completeOrder({ type: OrderType.Hold, unitProvinceId: selectedUnit });
  }

  function startMove() {
    if (!selectedUnit) return;
    const unit = gameState.units.find(u => u.provinceId === selectedUnit);
    if (!unit) return;
    setOrderMode('move');
    const targets = getValidMoveTargets(unit.type, unit.provinceId, unit.coastId);
    setValidTargets(targets.map(t => t.provinceId));
  }

  function startSupport() {
    if (!selectedUnit) return;
    setOrderMode('support');
    setSupportTarget(null);
    // Valid first targets: any province with a unit
    setValidTargets(gameState.units.map(u => u.provinceId));
  }

  function startConvoy() {
    if (!selectedUnit) return;
    const unit = gameState.units.find(u => u.provinceId === selectedUnit);
    if (!unit || unit.type !== UnitType.Fleet) {
      flash('Only fleets can convoy');
      return;
    }
    setOrderMode('convoy');
    setConvoyArmy(null);
    setValidTargets(gameState.units.filter(u => u.type === UnitType.Army).map(u => u.provinceId));
  }

  function completeMoveOrder(targetProvinceId: string) {
    if (!selectedUnit) return;
    const prov = PROVINCE_MAP.get(targetProvinceId);
    if (prov?.coasts && prov.coasts.length > 0) {
      const unit = gameState.units.find(u => u.provinceId === selectedUnit);
      if (unit?.type === UnitType.Fleet) {
        // Need to choose a coast
        setCoastPrompt({
          provinceId: targetProvinceId,
          coasts: prov.coasts,
          callback: (coastId) => {
            completeOrder({
              type: OrderType.Move,
              unitProvinceId: selectedUnit!,
              targetProvinceId,
              targetCoastId: coastId,
            });
            setCoastPrompt(null);
          },
        });
        return;
      }
    }

    completeOrder({
      type: OrderType.Move,
      unitProvinceId: selectedUnit,
      targetProvinceId,
    });
  }

  function completeOrder(order: Order) {
    // Remove any existing order for this unit
    const unitProvId = 'unitProvinceId' in order ? order.unitProvinceId : '';
    setOrders(prev => [...prev.filter(o => {
      if ('unitProvinceId' in o) return o.unitProvinceId !== unitProvId;
      return true;
    }), order]);
    cancelOrder();
  }

  function removeOrder(index: number) {
    setOrders(prev => prev.filter((_, i) => i !== index));
  }

  // Retreat phase handling
  function handleRetreatClick(provinceId: string) {
    if (orderMode === 'retreat' && selectedUnit) {
      // Check if target is valid
      const dislodged = gameState.dislodgedUnits.find(d => d.unit.provinceId === selectedUnit);
      if (!dislodged) return;

      // Can't retreat to attacker's province or standoff locations
      if (provinceId === dislodged.attackerFromProvinceId) {
        flash('Cannot retreat to attacker\'s province');
        return;
      }
      if (gameState.standoffs.includes(provinceId)) {
        flash('Cannot retreat to standoff location');
        return;
      }
      if (gameState.units.some(u => u.provinceId === provinceId)) {
        flash('Province is occupied');
        return;
      }

      const prov = PROVINCE_MAP.get(provinceId);
      if (prov?.coasts && prov.coasts.length > 0 && dislodged.unit.type === UnitType.Fleet) {
        setCoastPrompt({
          provinceId,
          coasts: prov.coasts,
          callback: (coastId) => {
            completeOrder({
              type: OrderType.Retreat,
              unitProvinceId: selectedUnit!,
              targetProvinceId: provinceId,
              targetCoastId: coastId,
            });
            setCoastPrompt(null);
          },
        });
        return;
      }

      completeOrder({
        type: OrderType.Retreat,
        unitProvinceId: selectedUnit,
        targetProvinceId: provinceId,
      });
      return;
    }

    // Select a dislodged unit
    const dislodged = gameState.dislodgedUnits.find(d => d.unit.provinceId === provinceId);
    if (dislodged) {
      setSelectedUnit(provinceId);
      setOrderMode('retreat');
      // Calculate valid retreat targets
      const unit = dislodged.unit;
      const targets = getValidMoveTargets(unit.type, unit.provinceId, unit.coastId)
        .map(t => t.provinceId)
        .filter(id => {
          if (id === dislodged.attackerFromProvinceId) return false;
          if (gameState.standoffs.includes(id)) return false;
          if (gameState.units.some(u => u.provinceId === id)) return false;
          return true;
        });
      setValidTargets(targets);
    }
  }

  // Build phase handling
  function handleBuildClick(provinceId: string) {
    const counts = getBuildCounts(gameState);
    const unit = gameState.units.find(u => u.provinceId === provinceId);

    if (unit) {
      // Clicking an existing unit during build phase = disband it
      const power = unit.power;
      const count = counts.get(power) || 0;
      if (count < 0) {
        // This power needs to disband
        completeOrder({
          type: OrderType.Disband,
          unitProvinceId: provinceId,
        });
      } else {
        flash(`${power} doesn't need to disband`);
      }
      return;
    }

    // Clicking an empty province = try to build
    const prov = PROVINCE_MAP.get(provinceId);
    if (!prov || !prov.isSupplyCenter || !prov.homeOf) {
      flash('Can only build on empty home supply centers');
      return;
    }

    const power = prov.homeOf;
    const count = counts.get(power) || 0;
    const existingBuilds = orders.filter(o => o.type === OrderType.Build && o.power === power).length;
    const existingDisbands = orders.filter(o => o.type === OrderType.Disband && gameState.units.find(u => u.provinceId === o.unitProvinceId)?.power === power).length;

    if (count - existingBuilds + existingDisbands <= 0) {
      flash(`${power} has no more builds available`);
      return;
    }

    const controller = gameState.supplyCenters.get(provinceId);
    if (controller !== power) {
      flash(`${power} doesn't control ${prov.name}`);
      return;
    }

    // Choose unit type
    if (prov.coasts && prov.coasts.length > 0) {
      // Can build army or fleet with coast choice
      setCoastPrompt({
        provinceId,
        coasts: [
          { id: 'army', name: 'Army' },
          ...prov.coasts.map(c => ({ id: `fleet_${c.id}`, name: `Fleet (${c.name})` })),
        ],
        callback: (choice) => {
          if (choice === 'army') {
            completeOrder({
              type: OrderType.Build,
              provinceId,
              unitType: UnitType.Army,
              power,
            });
          } else {
            const coastId = choice.replace('fleet_', '');
            completeOrder({
              type: OrderType.Build,
              provinceId,
              unitType: UnitType.Fleet,
              coastId,
              power,
            });
          }
          setCoastPrompt(null);
        },
      });
    } else if (prov.type === 'Land') {
      // Landlocked — can only build army
      completeOrder({
        type: OrderType.Build,
        provinceId,
        unitType: UnitType.Army,
        power,
      });
    } else {
      // Coastal — choose army or fleet
      setCoastPrompt({
        provinceId,
        coasts: [
          { id: 'army', name: 'Army' },
          { id: 'fleet', name: 'Fleet' },
        ],
        callback: (choice) => {
          completeOrder({
            type: OrderType.Build,
            provinceId,
            unitType: choice === 'army' ? UnitType.Army : UnitType.Fleet,
            power,
          });
          setCoastPrompt(null);
        },
      });
    }
  }

  // Submit orders
  function submitOrders() {
    const stateBefore = serializeState(gameState);
    const { results, newState } = resolve(gameState, [...orders]);

    // Record turn
    setTurnHistory(prev => [...prev, {
      year: gameState.year,
      season: gameState.season,
      phase: gameState.phase,
      orders: [...orders],
      results,
      stateBefore,
      stateAfter: serializeState(newState),
    }]);

    setGameState(newState);
    setOrders([]);
    cancelOrder();

    // Check victory
    const winner = checkVictory(newState);
    if (winner) {
      flash(`${winner} wins with 18+ supply centers!`);
    }

    // Flash phase info
    if (newState.phase === Phase.Retreat && newState.dislodgedUnits.length > 0) {
      flash(`Retreat phase: ${newState.dislodgedUnits.length} unit(s) must retreat or disband`);
    } else if (newState.phase === Phase.Build) {
      flash('Build/Disband phase');
    }
  }

  // Setup mode handlers
  function handleSetupClick(provinceId: string) {
    const existing = setupUnits.findIndex(u => u.provinceId === provinceId);
    if (existing >= 0) {
      // Remove existing unit
      setSetupUnits(prev => prev.filter((_, i) => i !== existing));
      return;
    }

    const prov = PROVINCE_MAP.get(provinceId);
    if (!prov) return;

    if (prov.type === 'Sea' && setupUnitType === UnitType.Army) {
      flash('Armies cannot be placed on sea zones');
      return;
    }
    if (prov.type === 'Land' && setupUnitType === UnitType.Fleet) {
      flash('Fleets cannot be placed on landlocked provinces');
      return;
    }

    if (prov.coasts && prov.coasts.length > 0 && setupUnitType === UnitType.Fleet) {
      setCoastPrompt({
        provinceId,
        coasts: prov.coasts,
        callback: (coastId) => {
          setSetupUnits(prev => [...prev, {
            provinceId,
            type: setupUnitType,
            power: setupPower,
            coastId,
          }]);
          setCoastPrompt(null);
        },
      });
      return;
    }

    setSetupUnits(prev => [...prev, {
      provinceId,
      type: setupUnitType,
      power: setupPower,
    }]);
  }

  function startSetupGame() {
    const supplyCenters = new Map<string, Power>();
    for (const prov of PROVINCES) {
      if (prov.isSupplyCenter && prov.homeOf) {
        supplyCenters.set(prov.id, prov.homeOf);
      }
    }
    // Also mark SCs as controlled if a unit is there
    for (const unit of setupUnits) {
      const prov = PROVINCE_MAP.get(unit.provinceId);
      if (prov?.isSupplyCenter) {
        supplyCenters.set(unit.provinceId, unit.power);
      }
    }

    setGameState({
      year: setupYear,
      season: Season.Spring,
      phase: Phase.Movement,
      units: setupUnits.map(u => ({
        type: u.type,
        power: u.power,
        provinceId: u.provinceId,
        coastId: u.coastId,
      })),
      supplyCenters,
      dislodgedUnits: [],
      standoffs: [],
    });
    setSetupMode(false);
    setShowMenu(false);
    setTurnHistory([]);
    setOrders([]);
  }

  // Save/load campaign
  function saveCampaign() {
    const campaign: Campaign = {
      version: 1,
      name: campaignName,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      currentTurnIndex: turnHistory.length,
      turns: turnHistory,
      currentState: serializeState(gameState),
    };
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaignName.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Campaign saved!');
  }

  function loadCampaign(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const campaign = JSON.parse(e.target?.result as string) as Campaign;
        setCampaignName(campaign.name);
        setTurnHistory(campaign.turns);
        setGameState(deserializeState(campaign.currentState));
        setOrders([]);
        cancelOrder();
        setShowMenu(false);
        flash(`Loaded: ${campaign.name}`);
      } catch {
        flash('Error loading campaign file');
      }
    };
    reader.readAsText(file);
  }

  // Auto-save to localStorage
  useEffect(() => {
    if (showMenu) return;
    const campaign: Campaign = {
      version: 1,
      name: campaignName,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      currentTurnIndex: turnHistory.length,
      turns: turnHistory,
      currentState: serializeState(gameState),
    };
    localStorage.setItem('diplomacy-autosave', JSON.stringify(campaign));
  }, [gameState, turnHistory, campaignName, showMenu]);

  // View historical turn
  const viewState = viewingTurn !== null && viewingTurn < turnHistory.length
    ? deserializeState(turnHistory[viewingTurn].stateAfter)
    : gameState;

  // Menu screen
  if (showMenu) {
    return (
      <div className="menu-screen">
        <h1>Diplomacy</h1>
        <div className="menu-options">
          <div className="menu-section">
            <h2>New Game</h2>
            <input
              type="text"
              placeholder="Campaign name"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
            />
            <button onClick={() => {
              setGameState(createInitialState());
              setTurnHistory([]);
              setOrders([]);
              setShowMenu(false);
            }}>
              Standard Start (1901)
            </button>
            <button onClick={() => {
              setSetupMode(true);
              setSetupUnits([]);
              setShowMenu(false);
            }}>
              Custom Setup
            </button>
          </div>

          <div className="menu-section">
            <h2>Load Game</h2>
            <input
              type="file"
              accept=".json"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) loadCampaign(file);
              }}
            />
            {localStorage.getItem('diplomacy-autosave') && (
              <button onClick={() => {
                try {
                  const saved = JSON.parse(localStorage.getItem('diplomacy-autosave')!);
                  setCampaignName(saved.name);
                  setTurnHistory(saved.turns);
                  setGameState(deserializeState(saved.currentState));
                  setOrders([]);
                  setShowMenu(false);
                  flash('Loaded autosave');
                } catch {
                  flash('Error loading autosave');
                }
              }}>
                Resume Autosave
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup mode
  if (setupMode) {
    // Create a temporary game state for the map view
    const setupState: GameState = {
      year: setupYear,
      season: Season.Spring,
      phase: Phase.Movement,
      units: setupUnits.map(u => ({
        type: u.type,
        power: u.power,
        provinceId: u.provinceId,
        coastId: u.coastId,
      })),
      supplyCenters: new Map(
        PROVINCES.filter(p => p.isSupplyCenter && p.homeOf).map(p => [p.id, p.homeOf!])
      ),
      dislodgedUnits: [],
      standoffs: [],
    };

    return (
      <div className="app-container">
        <div className="map-panel">
          <MapView
            gameState={setupState}
            orders={[]}
            selectedUnit={null}
            validTargets={[]}
            onProvinceClick={onProvinceClick}
          />
        </div>
        <div className="sidebar">
          <h2>Custom Setup</h2>
          <div className="setup-controls">
            <label>
              Power:
              <select value={setupPower} onChange={e => setSetupPower(e.target.value as Power)}>
                {ALL_POWERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label>
              Unit:
              <select value={setupUnitType} onChange={e => setSetupUnitType(e.target.value as UnitType)}>
                <option value={UnitType.Army}>Army</option>
                <option value={UnitType.Fleet}>Fleet</option>
              </select>
            </label>
            <label>
              Year:
              <input type="number" value={setupYear} onChange={e => setSetupYear(Number(e.target.value))} min={1901} />
            </label>
          </div>
          <p className="hint">Click provinces to place/remove units.</p>
          <div className="setup-units">
            {setupUnits.map((u, i) => (
              <div key={i} className="order-item">
                {u.power} {u.type} — {PROVINCE_MAP.get(u.provinceId)?.name}
                {u.coastId ? ` (${u.coastId.toUpperCase()})` : ''}
                <button className="remove-btn" onClick={() => setSetupUnits(prev => prev.filter((_, j) => j !== i))}>x</button>
              </div>
            ))}
          </div>
          <button className="submit-btn" onClick={startSetupGame}>Start Game</button>
          <button className="cancel-btn" onClick={() => { setSetupMode(false); setShowMenu(true); }}>Back</button>
        </div>
        {message && <div className="flash-message">{message}</div>}
        {coastPrompt && (
          <div className="coast-prompt-overlay">
            <div className="coast-prompt">
              <h3>Choose:</h3>
              {coastPrompt.coasts.map(c => (
                <button key={c.id} onClick={() => coastPrompt.callback(c.id)}>
                  {c.name}
                </button>
              ))}
              <button onClick={() => setCoastPrompt(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="map-panel">
        <MapView
          gameState={viewState}
          orders={viewingTurn === null ? orders : []}
          selectedUnit={viewingTurn === null ? selectedUnit : null}
          validTargets={viewingTurn === null ? validTargets : []}
          onProvinceClick={viewingTurn === null ? onProvinceClick : () => {}}
        />
      </div>
      <Sidebar
        gameState={viewState}
        orders={orders}
        turnHistory={turnHistory}
        campaignName={campaignName}
        selectedUnit={selectedUnit}
        orderMode={orderMode}
        viewingTurn={viewingTurn}
        onSetViewingTurn={(t) => setViewingTurn(t)}
        onHold={handleHold}
        onMove={startMove}
        onSupport={startSupport}
        onConvoy={startConvoy}
        onCancel={cancelOrder}
        onSubmit={submitOrders}
        onRemoveOrder={removeOrder}
        onSave={saveCampaign}
        onMenu={() => setShowMenu(true)}
        onDisband={selectedUnit ? () => {
          completeOrder({ type: OrderType.Disband, unitProvinceId: selectedUnit });
        } : undefined}
        gamePhase={gameState.phase}
      />
      {message && <div className="flash-message">{message}</div>}
      {coastPrompt && (
        <div className="coast-prompt-overlay">
          <div className="coast-prompt">
            <h3>Choose coast:</h3>
            {coastPrompt.coasts.map(c => (
              <button key={c.id} onClick={() => coastPrompt.callback(c.id)}>
                {c.name}
              </button>
            ))}
            <button onClick={() => setCoastPrompt(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
