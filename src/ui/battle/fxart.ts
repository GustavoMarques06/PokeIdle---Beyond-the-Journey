// Efeitos de golpe (um por tipo) e de status (em loop) em pixel art, de dois pacotes CC0: PVFX Foundry (nerijs) e Pixel
// Magic Effects (Foozle). As folhas ficam em public/sprites/fx e os dados em generated/fx-art.json
// (scripts/build-fx.py). Aço, veneno, inseto e dragão não têm efeito próprio nos pacotes: usam um parecido, recolorido.

import fxJson from '../../game-data/generated/fx-art.json';

export interface FxArt {
  name: string;
  /** Tamanho de um quadro recortado e quantidade de quadros. */
  w: number;
  h: number;
  n: number;
  /** Duração de uma volta (ms, na velocidade normal). */
  ms: number;
  /** Ponto de impacto dentro do quadro. */
  ax: number;
  ay: number;
  /** Onde ancora no Pokémon: centro do corpo, pés ou cabeça. */
  at: 'body' | 'floor' | 'head';
  /** Tamanho de 1 pixel do efeito em pixels virtuais da cena. */
  k: number;
  loop: boolean;
  /** Golpe forte sem versão própria: toca maior. */
  boost?: boolean;
}

const DATA = fxJson as unknown as {
  types: Record<string, { src: string; big?: string }>;
  status: Record<string, string>;
  activity?: Record<string, string>;
  shots?: Record<string, string>;
  sheets: Record<string, Omit<FxArt, 'name' | 'boost'>>;
};

const get = (name: string): FxArt | undefined =>
  DATA.sheets[name] ? { name, ...DATA.sheets[name] } : undefined;

/** O efeito do tipo de golpe, se houver (super efetivo e crítico usam o forte, ou o normal ampliado). */
export function impactArt(type: string, big: boolean): FxArt | undefined {
  const t = DATA.types[type];
  if (!t) return undefined;
  const art = get((big && t.big) || t.src);
  return art && big && !t.big ? { ...art, boost: true } : art;
}

/** Energia de golpe especial (PVFX): sai do atacante e vai até o alvo. `len` = o quanto o desenho percorre. */
export type ShotArt = FxArt & { len: number };

export const shotArt = (type: string): ShotArt | undefined =>
  DATA.shots?.[type] ? (get(DATA.shots[type]) as ShotArt | undefined) : undefined;

/** O efeito em loop de um status (sono, paralisia, queimadura, congelamento, veneno). */
export const statusArt = (kind: string): FxArt | undefined =>
  DATA.status[kind] ? get(DATA.status[kind]) : undefined;

/** Efeitos das atividades (fora da batalha): escudo, carga, fogos, moedas, brilhos, corações, colheita… */
export type ActivityFx =
  | 'shield'
  | 'shatter'
  | 'charge'
  | 'portal'
  | 'circle'
  | 'firework'
  | 'coins'
  | 'stars'
  | 'glint'
  | 'dust'
  | 'resurrect'
  | 'hearts'
  | 'heart'
  | 'bloom'
  | 'spore'
  | 'splash'
  | 'levelup';

export const activityArt = (key: ActivityFx): FxArt | undefined =>
  DATA.activity?.[key] ? get(DATA.activity[key]) : undefined;

/** Quanto tempo o efeito fica na tela, na velocidade escolhida. */
export const artMs = (art: FxArt, speed: number) => Math.round(art.ms / speed) + 80;
