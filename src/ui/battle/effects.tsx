// Efeitos da cena de batalha: impacto por tipo de golpe (partículas em pixel art, descritas por
// tabela), brilho de shiny e a entrada com Poké Ball. Tudo em CSS (ver styles/effects.css).
// Os tipos com arte desenhada (fxart.ts, public/sprites/fx) usam ArtFx; os outros, as partículas daqui.

import type { CSSProperties } from 'react';
import { assetUrl } from '../../game-data';
import { ItemIcon, PixelIcon } from '../components/common';
import type { FxArt } from './fxart';

type Motion = 'burst' | 'rise' | 'fall' | 'ring' | 'slash' | 'spin' | 'bolt';
type Shape = 'square' | 'circle' | 'ring' | 'bar' | 'diamond';

interface FxDef {
  motion: Motion;
  shape: Shape;
  colors: string[];
  count: number;
  /** Tamanho base das partículas (pixels virtuais). */
  size: number;
}

const FX: Record<string, FxDef> = {
  normal: { motion: 'burst', shape: 'diamond', colors: ['#ffffff', '#f0f0c8'], count: 6, size: 4 },
  fire: { motion: 'rise', shape: 'square', colors: ['#f8e048', '#f89030', '#e04020'], count: 11, size: 4 },
  water: { motion: 'burst', shape: 'circle', colors: ['#c8e8ff', '#58a8f8', '#2868c8'], count: 11, size: 4 },
  electric: { motion: 'bolt', shape: 'bar', colors: ['#fff8a0', '#f8e030'], count: 6, size: 3 },
  grass: { motion: 'spin', shape: 'diamond', colors: ['#a8e070', '#58b048', '#307830'], count: 9, size: 5 },
  ice: { motion: 'fall', shape: 'diamond', colors: ['#ffffff', '#c8f8ff', '#80d8f0'], count: 9, size: 4 },
  fighting: { motion: 'burst', shape: 'square', colors: ['#f8c080', '#e06040'], count: 8, size: 6 },
  poison: { motion: 'rise', shape: 'circle', colors: ['#e0a0f0', '#a040c0', '#702890'], count: 9, size: 5 },
  ground: { motion: 'rise', shape: 'square', colors: ['#e0c080', '#a07838', '#705028'], count: 12, size: 5 },
  flying: { motion: 'slash', shape: 'bar', colors: ['#ffffff', '#c8d8f8'], count: 4, size: 3 },
  psychic: { motion: 'ring', shape: 'ring', colors: ['#f870a8', '#f8a8d0', '#c060f0'], count: 3, size: 10 },
  bug: { motion: 'burst', shape: 'square', colors: ['#c8e040', '#789020'], count: 13, size: 3 },
  rock: { motion: 'fall', shape: 'square', colors: ['#c8a858', '#8a6a38', '#5c4424'], count: 7, size: 7 },
  ghost: { motion: 'rise', shape: 'circle', colors: ['#a890e0', '#605098', '#302850'], count: 7, size: 7 },
  dragon: { motion: 'spin', shape: 'diamond', colors: ['#8068f8', '#40a0f8', '#f8d050'], count: 10, size: 5 },
  dark: { motion: 'slash', shape: 'bar', colors: ['#302030', '#806878'], count: 3, size: 4 },
  steel: { motion: 'slash', shape: 'bar', colors: ['#ffffff', '#b8c0d8', '#8890a8'], count: 3, size: 4 },
  fairy: { motion: 'spin', shape: 'diamond', colors: ['#ffd0e8', '#f8a8d8', '#ffffff'], count: 11, size: 4 },
};

/** Números estáveis por id (o mesmo golpe desenha sempre igual; render puro). */
function seeded(id: number) {
  let h = (id * 2654435761) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return h / 4294967296;
  };
}

