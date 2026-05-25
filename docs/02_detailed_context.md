# Bobiverse Idle Game - Detailed Context Document

## Game State Structure

### Global State
```
{
  currentSystemId: string,
  systems: { [systemId]: SystemState },
  globalTech: { [techId]: TechState },  // Tech shared across systems (after Zero Latency Communication)
}
```

### System State
```
{
  id: string,
  name: string,
  resourceRichness: number,  // 0.5x to 2x multiplier on mining/energy output
  mainProbe: ProbeState,
  structures: {
    miners: StructureInstance[],
    reactors: StructureInstance[],
    printers: StructureInstance[],
  },
  resources: {
    materials: number,
    energy: number,
    computingPower: number,
  },
  resourceRates: {
    materialsPerSecond: number,
    energyPerSecond: number,
    computingPowerPerSecond: number,
  },
  constructionQueue: ConstructionProject[],
  researchQueue: ResearchProject[],
  researchTechs: { [branchId]: TechState[] },  // Tech progresses per system (until unlocked globally)
  discoveredSystems: string[],
  sentProbes: ProbeInTransit[],
}
```

### Probe State
```
{
  id: string,
  systemId: string,
  components: {
    cpu: CPU,           // Determines: computing power, mining speed, internal print speed
    propulsion: Propulsion,  // Determines: travel speed, unlockable structures
    reactor: Reactor,   // Determines: energy generation, operating cost
  },
  miningOutput: number,
  computingOutput: number,
  internalPrinterSpeed: number,
  autoReplicating: boolean,
}
```

### Structure Instance
```
{
  id: string,
  type: "miner" | "reactor" | "printer",
  tier: number,  // 1, 2, 3, 4 (for printers); 1, 2, 3, 4 (for reactor types)
  productionRate: number,
  constructionProgress: number,  // 0-1
  active: boolean,
}
```

### Construction Project
```
{
  id: string,
  type: "structure" | "probe",
  targetType: string,  // "miner", "reactor", "printer", "probe"
  targetConfig?: ProbeComponentConfig,  // If probe, what components
  totalCost: { materials: number, energy: number },
  remainingCost: { materials: number, energy: number },
  printerIds: string[],  // Which printers are working on this
  dueDate: number,  // When will it complete (based on printer speed)
}
```

### Research Project
```
{
  id: string,
  branchId: string,  // "mining", "energy", "manufacturing", "probe_components", "computing", "communication"
  tier: number,  // 1, 2, 3, 4
  researchName: string,
  initialCost: { materials: number, energy: number },
  continuousCost: number,  // Computing power per second
  progress: number,  // 0-1
  completed: boolean,
  unlockedTechs: string[],  // Which techs this unlocks
  unlockedComponents: ComponentType[],  // Which components this unlocks
}
```

---

## Resources

### Materials
- **Source**: Miners extract from system
- **Uses**: Building structures, building probes, research initial cost
- **Multipliers**: System richness affects mining rate
- **Rate Calculation**: (baseProbeOutput + sumOf(minerOutputs)) * systemRichness

### Energy
- **Source**: Power Reactors generate
- **Uses**: Powering construction, powering structure operations
- **Multipliers**: Reactor type determines output, system richness affects solar harvesters
- **Operating Costs**: Structures consume energy continuously
- **Rate Calculation**: (baseProbeOutput + sumOf(reactorOutputs)) * systemRichness - totalConsumption

### Computing Power
- **Source**: Probes generate based on CPU
- **Uses**: Research (continuous per-second cost)
- **Multipliers**: CPU tier determines output
- **Distribution**: Per-system generation until "Distributed Intelligence" tech unlocks

---

## Structures (Buildable in Systems)

### Miners
- **Cost**: 30 Materials, 10 Energy to build
- **Effect**: +20 Materials/sec (before richness multiplier)
- **Tech Gates**: None (buildable immediately)
- **Improvements**: Mining Efficiency branch techs increase output

### Power Reactors (all types)
**Basic Reactor**
- Cost: 10 Materials, 2 Energy
- Output: +10 Energy/sec, Operating Cost: -1 Energy/sec
- Tech: None (available immediately)

**Fusion Reactor**
- Cost: 30 Materials, 6 Energy
- Output: +15 Energy/sec, Operating Cost: -0.8 Energy/sec
- Tech: "Fusion Efficiency" (Energy Production Tier 2)

**Solar Harvester**
- Cost: 25 Materials, 5 Energy
- Output: +12 Energy/sec (varies with system richness), Operating Cost: -0.5 Energy/sec
- Tech: "Solar Harvesters" (Energy Production Tier 3)

