// Efeitos da cena de batalha: impacto por tipo de golpe (partículas em pixel art, descritas por
// tabela), brilho de shiny e a entrada com Poké Ball. Tudo em CSS (ver styles/effects.css).
// Para trocar o efeito de um tipo por arte desenhada, coloque public/sprites/fx/<tipo>.png
// (folha de 6 quadros de 64×64 lado a lado) e acrescente o tipo em FX_ART.

import type { CSSProperties } from 'react';
import { assetUrl } from '../../game-data';
import { ItemIcon, PixelIcon } from '../components/common';

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

/** Tipos que já têm arte própria em public/sprites/fx/<tipo>.png. */
const FX_ART = new Set<string>([]);

/** Números estáveis por id (o mesmo golpe desenha sempre igual; render puro). */
function seeded(id: number) {
  let h = (id * 2654435761) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return h / 4294967296;
  };
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
  if (FX_ART.has(type)) {
    return (
      <span
        className={`fx fx-art ${big ? 'big' : ''}`}
        style={{ ...pos, backgroundImage: `url(${assetUrl(`sprites/fx/${type}.png`)})` }}
        aria-hidden
      />
    );
  }
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
