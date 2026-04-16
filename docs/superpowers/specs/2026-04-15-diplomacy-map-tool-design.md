# Diplomacy Map Tool — Design Spec

**Date:** 2026-04-15
**Purpose:** Browser-based Diplomacy game tracker for face-to-face classroom play. Renders printable maps with supply center shading, supports point-and-click order entry, and adjudicates moves automatically.

## Context

Jeremy runs Diplomacy games with students. They play face-to-face and need clean printed maps between rounds. Backstabbr is almost right but has ugly/unclear visuals and uses abbreviations instead of full province names. This tool replaces it with something clear enough for students and portable enough to run on any computer via GitHub Pages.

## V1 Scope

### In scope
- Interactive SVG map of the standard Diplomacy board
- Full province names (not abbreviations)
- Point-and-click order entry with hotkeys (H/M/S/C)
- Order visualization (arrows, hold symbols, support lines, convoy markers)
- Automatic adjudication of movement, retreat, and build phases
- Light color shading for supply center ownership (printer-friendly)
- Supply center count per power displayed in sidebar
- Printable map + order list per turn
- Print history (range of turns)
- Campaign save/load (single JSON file per campaign, full game history)
- localStorage auto-backup
- Custom game setup (place units anywhere for mid-game start)
- Victory detection (18 supply centers)
- Split coast handling (Bulgaria, Spain, St. Petersburg)
- GitHub Pages deployment (private repo)

### Out of scope (future versions)
- Claude-as-input mode (photo/verbal order entry)
- Hatched printing patterns (B&W printer-friendly, 7 distinct patterns)
- DATC edge case hardening
- Multiple map variants
- Player accounts / hidden orders
- Negotiation timer

## Architecture

### Tech stack
- **Framework:** Vite + TypeScript + React
- **Adjudication:** Fork of KarmaMi/js-diplomacy (MIT, ~3K lines, proven browser-compatible)
- **Map rendering:** SVG with province paths from vizdip/diplomacy-engine (adapted, full names)
- **Unit positions:** Pre-computed coordinates from vizdip position data
- **Deployment:** GitHub Actions → GitHub Pages
- **State management:** React state + JSON save files

### Why these choices
- **Vite** — fast builds, zero-config TypeScript support, clean GitHub Actions integration
- **React** — vizdip already uses React for the map, so we can adapt its components directly
- **js-diplomacy** — the only browser-compatible Diplomacy adjudicator. Handles movement, retreat, and build phases. Covers bounces, dislodges, cut supports, convoys.
- **SVG** — scalable, printable, provinces individually addressable for shading and click events

### Project structure
```
diplomacy-tool/
├── src/
│   ├── engine/          # Adapted js-diplomacy adjudication engine
│   │   ├── board.ts
│   │   ├── graph.ts
│   │   ├── rule.ts
│   │   ├── standard.ts
│   │   ├── standardBoard.ts
│   │   ├── standardMap/     # Province definitions, adjacency, powers
│   │   ├── standardRule/    # Movement, retreat, build resolvers
│   │   ├── util.ts
│   │   └── variant.ts
│   ├── map/             # SVG map rendering
│   │   ├── MapView.tsx       # Main SVG map component
│   │   ├── ProvinceLayer.tsx # Province shapes with shading
│   │   ├── UnitLayer.tsx     # Army/fleet symbols
│   │   ├── OrderLayer.tsx    # Arrows, hold rings, support lines
│   │   ├── LabelLayer.tsx    # Full province name labels
│   │   └── positions.ts     # Unit and label coordinates
│   ├── game/            # Game state management
│   │   ├── GameState.ts      # Core game state types
│   │   ├── Campaign.ts       # Save/load campaign files
│   │   └── TurnHistory.ts    # Turn navigation
│   ├── ui/              # User interface
│   │   ├── App.tsx           # Main app shell
│   │   ├── Sidebar.tsx       # Supply center counts, order list, turn info
│   │   ├── Toolbar.tsx       # Order type buttons, submit, phase controls
│   │   ├── OrderEntry.tsx    # Click-to-order interaction logic
│   │   ├── SetupMode.tsx     # Custom game setup UI
│   │   └── PrintView.tsx     # Print-optimized layout
│   ├── data/            # Static game data
│   │   └── colors.ts        # Power colors (pastel, printer-friendly)
│   └── main.tsx
├── public/
├── docs/superpowers/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .github/workflows/deploy.yml
```

## Map Rendering

### Province shapes
Adapted from vizdip's map-image.tsx, which contains inline SVG path data for all 76 provinces (75 playable + Switzerland). Each province is a `<path>` element with:
- A unique ID matching the province code
- Fill color based on supply center ownership (pastel shade) or neutral (light green for unowned SCs, white/light gray for non-SC provinces)
- Stroke for borders
- Click handler for order entry

### Province names
Full names displayed as `<text>` elements positioned within each province. Names from the js-diplomacy location data (e.g., "Budapest" not "Bud", "Constantinople" not "Con").

### Unit symbols
- **Army:** Small filled circle (or simple shield shape) in the power's color, positioned at the province's unit coordinate
- **Fleet:** Small filled anchor/ship shape in the power's color
- Both have a dark outline for contrast when printed

### Order visualization
- **Move:** Arrow from unit to destination province
- **Hold:** Small ring around the unit
- **Support:** Dashed arrow from supporting unit to the target province, with a small "S" marker
- **Convoy:** Dotted line from fleet to destination, with a "C" marker
- **Bounce/Failed:** Red X at the failed destination
- All order lines have a white margin stroke underneath for readability over the map