**Exotic Reactor**
- Cost: 100 Materials, 25 Energy
- Output: +25 Energy/sec, Operating Cost: -0.6 Energy/sec
- Tech: "Exotic Power" (Energy Production Tier 4)

### 3D Printers (all tiers)
**Basic 3D Printer**
- Cost: 30 Materials, 10 Energy to build
- Print Speed: 1x (baseline = 10 items/sec... or time-based?)
- Can Print: Miners, Reactors, other 3D Printers, Probes
- Tech: None (available immediately)

**Enhanced Printer**
- Cost: 80 Materials, 25 Energy
- Print Speed: 1.5x
- Can Print: All basic structures + Probes
- Tech: "Faster Printing" (Manufacturing Tier 1)

**Advanced Printer**
- Cost: 200 Materials, 60 Energy
- Print Speed: 2.5x
- Can Print: All structures + all basic probes
- Tech: "Complex Objects" (Manufacturing Tier 2)

**Automated Assembly**
- Cost: 500 Materials, 150 Energy
- Print Speed: 4x
- Can Print: All structures + all probe components
- Tech: "Automated Assembly" (Manufacturing Tier 4)

---

## Probe Components (3 choices per build)

### CPU Components
| Component | Cost | Computing | Mining | Internal Print | Unlock Tech |
|-----------|------|-----------|--------|-----------------|-------------|
| Basic CPU | 10M, 2E | 1x | 1x | 1x | — |
| Enhanced CPU | 30M, 6E | 2x | 1.3x | 1.3x | "Basic Computing" |
| Advanced CPU | 80M, 16E | 5x | 1.8x | 1.8x | "Parallel Processing" |
| Quantum CPU | 200M, 40E | 12x | 2.5x | 2.5x | "Quantum Computing" |

### Propulsion Systems
| Component | Cost | Travel Speed | Structure Unlock | Special | Unlock Tech |
|-----------|------|--------------|------------------|---------|-------------|
| Basic Ion Drive | 10M, 2E | 1x | Basic | — | — |
| Efficient Drive | 30M, 6E | 1.5x | Factories? | — | "Efficient Probes" |
| Advanced Drive | 80M, 16E | 2.5x | Specialized | — | "Specialized Probes" |
| Von Neumann Drive | 200M, 40E | 3x | All | Auto-replicates | "Von Neumann Replicators" |

### Reactor Components (for probes)
| Component | Cost | Energy Output | Op. Cost | Unlock Tech |
|-----------|------|---------------|----------|-------------|
| Basic Reactor | 10M, 2E | 1x | 1x | — |
| Fusion Reactor | 30M, 6E | 1.5x | 0.8x | "Fusion Efficiency" |
| Solar Harvester | 25M, 5E | 1.2x | 0.5x | "Solar Harvesters" |
| Exotic Reactor | 100M, 25E | 2.5x | 0.6x | "Exotic Power" |

---

## Tech Tree (6 Branches, 4 Tiers Each)

### Branch 1: Mining Efficiency
- T1: Basic Mining Techniques → +20% mining output
- T2: Mineral Separation → +40% mining output
- T3: Advanced Extraction → +60% mining output + unlock special deposits
- T4: Automated Deep Mining → +100% mining output

### Branch 2: Energy Production
- T1: Basic Reactors → unlock all basic reactor types
- T2: Fusion Efficiency → unlock Fusion Reactor
- T3: Solar Harvesters → unlock Solar Harvester
- T4: Exotic Power → unlock Exotic Reactor

### Branch 3: Manufacturing & Construction
- T1: Faster Printing → 3D Printers +25% speed
- T2: Complex Objects → unlock Enhanced Printer structure
- T3: Printer Networking → multiple printers can pool output on single project
- T4: Automated Assembly → unlock Automated Assembly structure

### Branch 4: Probe Components
- T1: Efficient Probes → unlock Enhanced CPU, Efficient Drive, Fusion Reactor
- T2: Advanced Components → unlock Advanced CPU, Advanced Drive, Solar Harvester
- T3: Specialized Probes → unlock specialized component variants
- T4: Von Neumann Replicators → unlock Quantum CPU, Von Neumann Drive, Exotic Reactor

### Branch 5: Computing & Research
- T1: Basic Computing → +25% research speed
- T2: Parallel Processing → research 2 techs simultaneously per system
- T3: Quantum Computing → +100% research speed
- T4: Distributed Intelligence → all systems contribute computing power to shared research pool

