export interface StarSystemDefinition {
  id: string;
  name: string;
  starType: string;
  distanceFromOrigin: number;
  knownRichness: number | null;
}

export const KNOWN_SYSTEMS: readonly StarSystemDefinition[] = [
  {
    id: "sol",
    name: "Sol",
    starType: "yellow",
    distanceFromOrigin: 0,
    knownRichness: 1.0,
  },
  {
    id: "alpha_centauri",
    name: "Alpha Centauri",
    starType: "yellow",
    distanceFromOrigin: 4.37,
    knownRichness: 1.2,
  },
  {
    id: "barnards_star",
    name: "Barnard's Star",
    starType: "red",
    distanceFromOrigin: 5.96,
    knownRichness: null,
  },
  {
    id: "wolf_359",
    name: "Wolf 359",
    starType: "red",
    distanceFromOrigin: 7.86,
    knownRichness: null,
  },
  {
    id: "lalande_21185",
    name: "Lalande 21185",
    starType: "red",
    distanceFromOrigin: 8.29,
    knownRichness: null,
  },
  {
    id: "sirius",
    name: "Sirius",
    starType: "blue",
    distanceFromOrigin: 8.6,
    knownRichness: null,
  },
  {
    id: "luyten_726_8",
    name: "Luyten 726-8",
    starType: "red",
    distanceFromOrigin: 8.73,
    knownRichness: null,
  },
  {
    id: "ross_154",
    name: "Ross 154",
    starType: "red",
    distanceFromOrigin: 9.69,
    knownRichness: null,
  },
  {
    id: "ross_248",
    name: "Ross 248",
    starType: "red",
    distanceFromOrigin: 10.32,
    knownRichness: null,
  },
  {
    id: "epsilon_eridani",
    name: "Epsilon Eridani",
    starType: "yellow",
    distanceFromOrigin: 10.52,
    knownRichness: null,
  },
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
