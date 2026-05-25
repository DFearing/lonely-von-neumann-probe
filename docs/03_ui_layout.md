# Bobiverse Idle Game - UI Layout Outline

## Overall Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HEADER BAR                              │
│  Logo | Current System Name | Settings | Pause Button        │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                            │
│  LEFT SIDEBAR    │  MAIN CONTENT AREA                       │
│  (Navigation)    │  (Context-dependent)                     │
│                  │                                            │
│  • Structures    │                                            │
│  • Probes        │  [View-specific content]                 │
│  • Tech          │                                            │
│  • Systems       │                                            │
│  • Research      │                                            │
│                  │                                            │
├──────────────────┴──────────────────────────────────────────┤
│                    RESOURCE BAR (Footer)                      │
│  Materials: 1250 (+15.3/s)  Energy: 890 (+8.2/s)  Computing: 42/s  │
└─────────────────────────────────────────────────────────────┘
```

---

## Screen Layouts by View

### 1. MAIN OVERVIEW SCREEN (Default view)
*Shown when first opening game or clicking "Overview" in sidebar*

```
┌─ MAIN CONTENT ─────────────────────────────────────────┐
│                                                          │
│  ┌─ CURRENT SYSTEM STATUS ─────────────────────────┐   │
│  │ System: Sol | Richness: 1.0x                   │   │
│  │                                                  │   │
│  │ Active Probe: Basic CPU | Basic Drive | Basic  │   │
│  │ Reactor | Mining: 1x | Computing: 1/s          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ STRUCTURES SUMMARY ────────────────────────────┐   │
│  │ Miners: 3 (+60 Materials/s)                    │   │
│  │ Reactors: 2 (Basic: +20 E/s, Fusion: +15 E/s) │   │
│  │ 3D Printers: 1 (Basic, 1x speed)              │   │
│  │                                                 │   │
│  │ [BUILD STRUCTURES...]                          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ CONSTRUCTION QUEUE ────────────────────────────┐   │
│  │                                                 │   │
│  │ 1. Miner          [████████░░] 3.2s / 8s      │   │
│  │    Allocated: Printer A                         │   │
│  │                                                 │   │
│  │ 2. Reactor (Fusion) [░░░░░░░░░░] 15.3s / 12s  │   │
│  │    Allocated: Printer B                         │   │
│  │                                                 │   │
│  │ 3. Miner          [░░░░░░░░░░] 8s / 8s        │   │
│  │    Allocated: Printer C (waiting for energy)   │   │
│  │                                                 │   │
│  │ [CANCEL BOTTOM ITEM] [ADD TO QUEUE]            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ RESEARCH IN PROGRESS ──────────────────────────┐   │
│  │                                                 │   │
│  │ Mining Efficiency (Tier 2)                     │   │
│  │ [██████░░░░░░░░░░░░] 35% | ETA: 2m 15s       │   │
│  │ Computing Power: 15/s                          │   │
│  │                                                 │   │
│  │ [QUEUE ANOTHER RESEARCH...]                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└────────────────────────────────────────────────────────┘
```

---

### 2. STRUCTURES VIEW
*Opened from left sidebar "Structures" or via [BUILD STRUCTURES...] button*

```
┌─ MAIN CONTENT ─────────────────────────────────────────┐
│                STRUCTURES IN SOL SYSTEM                 │
│                                                          │
│  ┌─ MINERS ──────────────────────────────────────────┐ │
│  │                                                   │ │
│  │ You own 3 Miners (60 Materials/s total)         │ │
│  │                                                   │ │
│  │ [+ BUILD NEW MINER]  Cost: 30M, 10E             │ │
│  │                                                   │ │
│  │ Details: Each miner produces 20 Materials/s     │ │
│  │          before system richness multiplier      │ │
│  │          (×1.0x = 20/s each)                    │ │
│  │                                                   │ │
│  │ Tech Improvements Available:                     │ │
│  │ • Basic Mining Techniques → +20% (research)     │ │
│  │ • Mineral Separation → +40% (locked until T2)   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ REACTORS ────────────────────────────────────────┐ │
│  │                                                   │ │
│  │ You own 2 Reactors (35 Energy/s total)          │ │
│  │                                                   │ │
│  │ • Basic Reactor (1x)   +10 E/s, -1 E/s op cost │ │
│  │ • Fusion Reactor (1x)  +15 E/s, -0.8 E/s op    │ │
│  │                                                   │ │
│  │ [+ BUILD REACTOR]  Choose type:                 │ │
│  │ • Basic Reactor   (10M, 2E)                     │ │
│  │ • Fusion Reactor  (30M, 6E)  [Tech unlocked]   │ │
│  │ • Solar Harvester (25M, 5E)  [Locked]          │ │
│  │ • Exotic Reactor  (100M, 25E) [Locked]         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ 3D PRINTERS ─────────────────────────────────────┐ │
│  │                                                   │ │
│  │ You own 1 3D Printer (1x speed)                 │ │
│  │                                                   │ │
│  │ • Basic 3D Printer (1x speed)                   │ │
│  │   Can print: Miners, Reactors, Printers, Probes│ │
│  │                                                   │ │
│  │ [+ BUILD PRINTER]  Choose type:                 │ │
│  │ • Basic Printer    (30M, 10E) [Unlocked]       │ │
│  │ • Enhanced Printer (80M, 25E) [Tech unlocked]  │ │
│  │ • Advanced Printer (200M, 60E) [Locked]        │ │
│  │ • Automated Assembly (500M, 150E) [Locked]     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
└────────────────────────────────────────────────────────┘
```

---

### 3. PROBE BUILDER VIEW
*Opened from left sidebar "Probes" or in context of System view*

```
┌─ MAIN CONTENT ─────────────────────────────────────────┐
│              BUILD & SEND NEW PROBE                    │
│                                                         │
│  ┌─ COMPONENT SELECTION ──────────────────────────┐   │
│  │                                                 │   │
│  │ CPU Component:                                  │   │
│  │ [▼ Basic CPU ____] (1x Computing, 1x Mining)  │   │
│  │   • Enhanced CPU (2x Computing, 1.3x Mining)  │   │
│  │   • Advanced CPU (5x Computing, 1.8x Mining)  │   │
│  │   • Quantum CPU (12x Computing, 2.5x Mining)  │   │
│  │                                                 │   │
│  │ Propulsion System:                              │   │
│  │ [▼ Basic Ion Drive ____] (1x travel speed)    │   │
│  │   • Efficient Drive (1.5x travel speed)        │   │
│  │   • Advanced Drive (2.5x travel speed)         │   │
│  │   • Von Neumann Drive (3x + auto-replicates)  │   │
│  │                                                 │   │
│  │ Reactor Type:                                   │   │
│  │ [▼ Basic Reactor ____] (+10 E/s, -1 op cost) │   │
│  │   • Fusion Reactor (+15 E/s, -0.8 op cost)    │   │
│  │   • Solar Harvester (+12 E/s, -0.5 op cost)   │   │
│  │   • Exotic Reactor (+25 E/s, -0.6 op cost)    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ PROBE SPECS ──────────────────────────────────┐   │
│  │                                                 │   │
│  │ Configuration: Basic + Basic + Basic           │   │
│  │ Total Cost: 30 Materials + 6 Energy            │   │
│  │ Available: YES (current resources sufficient) │   │
│  │                                                 │   │
│  │ Performance:                                    │   │
│  │ • Computing Power: 1/s                         │   │
│  │ • Mining Speed: 1x                             │   │
│  │ • Internal Printing: 1x speed                  │   │
│  │ • Travel Speed: 1x                             │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ TARGET SYSTEM ────────────────────────────────┐   │
│  │                                                 │   │
│  │ Send to: [▼ Alpha Centauri ____]              │   │
│  │ Distance: 4.37 light-years                     │   │
│  │ Resource Richness: 1.2x                        │   │
│  │ Travel Time (at 1x speed): ~4.37 years        │   │
│  │ Light-speed Tech Share Delay: ~4.37 years     │   │
│  │                                                 │   │
│  │ [← BACK]  [LAUNCH PROBE]                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

