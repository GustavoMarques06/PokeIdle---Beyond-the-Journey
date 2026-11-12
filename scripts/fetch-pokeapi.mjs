// Gera os dados do jogo a partir de scripts/world.mjs e da PokéAPI, e baixa os assets.
//
//   npm run data:fetch            -> usa o cache local quando existir
//   npm run data:fetch -- --fresh -> ignora o cache e baixa tudo de novo
//
// Saídas:
//   src/game-data/generated/{species,moves,type-chart,items,world}.json
//   public/sprites/pokemon/{front,back,front-shiny,back-shiny,icon}/<id>.*
//   public/sprites/{items,trainers,badges,backgrounds}/<id>.png
//   public/audio/cries/<id>.ogg
//
// Fontes:
//   Pokémon: Black/White animado (PokéAPI) até a Geração V; a Geração VI usa os sprites
//   estáticos no estilo Black/White do Showdown. Ícones Gen VII; gritos "legacy".
//   Treinadores e fundos: Pokémon Showdown. Insígnias: repositório da PokéAPI.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import * as WORLD from './world.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'scripts', '.cache');
const DATA_OUT = path.join(ROOT, 'src', 'game-data', 'generated');
const PUBLIC = path.join(ROOT, 'public');
const SPRITE_OUT = path.join(PUBLIC, 'sprites');
const API = 'https://pokeapi.co/api/v2';
const SHOWDOWN = 'https://play.pokemonshowdown.com';
const FRESH = process.argv.includes('--fresh');
const MAX_ID = 721; // Gerações I–VI (a VI sem animação: não há sprites animados no estilo Black/White).

const LEARNSET_VERSION_GROUPS = [
  'firered-leafgreen',
  'emerald',
  'heartgold-soulsilver',
  'platinum',
  'black-2-white-2',
  'x-y',
  'omega-ruby-alpha-sapphire',
];
/** Máquinas e tutores: Black 2/White 2; quem não existia lá (Geração VI) usa X/Y. */
const TM_VERSION_GROUPS = ['black-2-white-2', 'x-y'];
const FALLBACK_MOVE = 'tackle';
// Golpes de tutor que marcam a espécie e não vêm por nível na PokéAPI: entram no aprendizado por nível aqui.
// Dragon Ascent: em ORAS a Zinnia ensina ao Rayquaza (é o golpe da Mega Rayquaza).
// Water Pulse: a linha do Squirtle aprende por nível a partir da Geração VI (Squirtle 25, Wartortle e Blastoise 28),
// e é o golpe que o Mega Lançador do Mega Blastoise reforça.
const TUTOR_LEVEL_MOVES = {
  384: [{ level: 70, move: 'dragon-ascent' }],
  7: [{ level: 25, move: 'water-pulse' }],
  8: [{ level: 28, move: 'water-pulse' }],
  9: [{ level: 28, move: 'water-pulse' }],
};
// TMs que a espécie aprende nas gerações seguintes e que ela precisa aqui: Dark Pulse e Dragon Pulse dão ao Mega
// Blastoise golpes de pulso de outros tipos, como nos jogos.
const EXTRA_TM_MOVES = { 9: ['dark-pulse', 'dragon-pulse'] };
// Golpes que o combate simples não modela (autodestruição, recarga, dois turnos, poder variável…).
const MOVE_BLACKLIST = new Set([
  'self-destruct',
  'explosion',
  'dream-eater',
  'focus-punch',
  'snore',
  'future-sight',
  'doom-desire',
  'solar-beam',
  'sky-attack',
  'skull-bash',
  'razor-wind',
  'hyper-beam',
  'giga-impact',
  'blast-burn',
  'hydro-cannon',
  'frenzy-plant',
  'rock-wrecker',
  'roar-of-time',
  'fly',
  'dig',
  'dive',
  'bounce',
  'sky-drop',
  'phantom-force',
  'shadow-force',
  'bide',
  'counter',
  'mirror-coat',
  'metal-burst',
  'endeavor',
  'false-swipe',
  'present',
  'magnitude',
  'low-kick',
  'grass-knot',
  'heavy-slam',
  'heat-crash',
  'reversal',
  'flail',
  'return',
  'frustration',
  'hidden-power',
  'spit-up',
  'natural-gift',
  'fling',
  'last-resort',
  'belch',
  'final-gambit',
  'thrash',
  'petal-dance',
  'outrage',
  'uproar',
  'rollout',
  'ice-ball',
  'fury-cutter',
  'echoed-voice',
  'round',
  'pursuit',
  'payback',
  'avalanche',
  'revenge',
  'assurance',
  'stored-power',
  'punishment',
  'trump-card',
  'wring-out',
  'crush-grip',
  'electro-ball',
  'gyro-ball',
  'beat-up',
  'water-spout',
  'eruption',
  'struggle',
  'freeze-shock',
  'ice-burn',
  'shell-trap',
  'steel-beam',
  'mind-blown',
  'meteor-beam',
]);

