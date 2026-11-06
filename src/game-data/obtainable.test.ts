// Toda espécie do jogo precisa de um caminho até a coleção: captura, prêmio, evolução ou ovo.

import { describe, expect, it } from 'vitest';
import {
  DEPT_STORE_CATALOG,
  LEGENDARIES,
  ROUTES,
  SAFARI_ENCOUNTERS,
  SHOP_CATALOG,
  SPECIES,
  STARTER_GENERATIONS,
  WATER_SPOTS,
  lineRoot,
  speciesId,
} from './index';
import world from './generated/world.json';

function obtainable(): Set<number> {
  const got = new Set<number>();
  for (const g of STARTER_GENERATIONS) for (const id of g.ids) got.add(id);
  for (const r of ROUTES) for (const e of r.encounters) got.add(e.speciesId);
  for (const spot of Object.values(WATER_SPOTS)) {
    for (const [slug] of spot.fish ?? []) got.add(speciesId(slug));
    for (const [slug] of spot.surf ?? []) got.add(speciesId(slug));
  }
  for (const [slug] of SAFARI_ENCOUNTERS) got.add(speciesId(slug));
  for (const l of LEGENDARIES) got.add(l.speciesId);
  for (const f of world.fossils) got.add(f.speciesId);
  for (const r of world.roamers) got.add(r.speciesId);
  for (const p of world.prizes) if ('speciesId' in p && p.speciesId) got.add(p.speciesId);
  for (const e of world.expeditions) {
    for (const r of e.rewards) if ('speciesId' in r && r.speciesId) got.add(r.speciesId);
  }
  const items = new Set<string>([...DEPT_STORE_CATALOG, ...SHOP_CATALOG].map((e) => e.id));
  for (let changed = true; changed;) {
    changed = false;
    for (const s of SPECIES) {
      if (!got.has(s.id)) continue;
      const next = s.evolutions.filter((e) => e.trigger !== 'item' || items.has(e.item)).map((e) => e.to);
      // O ovo sai na primeira forma da linha.
      if (!s.eggGroups.some((g) => g === 'no-eggs')) next.push(lineRoot(s.id));
      for (const id of next) {
        if (!got.has(id)) {
          got.add(id);
          changed = true;
        }
      }
    }
  }
  return got;
}

describe('Pokédex', () => {
  it('nenhuma espécie fica sem caminho', () => {
    const got = obtainable();
    expect(SPECIES.filter((s) => !got.has(s.id)).map((s) => s.name)).toEqual([]);
  });
});