### 4. TECH TREE VIEW
*Opened from left sidebar "Tech" or "Research" button*

```
┌─ MAIN CONTENT ─────────────────────────────────────────┐
│                      TECH TREE                          │
│                                                         │
│  [Mining] [Energy] [Manufacturing] [Probes] [Computing] [Comms]
│
│  ┌─ MINING EFFICIENCY ────────────────────────────────┐ │
│  │                                                    │ │
│  │ Tier 1: Basic Mining Techniques                   │ │
│  │ Status: [✓ RESEARCHED]                            │ │
│  │ Effect: +20% mining output                        │ │
│  │                                                    │ │
│  │ Tier 2: Mineral Separation                        │ │
│  │ Status: [IN PROGRESS] 35% complete, ETA 2m 15s  │ │
│  │ Cost: 50 Materials (start), 10 Computing/s       │ │
│  │ Effect: +40% mining output                        │ │
│  │ [PAUSE] [CANCEL]                                 │ │
│  │                                                    │ │
│  │ Tier 3: Advanced Extraction                       │ │
│  │ Status: [LOCKED - requires Tier 2]               │ │
│  │ Cost: 100 Materials, 20 Computing/s              │ │
│  │ Effect: +60% mining + unlock special deposits    │ │
│  │ [QUEUE THIS RESEARCH]                            │ │
│  │                                                    │ │
│  │ Tier 4: Automated Deep Mining                     │ │
│  │ Status: [LOCKED - requires Tier 3]               │ │
│  │ Cost: 200 Materials, 40 Computing/s              │ │
│  │ Effect: +100% mining output                       │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  [Similar layout for other 5 branches]                │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

### 5. SYSTEMS VIEW
*Opened from left sidebar "Systems" - shows all discovered systems and colonies*

```
┌─ MAIN CONTENT ─────────────────────────────────────────┐
│                   STAR SYSTEMS                          │
│                                                         │
│  ┌─ SOL (Current System) ──────────────────────────┐   │
│  │ Status: HOME / ACTIVE                           │   │
│  │ Richness: 1.0x (revealed)                       │   │
│  │                                                 │   │
│  │ Resources:                                      │   │
│  │ • Materials: 1250/s                             │   │
│  │ • Energy: 35/s                                  │   │
│  │ • Computing: 1/s                                │   │
│  │                                                 │   │
│  │ Structures:                                     │   │
│  │ • Miners: 3  • Reactors: 2  • Printers: 1      │   │
│  │                                                 │   │
│  │ Probes: 1 (main probe)                          │   │
│  │ Outgoing: 1 probe to Sirius (ETA 3 days)      │   │
│  │                                                 │   │
│  │ [MANAGE THIS SYSTEM] [BUILD PROBE FOR...]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ ALPHA CENTAURI (Colonized) ─────────────────────┐  │
│  │ Status: ACTIVE / REMOTE                         │   │
│  │ Richness: 1.2x (revealed)                       │   │
│  │                                                 │   │
│  │ Resources:                                      │   │
│  │ • Materials: 900/s                              │   │
│  │ • Energy: 22/s                                  │   │
│  │ • Computing: 2/s                                │   │
│  │                                                 │   │
│  │ Structures:                                     │   │
│  │ • Miners: 2  • Reactors: 1  • Printers: 0      │   │
│  │                                                 │   │
│  │ Probes: 1 (Enhanced CPU)                        │   │
│  │ Outgoing: 0                                     │   │
│  │                                                 │   │
│  │ Tech Sync: Light-speed (4.37 year delay)       │   │
│  │                                                 │   │
│  │ [MANAGE THIS SYSTEM] [VIEW TECH TREE]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ SIRIUS (In Transit) ─────────────────────────────┐ │
│  │ Status: INCOMING PROBE                          │   │
│  │ Richness: [SCANNING...] (ETA 2 days)           │   │
│  │                                                 │   │
│  │ Inbound Probe:                                  │   │
│  │ • Config: Basic CPU + Efficient Drive + Fusion  │   │
│  │ • ETA: 3 days 5 hours                           │   │
│  │ • Will arrive with 0 resources                  │   │
│  │                                                 │   │
│  │ [TRACK PROBE]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ BETELGEUSE (Known) ───────────────────────────────┐ │
│  │ Status: KNOWN / UNVISITED                       │   │
│  │ Richness: [UNKNOWN - scan to reveal]           │   │
│  │                                                 │   │
│  │ [SEND PROBE TO BETELGEUSE]                      │   │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
└────────────────────────────────────────────────────────┘
```

---

### 6. RESEARCH QUEUE VIEW
*Side panel or modal for managing active and queued research*

```
┌─ RESEARCH QUEUE MANAGER ─────────────────────────┐
│                                                   │
│ ┌─ ACTIVE RESEARCH ─────────────────────────┐   │
│ │                                            │   │
│ │ Mining Efficiency (Tier 2)                │   │
│ │ [████████░░░░░░░░░░░░] 35% | 2m 15s     │   │
│ │ Computing: 10/s allocated                │   │
│ │ [PAUSE] [CANCEL]                          │   │
│ │                                            │   │
│ └────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ QUEUED RESEARCH ─────────────────────────┐   │
│ │                                            │   │
│ │ 1. Energy Production (Tier 1)             │   │
│ │    Cost: 40M, 15 Computing/s              │   │
│ │    ETA: 8m (after active research)       │   │
│ │    [↑ REORDER] [REMOVE]                  │   │
│ │                                            │   │
│ │ 2. Manufacturing (Tier 1)                 │   │
│ │    Cost: 30M, 10 Computing/s              │   │
│ │    ETA: 12m (after above)                │   │
│ │    [↑ REORDER] [↓ REORDER] [REMOVE]      │   │
│ │                                            │   │
│ └────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ COMPUTING ALLOCATION ────────────────────┐   │
│ │                                            │   │
│ │ Total Available: 15/s                     │   │
│ │ Allocated to Research: 10/s               │   │
│ │ Remaining: 5/s                            │   │
│ │                                            │   │
│ │ Auto-Balance: [TOGGLE OFF]                │   │
│ │ Slider: Active Research gets 10/s         │   │
│ │         Queue splits remaining...         │   │
│ │                                            │   │
│ └────────────────────────────────────────────┘   │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## Left Sidebar Navigation