/** Fundos de batalha (Showdown) para cada cena do jogo. */
const BACKGROUNDS = {
  meadow: 'bg-meadow',
  route: 'bg-route',
  forest: 'bg-forest',
  mountain: 'bg-mountain',
  cave: 'bg-earthycave',
  river: 'bg-river',
  beach: 'bg-beach',
  desert: 'bg-desert',
  city: 'bg-city',
  icecave: 'bg-icecave',
  volcano: 'bg-volcanocave',
  plains: 'bg-thunderplains',
  dampcave: 'bg-dampcave',
  sea: 'bg-deepsea',
};

/** Treinadores fixos da interface → arquivo no Showdown. */
const UI_TRAINERS = {
  red: ['red-gen3'],
  leaf: ['leaf-gen3'],
  oak: ['oak-gen3'],
  rocket: ['teamrocketgruntm-gen3', 'rocketgrunt'],
  rocketf: ['teamrocketgruntf-gen3', 'rocketgruntf'],
  // Classes de treinador das atividades (Laboratório, Creche, Treino, Game Corner e os andares da Torre). Estilo da
  // 3ª geração, como os de cima; a 4ª quando não houver.
  ...Object.fromEntries(
    [
      'scientist', 'gambler', 'pokemonbreeder', 'blackbelt', 'battlegirl', 'psychic', 'lass', 'youngster',
      'birdkeeper', 'hiker', 'fisherman', 'beauty', 'gentleman', 'pokemonranger', 'acetrainer', 'camper',
      'picnicker', 'ruinmaniac', 'richboy', 'lady', 'parasollady', 'aromalady', 'supernerd', 'guitarist',
      'swimmer', 'cyclist', 'worker', 'veteran', 'clerk-boss', 'waitress', 'backpacker',
    ].map((c) => [`class-${c}`, [`${c}-gen3`, `${c}-gen4`, `${c}-gen4dp`, c]]),
  ),
};

const UI_ITEMS = [
  'exp-share',
  'amulet-coin',
  'potion',
  'town-map',
  'macho-brace',
  'muscle-band',
  'lucky-egg',
  'shiny-charm',
  'explorer-kit',
  'rare-candy',
  'up-grade',
  'vs-seeker',
  'coin-case',
  'nugget',
  'star-piece',
  'fame-checker',
  'teachy-tv',
  'pokemon-box',
  'escape-rope',
  'dowsing-machine',
  'berry-pouch',
  'oval-charm',
  'tm-case',
  'pokeblock-case',
];
/** Sprites oficiais dos itens seguráveis, das vitaminas e dos ícones da interface (ver helditems.ts). */
const SPRITE_ONLY_ITEMS = [
  'charcoal',
  'mystic-water',
  'miracle-seed',
  'magnet',
  'never-melt-ice',
  'black-belt',
  'poison-barb',
  'soft-sand',
  'sharp-beak',
  'twisted-spoon',
  'silver-powder',
  'hard-stone',
  'spell-tag',
  'dragon-fang',
  'black-glasses',
  'silk-scarf',
  'leftovers',
  'choice-band',
  'choice-specs',
  'choice-scarf',
  'assault-vest',
  'life-orb',
  'focus-sash',
  'expert-belt',
  'shell-bell',
  'rocky-helmet',
  'scope-lens',
  'wide-lens',
  'quick-claw',
  'wise-glasses',
  'hp-up',
  'protein',
  'iron',
  'calcium',
  'zinc',
  'carbos',
  'bottle-cap',
  'ability-capsule',
  'ability-patch',
  'linking-cord',
  'vs-recorder',
  'machine-part',
  'mystery-egg',
  'poke-radar',
  'dynamax-band',
  'relic-crown',
  'rainbow-pass',
  'catching-charm',
];
const SHOP_ITEMS = [
  'poke-ball',
  'great-ball',
  'ultra-ball',
  'moon-stone',
  'thunder-stone',
  'water-stone',
  'leaf-stone',
  'fire-stone',
];
/** Bolas especiais, repelentes e incensos (ver capture.ts e lures.ts). */
const CAPTURE_ITEMS = [
  'net-ball',
  'dusk-ball',
  'quick-ball',
  'timer-ball',
  'repeat-ball',
  'nest-ball',
  'luxury-ball',
  'heal-ball',
  'repel',
  'super-repel',
  'max-repel',
  'sea-incense',
  'rose-incense',
  'rock-incense',
  'odd-incense',
];
const ICON_SHEET = { url: `${SHOWDOWN}/sprites/pokemonicons-sheet.png`, cols: 12, w: 40, h: 30 };

