// Golpes de apoio (sem dano): quem aprende cada um e em que nível, por subida de nível, na PokéAPI.
// Gera src/game-data/generated/support-moves.json: { "<espécie>": [["swords-dance", 25], ...] }, por nível.
// Os efeitos ficam em src/game-data/supportMoves.ts; esta lista precisa bater com a de lá.
// Uso: node scripts/fetch-support-moves.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const WANTED = new Set(
  `spore sleep-powder hypnosis sing lovely-kiss dark-void thunder-wave stun-spore glare will-o-wisp toxic poison-powder
  poison-gas swords-dance nasty-plot dragon-dance calm-mind bulk-up agility rock-polish iron-defense acid-armor barrier
  amnesia growth quiver-dance hone-claws recover soft-boiled roost slack-off synthesis moonlight morning-sun milk-drink`.split(
    /\s+/,
  ),
);
const species = JSON.parse(await readFile(join(ROOT, 'src/game-data/generated/species.json'), 'utf8'));
const out = {};

async function get(id) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) return r.json();
    } catch {
      /* de novo */
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

let failed = 0;
const queue = species.map((s) => s.id);
await Promise.all(
  Array.from({ length: 10 }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const p = await get(id);
      if (!p) {
        failed++;
        continue;
      }
      const list = [];
      for (const m of p.moves) {
        if (!WANTED.has(m.move.name)) continue;
        const levels = m.version_group_details
          .filter((d) => d.move_learn_method.name === 'level-up')
          .map((d) => d.level_learned_at);
        // Nível 0 é "ao evoluir": conta como aprendido desde o nível 1.
        if (levels.length) list.push([m.move.name, Math.max(1, Math.min(...levels))]);
      }
      if (list.length) out[id] = list.sort((a, b) => a[1] - b[1]);
    }
  }),
);
// Arquivo parcial tiraria o golpe de espécies sem aviso: melhor não escrever nada.
if (failed > 0) {
  console.error(`${failed} espécies falharam: nada foi gravado. Tente de novo.`);
  process.exit(1);
}
const seen = new Set(Object.values(out).flatMap((list) => list.map(([move]) => move)));
const unused = [...WANTED].filter((move) => !seen.has(move));
if (unused.length) console.warn('Golpes que nenhuma espécie aprende (nome errado?):', unused.join(', '));
const sorted = Object.fromEntries(Object.entries(out).sort((a, b) => Number(a[0]) - Number(b[0])));
await writeFile(join(ROOT, 'src/game-data/generated/support-moves.json'), JSON.stringify(sorted));
console.log(
  `${Object.keys(sorted).length} de ${species.length} espécies com golpe de apoio; ${failed} falhas.`,
);
