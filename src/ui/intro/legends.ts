// Um lendário por região (na ordem de STARTER_GENERATIONS), com a cor que ele dá às telas:
// a de "Pressione Start" e a fala do professor quando a região é liberada.

export const REGION_LEGENDS = [
  { regionId: 'kanto', id: 150, color: '#9858d8' },
  { regionId: 'johto', id: 249, color: '#4878d0' },
  { regionId: 'hoenn', id: 384, color: '#30a060' },
  { regionId: 'sinnoh', id: 483, color: '#4868c0' },
  { regionId: 'unova', id: 643, color: '#e07028' },
  { regionId: 'kalos', id: 716, color: '#2898b0' },
] as const;

export const legendOf = (regionId: string) => REGION_LEGENDS.find((l) => l.regionId === regionId);