// --- utilidades ------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function getJson(url) {
  const key = url.replace(API, '').replace(/[^a-z0-9]+/gi, '_') + '.json';
  const cachePath = path.join(CACHE_DIR, key);
  if (!FRESH && (await exists(cachePath))) return JSON.parse(await readFile(cachePath, 'utf8'));
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) throw Object.assign(new Error('404'), { notFound: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      await writeFile(cachePath, JSON.stringify(json));
      return json;
    } catch (err) {
      if (err.notFound || attempt >= 4)
        throw new Error(`Falha ao buscar ${url}: ${err.message}`, { cause: err });
      await sleep(500 * attempt);
    }
  }
}

async function download(url, dest) {
  if (!url) return false;
  if (!FRESH && (await exists(dest))) return true;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return true;
    } catch (err) {
      if (attempt >= 4) throw new Error(`Falha ao baixar ${url}: ${err.message}`, { cause: err });
      await sleep(500 * attempt);
    }
  }
}

async function downloadFirst(candidates, destNoExt) {
  for (const url of candidates.filter(Boolean)) {
    const dest = destNoExt + path.extname(new URL(url).pathname);
    if (await download(url, dest)) return dest;
  }
  return null;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function imageSize(file) {
  if (!(await exists(file))) return null;
  const buf = await readFile(file);
  if (buf.toString('ascii', 0, 3) === 'GIF') return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  return null;
}

async function cropIcon(sheetPath, num, dest) {
  if (!FRESH && (await exists(dest))) return true;
  const sheet = PNG.sync.read(await readFile(sheetPath));
  const { cols, w, h } = ICON_SHEET;
  const x0 = (num % cols) * w;
  const y0 = Math.floor(num / cols) * h;
  if (y0 + h > sheet.height) return false;
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(sheet, out, x0, y0, w, h, 0, 0);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, PNG.sync.write(out));
  return true;
}

const idFromUrl = (url) => Number(url.split('/').filter(Boolean).pop());
const englishName = (names, fallback) => names.find((n) => n.language.name === 'en')?.name ?? fallback;
const AILMENTS = new Set(['burn', 'poison', 'paralysis', 'sleep', 'freeze']);
const STAT_KEYS = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spAtk',
  'special-defense': 'spDef',
  speed: 'spe',
};
const GENERATION_NUMBERS = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
};
/** Evolução por saber um golpe de certo tipo (Sylveon) vira uma pedra. */
const MOVE_TYPE_ITEM = { fairy: 'shiny-stone' };
const LOCATION_ITEM_BY_TYPE = {
  grass: 'leaf-stone',
  bug: 'leaf-stone',
  ice: 'ice-stone',
  electric: 'thunder-stone',
  steel: 'thunder-stone',
  rock: 'thunder-stone',
};
const EXTRA_EVOLUTION_ITEMS = ['shiny-stone', 'dusk-stone', 'dawn-stone'];

// --- evoluções ------------------------------------------------------------------------

/**
 * Converte os detalhes de evolução da PokéAPI em gatilhos que o jogo entende:
 * nível ou item (com período do dia opcional). Troca vira nível 38 (ou o item segurado);
 * amizade vira o item Soothe Bell; evolução por local vira a pedra do tipo resultante.
 */
