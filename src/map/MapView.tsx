import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Unit, UnitType, Power, ProvinceType, Order } from '../engine/types';
import { PROVINCES, PROVINCE_MAP } from '../engine/provinces';
import { POWER_COLORS, POWER_DARK_COLORS, SEA_COLOR, LAND_COLOR, NEUTRAL_SC_COLOR } from '../data/colors';
import { UNIT_POSITIONS } from '../data/positions';

interface MapViewProps {
  gameState: GameState;
  orders: Order[];
  selectedUnit: string | null;
  validTargets: string[];
  onProvinceClick: (provinceId: string) => void;
}

// Map SVG province IDs (like '_ank') to our province IDs (like 'ank')
function svgIdToProvinceId(svgId: string): string | null {
  if (!svgId.startsWith('_')) return null;
  const id = svgId.substring(1);
  // Handle some naming differences between the SVG and our data
  const mapping: Record<string, string> = {
    'nao': 'nat',
    'nwg': 'nrg',
    'lyo': 'gol',
    'mao': 'mid',
    'tys': 'tyn',
  };
  return mapping[id] || id;
}

function provinceIdToSvgId(provinceId: string): string {
  const mapping: Record<string, string> = {
    'nat': 'nao',
    'nrg': 'nwg',
    'gol': 'lyo',
    'mid': 'mao',
    'tyn': 'tys',
  };
  return '_' + (mapping[provinceId] || provinceId);
}

// Get the SVG position key for a province
// The SVG uses different names for some provinces
function getSvgPositionKey(provinceId: string): string {
  const mapping: Record<string, string> = {
    'nat': 'nao',
    'nrg': 'nwg',
    'gol': 'lyo',
    'mid': 'mao',
    'tyn': 'tys',
  };
  return mapping[provinceId] || provinceId;
}

