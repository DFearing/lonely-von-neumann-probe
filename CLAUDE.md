# Project: Lonely Von Neumann Probe

Bobiverse-inspired idle/progression browser game. Deterministic tick-based simulation with seeded RNG.

**Live:** https://dfearing.github.io/lonely-von-neumann-probe/

## Commands

```bash
bun test           # 452 tests, ~30s
bun run typecheck  # tsc --noEmit (strict)
bun run dev        # vite dev server
bun run build      # production build
```

## Architecture Rules

- **Simulation is pure.** `src/simulation/` has zero DOM dependencies. All functions are `(state, ...) -> state` with no side effects. Never import browser APIs here.
- **Sound system is browser-only.** `src/audio/` contains a Web Audio API synthesis engine (no external deps) that reads `soundEvent` fields off `LogEntry` values. It never touches simulation state.
- **All randomness through seeded RNG.** Use `Rng` from `rng.ts`, never `Math.random()`. The RNG state is part of `GameState` and advances deterministically.
- **State is immutable.** Update via spread operators. No mutation of input state. No `Map`, `Set`, `Date`, or class instances in state — everything must survive `JSON.stringify` round-trip.
- **Sub-systems run in fixed order** in `tick.ts`: resources → construction → research → navigation → events. This order is load-bearing for determinism (RNG consumption sequence).
- **One action per tick maximum** for replay fidelity. Actions queue in the game loop and drain into `tick()`.

## Key Entry Points

- `src/simulation/tick.ts` — `tick(state, dt, actions)` is the simulation core
- `src/simulation/state.ts` — `GameState` type and `createInitialState(seed)`
- `src/simulation/queries.ts` — read-only helpers for UI: `getTechStatus`, `getAvailableStructures`, `getAvailableComponents`
- `src/simulation/rates.ts` — `calculateRates(system)` computes resource rates (materials supply/demand/net, energy supply/demand/net, computing)
- `src/simulation/tech-effects.ts` — `getTechMultipliers(completedResearch)` derives multipliers/flags from completed tech
- `src/loop/game-loop.ts` — `createGameLoop(state)` bridges simulation to browser
- `src/audio/sound-manager.ts` — singleton `SoundManager`; lazy `AudioContext`, 8 procedural recipes, localStorage-persisted settings

## TypeScript Strictness

The project uses aggressive strict settings. Key ones that affect how you write code:
- `noUncheckedIndexedAccess` — `Record` lookups return `T | undefined`. Use `!` only when the index is guaranteed in-bounds.
- `exactOptionalPropertyTypes` — `field?: string` means the field is absent, not `undefined`. Use `field: string | undefined` if you need to store `undefined`.
- `noUnusedLocals` / `noUnusedParameters` — no dead code allowed.

## Adding Game Content

- **New structure type/tier:** Add entry to `src/simulation/data/structures.ts` with cost, production, operating cost, maintenance cost, and tech gate. Update `src/simulation/systems/construction.ts` to set `maintenanceCost` on the created `StructureInstance`.
- **New probe component:** Add entry to `src/simulation/data/components.ts` in the appropriate Record (6 tiers, cost scaling 2.2x).
- **New tech:** Add entry to `src/simulation/data/tech-tree.ts`. Effects are applied via `src/simulation/tech-effects.ts` — add the multiplier/flag there too. Tech tree has 12 branches × 20 tiers; types branches unlock structures/components every 4 tiers.
- **New player action:** Add variant to the `PlayerAction` union in `actions.ts`, handle in `applyAction` in `tick.ts`.
- **New sound event:** Add a variant to `SoundEventType` in `src/simulation/state.ts`, add a matching recipe in `src/audio/sound-recipes.ts`, and attach `soundEvent` to the relevant `LogEntry` in the responsible system (construction, research, events, or resources).

## Economy Balance

The game is intentionally slow in early game (~30 min to self-sustaining). Key parameters:
- **Probe starts with**: mining 1/sec, computing 1/sec, print speed 0.5, base energy 3 MW
- **Structure cost scaling**: 2.2x per tier across all types
- **Maintenance**: All structures and probes drain nano-materials (0.08-0.2/sec, scaling with tier). Probe maintenance is 0.1/sec flat.
- **Materials rates** track supply (gross production) and demand (maintenance) separately, like energy tracks supply/demand.
- **Research**: base cost 40 materials / 10 energy, continuous cost 2–6 computing/sec (per-branch, see `BRANCH_COMPUTING_PARAMS` in `tech-tree.ts`), 120 sec base time (1.20x scaling per tier)

## UI

The `src/ui/` directory is a React-based Mission Control interface. Build dialogs only show unlocked structures/components (tech-locked items are hidden, not grayed out). The footer shows materials and energy as supply/demand/net with color-coded status (white/blue normal → yellow near limit → red at limit). Use "tons" not "t" and "cycle(s)" not "cy" for units throughout the UI. The Topbar hosts a volume slider and mute toggle; a full `SoundSettings` modal (`src/ui/screens/SoundSettings.tsx`) is opened from there and rendered in `App.tsx`.

## Persistence

Save/load uses a slot-based system (`saveGameSlot`/`loadGameSlot`/`deleteSlot`). **Never add legacy save support** — no single-key saves, no migration from old formats. The game loop does not auto-save; saving is handled by the `onStateChange` callback in `PreGameGate`.

## Design Documents

The three files in `docs/` (`01_design_brief.md`, `02_detailed_context.md`, `03_ui_layout.md`) are the source of truth for game design. When in doubt about game mechanics, check these first.