function parseEvolution(details, toTypes) {
  const d = details[0];
  if (!d) return { trigger: 'level', minLevel: 30 };
  const time = d.time_of_day === 'day' || d.time_of_day === 'night' ? d.time_of_day : undefined;
  const withTime = (evo) => (time ? { ...evo, time } : evo);
  const anyItem = details.find((x) => x.item);
  const anyHeld = details.find((x) => x.held_item);
  const anyLevel = details.find((x) => x.min_level);
  const anyHappiness = details.find((x) => x.min_happiness);
  const anyLocation = details.find((x) => x.location);
  const anyMoveType = details.find((x) => MOVE_TYPE_ITEM[x.known_move_type?.name]);
  if (d.trigger.name === 'use-item' && anyItem) return withTime({ trigger: 'item', item: anyItem.item.name });
  if (d.trigger.name === 'trade')
    return anyHeld ? { trigger: 'item', item: anyHeld.held_item.name } : { trigger: 'level', minLevel: 38 };
  if (anyHeld) return withTime({ trigger: 'item', item: anyHeld.held_item.name });
  if (anyMoveType && !anyLevel)
    return { trigger: 'item', item: MOVE_TYPE_ITEM[anyMoveType.known_move_type.name] };
  if (anyLevel) return withTime({ trigger: 'level', minLevel: anyLevel.min_level });
  if (anyHappiness) return withTime({ trigger: 'item', item: 'soothe-bell' });
  if (anyLocation) return { trigger: 'item', item: LOCATION_ITEM_BY_TYPE[toTypes[0]] ?? 'shiny-stone' };
  if (anyItem) return { trigger: 'item', item: anyItem.item.name };
  return { trigger: 'level', minLevel: 30 };
}

function walkChain(node, visit) {
  visit(node);
  for (const next of node.evolves_to) walkChain(next, visit);
}