```
┌─────────────────────┐
│  BOBIVERSE          │
├─────────────────────┤
│                     │
│ ● Overview          │  (Current Screen)
│                     │
│ [STRUCTURES]        │  (Section)
│  Miners             │
│  Reactors           │
│  3D Printers        │
│                     │
│ [PROBES]            │
│  Build New          │
│  Fleet Status       │
│  In Transit         │
│                     │
│ [SYSTEMS]           │
│  Manage Systems     │
│  Star Map           │
│                     │
│ [RESEARCH]          │
│  Tech Tree          │
│  Queue              │
│  Progress           │
│                     │
│ [SETTINGS]          │
│  Save/Load          │
│  Preferences        │
│  About              │
│                     │
└─────────────────────┘
```

---

## Resource Footer Bar

```
┌────────────────────────────────────────────────────────────────────┐
│ Materials: 1250 (+15.3/s) │ Energy: 890 (+8.2/s) │ Computing: 42/s │
│                           │ (Capacity: 4800)      │ (Used: 10/s)    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

### Desktop (1200px+)
- Left sidebar: fixed, 240px wide
- Main content: full width minus sidebar
- Resource footer: sticky bottom

### Tablet (768px - 1199px)
- Left sidebar: collapsible hamburger menu
- Main content: full width when sidebar collapsed
- Resource footer: sticky bottom

### Mobile (< 768px)
- Left sidebar: slides in from left (overlay)
- Main content: full width
- Resource footer: sticks to bottom
- Font sizes reduced for readability
- All grids become single column
- Buttons enlarged for touch targets

---

## Color/Typography (Design Direction)

### Colors
- **Background**: Deep space blacks (#0a0e27, #1a1f3a)
- **Accents**: Cyan/neon (#00d9ff, #0099ff)
- **Text**: Bright white, with secondary gray for muted info
- **Success**: Green (#00ff88)
- **Warning**: Orange (#ff9900)
- **Error**: Red (#ff4444)

### Typography
- **Display**: Bold, futuristic font (e.g., Space Mono)
- **Body**: Clean, readable monospace or sans-serif
- **Numbers**: Monospace for alignment and readability

### Animations
- Progress bars: smooth easing (ease-in-out)
- Resource counter changes: flash on update
- Button hover: subtle glow or scale
- Loading spinners: smooth rotation

---

## Key Interactions Summary

| Action | Flow | Feedback |
|--------|------|----------|
| Build Structure | Sidebar → Structures → Select Type → Confirm | Add to queue, allocate printer |
| Send Probe | Sidebar → Probes → Configure → Select Target → Launch | Probe appears in transit |
| Research Tech | Sidebar → Research → Click Tech → Queue | Tech joins research queue |
| Switch System | Sidebar → Systems → Click System | View updates to show that system |
| Pause Game | Header → Pause Button | All timers pause, button shows "Resume" |
| Save Game | Auto-save every 10s to localStorage | No UI indication (silent) |
