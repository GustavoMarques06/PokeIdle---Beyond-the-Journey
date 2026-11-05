// Cena do laboratório: cenário pintado, Prof. Carvalho, as três Poké Bolas da região na
// mesa e, quando uma é aberta, o inicial em pé no tapete. A placa da parede mostra a região,
// com setas para trocar. Posições em pixels virtuais (ver lab.ts); tamanhos de sprite em
// múltiplos inteiros para manter os pixels nítidos.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { assetUrl, getItem, getSpecies, spriteFeet, trainerSprite } from '../../game-data';
import { PixelIcon } from '../components/common';
import { LAB, LAB_W, paintLab, ringUri, shadowUri } from './lab';

/** Pixels visíveis dentro dos sprites (medidos nos arquivos), para alinhar os pés ao chão. */
const OAK_FEET = 71;
const OAK_SIZE = 80;
/** Altura do desenho do Carvalho dentro do sprite (linhas 8 a 71). */
const OAK_DRAWN = 63;
const BALL_SIZE = 30;
const BALL_BOTTOM = 24;
const BALL_VISIBLE = 18;
/** Onde o rival para, à direita do tapete (pixels virtuais). */
const RIVAL_X = 196;
const RIVAL_FEET = 124;

export function LabScene({
  ids,
  region,
  numeral,
  focus,
  opened,
  taken = null,
  rivalSprite = null,
  onFocus,
  onPick,
  onPrevRegion,
  onNextRegion,
}: {
  ids: readonly number[];
  region: string;
  numeral: string;
  /** Bola com o cursor (0–2). */
  focus: number;
  /** Inicial que saiu da bola (ou null, com as três ainda fechadas). */
  opened: number | null;
  /** Inicial que o rival levou (a bola some da mesa). */
  taken?: number | null;
  /** Rival da região, que entra pela direita quando leva a bola dele. */
  rivalSprite?: string | null;
  onFocus: (index: number) => void;
  onPick: (index: number) => void;
  onPrevRegion: () => void;
  onNextRegion: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [u, setU] = useState(3.5);
  // Ao dizer NÃO, o inicial volta para a bola antes de sumir.
  const [leaving, setLeaving] = useState<number | null>(null);
  const [prevOpened, setPrevOpened] = useState(opened);
  if (opened !== prevOpened) {
    setPrevOpened(opened);
    setLeaving(opened === null && prevOpened !== null && taken !== prevOpened ? prevOpened : null);
  }
  useEffect(() => {
    if (leaving === null) return;
    const t = setTimeout(() => setLeaving(null), 750);
    return () => clearTimeout(t);
  }, [leaving]);

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

  // Escalas inteiras: bola ≈ 19 u, Carvalho ≈ 58 u de largura.
  const ballScale = Math.max(1, Math.round((19 * u) / BALL_VISIBLE));
  const oakScale = Math.max(1, Math.round((58 * u) / OAK_SIZE));

  return (
    <div className="lab-scene" ref={wrapRef} role="group" aria-label={`Laboratório: Poké Bolas de ${region}`}>
      <canvas ref={canvasRef} width={LAB_W} height={160} className="lab-canvas" />

      {/* Placa da região, com setas para trocar */}
      <div
        className="lab-sign frame frame-sign"
        style={{
          left: at(LAB.sign.x),
          top: at(LAB.sign.y),
          width: at(LAB.sign.w),
          height: at(LAB.sign.h),
        }}
      >
        <small style={{ fontSize: Math.max(9, at(3)) }}>REGIÃO {numeral}</small>
        <strong style={{ fontSize: Math.max(16, at(8)) }}>{region}</strong>
      </div>
      {(
        [
          ['prev', onPrevRegion, LAB.sign.x - 9, 'Região anterior'],
          ['next', onNextRegion, LAB.sign.x + LAB.sign.w + 1, 'Próxima região'],
        ] as const
      ).map(([dir, fn, x, label]) => (
        <button
          key={dir}
          className={`lab-arrow ${dir}`}
          onClick={fn}
          aria-label={label}
          title={label}
          style={{ left: at(x), top: at(LAB.sign.y + 5), width: at(8), height: at(12) }}
        >
          <PixelIcon name="cursor" scale={Math.max(2, Math.round(u * 0.9))} />
        </button>
      ))}

      {/* Prof. Carvalho */}
      <span
        className="lab-shadow"
        style={{
          backgroundImage: shadowUri(24, 5),
          left: at(LAB.oak.x) - at(17),
          top: at(LAB.oak.y) - at(1.5),
          width: at(34),
          height: at(6),
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

      {(opened ?? leaving) !== null && (
        <OpenedStarter
          id={(opened ?? leaving)!}
          ball={LAB.balls[Math.max(0, ids.indexOf((opened ?? leaving)!))]}
          leaving={opened === null}
          at={at}
          oakScale={oakScale}
        />
      )}

      {/* Rival da região, entrando pela direita com a bola que levou */}
      {rivalSprite && (
        <>
          <span
            className="lab-shadow"
            style={{
              backgroundImage: shadowUri(24, 5),
              left: at(RIVAL_X) - at(17),
              top: at(RIVAL_FEET) - at(1.5),
              width: at(34),
              height: at(6),
            }}
          />
          <img
            className="lab-rival"
            src={assetUrl(trainerSprite(rivalSprite))}
            alt="Rival"
            draggable={false}
            style={{
              width: OAK_SIZE * oakScale,
              height: OAK_SIZE * oakScale,
              left: at(RIVAL_X) - (OAK_SIZE * oakScale) / 2,
              top: at(RIVAL_FEET) - OAK_FEET * oakScale,
            }}
          />
        </>
      )}

      {/* Anel dourado no pedestal com o cursor */}
      {opened === null && (
        <span
          className="lab-ring"
          style={{
            backgroundImage: ringUri(28, 10),
            left: at(LAB.balls[focus].x) - at(14),
            top: at(LAB.balls[focus].y) - at(4),
            width: at(28),
            height: at(10),
          }}
        />
      )}

      {/* Poké Bolas na mesa */}
      {ids.map((id, i) => {
        const slot = LAB.balls[i];
        const size = BALL_SIZE * ballScale;
        const focused = i === focus && opened === null;
        const isOpen = opened === id;
        if (taken === id) return null;
        return (
          <button
            key={id}
            className={`lab-ball ${focused ? 'selected' : ''} ${isOpen ? 'opened' : ''} ${leaving === id ? 'closing' : ''}`}
            onClick={() => onPick(i)}
            onMouseEnter={() => opened === null && onFocus(i)}
            onFocus={() => opened === null && onFocus(i)}
            disabled={opened !== null}
            aria-label={`Poké Bola ${i + 1}: ${getSpecies(id).name}`}
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
            {focused && <PixelIcon name="arrowDown" scale={Math.max(2, ballScale)} className="lab-pointer" />}
          </button>
        );
      })}
    </div>
  );
}

/** O inicial no tapete: sai da bola num clarão e salta até lá; ao dizer NÃO, encolhe e volta para a bola. */
function OpenedStarter({
  id,
  ball,
  leaving,
  at,
  oakScale,
}: {
  id: number;
  ball: { x: number; y: number };
  leaving: boolean;
  at: (v: number) => number;
  oakScale: number;
}) {
  const species = getSpecies(id);
  const [sw, sh] = species.spriteSize?.front ?? [40, 40];
  const [feetCx, feetW, feetBottom, feetTop] = spriteFeet(id, 'front') ?? [sw / 2, sw * 0.7, sh, 0];
  // Proporção com o professor: o inicial é bem menor que ele (no máximo ~2/3 da altura dele, e quase sempre
  // menos). Escala fracionária: o sprite continua em pixels nítidos.
  const drawn = Math.max(1, feetBottom - feetTop);
  const scale = Math.max(1.4, Math.min(oakScale * 0.62, (OAK_DRAWN * oakScale * 0.68) / drawn));
  const w = sw * scale;
  const h = sh * scale;
  const feetX = Math.min(0.72, Math.max(0.28, feetCx / sw)) * w;
  const shadowW = Math.max(at(20), Math.round(Math.min(sw * 0.9, feetW * 1.3) * scale));
  const shadowH = Math.round(shadowW * 0.2);
  // Deslocamento da bola (na mesa) até o ponto onde ele fica, e a metade do caminho, mais alta (arco do salto).
  const dx = at(ball.x - LAB.starter.x);
  const dy = at(ball.y - 10 - LAB.starter.y);
  return (
    <>
      {!leaving && (
        <span className="lab-burst" style={{ left: at(ball.x), top: at(ball.y - 12) }} key={`b-${id}`} />
      )}
      <span
        className={`lab-shadow ${leaving ? 'leaving' : 'arriving'}`}
        style={{
          backgroundImage: shadowUri(30, 6),
          left: at(LAB.starter.x) - shadowW / 2,
          top: at(LAB.starter.y) - shadowH / 2,
          width: shadowW,
          height: shadowH,
        }}
      />
      <img
        key={`${id}-${leaving ? 'out' : 'in'}`}
        className={`lab-starter ${leaving ? 'returning' : ''}`}
        src={assetUrl(species.sprites.front)}
        alt={species.name}
        draggable={false}
        style={{
          width: w,
          height: h,
          left: at(LAB.starter.x) - feetX,
          top: at(LAB.starter.y) - feetBottom * scale,
          ['--ps' as string]: `${scale}px`,
          ['--dx' as string]: `${dx}px`,
          ['--dy' as string]: `${dy}px`,
          ['--hop' as string]: `${at(14)}px`,
        }}
      />
    </>
  );
}
