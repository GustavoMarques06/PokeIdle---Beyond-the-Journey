// Cena do laboratório: cenário pintado, Prof. Carvalho, as três Poké Balls na mesa e o
// inicial escolhido em pé no tapete. Posições em pixels virtuais (ver lab.ts);
// tamanhos de sprite em múltiplos inteiros para manter os pixels nítidos.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { assetUrl, getItem, getSpecies, spriteFeet, trainerSprite } from '../../game-data';
import { PixelIcon } from '../components/common';
import { LAB, LAB_H, LAB_W, paintLab, ringUri, shadowUri } from './lab';

/** Pixels visíveis dentro dos sprites (medidos nos arquivos), para alinhar os pés ao chão. */
const OAK_FEET = 71;
const OAK_SIZE = 80;
const BALL_SIZE = 30;
const BALL_BOTTOM = 24;
const BALL_VISIBLE = 18;

export function LabScene({
  ids,
  chosen,
  onChoose,
}: {
  ids: readonly number[];
  chosen: number;
  onChoose: (id: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [u, setU] = useState(3.5);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setU(el.clientWidth / LAB_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintLab(ctx);
  }, []);

  const at = (v: number) => Math.round(v * u);
  const species = getSpecies(chosen);
  const [sw, sh] = species.spriteSize?.front ?? [40, 40];

  // Escalas inteiras: bola ≈ 15 u, Carvalho ≈ 46 u de largura, inicial limitado a ≈ 58 u de altura.
  const ballScale = Math.max(1, Math.round((15 * u) / BALL_VISIBLE));
  const oakScale = Math.max(1, Math.round((46 * u) / OAK_SIZE));
  const starterScale = Math.max(2, Math.min(Math.floor(u * 1.3), Math.floor((58 * u) / sh)));
  const starterW = sw * starterScale;
  const starterH = sh * starterScale;
  // Apoia o inicial pelos pés (não pelo centro da imagem) e dimensiona a sombra por eles.
  const [feetCx, feetW, feetBottom] = spriteFeet(chosen, 'front') ?? [sw / 2, sw * 0.7, sh, 0];
  const feetX = Math.min(0.72, Math.max(0.28, feetCx / sw)) * starterW;
  const shadowW = Math.max(at(26), Math.round(Math.min(sw * 0.9, feetW * 1.3) * starterScale));
  const shadowH = Math.round(shadowW * 0.2);

  return (
    <div className="lab-scene" ref={wrapRef} role="img" aria-label="Laboratório do Professor">
      <canvas ref={canvasRef} width={LAB_W} height={LAB_H} className="lab-canvas" />

      <div
        className="lab-sign frame frame-sign"
        style={{
          left: at(LAB.sign.x),
          top: at(LAB.sign.y),
          width: at(LAB.sign.w),
          height: at(LAB.sign.h),
        }}
      >
        <strong style={{ fontSize: Math.max(16, at(8.5)) }}>PokéIdle</strong>
        <small style={{ fontSize: Math.max(9, at(2.9)) }}>BEYOND THE JOURNEY</small>
      </div>

      {/* Prof. Carvalho */}
      <span
        className="lab-shadow"
        style={{
          backgroundImage: shadowUri(24, 5),
          left: at(LAB.oak.x) - at(14),
          top: at(LAB.oak.y) - at(1.5),
          width: at(28),
          height: at(5.5),
        }}
      />
      <img
        className="lab-oak"
        src={assetUrl(trainerSprite('oak'))}
        alt="Prof. Carvalho"
        draggable={false}
        style={{
          width: OAK_SIZE * oakScale,
          height: OAK_SIZE * oakScale,
          left: at(LAB.oak.x) - (OAK_SIZE * oakScale) / 2,
          top: at(LAB.oak.y) - OAK_FEET * oakScale,
        }}
      />

      {/* Inicial escolhido, em pé no tapete */}
      <span
        className="lab-shadow"
        style={{
          backgroundImage: shadowUri(30, 6),
          left: at(LAB.starter.x) - shadowW / 2,
          top: at(LAB.starter.y) - shadowH / 2,
          width: shadowW,
          height: shadowH,
        }}
      />
      <img
        key={chosen}
        className="lab-starter"
        src={assetUrl(species.sprites.front)}
        alt={species.name}
        draggable={false}
        style={{
          width: starterW,
          height: starterH,
          left: at(LAB.starter.x) - feetX,
          top: at(LAB.starter.y) - feetBottom * starterScale,
          ['--ps' as string]: `${starterScale}px`,
        }}
      />

      {/* Anel dourado no pedestal da bola escolhida */}
      {ids.map((id, i) =>
        id === chosen ? (
          <span
            key={`ring-${id}`}
            className="lab-ring"
            style={{
              backgroundImage: ringUri(28, 10),
              left: at(LAB.balls[i].x) - at(14),
              top: at(LAB.balls[i].y) - at(4),
              width: at(28),
              height: at(10),
            }}
          />
        ) : null,
      )}

      {/* Poké Balls na mesa */}
      {ids.map((id, i) => {
        const slot = LAB.balls[i];
        const size = BALL_SIZE * ballScale;
        const selected = id === chosen;
        return (
          <button
            key={id}
            className={`lab-ball ${selected ? 'selected' : ''}`}
            onClick={() => onChoose(id)}
            aria-pressed={selected}
            aria-label={getSpecies(id).name}
            title={getSpecies(id).name}
            style={{
              width: size,
              height: size,
              left: at(slot.x) - size / 2,
              top: at(slot.y) - BALL_BOTTOM * ballScale,
            }}
          >
            <img
              className="lab-ball-img"
              src={assetUrl(getItem('poke-ball')?.sprite)}
              alt=""
              draggable={false}
            />
            {selected && (
              <PixelIcon name="arrowDown" scale={Math.max(2, ballScale)} className="lab-pointer" />
            )}
          </button>
        );
      })}
    </div>
  );
}
