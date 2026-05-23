# Lonely Von Neumann Probe

A Bobiverse-inspired idle/progression browser game where players manage autonomous probes across star systems — mining materials, generating energy, researching tech, building structures, and launching new probes to expand.

## Quick Start

```bash
bun install
bun run dev        # start dev server
bun test           # run 177 tests
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

**Structures:** Miners, Reactors (4 tiers), 3D Printers (4 tiers) — built via printer-driven construction queue

**Tech Tree:** 6 branches × 4 tiers — Mining, Energy, Manufacturing, Probe Components, Computing, Communication. Researched tech applies multipliers and unlocks higher-tier structures/components.

**Probes:** Customizable (CPU + Propulsion + Reactor). Launch to new star systems. Arrive, generate system, begin resource loop.

**Progression:** Tech gating enforces build order. Parallel research, printer networking, distributed intelligence, and zero-latency communication unlock as late-game mechanics.

## Stack

- Vanilla TypeScript + DOM (no framework)
- Bun + Vite (dev tooling only)
- Zero runtime dependencies
- TypeScript strict mode (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)

## Design Documents

- `01_design_brief.md` — game overview, core loop, resource types, UI complexity levels
- `02_detailed_context.md` — detailed state structure, all structures/components/tech, game phases
- `03_ui_layout.md` — wireframes and layout specification (UI built separately)