### Branch 6: Communication & Networking
- T1: Basic Transmission → probes send scan data instantly
- T2: Enhanced Scanning → reveals resource richness faster
- T3: System Mapping → auto-map all known systems
- T4: Zero Latency Communication → tech syncs instantly across all systems

---

## Star Systems Data

### System Properties
```
{
  id: string,
  name: string,
  starType: string,  // "yellow", "red", "blue", etc. (visual, not mechanically important yet)
  distanceFromOrigin: number,  // affects light-speed tech sharing delay
  resourceRichness: number,  // 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0
  discovered: boolean,
  scanned: boolean,  // has richness been revealed?
}
```

### Known Systems (catalog)
The UI needs to show a list of known systems with their richness once scanned. Example:
- Sol (origin): 1.0x richness, starting system
- Alpha Centauri: 1.2x richness, distance 4.37 ly
- Sirius: 0.9x richness, distance 8.6 ly
- (etc. — exact list TBD)

---

## Construction & Research Queuing

### Printer Allocation
Early game: Printers work independently. Player can queue multiple projects:
- Printer A: Mining project A
- Printer B: Reactor project
- Printer C: Another Miner

Late game (with Printer Networking): Printers can focus on one big project together.

### Research Queuing
- Per-system research queue before "Distributed Intelligence" tech
- Global research queue after unlocking that tech
- Player can pause/cancel research to re-allocate computing power

---

## Game States & Transitions

### Early Game (Phase 1: 0-30 min)
- Single system: Sol
- Only basic CPU, drive, reactor available
- No techs researched yet
- Player manually grinds materials with probe
- First builds: Miner, then Reactor, then 3D Printer
- Goal: Get to self-sustaining resource generation

### Mid Game (Phase 2: 30 min - 2 hrs)
- 2-3 systems (player has built and sent probes)
- Multiple tech branches in progress
- Probe customization available (different CPUs, drives, reactors)
- Building 3D Printer structures to parallelize
- Goal: Exponential growth, unlock key techs

### Late Game (Phase 3: 2+ hrs)
- 5-10+ systems in operation
- Complex tech sharing strategy (light-speed vs zero latency)
- Mega probes with specialized components
- Advanced printer structures and networking
- Goal: Manage and optimize multi-system empire

---

## UI Data Requirements by Screen

### Main Game Screen
- Current system name
- Resources: Materials (current + /sec rate), Energy (current + /sec rate), Computing Power (/sec)
- Construction queue (next 3-5 projects with ETAs)
- Research progress (currently researching tech, progress bar, ETA)
- Active structures summary (# of miners, reactors, printers)
- Main probe stats (CPU, Drive, Reactor, status)

### Structures Panel
- List of all structures in current system with counts
- Build buttons for each structure type (with cost display)
- Currently building indicator (which printers are allocated)
- Structure details on click (production rate, operating cost)

### Probe Builder Panel
- Component selection: CPU dropdown, Propulsion dropdown, Reactor dropdown
- Total cost summary (Materials + Energy)
- Launch button (only if sufficient resources + has printer)
- Cost to send probe (light-speed transmission time based on distance to target system)

### Tech Tree View
- 6 branches displayed (can be tabs or horizontal scroll)
- Each branch shows 4 tiers (1-4)
- Locked vs unlocked visual states
- Click to view full details: cost, what it unlocks, ETA to research
- Queue/start research button

### Systems View
- List of all discovered/colonized systems
- Status for each: resources, # of structures, # of probes
- Resource richness (once scanned)
- Probes in transit to each system
- Click to switch to managing that system

### Research Queue
- Currently active research (progress bar, ETA)
- Queued research (order, can reorder/cancel)
- Computing power allocation across queue (manual slider or auto-balance)

---

## Time Representation
- Game uses real-time seconds internally
- Display remaining time as: "5s", "1m 23s", "2h 15m", "3d 4h"
- Auto-round: if ETA > 1 hour, show "~2h", if < 1 second, show "now"

---

## Key Interactions
1. **Build Structure**: Click structure type → confirm → allocate printers → add to queue
2. **Send Probe**: Select components → select target system → launch → waits for travel time
3. **Research Tech**: Click tech → confirm cost → queue begins
4. **Switch System**: Click system in list → view switches to that system's data
5. **Pause/Resume**: Game runs automatically; pause button stops time
6. **Save/Load**: Auto-saves every 10 seconds to localStorage

---

## Performance Constraints
- Minimum 60 FPS for mobile
- Lazy-load system views (don't render all systems simultaneously)
- Batch update resource displays every 0.5 seconds instead of every frame
- Use requestAnimationFrame for smooth progress bars
