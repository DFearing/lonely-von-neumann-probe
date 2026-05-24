# Lonely Von Neumann Probe

A Bobiverse-inspired idle/progression browser game where players manage autonomous probes across star systems — mining materials, generating energy, researching tech, building structures, and launching new probes to expand.

## Quick Start

```bash
bun install
bun run dev        # start dev server
bun test           # run 186 tests
bun run typecheck  # strict TypeScript check
bun run build      # production build
```

## Architecture

The simulation is deterministic and pure — all randomness flows through a seeded xoshiro128\*\* PRNG, enabling replay, testing, and debugging by reproducing seed + inputs.

```
src/
├── simulation/          # Pure game logic — no DOM, no side effects
│   ├── tick.ts          # Core: (state, dt, actions) -> state
│   ├── rng.ts           # Seeded xoshiro128** PRNG
│   ├── state.ts         # GameState types + createInitialState(seed)
│   ├── actions.ts       # PlayerAction discriminated union
│   ├── rates.ts         # Resource rate calculator
│   ├── queries.ts       # UI query helpers (tech status, available builds)
│   ├── tech-effects.ts  # Maps completed research to gameplay multipliers
│   ├── systems/         # Sub-systems called by tick() in deterministic order
│   │   ├── resources.ts, construction.ts, research.ts, navigation.ts, events.ts
│   └── data/            # Static game data tables
│       ├── structures.ts, components.ts, tech-tree.ts, star-systems.ts
├── loop/
│   └── game-loop.ts     # rAF loop, fixed timestep, offline catch-up
├── persistence/
│   ├── save-load.ts     # localStorage serialization
│   └── replay.ts        # Input recording + deterministic replay
└── ui/                  # Minimal DOM scaffolding (full UI designed separately)
```

## Game Systems

**Resources:** Materials (mined), Energy (reactors + probe), Computing Power (probe CPU, used as research rate)

**Structures:** Miners, Reactors, 3D Printers (6 tiers each, cost scaling 2.2x per tier) — built via printer-driven construction queue. All structures consume nano-materials for ongoing maintenance.

**Tech Tree:** 12 branches × 20 tiers organized in 6 groups (Mining, Energy, Manufacturing, Probes, Computing, Communication). Each group has efficiency and types branches. Efficiency branches boost output multipliers; types branches unlock higher-tier structures/components (every 4 tiers).

**Probes:** Customizable (CPU + Propulsion + Reactor, 6 tiers each). Launch to new star systems. Arrive, generate system, begin resource loop. Each probe incurs ongoing maintenance costs.

**Progression:** Tech gating enforces build order. Economy starts deliberately slow (probe mines 1 ton/sec) with a ~30-minute early game phase. Parallel research, printer networking, distributed intelligence, and zero-latency communication unlock as late-game mechanics.

## Stack

- TypeScript + React (UI layer)
- Bun + Vite (dev tooling and bundling)
- Zero runtime dependencies beyond React
- TypeScript strict mode (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)

## Design Documents

- `01_design_brief.md` — game overview, core loop, resource types, UI complexity levels
- `02_detailed_context.md` — detailed state structure, all structures/components/tech, game phases
- `03_ui_layout.md` — wireframes and layout specification (UI built separately)
