// Baixa a altura real (em decímetros, PokéAPI) de cada espécie e das Megas/Primais para
// src/game-data/generated/heights.json. A cena de batalha usa isso para o tamanho relativo dos Pokémon.
// Uso: node scripts/fetch-heights.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const species = JSON.parse(await readFile(join(ROOT, 'src/game-data/generated/species.json'), 'utf8'));
const megas = JSON.parse(await readFile(join(ROOT, 'src/game-data/generated/megas.json'), 'utf8'));
const wanted = new Set(megas.map((m) => `${m.speciesId}-${m.form}`));
const out = {};

async function get(id) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { signal: AbortSignal.timeout(20000) });
      if (r.ok) return r.json();
    } catch {
      /* de novo */
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

const queue = [...species.map((s) => ({ id: s.id, key: String(s.id) })), ...Array.from({ length: 58 }, (_, i) => ({ id: 10033 + i }))];
await Promise.all(
  Array.from({ length: 10 }, async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      const p = await get(j.id);
      if (!p) continue;
      if (j.key) out[j.key] = p.height;
      else {
        const m = p.name.match(/-(mega|primal)(?:-([xy]))?$/);
        if (!m) continue;
        const form = m[1] === 'primal' ? 'primal' : `mega${m[2] ?? ''}`;
        const sp = Number(p.species.url.split('/').at(-2));
        if (wanted.has(`${sp}-${form}`)) out[`${sp}-${form}`] = p.height;
      }
    }
  }),
);
await writeFile(join(ROOT, 'src/game-data/generated/heights.json'), JSON.stringify(out));
console.log(Object.keys(out).length, 'alturas');