export function MapView({ gameState, orders, selectedUnit, validTargets, onProvinceClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);

  // Load and embed the SVG
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    fetch(import.meta.env.BASE_URL + 'map.svg')
      .then(r => r.text())
      .then(svgText => {
        // Parse the SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) return;

        // Set up the SVG for our use
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.maxWidth = '100%';

        // Hide the brief label layer (abbreviations)
        const briefLabels = svg.querySelector('#BriefLabelLayer');
        if (briefLabels) (briefLabels as HTMLElement).style.display = 'none';

        // Hide current note and phase text
        const currentNote = svg.querySelector('#CurrentNote');
        if (currentNote) (currentNote as HTMLElement).style.display = 'none';
        const currentNote2 = svg.querySelector('#CurrentNote2');
        if (currentNote2) (currentNote2 as HTMLElement).style.display = 'none';
        const currentPhase = svg.querySelector('#CurrentPhase');
        if (currentPhase) (currentPhase as HTMLElement).style.display = 'none';
        // Hide the note background rectangle
        svg.querySelectorAll('.currentnoterect').forEach(el => (el as HTMLElement).style.display = 'none');

        // Crop the viewBox to remove bottom whitespace
        svg.setAttribute('viewBox', '0 0 1835 1360');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Add full province name labels
        const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelGroup.setAttribute('id', 'FullLabelLayer');
        for (const prov of PROVINCES) {
          const pos = UNIT_POSITIONS[prov.id];
          if (!pos) continue;
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', String(pos.x));
          text.setAttribute('y', String(pos.y + (prov.type === ProvinceType.Sea ? 0 : 28)));
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', prov.type === ProvinceType.Sea ? '22' : '18');
          text.setAttribute('font-family', 'Georgia, serif');
          text.setAttribute('font-style', 'italic');
          text.setAttribute('fill', '#111');
          text.setAttribute('stroke', 'white');
          text.setAttribute('stroke-width', '4');
          text.setAttribute('paint-order', 'stroke fill');
          text.style.pointerEvents = 'none';
          text.textContent = prov.name;
          labelGroup.appendChild(text);
        }
        svg.appendChild(labelGroup);

        container.innerHTML = '';
        container.appendChild(svg);
        setSvgLoaded(true);
      });
  }, []);

  // Update province colors based on game state
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgLoaded) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Color provinces based on supply center control
    for (const prov of PROVINCES) {
      const svgId = provinceIdToSvgId(prov.id);
      const el = svg.querySelector(`#${svgId}`) as SVGPathElement | null;
      if (!el) continue;

      if (prov.type === ProvinceType.Sea) {
        el.style.fill = SEA_COLOR;
      } else {
        const controller = gameState.supplyCenters.get(prov.id);
        if (controller) {
          el.style.fill = POWER_COLORS[controller];
        } else if (prov.isSupplyCenter) {
          el.style.fill = NEUTRAL_SC_COLOR;
        } else {
          el.style.fill = LAND_COLOR;
        }
      }

      // Always ensure visible borders between provinces
      el.style.stroke = '#000000';
      el.style.strokeWidth = '1.5';

      // Highlight valid targets
      if (validTargets.includes(prov.id)) {
        el.style.stroke = '#4CAF50';
        el.style.strokeWidth = '3';
      }

      // Highlight selected unit's province
      if (selectedUnit && selectedUnit === prov.id) {
        el.style.stroke = '#FF9800';
        el.style.strokeWidth = '4';
      }

      // Make clickable
      el.style.cursor = 'pointer';
      el.onclick = () => {
        const provId = svgIdToProvinceId(svgId);
        if (provId) onProvinceClick(provId);
      };
    }
  }, [gameState, svgLoaded, selectedUnit, validTargets, onProvinceClick]);

  // Draw units and orders on top of the SVG
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgLoaded) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    // Remove existing overlay elements
    svg.querySelectorAll('.unit-overlay, .order-overlay, .sc-marker').forEach(el => el.remove());

    const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 1835, 1360];

    // Draw supply center markers
    for (const prov of PROVINCES) {
      if (!prov.isSupplyCenter) continue;
      const pos = UNIT_POSITIONS[prov.id];
      if (!pos) continue;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(pos.x));
      circle.setAttribute('cy', String(pos.y + 30));
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', '#333');
      circle.setAttribute('stroke-width', '1.5');
      circle.classList.add('sc-marker');
      circle.style.pointerEvents = 'none';
      svg.appendChild(circle);

      const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerCircle.setAttribute('cx', String(pos.x));
      innerCircle.setAttribute('cy', String(pos.y + 30));
      innerCircle.setAttribute('r', '3');
      innerCircle.setAttribute('fill', '#333');
      innerCircle.classList.add('sc-marker');
      innerCircle.style.pointerEvents = 'none';
      svg.appendChild(innerCircle);
    }

    // Draw units
    for (const unit of gameState.units) {
      const posKey = unit.coastId ? `${unit.provinceId}/${unit.coastId}` : unit.provinceId;
      const pos = UNIT_POSITIONS[posKey] || UNIT_POSITIONS[unit.provinceId];
      if (!pos) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('unit-overlay');
      g.style.cursor = 'pointer';
      g.onclick = (e) => {
        e.stopPropagation();
        onProvinceClick(unit.provinceId);
      };

      if (unit.type === UnitType.Army) {
        // Army: rounded rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(pos.x - 15));
        rect.setAttribute('y', String(pos.y - 10));
        rect.setAttribute('width', '30');
        rect.setAttribute('height', '20');
        rect.setAttribute('rx', '4');
        rect.setAttribute('fill', POWER_DARK_COLORS[unit.power]);
        rect.setAttribute('stroke', '#000');
        rect.setAttribute('stroke-width', '1.5');
        g.appendChild(rect);

        // "A" label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(pos.x));
        text.setAttribute('y', String(pos.y + 5));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-family', 'sans-serif');
        text.textContent = 'A';
        text.style.pointerEvents = 'none';
        g.appendChild(text);
      } else {
        // Fleet: ellipse
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', String(pos.x));
        ellipse.setAttribute('cy', String(pos.y));
        ellipse.setAttribute('rx', '18');
        ellipse.setAttribute('ry', '12');
        ellipse.setAttribute('fill', POWER_DARK_COLORS[unit.power]);
        ellipse.setAttribute('stroke', '#000');
        ellipse.setAttribute('stroke-width', '1.5');
        g.appendChild(ellipse);

        // "F" label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(pos.x));
        text.setAttribute('y', String(pos.y + 5));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-family', 'sans-serif');
        text.textContent = 'F';
        text.style.pointerEvents = 'none';
        g.appendChild(text);
      }

      svg.appendChild(g);
    }

    // Draw order arrows
    for (const order of orders) {
      if (order.type === 'Move') {
        const fromPos = UNIT_POSITIONS[order.unitProvinceId];
        const toKey = order.targetCoastId ? `${order.targetProvinceId}/${order.targetCoastId}` : order.targetProvinceId;
        const toPos = UNIT_POSITIONS[toKey] || UNIT_POSITIONS[order.targetProvinceId];
        if (!fromPos || !toPos) continue;

        drawArrow(svg, fromPos, toPos, POWER_DARK_COLORS[findUnitPower(gameState, order.unitProvinceId)], false);
      } else if (order.type === 'Support') {
        const fromPos = UNIT_POSITIONS[order.unitProvinceId];
        const targetPos = order.supportedTargetProvinceId
          ? UNIT_POSITIONS[order.supportedTargetProvinceId]
          : UNIT_POSITIONS[order.supportedUnitProvinceId];
        if (!fromPos || !targetPos) continue;

        drawArrow(svg, fromPos, targetPos, POWER_DARK_COLORS[findUnitPower(gameState, order.unitProvinceId)], true);
      } else if (order.type === 'Convoy') {
        // Draw a small triangle marker on the fleet
        const pos = UNIT_POSITIONS[order.unitProvinceId];
        if (!pos) continue;

        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const size = 10;
        const points = `${pos.x},${pos.y - size - 15} ${pos.x - size},${pos.y + size / 2 - 15} ${pos.x + size},${pos.y + size / 2 - 15}`;
        marker.setAttribute('points', points);
        marker.setAttribute('fill', 'none');
        marker.setAttribute('stroke', POWER_DARK_COLORS[findUnitPower(gameState, order.unitProvinceId)]);
        marker.setAttribute('stroke-width', '2');
        marker.setAttribute('stroke-dasharray', '4,2');
        marker.classList.add('order-overlay');
        marker.style.pointerEvents = 'none';
        svg.appendChild(marker);
      } else if (order.type === 'Hold') {
        // Draw a small octagon around the unit
        const pos = UNIT_POSITIONS[order.unitProvinceId];
        if (!pos) continue;

        const r = 22;
        const points = [];
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i - Math.PI / 8;
          points.push(`${pos.x + r * Math.cos(angle)},${pos.y + r * Math.sin(angle)}`);
        }

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.join(' '));
        polygon.setAttribute('fill', 'none');
        polygon.setAttribute('stroke', POWER_DARK_COLORS[findUnitPower(gameState, order.unitProvinceId)]);
        polygon.setAttribute('stroke-width', '2');
        polygon.classList.add('order-overlay');
        polygon.style.pointerEvents = 'none';
        svg.appendChild(polygon);
      }
    }

    // Draw dislodged units
    for (const d of gameState.dislodgedUnits) {
      const pos = UNIT_POSITIONS[d.unit.provinceId];
      if (!pos) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('unit-overlay');
      g.style.opacity = '0.6';
      g.style.cursor = 'pointer';
      g.onclick = (e) => {
        e.stopPropagation();
        onProvinceClick(d.unit.provinceId);
      };

      // Red halo
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('cx', String(pos.x + 15));
      halo.setAttribute('cy', String(pos.y - 15));
      halo.setAttribute('r', '18');
      halo.setAttribute('fill', 'rgba(255,0,0,0.3)');
      halo.setAttribute('stroke', 'red');
      halo.setAttribute('stroke-width', '2');
      g.appendChild(halo);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(pos.x + 15));
      text.setAttribute('y', String(pos.y - 10));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'red');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('font-family', 'sans-serif');
      text.textContent = d.unit.type === UnitType.Army ? 'A' : 'F';
      text.style.pointerEvents = 'none';
      g.appendChild(text);

      svg.appendChild(g);
    }
  }, [gameState, orders, svgLoaded, onProvinceClick]);

  return (
    <div
      ref={containerRef}
      className="map-container"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    />
  );
}

