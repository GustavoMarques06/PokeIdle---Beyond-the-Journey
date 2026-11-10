// Escavação (no Laboratório de fósseis): uma parede de rocha com tesouros escondidos. A picareta quebra fundo no
// centro de uma cruz pequena; o martelo quebra uma área 3×3, mas abala mais a parede. Cada golpe tira estabilidade e, quando ela acaba,
// a parede desaba: só os tesouros totalmente descobertos vêm junto. Três escavações grátis por dia; depois, pagas.
// A parede (profundidade de cada bloco e onde estão os tesouros) é sorteada com uma semente e fica salva, então
// recarregar o jogo não muda nada.

import { FOSSILS, getItem } from '../game-data';
import { activityUnlocked } from './collection';
import type { GameEvent, GameState } from './game';
import { localDay } from './missions';
import { pickWeighted, rngFrom, seededRng, type Rng } from './rng';
import { UNOWN_TABLET, giveUnown } from './unown';

export const DIG_W = 12;
export const DIG_H = 8;
export const FREE_DIGS = 3;
export const DIG_COST = 8000;
const MAX_DEPTH = 3;
/** Chance de a parede esconder uma tabuleta das Ruínas de Alph. */
const TABLET_CHANCE = 0.3;

export type DigTool = 'pick' | 'hammer';

export interface DigTreasure {
  item: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DigRun {
  seed: number;
  /** Profundidade de cada bloco (0 = descoberto), linha a linha. */
  depth: number[];
  treasures: DigTreasure[];
  /** 100 = firme; 0 = desaba. */
  stability: number;
  hits: number;
}

export interface DigState {
  day: number;
  used: number;
  run: DigRun | null;
  /** Total achado de cada item, para o recorde. */
  found: Record<string, number>;
  digs: number;
}

/** Tesouros possíveis: tamanho e peso no sorteio. Fósseis são grandes e mais raros. */
const POOL: { item: string; w: number; h: number; weight: number }[] = [
  ...FOSSILS.map((f) => ({ item: f.item, w: 3, h: 3, weight: 3 })),
  ...['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone'].map((item) => ({
    item,
    w: 2,
    h: 2,
    weight: 6,
  })),
  ...['sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'ice-stone'].map((item) => ({
    item,
    w: 2,
    h: 2,
    weight: 3,
  })),
  { item: 'oval-stone', w: 2, h: 2, weight: 4 },
  { item: 'everstone', w: 2, h: 2, weight: 5 },
  { item: 'hard-stone', w: 2, h: 2, weight: 5 },
  { item: 'nugget', w: 1, h: 1, weight: 10 },
  { item: 'star-piece', w: 1, h: 1, weight: 8 },
];

export function digState(state: GameState): DigState {
  return (state.dig ??= { day: 0, used: 0, run: null, found: {}, digs: 0 });
}

export function digUnlocked(state: GameState): boolean {
  return activityUnlocked(state, 'fossils');
}

/** Escavações grátis que sobram hoje. */
export function freeDigsLeft(state: GameState, now: number): number {
  const d = digState(state);
  return d.day === localDay(now) ? Math.max(0, FREE_DIGS - d.used) : FREE_DIGS;
}

function makeRun(seed: number): DigRun {
  const rng = seededRng(seed);
  // Profundidade em "manchas": um ruído simples somado aos vizinhos dá camadas que parecem rocha de verdade.
  const raw = Array.from({ length: DIG_W * DIG_H }, () => rng.next());
  const depth = raw.map((_, i) => {
    const x = i % DIG_W;
    const y = Math.floor(i / DIG_W);
    let sum = 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < DIG_W && yy < DIG_H) {
          sum += raw[yy * DIG_W + xx];
          n++;
        }
      }
    return 1 + Math.min(MAX_DEPTH - 1, Math.floor((sum / n) * MAX_DEPTH * 1.15));
  });
  const treasures: DigTreasure[] = [];
  const taken = new Set<number>();
  const pool = POOL.filter((t) => getItem(t.item));
  const count = 2 + Math.floor(rng.next() * 3);
  for (let k = 0, tries = 0; k < count && tries < 60; tries++) {
    const t = pickWeighted(rng, pool);
    const x = Math.floor(rng.next() * (DIG_W - t.w + 1));
    const y = Math.floor(rng.next() * (DIG_H - t.h + 1));
    const cells: number[] = [];
    for (let yy = y; yy < y + t.h; yy++) for (let xx = x; xx < x + t.w; xx++) cells.push(yy * DIG_W + xx);
    if (cells.some((c) => taken.has(c))) continue;
    cells.forEach((c) => taken.add(c));
    treasures.push({ item: t.item, x, y, w: t.w, h: t.h });
    k++;
  }
  // Às vezes a parede esconde uma tabuleta das Ruínas de Alph (vira um Unown). Entra por último na lista, depois
  // de todos os outros sorteios, para as paredes antigas saírem iguais.
  if (rng.next() < TABLET_CHANCE) {
    for (let tries = 0; tries < 30; tries++) {
      const x = Math.floor(rng.next() * (DIG_W - 1));
      const y = Math.floor(rng.next() * (DIG_H - 1));
      const cells = [y * DIG_W + x, y * DIG_W + x + 1, (y + 1) * DIG_W + x, (y + 1) * DIG_W + x + 1];
      if (cells.some((c) => taken.has(c))) continue;
      treasures.push({ item: UNOWN_TABLET, x, y, w: 2, h: 2 });
      break;
    }
  }
  return { seed, depth, treasures, stability: 100, hits: 0 };
}

