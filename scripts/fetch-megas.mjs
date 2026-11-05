// Mega Evoluções da 6ª geração: gera src/game-data/generated/megas.json (tipos, atributos e habilidade da
// PokéAPI) e baixa os sprites (PokéAPI/sprites) e as Mega Stones.
// Uso: node scripts/fetch-megas.mjs   (depois: python scripts/sprite-feet.py)
// Os GIFs vão para public/sprites/pokemon/forms/<pasta>/<espécie>-<forma>.gif, junto das formas alternativas
// (Unown, Castform...); os ícones, para forms/icon/<espécie>-<forma>.png.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const API = 'https://pokeapi.co/api/v2';

// Espécie base → Mega Stone (as de dois formatos, X e Y, ganham o sufixo). Mega Rayquaza não usa pedra.
const STONES = {
  venusaur: 'venusaurite',
  charizard: 'charizardite',
  blastoise: 'blastoisinite',
  alakazam: 'alakazite',
  gengar: 'gengarite',
  kangaskhan: 'kangaskhanite',
  pinsir: 'pinsirite',
  gyarados: 'gyaradosite',
  aerodactyl: 'aerodactylite',
  mewtwo: 'mewtwonite',
  ampharos: 'ampharosite',
  scizor: 'scizorite',
  heracross: 'heracronite',
  houndoom: 'houndoominite',
  tyranitar: 'tyranitarite',
  blaziken: 'blazikenite',
  gardevoir: 'gardevoirite',
  mawile: 'mawilite',
  aggron: 'aggronite',
  medicham: 'medichamite',
  manectric: 'manectite',
  banette: 'banettite',
  absol: 'absolite',
  garchomp: 'garchompite',
  lucario: 'lucarionite',
  abomasnow: 'abomasite',
  beedrill: 'beedrillite',
  pidgeot: 'pidgeotite',
  slowbro: 'slowbronite',
  steelix: 'steelixite',
  sceptile: 'sceptilite',
  swampert: 'swampertite',
  sableye: 'sablenite',
  sharpedo: 'sharpedonite',
  camerupt: 'cameruptite',
  altaria: 'altarianite',
  glalie: 'glalitite',
  salamence: 'salamencite',
  metagross: 'metagrossite',
  latias: 'latiasite',
  latios: 'latiosite',
  lopunny: 'lopunnite',
  gallade: 'galladite',
  audino: 'audinite',
  diancie: 'diancite',
};

const KINDS = [
  ['front', 'other/showdown'],
  ['back', 'other/showdown/back'],
  ['front-shiny', 'other/showdown/shiny'],
  ['back-shiny', 'other/showdown/back/shiny'],
];

const titleCase = (slug) =>
  slug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function save(url, file) {
  const res = await fetch(url);
  if (!res.ok) return false;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

const megas = [];
// Regressões Primais: mesmo mecanismo da Mega, com o Orb no lugar da pedra.
const PRIMALS = [
  [10077, 'kyogre', 'blue-orb'],
  [10078, 'groudon', 'red-orb'],
];
for (const [id, base, orb] of PRIMALS) {
  const p = await json(`${API}/pokemon/${id}`);
  const species = Number(p.species.url.split('/').at(-2));
  const form = 'primal';
  const stat = Object.fromEntries(p.stats.map((s) => [s.stat.name, s.base_stat]));
  for (const [folder, path] of KINDS)
    await save(
      `${RAW}/pokemon/${path}/${id}.gif`,
      join(ROOT, 'public/sprites/pokemon/forms', folder, `${species}-${form}.gif`),
    );
  await save(
    `${RAW}/pokemon/versions/generation-vii/icons/${id}.png`,
    join(ROOT, 'public/sprites/pokemon/forms/icon', `${species}-${form}.png`),
  );
  await save(`${RAW}/items/${orb}.png`, join(ROOT, 'public/sprites/items', `${orb}.png`));
  megas.push({
    stone: orb,
    stoneName: titleCase(orb),
    speciesId: species,
    form,
    name: `Primal ${titleCase(base)}`,
    types: p.types.map((t) => t.type.name),
    baseStats: {
      hp: stat.hp,
      atk: stat.attack,
      def: stat.defense,
      spAtk: stat['special-attack'],
      spDef: stat['special-defense'],
      spe: stat.speed,
    },
    ability: p.abilities[0].ability.name,
  });
  console.log('ok', p.name, orb);
}
for (let id = 10033; id <= 10090; id++) {
  const p = await json(`${API}/pokemon/${id}`).catch(() => null);
  if (!p || !p.name.includes('-mega')) continue;
  const base = p.name.split('-mega')[0];
  const suffix = p.name.split('-mega')[1]; // '', '-x' ou '-y'
  if (!STONES[base]) {
    console.log('sem pedra (ignorada):', p.name);
    continue;
  }
  const species = Number(p.species.url.split('/').at(-2));
  const form = `mega${suffix.replace('-', '')}`;
  const stone = STONES[base] + suffix;
  const stat = Object.fromEntries(p.stats.map((s) => [s.stat.name, s.base_stat]));
  const okSprites = [];
  for (const [folder, path] of KINDS)
    okSprites.push(
      await save(
        `${RAW}/pokemon/${path}/${id}.gif`,
        join(ROOT, 'public/sprites/pokemon/forms', folder, `${species}-${form}.gif`),
      ),
    );
  if (!okSprites.every(Boolean)) {
    console.log('sprites incompletos (ignorada):', p.name);
    continue;
  }
  await save(
    `${RAW}/pokemon/versions/generation-vii/icons/${id}.png`,
    join(ROOT, 'public/sprites/pokemon/forms/icon', `${species}-${form}.png`),
  );
  if (!(await save(`${RAW}/items/${stone}.png`, join(ROOT, 'public/sprites/items', `${stone}.png`)))) {
    console.log('pedra sem ícone:', stone);
  }
  megas.push({
    stone,
    stoneName: titleCase(stone),
    speciesId: species,
    form,
    name: `Mega ${titleCase(base)}${suffix ? ` ${suffix.slice(1).toUpperCase()}` : ''}`,
    types: p.types.map((t) => t.type.name),
    baseStats: {
      hp: stat.hp,
      atk: stat.attack,
      def: stat.defense,
      spAtk: stat['special-attack'],
      spDef: stat['special-defense'],
      spe: stat.speed,
    },
    ability: p.abilities.find((a) => !a.is_hidden)?.ability.name ?? p.abilities[0].ability.name,
  });
  console.log('ok', p.name, stone);
}
megas.sort((a, b) => a.speciesId - b.speciesId || a.form.localeCompare(b.form));
await mkdir(join(ROOT, 'src/game-data/generated'), { recursive: true });
await writeFile(join(ROOT, 'src/game-data/generated/megas.json'), JSON.stringify(megas));
console.log(`${megas.length} Megas.`);
