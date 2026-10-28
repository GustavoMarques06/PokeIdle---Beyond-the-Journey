// Tela de "Pressione Start", montada como uma tela de título de GBA (grade de 240×160
// pixels virtuais) que se estica para ocupar a janela inteira: em paisagem, a altura
// define o tamanho do pixel e as faixas se alongam na largura; em retrato, a largura
// define o pixel e sobra altura acima e abaixo do miolo. Faixas pintadas em canvas (ver
// startScene.ts); por cima, na mesma grade: o logo no alto à esquerda, fileiras de Pokémon
// marchando pela grama, o lendário da vez grande à direita e o convite piscando. Qualquer
// tecla ou toque leva ao menu.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GAME_VERSION } from '../../core/save';
import { STARTER_GENERATIONS, assetUrl, getSpecies } from '../../game-data';
import { audio } from '../audio';
import { PokemonSprite } from '../components/common';
import { REGION_LEGENDS } from './legends';
import { MusicToggle } from './MusicToggle';
import {
  BANDS,
  FOOTER_H,
  GBA_H,
  GBA_W,
  paintGrassFront,
  paintStartBackground,
  startSparkles,
  type StartLayout,
} from './startScene';

/** O lendário da vez troca a cada poucos segundos, uma região por vez. */
const FEATURED = REGION_LEGENDS;
const CYCLE_MS = 8000;
/** Espaço do lendário, colado à direita: distância do centro até a borda, onde pisa e
 *  tamanho máximo (pixels virtuais). */
const LEGEND = { fromRight: 56, feet: 144, maxW: 108, maxH: 100, maxScale: 1.75 };
const MARCH_GAP = 34;