/** Começa uma escavação (grátis enquanto houver; depois custa moedas). */
export function startDig(state: GameState, now: number, rng: Rng = rngFrom(state)): boolean {
  const d = digState(state);
  if (!digUnlocked(state) || d.run) return false;
  const today = localDay(now);
  if (d.day !== today) {
    d.day = today;
    d.used = 0;
  }
  if (d.used >= FREE_DIGS) {
    if (state.coins < DIG_COST) return false;
    state.coins -= DIG_COST;
  } else d.used++;
  d.run = makeRun((rng.next() * 2 ** 32) | 0);
  return true;
}

/** Blocos que o golpe atinge e quanto cava em cada um. */
export function hitArea(tool: DigTool, x: number, y: number): { x: number; y: number; dig: number }[] {
  const cells =
    tool === 'pick'
      ? [
          { x, y, dig: 2 },
          { x: x - 1, y, dig: 1 },
          { x: x + 1, y, dig: 1 },
          { x, y: y - 1, dig: 1 },
          { x, y: y + 1, dig: 1 },
        ]
      : [-1, 0, 1].flatMap((dy) =>
          [-1, 0, 1].map((dx) => ({ x: x + dx, y: y + dy, dig: dx === 0 && dy === 0 ? 2 : 1 })),
        );
  return cells.filter((c) => c.x >= 0 && c.y >= 0 && c.x < DIG_W && c.y < DIG_H);
}

/** Um golpe na parede. Devolve os eventos (o fim da escavação, se desabar). */
export function digHit(state: GameState, x: number, y: number, tool: DigTool): GameEvent[] {
  const run = digState(state).run;
  if (!run || run.stability <= 0) return [];
  for (const c of hitArea(tool, x, y)) {
    const i = c.y * DIG_W + c.x;
    run.depth[i] = Math.max(0, run.depth[i] - c.dig);
  }
  run.hits++;
  const rng = rngFrom(state);
  run.stability = Math.max(
    0,
    run.stability - (tool === 'pick' ? 3 + Math.floor(rng.next() * 3) : 7 + Math.floor(rng.next() * 3)),
  );
  return run.stability <= 0 ? finishDig(state, true) : [];
}

export function treasureUncovered(run: DigRun, t: DigTreasure): boolean {
  for (let yy = t.y; yy < t.y + t.h; yy++)
    for (let xx = t.x; xx < t.x + t.w; xx++) if (run.depth[yy * DIG_W + xx] > 0) return false;
  return true;
}

/** Termina (ou a parede desabou): leva os tesouros totalmente descobertos. */
export function finishDig(state: GameState, collapsed = false): GameEvent[] {
  const d = digState(state);
  const run = d.run;
  if (!run) return [];
  const uncovered = run.treasures.filter((t) => treasureUncovered(run, t));
  const items = uncovered.filter((t) => t.item !== UNOWN_TABLET).map((t) => t.item);
  for (const item of items) {
    state.items[item] = (state.items[item] ?? 0) + 1;
    d.found[item] = (d.found[item] ?? 0) + 1;
  }
  // Cada tabuleta inteira vira um Unown de uma letra que ainda falta.
  const unown: string[] = [];
  for (let i = items.length; i < uncovered.length; i++) {
    unown.push(giveUnown(state, state.lastTimerAt, 'Tabuleta da Escavação').form ?? 'a');
  }
  d.digs++;
  d.run = null;
  return [
    {
      type: 'digDone',
      items,
      missed: run.treasures.length - uncovered.length,
      collapsed,
      ...(unown.length ? { unown } : {}),
    },
  ];
}