/** Animação desenhada: toca uma tira de quadros com o ponto de impacto em (x, y), em pixels virtuais da cena. */
export function ArtFx({
  art,
  x,
  y,
  speed,
  flip = false,
  low = false,
}: {
  art: FxArt;
  x: number;
  y: number;
  speed: number;
  /** Espelha (golpe que acerta o Pokémon do jogador, que olha para o outro lado). */
  flip?: boolean;
  /** Fica por baixo das caixas de status (efeitos que duram enquanto o status durar). */
  low?: boolean;
}) {
  const k = art.k * (art.boost ? 1.3 : 1);
  const u = (v: number) => `calc(var(--u) * ${v})`;
  return (
    <span
      className={`fx-art ${art.loop ? 'loop' : ''} ${low ? 'low' : ''}`}
      style={{
        left: u(x),
        top: u(y),
        width: u(art.w * k),
        height: u(art.h * k),
        marginLeft: u(-art.ax * k),
        marginTop: u(-art.ay * k),
        transformOrigin: `${u(art.ax * k)} ${u(art.ay * k)}`,
        transform: flip ? 'scaleX(-1)' : undefined,
        backgroundImage: `url(${assetUrl(`sprites/fx/${art.name}.png`)})`,
        ['--n' as string]: art.n,
        ['--fx-ms' as string]: `${Math.round(art.ms / speed)}ms`,
      }}
      aria-hidden
    />
  );
}

/** Impacto de um golpe no alvo: (x, y) é o centro do alvo, em pixels virtuais. */
export function MoveFx({
  id,
  type,
  x,
  y,
  big,
  speed,
}: {
  id: number;
  type: string;
  x: number;
  y: number;
  big: boolean;
  speed: number;
}) {
  const pos: CSSProperties = {
    left: `calc(var(--u) * ${x})`,
    top: `calc(var(--u) * ${y})`,
    ['--fx-ms' as string]: `${Math.round(520 / speed)}ms`,
  };
  const def = FX[type] ?? FX.normal;
  const rand = seeded(id);
  const count = big ? Math.round(def.count * 1.5) : def.count;
  return (
    <span className={`fx fx-${def.motion} ${big ? 'big' : ''}`} style={pos} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + rand() * 0.8;
        const dist = (big ? 26 : 19) + rand() * 12;
        // Tamanho em pixels virtuais da cena (256 de largura): ~1,6× o valor da tabela.
        const size = def.size * 1.6 * (0.7 + rand() * 0.6) * (big ? 1.3 : 1);
        const style = {
          ['--dx' as string]: `calc(var(--u) * ${Math.cos(angle) * dist})`,
          ['--dy' as string]: `calc(var(--u) * ${Math.sin(angle) * dist})`,
          ['--x0' as string]: `calc(var(--u) * ${(rand() - 0.5) * 26})`,
          ['--rot' as string]: `${Math.round(rand() * 360)}deg`,
          ['--delay' as string]: `${Math.round(rand() * 120)}ms`,
          ['--c' as string]: def.colors[i % def.colors.length],
          ['--s' as string]: `calc(var(--u) * ${size})`,
        } as CSSProperties;
        return <i key={i} className={`fx-p fx-shape-${def.shape}`} style={style} />;
      })}
    </span>
  );
}

/** Estrelinhas girando em volta de um shiny que acabou de aparecer. */
export function ShinySparkle({ x, y }: { x: number; y: number }) {
  return (
    <span
      className="fx-shiny"
      style={{ left: `calc(var(--u) * ${x})`, top: `calc(var(--u) * ${y})` }}
      aria-hidden
    >
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} style={{ ['--a' as string]: `${i * 60}deg`, ['--delay' as string]: `${i * 70}ms` }}>
          <PixelIcon name="spark" scale={1} palette={{ c: '#fff8a0' }} />
        </i>
      ))}
    </span>
  );
}

/** Poké Ball que abre com um clarão onde o Pokémon vai aparecer. */
export function SendOutBall({ x, y, ball = 'poke-ball' }: { x: number; y: number; ball?: string }) {
  return (
    <span
      className="fx-sendout"
      style={{ left: `calc(var(--u) * ${x})`, top: `calc(var(--u) * ${y})` }}
      aria-hidden
    >
      <span className="fx-sendout-ball">
        <ItemIcon id={ball} size={24} />
      </span>
      <span className="fx-sendout-flash" />
    </span>
  );
}