export function StartScreen({ onStart }: { onStart: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grassRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState({ w: 1280, h: 800 });
  const [index, setIndex] = useState(0);
  const featured = FEATURED[index];

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setView({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tamanho do pixel e área virtual que cobre a janela toda.
  const landscape = view.w / view.h >= GBA_W / GBA_H;
  const u = landscape ? view.h / GBA_H : view.w / GBA_W;
  const layout: StartLayout = {
    w: Math.max(GBA_W, Math.ceil(view.w / u)),
    h: Math.max(GBA_H, Math.ceil(view.h / u)),
    // Em retrato, quase metade da altura extra vai para o céu; o resto, para a faixa preta.
    oy: landscape ? 0 : Math.round((view.h / u - GBA_H) * 0.45),
  };
  const { w: W, h: H, oy } = layout;

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % FEATURED.length), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  // Baixa o próximo lendário antes da troca, para ele não surgir vazio numa conexão lenta.
  useEffect(() => {
    const next = getSpecies(FEATURED[(index + 1) % FEATURED.length].id);
    const url = assetUrl(next.sprites.front);
    if (url) new Image().src = url;
  }, [index]);

  // Fundo e grama da frente pintados uma vez por lendário; os brilhos piscam por cima.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    grassRef.current?.getContext('2d')?.drawImage(paintGrassFront(featured.color, W), 0, 0);
    const bg = paintStartBackground(featured.color, { w: W, h: H, oy });
    const sparkles = startSparkles();
    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 50) return;
      last = t;
      ctx.drawImage(bg, 0, 0);
      for (const s of sparkles) s.step(ctx, 0, t);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [featured.color, W, H, oy]);

  const start = () => {
    audio.unlock();
    audio.sfx('click');
    onStart();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab') return;
      // Enter/Espaço num botão com foco (o de música) ficam com o próprio botão.
      if ((e.target as HTMLElement).tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
      e.preventDefault();
      start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Lendário: o maior que couber no espaço, com pixels de tamanho inteiro na tela.
  const [sw, sh] = getSpecies(featured.id).spriteSize?.front ?? [80, 80];
  // Em paisagem fica à direita, invadindo a faixa preta; em retrato, grande e centralizado
  // no céu (que sobra), pisando na grama.
  const slot = landscape
    ? {
        cx: W - LEGEND.fromRight,
        feet: LEGEND.feet + oy,
        maxW: LEGEND.maxW,
        maxH: LEGEND.maxH,
        maxScale: LEGEND.maxScale,
      }
    : { cx: W / 2, feet: BANDS.grassTop + oy + 6, maxW: 210, maxH: BANDS.grassTop + oy - 78, maxScale: 3 };
  const fit = Math.min(slot.maxScale, slot.maxW / sw, slot.maxH / sh);
  const px = u * fit >= 2 ? Math.floor(u * fit) : u * fit;
  const legendW = Math.round(sw * px);
  const legendH = Math.round(sh * px);

  // Fileira que marcha pela grama: os iniciais da região do lendário, Pikachu e Eevee. Ao
  // fundo, as evoluções finais deles em silhueta, mais devagar (dá profundidade à faixa).
  const starters = STARTER_GENERATIONS[index].ids;
  const marchers = [...starters, 25, 133];
  const finals = [...starters.map((id) => id + 2), 26, 196];
  const v = (n: number) => Math.round(n * u);
  const y = (n: number) => v(n + oy);

  return (
    <div
      className="start-screen"
      ref={wrapRef}
      onClick={start}
      role="button"
      tabIndex={0}
      aria-label="Pressione Start para começar"
    >
      <MusicToggle />
      <div className="gba-screen" style={{ width: v(W), height: v(H), ['--u' as string]: `${u}px` }}>
        <canvas ref={canvasRef} width={W} height={H} className="gba-layer" />

        <MarchRow
          ids={finals}
          top={y(BANDS.grassTop - 40)}
          span={v(W)}
          gap={v(MARCH_GAP + 6)}
          seconds={26}
          back
          key={`b${index}`}
        />
        <MarchRow
          ids={marchers}
          top={y(BANDS.grassTop - 24)}
          span={v(W)}
          gap={v(MARCH_GAP)}
          seconds={13}
          key={`f${index}`}
        />
        <canvas
          ref={grassRef}
          width={W}
          height={8}
          className="gba-layer gba-grass"
          style={{ top: y(BANDS.grassTop + 1), height: v(8) }}
        />

        <div className="gba-logo">
          <span className="gba-logo-outline" aria-hidden>
            PokéIdle
          </span>
          <span className="gba-logo-fill">PokéIdle</span>
        </div>
        <div className="gba-subtitle" aria-label="Beyond the Journey">
          <span>BEYOND THE</span>
          <span>JOURNEY</span>
        </div>

        <div
          className="gba-legendary"
          key={featured.id}
          style={{
            width: legendW,
            height: legendH,
            left: v(slot.cx) - Math.round(legendW / 2),
            top: v(slot.feet) - legendH,
          }}
          aria-hidden
        >
          <PokemonSprite speciesId={featured.id} kind="front" />
        </div>

        {/* Convite no meio da faixa preta de baixo. */}
        <p className="gba-press" style={{ top: v((BANDS.skyBottom + oy + H - FOOTER_H) / 2 - 5) }}>
          <span className="start-press-key">PRESSIONE START</span>
          <span className="start-press-touch">TOQUE NA TELA</span>
        </p>
        <p className="gba-copy">PokéIdle v{GAME_VERSION} · jogo de fã · Pokémon: Nintendo / Game Freak</p>
      </div>
    </div>
  );
}

function MarchRow({
  ids,
  top,
  gap,
  seconds,
  span,
  back = false,
}: {
  ids: number[];
  top: number;
  gap: number;
  seconds: number;
  /** Largura a cobrir (px de tela): a fileira se repete até preencher e dar a volta. */
  span: number;
  back?: boolean;
}) {
  const cycle = ids.length * gap;
  const reps = Math.ceil(span / cycle) + 1;
  return (
    <div
      className={`gba-march ${back ? 'back' : ''}`}
      style={{ top, ['--march-w' as string]: `${cycle}px` }}
      aria-hidden
    >
      <div className="gba-march-track" style={{ animationDuration: `${seconds}s` }}>
        {Array.from({ length: reps }, () => ids)
          .flat()
          .map((id, i) => (
            <span
              key={i}
              className="gba-marcher"
              style={{ width: gap, animationDelay: `${(i % 3) * 0.15}s` }}
            >
              <PokemonSprite speciesId={id} kind="icon" />
            </span>
          ))}
      </div>
    </div>
  );
}