function findUnitPower(state: GameState, provinceId: string): Power {
  const unit = state.units.find(u => u.provinceId === provinceId);
  if (unit) return unit.power;
  const dislodged = state.dislodgedUnits.find(d => d.unit.provinceId === provinceId);
  if (dislodged) return dislodged.unit.power;
  return Power.Austria; // fallback
}

function drawArrow(
  svg: SVGElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  dashed: boolean,
) {
  // Calculate arrow endpoint (stop short of the target)
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const endX = to.x - (dx / len) * 20;
  const endY = to.y - (dy / len) * 20;

  // Arrow line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(from.x));
  line.setAttribute('y1', String(from.y));
  line.setAttribute('x2', String(endX));
  line.setAttribute('y2', String(endY));
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '4');
  if (dashed) {
    line.setAttribute('stroke-dasharray', '8,4');
  }
  line.classList.add('order-overlay');
  line.style.pointerEvents = 'none';

  // White outline for readability
  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  outline.setAttribute('x1', String(from.x));
  outline.setAttribute('y1', String(from.y));
  outline.setAttribute('x2', String(endX));
  outline.setAttribute('y2', String(endY));
  outline.setAttribute('stroke', 'white');
  outline.setAttribute('stroke-width', '7');
  if (dashed) {
    outline.setAttribute('stroke-dasharray', '8,4');
  }
  outline.classList.add('order-overlay');
  outline.style.pointerEvents = 'none';

  svg.appendChild(outline);
  svg.appendChild(line);

  // Arrowhead
  const angle = Math.atan2(dy, dx);
  const headLen = 12;
  const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const points = [
    `${endX},${endY}`,
    `${endX - headLen * Math.cos(angle - 0.4)},${endY - headLen * Math.sin(angle - 0.4)}`,
    `${endX - headLen * Math.cos(angle + 0.4)},${endY - headLen * Math.sin(angle + 0.4)}`,
  ].join(' ');
  head.setAttribute('points', points);
  head.setAttribute('fill', color);
  head.classList.add('order-overlay');
  head.style.pointerEvents = 'none';
  svg.appendChild(head);
}