### Power colors (pastel, for supply center shading)
| Power | Color | Hex |
|-------|-------|-----|
| Austria | Light red/salmon | #EF9A9A |
| England | Light blue | #90CAF9 |
| France | Light cyan | #80DEEA |
| Germany | Light gray | #BDBDBD |
| Italy | Light green | #A5D6A7 |
| Russia | Light purple | #CE93D8 |
| Turkey | Light yellow/orange | #FFE082 |
| Neutral SC | Pale green | #C8E6C9 |

## Order Entry (Sandbox Mode)

### Interaction flow
1. Click any unit on the board — it highlights (glow or selection ring)
2. A context toolbar appears near the unit (or use global hotkeys):
   - **H** = Hold → order recorded immediately, hold ring appears
   - **M** = Move → click destination province → arrow appears
   - **S** = Support → click the unit being supported → click where it's acting (hold location or move destination) → support line appears
   - **C** = Convoy → click the army being convoyed → click the army's destination → convoy marker appears
3. Clicking an already-ordered unit lets you change or cancel the order
4. Units without explicit orders default to **Hold** on submission
5. Invalid orders show a brief error tooltip (e.g., "Army cannot move to sea zone")

### Submit Moves
- "Submit Moves" button (or Enter key) sends all orders to the adjudicator
- Results displayed: successful moves animate, bounces show X markers, dislodged units flash
- If retreats are needed, the app enters Retreat phase automatically
- After Fall turns, Build/Disband phase if supply center counts differ from unit counts

### Phase handling
1. **Movement phase** (Spring and Fall): Enter orders for all units, submit
2. **Retreat phase** (after movement if dislodges occurred): Dislodged units shown with red highlight. Click each to choose retreat destination (valid options highlighted) or disband. Submit retreats.
3. **Build/Disband phase** (after Fall retreats): Sidebar shows which powers build or disband. For builds: click an empty home SC, choose Army or Fleet. For disbands: click a unit to remove it. Submit builds.

### Split coasts
When moving a fleet to Bulgaria, Spain, or St. Petersburg, a small popup asks "Which coast?" with the valid options. The selected coast is shown in the order text (e.g., "Fleet Mid-Atlantic Ocean → Spain (North Coast)").

## Game State & Campaigns

### Save file format (JSON)
```json
{
  "version": 1,
  "campaign": "Period 3 — Spring 2026",
  "created": "2026-04-15T10:00:00Z",
  "lastModified": "2026-04-15T14:30:00Z",
  "currentTurnIndex": 3,
  "turns": [
    {
      "season": "Spring",
      "year": 1901,
      "phase": "movement",
      "orders": [
        { "power": "Austria", "unit": "Army", "location": "Vienna", "type": "move", "target": "Galicia" },
        { "power": "Austria", "unit": "Army", "location": "Budapest", "type": "move", "target": "Serbia" }
      ],
      "results": [
        { "order": 0, "result": "success" },
        { "order": 1, "result": "success" }
      ],
      "positionsAfter": {
        "units": [
          { "power": "Austria", "type": "Army", "location": "Galicia" }
        ],
        "supplyCenters": {
          "Austria": ["Vienna", "Budapest", "Trieste"],
          "England": ["Edinburgh", "London", "Liverpool"]
        }
      }
    }
  ]
}
```

### Campaign management
- **New Game:** Enter campaign name → standard 1901 setup
- **Custom Setup:** Enter campaign name → empty board → place units and assign SCs → set starting season/year → begin
- **Save:** Downloads `<campaign-name>.json`. Also auto-saves to localStorage.
- **Load:** Upload a JSON file → restores full game with history
- **Turn navigation:** Slider or prev/next buttons to view any past turn state. Current turn highlighted.

## Sidebar

### Always visible
- Campaign name and current season/year
- Phase indicator (Movement / Retreat / Build)
- Supply center count per power (sorted by count, descending)
- Victory threshold indicator (18 SCs)

### During order entry
- List of entered orders in standard Diplomacy notation with full names
- Each order clickable to edit/remove
- Count of units with/without orders

### After resolution
- Results summary: which orders succeeded, which bounced, which were cut
- Dislodged units listed (if any)

### Print panel
- "Print Current Turn" button
- "Print History" — select range of turns to print
- Print layout: map on top, order list below, supply center counts in footer

## Print Layout

Triggered by browser print (Ctrl+P) or print button. CSS `@media print` hides the toolbar, sidebar, and interactive elements. Shows:
- The map at maximum width
- Current season/year as header
- Order list below the map in two columns
- Supply center count summary at bottom
- Page breaks between turns when printing history

## Custom Setup Mode

For starting a game mid-way from a photo or known board state:
1. Enter campaign name, starting season/year
2. Empty map displayed
3. Click any province → popup: choose power + unit type (Army/Fleet)
4. Click any supply center → popup: choose controlling power (or neutral)
5. "Start Game" button validates setup (unit count vs SC count warning if mismatched) and begins play

## Victory & Game End

- After each Fall build/disband phase, check if any power controls 18+ supply centers
- If yes, display victory banner with the winning power
- Also support manual draw declaration (button in sidebar)
- Game can continue past victory if desired (for practice)

## Error Handling

- Invalid order attempts show inline tooltip (e.g., "Fleet cannot move to landlocked province")
- Orders that fail validation are not recorded
- Save file corruption: if JSON parse fails on load, show error with option to start new game
- localStorage quota exceeded: warn and suggest manual save/download

## Deployment

- Private GitHub repo: `bernie-lenin/diplomacy-tool`
- GitHub Actions workflow: on push to main, build with Vite, deploy to GitHub Pages
- Accessible at: `https://bernie-lenin.github.io/diplomacy-tool/`
- No server-side code, no API keys, no authentication needed