// --- principal ----------------------------------------------------------------------

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(DATA_OUT, { recursive: true });

  // 1. Nomes citados no conteúdo → ids.
  const routes = WORLD.REGIONS.flatMap((reg) =>
    reg.routes.map((rt) => ({ ...rt, regionId: reg.id, regionName: reg.name })),
  );
  const slugs = new Set(WORLD.EXTRA_SPECIES);
  for (const g of WORLD.STARTERS) for (const s of g.starters) slugs.add(s);
  for (const rt of routes) {
    for (const e of rt.encounters) slugs.add(e[0]);
    for (const [s] of rt.boss?.team ?? []) if (!s.startsWith('$')) slugs.add(s);
  }
  for (const x of WORLD.ROAMERS) slugs.add(x.species);
  for (const f of WORLD.FOSSILS) slugs.add(f.species);
  for (const e of WORLD.EXPEDITIONS) for (const rw of e.rewards) if (rw.species) slugs.add(rw.species);
  for (const p of WORLD.GAME_CORNER_PRIZES) if (p.species) slugs.add(p.species);

  console.log(`Resolvendo ${slugs.size} espécies citadas...`);
  const slugToId = new Map();
  await mapLimit([...slugs], 8, async (slug) => {
    const sp = await getJson(`${API}/pokemon-species/${slug}`);
    if (sp.id > MAX_ID) throw new Error(`${slug} (#${sp.id}) é de uma geração não suportada`);
    slugToId.set(slug, sp.id);
  });
  const idOf = (slug) => {
    const id = slugToId.get(slug);
    if (!id) throw new Error(`Espécie desconhecida no conteúdo: ${slug}`);
    return id;
  };

  // 2. Fecha as linhas evolutivas (inclui bebês e formas finais até a Geração V).
  const wanted = new Set(slugToId.values());
  const chains = new Map();
  for (let changed = true; changed;) {
    changed = false;
    await mapLimit([...wanted], 8, async (id) => {
      if (chains.has(id)) return;
      const sp = await getJson(`${API}/pokemon-species/${id}`);
      const chain = await getJson(sp.evolution_chain.url);
      chains.set(id, chain);
      walkChain(chain.chain, (node) => {
        const nid = idFromUrl(node.species.url);
        if (nid <= MAX_ID && !wanted.has(nid)) {
          wanted.add(nid);
          changed = true;
        }
      });
    });
  }
  const ids = [...wanted].sort((a, b) => a - b);
  console.log(`Buscando ${ids.length} espécies (com linhas evolutivas)...`);
  const raw = await mapLimit(ids, 8, async (id) => {
    const [pokemon, species] = await Promise.all([
      getJson(`${API}/pokemon/${id}`),
      getJson(`${API}/pokemon-species/${id}`),
    ]);
    return { id, pokemon, species, chain: chains.get(id) ?? (await getJson(species.evolution_chain.url)) };
  });
  const typesById = new Map(
    raw.map((x) => [x.id, [...x.pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name)]),
  );

  // 3. Golpes: por nível (versão de referência) e por máquina/tutor (Black 2/White 2).
  const moveNames = new Set([FALLBACK_MOVE, ...WORLD.TM_POOL]);
  for (const rt of routes) if (rt.boss?.reward?.tm) moveNames.add(rt.boss.reward.tm);
  for (const p of WORLD.GAME_CORNER_PRIZES) if (p.move) moveNames.add(p.move);
  const learnsets = new Map();
  const machines = new Map();
  const eggMovesById = new Map();
  for (const { id, pokemon } of raw) {
    const levelUp = (group) =>
      pokemon.moves.flatMap((m) =>
        m.version_group_details
          .filter((v) => v.version_group.name === group && v.move_learn_method.name === 'level-up')
          .map((v) => ({ level: Math.max(1, v.level_learned_at), move: m.move.name })),
      );
    const group = LEARNSET_VERSION_GROUPS.find((g) => levelUp(g).length > 0);
    const list = [...(group ? levelUp(group) : []), ...(TUTOR_LEVEL_MOVES[id] ?? [])];
    for (const l of list) moveNames.add(l.move);
    learnsets.set(id, list);
    const taught = (group) =>
      pokemon.moves
        .filter((m) =>
          m.version_group_details.some(
            (v) => v.version_group.name === group && ['machine', 'tutor'].includes(v.move_learn_method.name),
          ),
        )
        .map((m) => m.move.name);
    const tm = [...(TM_VERSION_GROUPS.map(taught).find((list) => list.length > 0) ?? []), ...(EXTRA_TM_MOVES[id] ?? [])];
    for (const m of tm) moveNames.add(m);
    machines.set(id, tm);
    // Golpes de ovo: herdados na Creche quando um dos pais conhece o golpe.
    const bred = (group) =>
      pokemon.moves
        .filter((m) =>
          m.version_group_details.some(
            (v) => v.version_group.name === group && v.move_learn_method.name === 'egg',
          ),
        )
        .map((m) => m.move.name);
    const egg = LEARNSET_VERSION_GROUPS.map(bred).find((list) => list.length > 0) ?? [];
    for (const m of egg) moveNames.add(m);
    eggMovesById.set(id, egg);
  }

  console.log(`Buscando ${moveNames.size} golpes...`);
  const moveList = await mapLimit([...moveNames], 8, (name) => getJson(`${API}/move/${name}`));
  const moves = {};
  for (const m of moveList) {
    if (!m.power || m.damage_class.name === 'status' || MOVE_BLACKLIST.has(m.name)) continue;
    moves[m.name] = {
      id: m.name,
      name: englishName(m.names, m.name),
      type: m.type.name,
      power: m.power,
      accuracy: m.accuracy ?? 100,
      category: m.damage_class.name,
      priority: m.priority,
    };
    // Efeito de status secundário (queimadura, veneno, paralisia, sono, congelamento).
    const ailment = AILMENTS.has(m.meta?.ailment?.name) ? m.meta.ailment.name : null;
    if (ailment && m.meta.ailment_chance > 0) {
      moves[m.name].ailment = ailment;
      moves[m.name].ailmentChance = m.meta.ailment_chance;
    }
    // Dreno (Giga Drain cura metade do dano) e recuo (Brave Bird fere quem ataca: valor negativo), em % do dano.
    if (m.meta?.drain) moves[m.name].drain = m.meta.drain;
    // Golpes de vários acertos (Double Kick, Bullet Seed) e de crítico fácil (Slash, Stone Edge).
    if (m.meta?.min_hits && m.meta?.max_hits) moves[m.name].hits = [m.meta.min_hits, m.meta.max_hits];
    if (m.meta?.crit_rate) moves[m.name].critStage = m.meta.crit_rate;
  }

  console.log('Buscando tabela de tipos...');
  const typeIndex = await getJson(`${API}/type?limit=100`);
  const typeNames = typeIndex.results
    .map((t) => t.name)
    .filter((n) => !['unknown', 'shadow', 'stellar'].includes(n));
  const types = await mapLimit(typeNames, 6, (name) => getJson(`${API}/type/${name}`));
  const typeChart = {};
  for (const t of types) {
    const row = {};
    for (const d of t.damage_relations.double_damage_to) row[d.name] = 2;
    for (const d of t.damage_relations.half_damage_to) row[d.name] = 0.5;
    for (const d of t.damage_relations.no_damage_to) row[d.name] = 0;
    typeChart[t.name] = row;
  }

  // 4. Espécies.
  const evolutionItems = new Set();
  const species = [];
  const spriteJobs = [];
  const iconJobs = [];
  const audioJobs = [];
  for (const { id, pokemon, species: sp, chain } of raw) {
    const evolutions = [];
    walkChain(chain.chain, (node) => {
      if (idFromUrl(node.species.url) !== id) return;
      for (const next of node.evolves_to) {
        const to = idFromUrl(next.species.url);
        if (!wanted.has(to)) continue;
        evolutions.push({ to, ...parseEvolution(next.evolution_details, typesById.get(to) ?? []) });
      }
    });
    // Duas evoluções no mesmo nível (Wurmple, Tyrogue…): as extras passam a usar pedras
    // distintas para continuarem alcançáveis.
    const usedItems = new Set(
      evolutions.filter((e) => e.trigger === 'item').map((e) => `${e.item}:${e.time ?? ''}`),
    );
    let levelSeen = false;
    for (const e of evolutions) {
      if (e.trigger !== 'level') continue;
      if (!levelSeen) {
        levelSeen = true;
        continue;
      }
      const item = EXTRA_EVOLUTION_ITEMS.find((it) => !usedItems.has(`${it}:`));
      e.trigger = 'item';
      e.item = item;
      delete e.minLevel;
      delete e.time;
      usedItems.add(`${item}:`);
    }
    for (const e of evolutions) if (e.trigger === 'item') evolutionItems.add(e.item);

    const baseStats = {};
    for (const s of pokemon.stats) baseStats[STAT_KEYS[s.stat.name]] = s.base_stat;
    const learnset = learnsets
      .get(id)
      .filter((l) => moves[l.move])
      .sort((a, b) => a.level - b.level);
    if (!learnset.some((l) => l.level <= 1)) learnset.unshift({ level: 1, move: FALLBACK_MOVE });
    const tmMoves = [...new Set(machines.get(id).filter((m) => moves[m]))].sort();
    const eggMoves = [...new Set(eggMovesById.get(id).filter((m) => moves[m]))].sort();

    const bw = pokemon.sprites.versions['generation-v']['black-white'];
    const sdId = pokemon.name.replace(/[^a-z0-9]/g, '');
    // Formas padrão com sufixo (aegislash-shield, meowstic-male…) têm o arquivo pelo nome da espécie.
    const sdSpecies = sp.name.replace(/[^a-z0-9]/g, '');
    const candidates = (key, sdFolder) => [
      bw.animated[key],
      `${SHOWDOWN}/sprites/${sdFolder}/${sdId}.png`,
      `${SHOWDOWN}/sprites/${sdFolder}/${sdSpecies}.png`,
      bw[key],
      pokemon.sprites[key],
    ];
    const entry = {
      id,
      slug: sp.name,
      name: englishName(sp.names, sp.name),
      genus: sp.genera.find((g) => g.language.name === 'en')?.genus ?? '',
      types: typesById.get(id),
      baseStats,
      baseExp: pokemon.base_experience ?? 60,
      captureRate: sp.capture_rate,
      growthRate: sp.growth_rate.name,
      legendary: sp.is_legendary || sp.is_mythical,
      baby: sp.is_baby,
      hatchCounter: sp.hatch_counter ?? 20,
      eggGroups: sp.egg_groups.map((g) => g.name),
      evolutions,
      learnset,
      tmMoves,
      eggMoves,
      // -1 = sem gênero; 0 a 8 = oitavos de chance de ser fêmea.
      genderRate: sp.gender_rate,
      generation: GENERATION_NUMBERS[sp.generation.name] ?? 0,
      sprites: {},
    };
    species.push(entry);
    for (const [key, sd, folder, field] of [
      ['front_default', 'gen5', 'front', 'front'],
      ['back_default', 'gen5-back', 'back', 'back'],
      ['front_shiny', 'gen5-shiny', 'front-shiny', 'frontShiny'],
      ['back_shiny', 'gen5-back-shiny', 'back-shiny', 'backShiny'],
    ]) {
      spriteJobs.push({
        entry,
        field,
        urls: candidates(key, sd),
        destNoExt: path.join(SPRITE_OUT, 'pokemon', folder, String(id)),
      });
    }
    iconJobs.push({ entry, url: pokemon.sprites.versions['generation-vii'].icons.front_default });
    const cryUrl = pokemon.cries?.legacy ?? pokemon.cries?.latest;
    if (cryUrl) {
      entry.cry = `audio/cries/${id}.ogg`;
      audioJobs.push({ url: cryUrl, dest: path.join(PUBLIC, entry.cry) });
    }
  }

  const publicPath = (abs) => path.relative(PUBLIC, abs).split(path.sep).join('/');
  let missing = 0;
  console.log(`Baixando ${spriteJobs.length} sprites de Pokémon...`);
  await mapLimit(spriteJobs, 10, async ({ entry, field, urls, destNoExt }) => {
    const dest = await downloadFirst(urls, destNoExt);
    if (!dest) return void missing++;
    entry.sprites[field] = publicPath(dest);
    if (field === 'front' || field === 'back') {
      const size = await imageSize(dest);
      if (size) (entry.spriteSize ??= {})[field] = size;
    }
  });
  console.log('Baixando ícones...');
  const sheetPath = path.join(CACHE_DIR, 'pokemonicons-sheet.png');
  await download(ICON_SHEET.url, sheetPath);
  await mapLimit(iconJobs, 10, async ({ entry, url }) => {
    const dest = path.join(SPRITE_OUT, 'pokemon', 'icon', `${entry.id}.png`);
    const ok = url ? await download(url, dest) : await cropIcon(sheetPath, entry.id, dest);
    if (ok) entry.sprites.icon = publicPath(dest);
    else missing++;
  });
  console.log(`Baixando ${audioJobs.length} gritos...`);
  await mapLimit(audioJobs, 10, async ({ url, dest }) => {
    if (!(await download(url, dest))) missing++;
  });

  // 5. Itens: básicos, interface, evoluções, recompensas, fósseis e berries.
  const itemNames = new Set([
    ...WORLD.EXTRA_ITEMS,
    ...UI_ITEMS,
    ...SPRITE_ONLY_ITEMS,
    ...SHOP_ITEMS,
    ...CAPTURE_ITEMS,
    ...evolutionItems,
  ]);
  for (const f of WORLD.FOSSILS) itemNames.add(f.item);
  for (const rt of routes) for (const it of Object.keys(rt.boss?.reward?.items ?? {})) itemNames.add(it);
  for (const e of WORLD.EXPEDITIONS) for (const rw of e.rewards) if (rw.item) itemNames.add(rw.item);
  for (const p of WORLD.GAME_CORNER_PRIZES) if (p.item) itemNames.add(p.item);
  console.log(`Baixando ${itemNames.size} itens...`);
  const items = {};
  await mapLimit([...itemNames], 8, async (name) => {
    const item = await getJson(`${API}/item/${name}`);
    if (await download(item.sprites.default, path.join(SPRITE_OUT, 'items', `${name}.png`))) {
      items[name] = { id: name, name: englishName(item.names, name), sprite: `sprites/items/${name}.png` };
    } else missing++;
  });
  // Ícone genérico das máquinas de ensino.
  const tmItem = await getJson(`${API}/item/tm01`);
  if (await download(tmItem.sprites.default, path.join(SPRITE_OUT, 'items', 'tm.png'))) {
    items.tm = { id: 'tm', name: 'TM', sprite: 'sprites/items/tm.png' };
  }

  // 6. Treinadores (estilo da geração de cada região), insígnias e fundos.
  const listingPath = path.join(CACHE_DIR, 'showdown-trainers.html');
  if (FRESH || !(await exists(listingPath))) {
    const res = await fetch(`${SHOWDOWN}/sprites/trainers/`);
    await writeFile(listingPath, await res.text());
  }
  const available = new Set(
    [...(await readFile(listingPath, 'utf8')).matchAll(/href="([^"]+)\.png"/g)].map((m) => m[1]),
  );
  const trainerFiles = { ...UI_TRAINERS };
  for (const reg of WORLD.REGIONS) {
    for (const rt of reg.routes) {
      if (!rt.boss) continue;
      const key = `${reg.id}-${rt.boss.trainer}`;
      trainerFiles[key] ??= [...reg.trainerSuffix.map((s) => `${rt.boss.trainer}${s}`), rt.boss.trainer];
    }
  }
  console.log(`Baixando ${Object.keys(trainerFiles).length} treinadores...`);
  const trainerMissing = [];
  await mapLimit(Object.entries(trainerFiles), 6, async ([key, candidates]) => {
    const file = candidates.find((c) => available.has(c));
    if (
      !file ||
      !(await download(
        `${SHOWDOWN}/sprites/trainers/${file}.png`,
        path.join(SPRITE_OUT, 'trainers', `${key}.png`),
      ))
    ) {
      trainerMissing.push(key);
    }
  });

  const badges = routes.filter((rt) => rt.boss?.badge).map((rt) => rt.boss.badge);
  await mapLimit(badges, 6, async (b) => {
    const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/${b.sprite}.png`;
    if (!(await download(url, path.join(SPRITE_OUT, 'badges', `${b.id}.png`)))) missing++;
  });
  await mapLimit(Object.entries(BACKGROUNDS), 4, async ([key, file]) => {
    if (!(await download(`${SHOWDOWN}/fx/${file}.png`, path.join(SPRITE_OUT, 'backgrounds', `${key}.png`))))
      missing++;
  });

  // 7. Mundo com ids numéricos.
  const team = (list) =>
    list.map(([s, level, form]) =>
      s.startsWith('$rival:')
        ? { rivalStage: Number(s.slice(7)), level }
        : { speciesId: idOf(s), level, ...(form ? { form } : {}) },
    );
  const withSpecies = (obj) => {
    if (!obj.species) return obj;
    const { species: slug, ...rest } = obj;
    return { ...rest, speciesId: idOf(slug) };
  };
  const world = {
    starters: WORLD.STARTERS.map((g) => ({
      generation: g.generation,
      region: g.region,
      ids: g.starters.map(idOf),
    })),
    regions: WORLD.REGIONS.map((reg) => ({
      id: reg.id,
      name: reg.name,
      routes: reg.routes.map((rt) => rt.id),
    })),
    routes: routes.map((rt) => ({
      id: rt.id,
      name: rt.name,
      region: rt.regionName,
      regionId: rt.regionId,
      description: rt.description,
      killsRequired: rt.kills,
      scene: rt.scene,
      map: rt.map,
      kind: rt.kind ?? 'wild',
      ...(rt.farm ? { farm: rt.farm } : {}),
      ...(rt.safari ? { safari: true } : {}),
      ...(rt.boost ? { boost: rt.boost } : {}),
      encounters: rt.encounters.map(([s, weight, minLevel, maxLevel, time]) => ({
        speciesId: idOf(s),
        weight,
        minLevel,
        maxLevel,
        ...(time ? { time } : {}),
      })),
      ...(rt.boss
        ? {
            boss: {
              name: rt.boss.name,
              title: rt.boss.title,
              trainer: `${rt.regionId}-${rt.boss.trainer}`,
              ...(rt.boss.badge ? { badge: { id: rt.boss.badge.id, name: rt.boss.badge.name } } : {}),
              team: team(rt.boss.team),
              reward: rt.boss.reward,
              ...(rt.boss.rival ? { rival: true } : {}),
              ...(rt.boss.champion ? { champion: true } : {}),
              ...(rt.boss.boost ? { boost: rt.boss.boost } : {}),
            },
          }
        : {}),
    })),
    roamers: WORLD.ROAMERS.map((x) => withSpecies(x)),
    fossils: WORLD.FOSSILS.map((f) => withSpecies(f)),
    tmPool: WORLD.TM_POOL.filter((m) => moves[m]),
    expeditions: WORLD.EXPEDITIONS.map((e) => ({ ...e, rewards: e.rewards.map(withSpecies) })),
    prizes: WORLD.GAME_CORNER_PRIZES.map(withSpecies),
  };

  // Validações: cada TM precisa existir e ter quem o aprenda; rotas selvagens precisam de encontros.
  const learners = (m) => species.filter((s) => s.tmMoves.includes(m)).length;
  for (const m of WORLD.TM_POOL) {
    if (!moves[m]) console.warn(`  aviso: TM ${m} não é um golpe de dano suportado`);
    else if (!learners(m)) console.warn(`  aviso: TM ${m} não tem nenhum Pokémon que o aprenda`);
  }
  for (const rt of routes) {
    const tm = rt.boss?.reward?.tm;
    if (tm && (!moves[tm] || !learners(tm)))
      console.warn(`  aviso: TM do chefe de ${rt.id} (${tm}) não é aprendível`);
    if ((rt.kind ?? 'wild') === 'wild' && !rt.encounters.length)
      throw new Error(`Rota sem encontros: ${rt.id}`);
  }

  const write = (file, data) => writeFile(path.join(DATA_OUT, file), JSON.stringify(data) + '\n');
  await write(
    'species.json',
    species.sort((a, b) => a.id - b.id),
  );
  await write('moves.json', moves);
  await write('type-chart.json', typeChart);
  await write('items.json', items);
  await write('world.json', world);

  console.log(
    `Pronto: ${species.length} espécies, ${Object.keys(moves).length} golpes, ${Object.keys(items).length} itens, ` +
      `${world.routes.length} rotas` +
      (missing ? ` · ${missing} arquivos indisponíveis` : '') +
      (trainerMissing.length ? ` · treinadores sem sprite: ${trainerMissing.join(', ')}` : ''),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
