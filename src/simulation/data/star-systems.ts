export interface StarSystemDefinition {
  id: string;
  name: string;
  starType: string;
  distanceFromOrigin: number;
  knownRichness: number | null;
}

export const KNOWN_SYSTEMS: readonly StarSystemDefinition[] = [
  // Origin
  { id: "sol", name: "Sol", starType: "yellow", distanceFromOrigin: 0, knownRichness: 1.0 },

  // Very Close (4-10 ly)
  { id: "proxima_centauri", name: "Proxima Centauri", starType: "red", distanceFromOrigin: 4.25, knownRichness: 0.7 },
  { id: "alpha_centauri", name: "Alpha Centauri", starType: "yellow", distanceFromOrigin: 4.37, knownRichness: 1.3 },
  { id: "barnards_star", name: "Barnard's Star", starType: "red", distanceFromOrigin: 5.96, knownRichness: 0.4 },
  { id: "wolf_359", name: "Wolf 359", starType: "red", distanceFromOrigin: 7.86, knownRichness: 0.5 },
  { id: "lalande_21185", name: "Lalande 21185", starType: "red", distanceFromOrigin: 8.30, knownRichness: 0.7 },
  { id: "sirius", name: "Sirius", starType: "blue", distanceFromOrigin: 8.60, knownRichness: 0.9 },
  { id: "uv_ceti", name: "UV Ceti", starType: "red", distanceFromOrigin: 8.73, knownRichness: 0.5 },
  { id: "ross_154", name: "Ross 154", starType: "red", distanceFromOrigin: 9.69, knownRichness: 0.6 },
  { id: "ross_248", name: "Ross 248", starType: "red", distanceFromOrigin: 10.30, knownRichness: 0.5 },
  { id: "epsilon_eridani", name: "Epsilon Eridani", starType: "orange", distanceFromOrigin: 10.50, knownRichness: 1.6 },

  // Near (10-25 ly)
  { id: "ross_128", name: "Ross 128", starType: "red", distanceFromOrigin: 11.01, knownRichness: 0.8 },
  { id: "61_cygni", name: "61 Cygni", starType: "orange", distanceFromOrigin: 11.36, knownRichness: 0.9 },
  { id: "procyon", name: "Procyon", starType: "yellow", distanceFromOrigin: 11.46, knownRichness: 1.0 },
  { id: "tau_ceti", name: "Tau Ceti", starType: "yellow", distanceFromOrigin: 11.91, knownRichness: 1.4 },
  { id: "epsilon_indi", name: "Epsilon Indi", starType: "orange", distanceFromOrigin: 11.87, knownRichness: 1.1 },
  { id: "luytens_star", name: "Luyten's Star", starType: "red", distanceFromOrigin: 12.36, knownRichness: 0.9 },
  { id: "yz_ceti", name: "YZ Ceti", starType: "red", distanceFromOrigin: 12.12, knownRichness: 0.8 },
  { id: "teegardens_star", name: "Teegarden's Star", starType: "red", distanceFromOrigin: 12.50, knownRichness: 0.6 },
  { id: "gliese_876", name: "Gliese 876", starType: "red", distanceFromOrigin: 15.30, knownRichness: 1.2 },
  { id: "40_eridani", name: "40 Eridani", starType: "orange", distanceFromOrigin: 16.34, knownRichness: 1.1 },
  { id: "altair", name: "Altair", starType: "blue", distanceFromOrigin: 16.73, knownRichness: 0.8 },
  { id: "sigma_draconis", name: "Sigma Draconis", starType: "orange", distanceFromOrigin: 18.77, knownRichness: 1.0 },
  { id: "delta_pavonis", name: "Delta Pavonis", starType: "yellow", distanceFromOrigin: 19.92, knownRichness: 1.2 },
  { id: "gliese_581", name: "Gliese 581", starType: "red", distanceFromOrigin: 20.50, knownRichness: 1.0 },
  { id: "gliese_667", name: "Gliese 667", starType: "orange", distanceFromOrigin: 23.62, knownRichness: 1.1 },
  { id: "beta_hydri", name: "Beta Hydri", starType: "yellow", distanceFromOrigin: 24.33, knownRichness: 1.3 },

  // Mid-Range (25-50 ly)
  { id: "vega", name: "Vega", starType: "blue", distanceFromOrigin: 25.04, knownRichness: 1.8 },
  { id: "fomalhaut", name: "Fomalhaut", starType: "blue", distanceFromOrigin: 25.13, knownRichness: 2.0 },
  { id: "chara", name: "Chara", starType: "yellow", distanceFromOrigin: 27.53, knownRichness: 1.1 },
  { id: "trappist_1", name: "TRAPPIST-1", starType: "red", distanceFromOrigin: 39.46, knownRichness: 1.3 },
  { id: "55_cancri", name: "55 Cancri", starType: "yellow", distanceFromOrigin: 41.06, knownRichness: 1.9 },
  { id: "capella", name: "Capella", starType: "yellow", distanceFromOrigin: 42.92, knownRichness: 1.4 },
  { id: "upsilon_andromedae", name: "Upsilon Andromedae", starType: "yellow", distanceFromOrigin: 44.25, knownRichness: 1.7 },
  { id: "47_ursae_majoris", name: "47 Ursae Majoris", starType: "yellow", distanceFromOrigin: 45.30, knownRichness: 1.5 },

  // Far (50-140 ly)
  { id: "mu_arae", name: "Mu Arae", starType: "yellow", distanceFromOrigin: 50.63, knownRichness: 1.8 },
  { id: "castor", name: "Castor", starType: "blue", distanceFromOrigin: 51.00, knownRichness: 1.5 },
  { id: "pollux", name: "Pollux", starType: "orange", distanceFromOrigin: 33.78, knownRichness: 1.2 },
  { id: "arcturus", name: "Arcturus", starType: "orange", distanceFromOrigin: 36.70, knownRichness: 0.4 },
  { id: "beta_pictoris", name: "Beta Pictoris", starType: "blue", distanceFromOrigin: 63.40, knownRichness: 2.5 },
  { id: "aldebaran", name: "Aldebaran", starType: "orange", distanceFromOrigin: 65.30, knownRichness: 0.7 },
  { id: "regulus", name: "Regulus", starType: "blue", distanceFromOrigin: 79.30, knownRichness: 1.0 },
  { id: "toi_700", name: "TOI-700", starType: "red", distanceFromOrigin: 101.40, knownRichness: 1.1 },
  { id: "hr_8799", name: "HR 8799", starType: "yellow", distanceFromOrigin: 133.30, knownRichness: 2.2 },
  { id: "achernar", name: "Achernar", starType: "blue", distanceFromOrigin: 139.00, knownRichness: 0.8 },

  // Additional interesting targets
  { id: "82_eridani", name: "82 Eridani", starType: "yellow", distanceFromOrigin: 19.71, knownRichness: 1.2 },
  { id: "eta_cassiopeiae", name: "Eta Cassiopeiae", starType: "yellow", distanceFromOrigin: 19.32, knownRichness: 1.1 },
  { id: "70_ophiuchi", name: "70 Ophiuchi", starType: "orange", distanceFromOrigin: 16.70, knownRichness: 1.0 },
  { id: "pi_mensae", name: "Pi Mensae", starType: "yellow", distanceFromOrigin: 59.74, knownRichness: 1.6 },
  { id: "gliese_436", name: "Gliese 436", starType: "red", distanceFromOrigin: 31.90, knownRichness: 0.9 },

  // Prestige endpoint
  { id: "cygnus_x1", name: "Cygnus X-1", starType: "black_hole", distanceFromOrigin: 6070, knownRichness: 0 },
] as const;

export const STAR_NAME_PARTS = {
  prefixes: [
    "Nova",
    "Theta",
    "Kappa",
    "Sigma",
    "Tau",
    "Zeta",
    "Omega",
    "Mu",
    "Delta",
    "Gamma",
    "Lambda",
    "Phi",
    "Psi",
    "Xi",
    "Rho",
    "Iota",
  ],
  suffixes: [
    "Centauri",
    "Draconis",
    "Cygni",
    "Eridani",
    "Pavonis",
    "Ursae",
    "Leonis",
    "Aquilae",
    "Serpentis",
    "Tauri",
    "Orionis",
    "Hydrae",
    "Lyrae",
    "Pegasi",
    "Scorpii",
    "Carinae",
  ],
} as const;
