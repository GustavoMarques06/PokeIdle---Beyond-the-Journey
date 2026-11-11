// Um efeito de pixel art do PVFX fora da batalha (atividades): toca uma vez (ou em loop, nos que são de loop) no
// ponto (x, y) do elemento pai, que precisa ter `position: relative`. Para tocar de novo, troque a `key`.

import type { CSSProperties } from 'react';
import { assetUrl } from '../../game-data';
import { activityArt, type ActivityFx } from '../battle/fxart';

export function PixelFx({
  fx,
  scale = 2,
  x = '50%',
  y = '50%',
  speed = 1,
  pivot = false,
  className = '',
}: {
  fx: ActivityFx;
  /** Pixels de tela por pixel do efeito (inteiro, para não borrar). */
  scale?: number;
  /** Onde fica o centro do efeito (ou o pivô dele, com `pivot`), em CSS (% ou px). */
  x?: string;
  y?: string;
  speed?: number;
  pivot?: boolean;
  className?: string;
}) {
  const art = activityArt(fx);
  if (!art) return null;
  const ax = pivot ? art.ax : art.w / 2;
  const ay = pivot ? art.ay : art.h / 2;
  return (
    <span
      className={`fx-art pixel-fx ${art.loop ? 'loop' : ''} ${className}`}
      style={
        {
          left: x,
          top: y,
          width: art.w * scale,
          height: art.h * scale,
          marginLeft: -ax * scale,
          marginTop: -ay * scale,
          backgroundImage: `url(${assetUrl(`sprites/fx/${art.name}.png`)})`,
          '--n': art.n,
          '--fx-ms': `${Math.round(art.ms / speed)}ms`,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}
