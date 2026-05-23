export const SYSTEM_COORDS: Record<string, { x: number; y: number }> = {
  sol: { x: 0, y: 0 },
  alpha_centauri: { x: 3.2, y: -2.8 },
  barnards_star: { x: -4.5, y: 3.8 },
  wolf_359: { x: -6.1, y: -4.8 },
  sirius: { x: 7.5, y: -4.2 },
  lalande_21185: { x: -3.0, y: -7.5 },
  luyten_726_8: { x: 6.8, y: 5.2 },
  ross_154: { x: -8.0, y: -5.5 },
  ross_248: { x: 2.5, y: 9.8 },
  epsilon_eridani: { x: -9.5, y: 4.0 },
};

export function getSystemCoord(id: string): { x: number; y: number } {
  return SYSTEM_COORDS[id] ?? { x: 0, y: 0 };
}