const GRASSY = new Set(['meadow', 'route', 'forest', 'plains', 'jungle', 'swamp']);
const WATERY = new Set(['river', 'beach', 'sea', 'swamp']);
const ROCKY = new Set(['cave', 'icecave', 'dampcave', 'ruins', 'mountain']);

/**
 * Cenário vivo: nuvens andando no céu aberto, a grama da frente balançando, reflexos correndo na água, poeira e gotas
 * nas cavernas e brasas no vulcão. Fica por cima do fundo e por baixo dos Pokémon (a grama, na frente dos pés).
 */
export function SceneLife({ scene, night, open, weather }: { scene: string; night: boolean; open: boolean; weather: string }) {
  const clouds = open && !night && (weather === 'clear' || weather === 'sun');
  const many = (n: number) => Array.from({ length: n }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />);
  return (
    <span className={`scene-life life-${scene}`} aria-hidden>
      {clouds && (
        <span className="life-clouds">
          <i className="c1" />
          <i className="c2" />
          <i className="c3" />
        </span>
      )}
      {WATERY.has(scene) && <span className="life-water">{many(6)}</span>}
      {ROCKY.has(scene) && !open && <span className="life-motes">{many(8)}</span>}
      {ROCKY.has(scene) && !open && <span className="life-drips">{many(3)}</span>}
      {scene === 'volcano' && <span className="life-embers">{many(8)}</span>}
      {GRASSY.has(scene) && <span className="life-grass" />}
    </span>
  );
}

/** Ambiente de céu limpo, só enfeite: depende do lugar e da hora (folhas na mata, vaga-lumes à noite, aurora no gelo). */
const AMBIENT: Record<string, { day?: string; night?: string }> = {
  forest: { day: 'leaves', night: 'fireflies' },
  meadow: { day: 'blossoms', night: 'fireflies' },
  route: { day: 'leaves', night: 'stars' },
  plains: { night: 'stars' },
  river: { night: 'fireflies' },
  swamp: { night: 'fireflies' },
  ruins: { night: 'stars' },
  beach: { night: 'stars' },
  desert: { night: 'stars' },
  mountain: { night: 'aurora' },
  snowfield: { night: 'aurora' },
};

export function ambientFor(scene: string, night: boolean): string | undefined {
  const a = AMBIENT[scene];
  return night ? a?.night : a?.day;
}

/**
 * Clima sobre a cena. Chuva, neve (o granizo) e tempestade (a chuva à noite) são animações de pixel art do pixelfx
 * (public/sprites/weather, scripts/build-weather.py); areia, névoa e sol são desenhados em CSS.
 */
export function WeatherLayer({ weather, night, scene }: { weather: string; night: boolean; scene: string }) {
  const anim =
    weather === 'rain'
      ? night
        ? 'storm'
        : 'rain'
      : weather === 'hail'
        ? 'snow'
        : weather === 'clear'
          ? ambientFor(scene, night)
          : undefined;
  if (anim) {
    return (
      <img
        className="scene-weather-anim"
        src={assetUrl(`sprites/weather/${anim}.webp`)}
        alt=""
        aria-hidden
        draggable={false}
      />
    );
  }
  if (weather === 'sand') {
    return (
      <span className="scene-sandstorm" aria-hidden>
        <i className="sand-haze" />
        {Array.from({ length: 3 }, (_, k) => (
          <i key={k} className={`sand-layer l${k}`} />
        ))}
      </span>
    );
  }
  if (weather === 'fog') {
    return (
      <span className="scene-fog" aria-hidden>
        {Array.from({ length: 3 }, (_, k) => (
          <i key={k} className={`fog-band b${k}`} />
        ))}
      </span>
    );
  }
  if (weather === 'sun') return <span className="scene-sun" aria-hidden />;
  return null;
}
