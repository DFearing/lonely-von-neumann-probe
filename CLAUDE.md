# Project: Lonely Von Neumann Probe

Bobiverse-inspired idle/progression browser game. Deterministic tick-based simulation with seeded RNG.

## Commands

```bash
bun test           # 177 tests, ~2s
bun run typecheck  # tsc --noEmit (strict)
bun run dev        # vite dev server
bun run build      # production build
```

## Architecture Rules

- **Simulation is pure.** `src/simulation/` has zero DOM dependencies. All functions are `(state, ...) -> state` with no side effects. Never import browser APIs here.
- **All randomness through seeded RNG.** Use `Rng` from `rng.ts`, never `Math.random()`. The RNG state is part of `GameState` and advances deterministically.
- **State is immutable.** Update via spread operators. No mutation of input state. No `Map`, `Set`, `Date`, or class instances in state — everything must survive `JSON.stringify` round-trip.
- **Sub-systems run in fixed order** in `tick.ts`: resources → construction → research → navigation → events. This order is load-bearing for determinism (RNG consumption sequence).
- **One action per tick maximum** for replay fidelity. Actions queue in the game loop and drain into `tick()`.

## Key Entry Points

- `src/simulation/tick.ts` — `tick(state, dt, actions)` is the simulation core
- `src/simulation/state.ts` — `GameState` type and `createInitialState(seed)`
- `src/simulation/queries.ts` — read-only helpers for UI: `getTechStatus`, `getAvailableStructures`, `getAvailableComponents`
- `src/simulation/rates.ts` — `calculateRates(system)` computes resource rates
- `src/loop/game-loop.ts` — `createGameLoop(state)` bridges simulation to browser

## TypeScript Strictness

The project uses aggressive strict settings. Key ones that affect how you write code:
- `noUncheckedIndexedAccess` — `Record` lookups return `T | undefined`. Use `!` only when the index is guaranteed in-bounds.
- `exactOptionalPropertyTypes` — `field?: string` means the field is absent, not `undefined`. Use `field: string | undefined` if you need to store `undefined`.
- `noUnusedLocals` / `noUnusedParameters` — no dead code allowed.

## Adding Game Content

- **New structure type/tier:** Add entry to `src/simulation/data/structures.ts` with cost, production, operating cost, and tech gate.
- **New probe component:** Add entry to `src/simulation/data/components.ts` in the appropriate Record.
- **New tech:** Add entry to `src/simulation/data/tech-tree.ts`. Effects are applied via `src/simulation/tech-effects.ts` — add the multiplier/flag there too.
- **New player action:** Add variant to the `PlayerAction` union in `actions.ts`, handle in `applyAction` in `tick.ts`.

## UI

The `src/ui/` directory has minimal scaffolding. The full interactive UI is being designed and built separately. Don't invest in detailed UI work — focus on simulation and query APIs that the UI will consume.

## Design Documents

The three files in the repo root (`01_design_brief.md`, `02_detailed_context.md`, `03_ui_layout.md`) are the source of truth for game design. When in doubt about game mechanics, check these first.
