// Gerador pseudoaleatório determinístico (mulberry32). O estado fica num objeto
// serializável, então o save carrega a sequência e os testes podem fixar sementes.

export interface Rng {
  /** Número em [0, 1). */
  next(): number;
}

export interface RngHolder {
  rngSeed: number;
}

export function rngFrom(holder: RngHolder): Rng {
  return {
    next() {
      holder.rngSeed = (holder.rngSeed + 0x6d2b79f5) | 0;
      let t = holder.rngSeed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function seededRng(seed: number): Rng {
  return rngFrom({ rngSeed: seed });
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

export function pickWeighted<T extends { weight: number }>(rng: Rng, entries: readonly T[]): T {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng.next() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll < 0) return e;
  }
  return entries[entries.length - 1];
}
