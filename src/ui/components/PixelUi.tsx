// Peças de interface em pixel art (CC0, OpenGameArt; ver art/ui-packs/LEIA.txt): balões animados, rostinhos em balão e
// troféus. Sempre ampliadas em múltiplos inteiros, para os pixels ficarem iguais.

import type { CSSProperties } from 'react';
import { assetUrl } from '../../game-data';

/** Linhas da folha de balões (cada uma tem 8 quadros de 16×16 que surgem e ficam no último). */
const BALLOON_ROW = { heart: 0, dots: 1, alert: 2, question: 3 } as const;
export type BalloonKind = keyof typeof BALLOON_ROW;

/** Balão de emoção que surge acima de alguém (para tocar de novo, troque a `key`). */
export function Balloon({ kind, scale = 2, className = '' }: { kind: BalloonKind; scale?: number; className?: string }) {
  return (
    <span
      className={`px-balloon ${className}`}
      style={
        {
          width: 16 * scale,
          height: 16 * scale,
          backgroundImage: `url(${assetUrl('sprites/ui/balloons.png')})`,
          backgroundSize: `${128 * scale}px ${64 * scale}px`,
          backgroundPositionY: `${-BALLOON_ROW[kind] * 16 * scale}px`,
          '--px-w': `${-112 * scale}px`,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}

export type EmoteMood = 'angry' | 'bored' | 'confused' | 'doh' | 'happy' | 'neutral' | 'sad' | 'veryhappy' | 'worried';

/** Rostinho num balão (humor de um personagem). */
export function Emote({ mood, scale = 2, className = '' }: { mood: EmoteMood; scale?: number; className?: string }) {
  return (
    <img
      className={`px-emote ${className}`}
      src={assetUrl(`sprites/ui/emote-${mood}.png`)}
      width={16 * scale}
      height={16 * scale}
      alt=""
      aria-hidden
      draggable={false}
    />
  );
}

export type AwardKind = 'cup' | 'medal';
export type Metal = 'gold' | 'silver' | 'bronze';

/** Taça ou medalha de ouro, prata ou bronze (ou roseta colorida). */
export function Award({
  kind,
  metal = 'gold',
  rosette,
  scale = 2,
  className = '',
  title,
}: {
  kind: AwardKind | 'rosette';
  metal?: Metal;
  rosette?: 'red' | 'blue' | 'green' | 'yellow';
  scale?: number;
  className?: string;
  title?: string;
}) {
  const file = kind === 'rosette' ? `award-rosette-${rosette ?? 'red'}` : `award-${kind}-${metal}`;
  return (
    <img
      className={`px-award ${className}`}
      src={assetUrl(`sprites/ui/${file}.png`)}
      width={16 * scale}
      height={16 * scale}
      alt={title ?? ''}
      title={title}
      draggable={false}
    />
  );
}
