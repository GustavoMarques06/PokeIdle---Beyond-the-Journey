// Campo de batalha: cenário em pixel art, plataformas, sprites em escala real,
// caixas de status e efeitos (dano, impacto, captura, subida de nível).
// Só apresentação — a simulação continua no GameEngine independentemente daqui.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import { TYPE_GLOW, legendGlow } from '../i18n/legends';
import {
  BALANCE,
  assetUrl,
  formSet,
  formSprite,
  getItem,
  getMove,
  getRoute,
  getSpecies,
  isMegaForm,
  megaLabel,
  matchupOf,
  spriteFeet,
} from '../../game-data';
import { INDOOR_NEW, routeWeather, skyEvent } from '../../core/env';
import { legendaryDef, legendaryRules } from '../../core/legendary';
import {
  activePokemon,
  battleForm,
  bestRod,
  encounterRoute,
  harvestTree,
  megaActive,
  treeBerry,
  treeReady,
  type GameEvent,
  type GameState,
  type StatusState,
  type TrainerInfo,
} from '../../core/game';
import { rngFrom } from '../../core/rng';
import { reservePokemon } from '../../core/team';
import { isPerfect, pokemonName, statsOf } from '../../core/pokemon';
import type { Stats } from '../../core/stats';
import { levelProgress } from '../../core/progression';
import {
  SpriteImage,
  ExpBar,
  GenderMark,
  HpBar,
  ItemIcon,
  PixelIcon,
  PokemonSprite,
  Shiny,
  TrainerImage,
  TrainerSprite,
  TypeBadge,
} from '../components/common';
import { raidAllies, raidBreakers } from '../../core/raids';
import { genderOf } from '../../core/gender';
import { activeLure } from '../../core/lures';
import { STATUS_TEXT, TYPE_NAMES, formatDuration, itemName, speciesName } from '../i18n/pt-BR';
import { useEngine, useGameEvents } from '../useGame';
import { audio } from '../audio';
import { useHotkeys } from '../hotkeys';
import { takePhoto } from '../photo';
import { SCENE_H, SCENE_THEMES, SCENE_W, paintScene, sceneBases } from './scene';
import { setEvolving, useShownPokemon } from '../evolutionView';
import { EncounterModeSwitch } from './BattleDialog';
import { EncounterFlash, LevelUpWindow, PokemonCenter, TrainerIntro } from './BattleFx';
import { RareBanner } from './RareBanner';
import { RaidVictory } from './RaidVictory';
import { battleSpritePath, useWarmBattleSprites } from './warmSprites';
import { EvolutionOverlay } from './EvolutionOverlay';
import { captureAnimMs, captureShakes } from '../../core/capture';
import { ArtFx, MoveFx, SceneLife, SendOutBall, ShinySparkle, WeatherLayer, ambientFor } from './effects';
import { activityArt, artMs, impactArt, statusArt, type FxArt } from './fxart';

interface Floater {
  id: number;
  side: 'player' | 'enemy';
  text: string;
  tone: 'normal' | 'super' | 'weak' | 'miss' | 'crit' | 'status' | 'heal';
}

/** Sigla de status ao lado do nome (QMD, ENV, PAR, DRM, CGL), como nas caixas do GBA. */
/** Tipos do inimigo e os golpes que o atingem forte: ajuda a escolher o golpe (e o Pokémon) certo. */
function MatchupRow({ speciesId }: { speciesId: number }) {
  const types = getSpecies(speciesId).types;
  const { weak, resist } = matchupOf(types);
  const name = (t: string) => TYPE_NAMES[t] ?? t;
  const text = (list: [string, number][], sign: string) =>
    list.map(([t, m]) => `${name(t)} ${sign}${m === 0 ? '0' : m > 1 ? m : `1/${1 / m}`}`).join(', ');
  return (
    <div
      className="matchup-row"
      title={`Fraco a: ${text(weak, '×') || '—'}. Resiste a: ${text(resist, '×') || '—'}.`}
    >
      {types.map((t) => (
        <span key={t} className={`type-badge type-${t} mini`}>
          {name(t).toUpperCase()}
        </span>
      ))}
      {weak.length > 0 && <span className="matchup-label">FRACO</span>}
      {weak.slice(0, 4).map(([t, m]) => (
        <span key={t} className={`type-badge type-${t} mini weak`}>
          {name(t).toUpperCase().slice(0, 3)}
          {m > 2 && <b>×4</b>}
        </span>
      ))}
    </div>
  );
}

function StatusTag({ status }: { status?: StatusState | null }) {
  if (!status) return null;
  const t = STATUS_TEXT[status.kind];
  return (
    <span className={`status-tag status-${status.kind}`} title={t.name}>
      {t.short}
    </span>
  );
}

/** Energia de um golpe especial viajando do atacante até o alvo (em pixels da cena). */
interface Shot {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  style: 'orb' | 'beam' | 'spray';
  ms: number;
}

/** Forma da energia de cada tipo: bola (fogo, sombra…), raio (gelo, psíquico…) ou jato de gotas (água, pedra…). */
const SHOT_STYLE: Record<string, Shot['style']> = {
  ice: 'beam',
  psychic: 'beam',
  dragon: 'beam',
  electric: 'beam',
  steel: 'beam',
  flying: 'beam',
  water: 'spray',
  ground: 'spray',
  rock: 'spray',
  bug: 'spray',
};

const isPhysical = (moveId: string) => {
  try {
    return getMove(moveId).category === 'physical';
  } catch {
    return true;
  }
};

interface Spark {
  id: number;
  side: 'player' | 'enemy';
  /** Tipo do golpe (define o efeito). */
  type: string;
  big: boolean;
  /** Arte desenhada deste tipo de golpe, se houver (senão, partículas de CSS). */
  art?: FxArt;
}

/** Contador animado (o HP desce número a número, como nos jogos). */
function useCountTo(target: number, ms = 450): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = Math.round(start + (target - start) * k);
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

interface CaptureAnim {
  id: number;
  ball: string;
  success: boolean;
  /** Quantas vezes a bola balança antes do resultado (1 a 3; sempre 3 ao capturar). */
  shakes: 1 | 2 | 3;
  speciesId: number;
  shiny: boolean;
  /** Identidade do inimigo no momento do arremesso. */
  enemyKey: string | null;
}

const keyOf = (e: { speciesId: number; level: number; maxHp: number } | null) =>
  e ? `${e.speciesId}:${e.level}:${e.maxHp}` : null;

/** Escala dos sprites (pixels virtuais por pixel do sprite) e altura máxima no cenário. */
const ENEMY_SCALE = 1.25;
const ENEMY_MAX_H = 76;
const RAID_MAX_H = 80;
const PLAYER_SCALE = 1.65;
const PLAYER_MAX_H = 104;

/**
 * Tamanho do sprite no cenário e onde ficam os pés: `feetX` é a distância da borda esquerda ao
 * centro dos pés e `feetY` a do topo à linha mais baixa desenhada (o ponto que pousa sobre a
 * base); `feetW` é a largura da sombra.
 */
function spriteBox(speciesId: number, kind: 'front' | 'back', scale: number, maxH: number, form?: string) {
  const feet = spriteFeet(speciesId, kind, formSprite(speciesId, form, kind) ? form : undefined);
  const [w, h] = feet ? [feet[5], feet[6]] : (getSpecies(speciesId).spriteSize?.[kind] ?? [64, 64]);
  const [cx, fw, bottom, top, hover] = feet ?? [w / 2, w * 0.6, h, 0, 0];
  // Tamanho normal do sprite (a escala da cena), limitado só pela altura máxima: a altura vale para o desenho, não para a
  // margem vazia em volta dele.
  const drawn = Math.max(1, bottom - top);
  const k = Math.min(scale, maxH / drawn);
  // Asas e caudas muito longas não podem empurrar o corpo para fora do cenário.
  const feetX = Math.min(0.72, Math.max(0.28, cx / w)) * w * k;
  const feetW = Math.min(0.85, Math.max(0.4, (fw * 1.25) / w)) * w * k;
  // Quem voa/flutua na animação ganha uma sombra menor, que pulsa com o bater de asas.
  // `bodyH`: altura do desenho, sem a margem vazia do quadro (é por ela que se acha a cabeça e o centro do corpo).
  return { w: w * k, h: h * k, bodyH: drawn * k, feetX, feetY: bottom * k, feetW, hovering: hover >= 0.1 };
}

function BattleSprite({
  speciesId,
  kind,
  shiny,
  base,
  scale,
  maxH,
  className = '',
  innerRef,
  form,
}: {
  speciesId: number;
  kind: 'front' | 'back';
  shiny: boolean;
  base: { x: number; y: number };
  scale: number;
  maxH: number;
  className?: string;
  innerRef?: Ref<HTMLDivElement>;
  form?: string;
}) {
  const src = battleSpritePath(speciesId, kind, shiny, form);
  const box = spriteBox(speciesId, kind, scale, maxH, form);
  // No celular os sprites baixam na hora: enquanto o desenho não chega, uma Poké Ball ocupa o lugar.
  // Erro também encerra a espera (sem internet ou sem o arquivo, ela balançaria para sempre).
  const [settledSrc, setSettledSrc] = useState<string | undefined>(undefined);
  return (
    <>
      <span
        className={`ground-shadow ${box.hovering ? 'hovering' : ''}`}
        style={{
          left: `calc(var(--u) * ${base.x - box.feetW / 2})`,
          top: `calc(var(--u) * ${base.y - 3})`,
          width: `calc(var(--u) * ${box.feetW})`,
          height: `calc(var(--u) * 6)`,
        }}
      />
      <div
        ref={innerRef}
        className={`battle-mon battle-mon-${kind} ${className}`}
        style={{
          left: `calc(var(--u) * ${base.x - box.feetX})`,
          top: `calc(var(--u) * ${base.y - box.feetY + 1})`,
          width: `calc(var(--u) * ${box.w})`,
          height: `calc(var(--u) * ${box.h})`,
        }}
      >
        {src && settledSrc !== src && <span className="sprite-loading" aria-hidden />}
        <SpriteImage
          className="sprite"
          src={assetUrl(src)}
          alt={getSpecies(speciesId).name}
          priority="high"
          onLoad={() => setSettledSrc(src)}
          onError={() => setSettledSrc(src)}
        />
        {formSet(speciesId)?.rule === 'pattern' && form && (
          <SpindaSpots pattern={form} src={assetUrl(src)!} kind={kind} />
        )}
      </div>
    </>
  );
}

/** Quatro manchas em posições tiradas do número do padrão (sempre as mesmas para o padrão). */
function spindaSpots(pattern: string, kind: 'front' | 'back') {
  let h = Number(pattern.slice(1)) * 2654435761;
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return h / 4294967296;
  };
  return Array.from({ length: 4 }, () => ({
    x: 22 + next() * 50,
    y: (kind === 'front' ? 6 : 4) + next() * 30,
    r: 9 + next() * 7,
  }));
}

/** Manchas do Spinda, recortadas pela silhueta do próprio sprite (máscara), só na cabeça. */
function SpindaSpots({ pattern, src, kind }: { pattern: string; src: string; kind: 'front' | 'back' }) {
  const spots = spindaSpots(pattern, kind);
  return (
    <span
      className="spinda-spots"
      style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
      aria-hidden
    >
      {spots.map((sp, i) => (
        <i
          key={i}
          style={{ left: `${sp.x}%`, top: `${sp.y}%`, width: `${sp.r}%`, height: `${sp.r * 0.9}%` }}
        />
      ))}
    </span>
  );
}

export function BattleScene({ state }: { state: GameState }) {
  const engine = useEngine();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  // Onde estão os dois Pokémon (pés e altura do corpo), atualizado a cada desenho.
  const geo = useRef({ player: { x: 66, y: 138 }, enemy: { x: 184, y: 78 }, pH: 40, eH: 40 });
  const [capture, setCapture] = useState<CaptureAnim | null>(null);
  // Lendário: entrada de cinema, fúria e o resultado da bola (rugido ou explosão de estrelas).
  const [legendIntro, setLegendIntro] = useState<{ id: number; speciesId: number } | null>(null);
  const [legendFx, setLegendFx] = useState<{ id: number; kind: 'rage' | 'roar' | 'caught' } | null>(null);
  const [levelUp, setLevelUp] = useState<{
    id: number;
    name: string;
    level: number;
    before: Stats;
    after: Stats;
  } | null>(null);
  // Encontro: piscada (selvagem) ou entrada do treinador ("X quer batalhar!").
  const [encounter, setEncounter] = useState<{
    id: number;
    trainer?: TrainerInfo;
  } | null>(null);
  const [evolutions, setEvolutions] = useState<
    { id: number; uid: number; from: number; to: number; shiny: boolean }[]
  >([]);
  // Enquanto a cena roda, ficha, equipe e avisos mostram a forma antiga (ver evolutionView.ts).
  const evolvingNow = evolutions[0];
  useEffect(() => {
    setEvolving(evolvingNow ? { uid: evolvingNow.uid, from: evolvingNow.from } : null);
  }, [evolvingNow]);
  useEffect(() => () => setEvolving(null), []);
  const [shake, setShake] = useState(0);
  const [shinyFx, setShinyFx] = useState<number | null>(null);
  const [shinyBush, setShinyBush] = useState<number | null>(null);
  const [shieldBreak, setShieldBreak] = useState<number | null>(null);
  // Raide vencida: o chefe se desfaz, chovem estrelas e moedas e aparece o cartão do resultado.
  // Golpe de um aliado na raide (o ícone dele pula e dispara).
  const [allyHit, setAllyHit] = useState<{ id: number; speciesId: number } | null>(null);
  const [raidWin, setRaidWin] = useState<(Extract<GameEvent, { type: 'raidDefeated' }> & { id: number }) | null>(
    null,
  );

  const animSpeed = state.settings.animSpeed || 1;
  const b = state.battle;
  const route = getRoute(b.routeId);
  // A Torre de Batalha é sempre num salão; o resto segue o cenário da rota.
  useWarmBattleSprites(state);
  const sceneKey = b.kind === 'tower' ? 'city' : route.scene;
  const theme = SCENE_THEMES[sceneKey] ?? 'meadow';
  const { enemy: ENEMY_BASE, player: PLAYER_BASE } = sceneBases(sceneKey);
  const gfx = state.settings.graphics;
  const weather = b.kind === 'tower' ? 'clear' : (b.weather ?? routeWeather(route, state.env));
  // Evento raro do céu (aurora, arco-íris, chuva de meteoros): só nas batalhas ao ar livre da própria rota.
  const sky =
    b.kind === 'tower' || b.weather ? undefined : skyEvent(route.kind === 'trial' ? encounterRoute(route) : route, state.env);
  const skyAnim = sky === 'aurora' ? 'aurora' : sky === 'meteors' ? 'stars' : undefined;
  const night =
    state.env.period === 'night' &&
    b.kind !== 'tower' &&
    !['cave', 'icecave', 'dampcave', 'volcano', ...INDOOR_NEW].includes(sceneKey);

  // Escala: --u = pixels de tela por pixel virtual do cenário.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => el.style.setProperty('--u', `${el.clientWidth / SCENE_W}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintScene(ctx, theme, sceneKey === 'city' ? 'city' : b.routeId);
  }, [theme, b.routeId, sceneKey]);

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      const st = engine.state;
      if (!st) return;
      const motion = !st.settings.reducedMotion && st.settings.graphics !== 'performance';
      const speed = st.settings.animSpeed || 1;
      for (const e of events) {
        if (e.type === 'enemyFainted' && motion && st.battle.kind !== 'wild') audio.cry(e.speciesId);
        if (e.type === 'attack') {
          const target = e.side === 'player' ? 'enemy' : 'player';
          const r = e.result;
          const physical = isPhysical(r.moveId);
          // O impacto (faíscas, número de dano, empurrão) chega quando o golpe alcança o alvo.
          const hitAt = motion ? (physical ? 230 : 320) / speed : 0;
          if (motion) {
            const [attackerEl, targetEl] =
              e.side === 'player'
                ? [playerRef.current, enemyRef.current]
                : [enemyRef.current, playerRef.current];
            const dir = e.side === 'player' ? 1 : -1;
            const g = geo.current;
            const mine = e.side === 'player' ? { b: g.player, h: g.pH } : { b: g.enemy, h: g.eH };
            const theirs = e.side === 'player' ? { b: g.enemy, h: g.eH } : { b: g.player, h: g.pH };
            const from = { x: mine.b.x, y: mine.b.y - mine.h / 2 };
            const to = { x: theirs.b.x, y: theirs.b.y - theirs.h / 2 };
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const u = (n: number) => `calc(var(--u) * ${n.toFixed(1)})`;
            const color = TYPE_GLOW[r.moveType] ?? '#f8f8f8';
            if (physical) {
              // Recua, corre até perto do alvo, bate e volta.
              attackerEl?.animate(
                [
                  { transform: 'translate(0, 0)' },
                  { transform: `translate(${u(-dir * 6)}, ${u(dir * 2)})`, offset: 0.2 },
                  { transform: `translate(${u(dx * 0.55)}, ${u(dy * 0.55)})`, offset: 0.48 },
                  { transform: `translate(${u(dx * 0.5)}, ${u(dy * 0.5)})`, offset: 0.62 },
                  { transform: 'translate(0, 0)' },
                ],
                { duration: 500 / speed, easing: 'steps(10, end)' },
              );
            } else {
              // Carrega a energia na cor do tipo e solta.
              attackerEl?.animate(
                [
                  { filter: 'none', transform: 'translate(0, 0)' },
                  {
                    filter: `brightness(1.6) drop-shadow(0 0 6px ${color})`,
                    transform: `translate(0, ${u(-2)})`,
                    offset: 0.45,
                  },
                  { filter: 'none', transform: 'translate(0, 0)' },
                ],
                { duration: 420 / speed, easing: 'steps(5, end)' },
              );
              const id = nextId.current++;
              const ms = Math.round(300 / speed);
              setShots((list) => [
                ...list.slice(-3),
                { id, x: from.x, y: from.y, dx, dy, color, style: SHOT_STYLE[r.moveType] ?? 'orb', ms },
              ]);
              setTimeout(() => setShots((list) => list.filter((x) => x.id !== id)), ms + 400);
            }
            if (r.damage > 0) {
              const big = r.effectiveness > 1 || r.crit;
              // Empurrão para trás (mais forte no super efetivo e no crítico) e o pisca-pisca do dano.
              const kb = big ? 12 : 5;
              targetEl?.animate(
                [
                  { transform: 'translate(0, 0)' },
                  { transform: `translate(${u(dir * kb)}, ${u(-dir * kb * 0.4)})`, offset: 0.3 },
                  { transform: 'translate(0, 0)' },
                ],
                { duration: 340 / speed, delay: hitAt, easing: 'steps(5, end)' },
              );
              targetEl?.animate(
                [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
                { duration: 320 / speed, delay: hitAt + 20, easing: 'steps(1, end)' },
              );
              const id = nextId.current++;
              const type = r.moveType;
              const art = impactArt(type, big);
              setTimeout(() => {
                setSparks((list) => [...list.slice(-4), { id, side: target, type, big, art }]);
                setTimeout(
                  () => setSparks((list) => list.filter((x) => x.id !== id)),
                  art ? artMs(art, speed) : 700 / speed,
                );
                if (big) setShake((n) => n + 1);
              }, hitAt);
            }
          }
          if (st.settings.showDamageNumbers && st.settings.graphics !== 'performance') {
            const tone: Floater['tone'] = r.missed
              ? 'miss'
              : r.crit
                ? 'crit'
                : r.effectiveness > 1
                  ? 'super'
                  : r.effectiveness < 1
                    ? 'weak'
                    : 'normal';
            const f: Floater = {
              id: nextId.current++,
              side: target,
              text: r.missed ? 'ERROU' : `-${r.damage}`,
              tone,
            };
            setTimeout(() => {
              setFloaters((list) => [...list.slice(-6), f]);
              setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
            }, hitAt);
          }
        } else if (motion && e.type === 'effect' && e.amount && st.settings.showDamageNumbers) {
          const f: Floater =
            e.kind === 'recoil'
              ? { id: nextId.current++, side: e.side, text: `-${e.amount}`, tone: 'status' }
              : { id: nextId.current++, side: e.side, text: `+${e.amount}`, tone: 'heal' };
          setFloaters((list) => [...list.slice(-6), f]);
          setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
        } else if (e.type === 'statusDamage' && motion && st.settings.showDamageNumbers) {
          const f: Floater = { id: nextId.current++, side: e.side, text: `-${e.damage}`, tone: 'status' };
          setFloaters((list) => [...list.slice(-6), f]);
          setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
        } else if (motion && e.type === 'supportMove' && (e.outcome === 'heal' || e.outcome === 'boost')) {
          const aura = activityArt(e.outcome === 'heal' ? 'hearts' : 'levelup');
          if (aura) {
            const id = nextId.current++;
            setSparks((list) => [...list.slice(-4), { id, side: e.side, type: 'normal', big: false, art: aura }]);
            setTimeout(() => setSparks((list) => list.filter((x) => x.id !== id)), artMs(aura, speed));
          }
          const f: Floater = {
            id: nextId.current++,
            side: e.side,
            text: e.outcome === 'heal' ? `+${e.amount}` : '▲',
            tone: 'heal',
          };
          setFloaters((list) => [...list.slice(-6), f]);
          setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
        } else if (e.type === 'legendRage') {
          const id = nextId.current++;
          audio.sfx('boss');
          audio.cry(e.speciesId);
          if (motion) {
            setLegendFx({ id, kind: 'rage' });
            setTimeout(() => setLegendFx((cur) => (cur?.id === id ? null : cur)), 1200);
          }
        } else if (e.type === 'raidRage') {
          audio.cry(e.speciesId);
          if (motion) setShake((n) => n + 1);
        } else if (e.type === 'raidAlly') {
          const id = nextId.current++;
          setAllyHit({ id, speciesId: e.speciesId });
          setTimeout(() => setAllyHit((cur) => (cur?.id === id ? null : cur)), 900);
          if (st.settings.showDamageNumbers && motion) {
            const f: Floater = { id: nextId.current++, side: 'enemy', text: `-${e.damage}`, tone: 'normal' };
            setFloaters((list) => [...list.slice(-6), f]);
            setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
          }
        } else if (e.type === 'raidShieldBroken') {
          audio.sfx('crit');
          if (motion) setShake((n) => n + 1);
          const id = nextId.current++;
          setShieldBreak(id);
          setTimeout(() => setShieldBreak((cur) => (cur === id ? null : cur)), 1100);
        } else if (e.type === 'raidBlast') {
          audio.sfx('boss');
          if (motion) setShake((n) => n + 1);
        } else if (e.type === 'raidDefeated') {
          const id = nextId.current++;
          setRaidWin({ ...e, id });
          setTimeout(() => setRaidWin((cur) => (cur?.id === id ? null : cur)), 5200);
        } else if (e.type === 'captureAttempt') {
          const enemy = st.battle.enemy;
          if (legendaryDef(e.speciesId)) {
            // Depois que a bola para de balançar: rugido (escapou) ou estrelas (capturado).
            const id = nextId.current++;
            const after = captureAnimMs(captureShakes(e.chance, e.success), e.success);
            const kind = e.success ? 'caught' : 'roar';
            setTimeout(() => {
              if (kind === 'roar') audio.cry(e.speciesId);
              else audio.sfx('fanfare');
              if (motion) setLegendFx({ id, kind });
            }, after * (kind === 'roar' ? 0.85 : 0.7));
            setTimeout(() => setLegendFx((cur) => (cur?.id === id ? null : cur)), after + 1400);
          }
          setCapture({
            id: nextId.current++,
            ball: e.ball,
            success: e.success,
            shakes: captureShakes(e.chance, e.success),
            speciesId: e.speciesId,
            shiny: enemy?.shiny ?? false,
            enemyKey: keyOf(enemy),
          });
        } else if (e.type === 'spawn' && (e.legendary || st.battle.kind === 'legendary')) {
          const id = nextId.current++;
          audio.sfx('boss');
          setTimeout(() => audio.cry(e.speciesId), 900);
          if (motion) {
            setLegendIntro({ id, speciesId: e.speciesId });
            setTimeout(() => setLegendIntro((cur) => (cur?.id === id ? null : cur)), 2800 / speed);
          }
        } else if (e.type === 'spawn' && motion) {
          const id = nextId.current++;
          const trainer = st.battle.trainer;
          if (e.boss && trainer && st.battle.bossIndex === 0) {
            setEncounter({ id, trainer });
            setTimeout(
              () => setEncounter((cur) => (cur?.id === id ? null : cur)),
              (trainer.line ? 3400 : 1700) / speed,
            );
            if (trainer.line) audio.sfx('boss');
          } else if (st.battle.kind === 'wild' && (e.shiny || e.roamer || e.perfect)) {
            // Só no raro: num jogo idle, um clarão a cada encontro cansa os olhos.
            setEncounter({ id });
            setTimeout(() => setEncounter((cur) => (cur?.id === id ? null : cur)), 420 / speed);
          }
          if (e.shiny) {
            const id = nextId.current++;
            setShinyFx(id);
            setTimeout(() => setShinyFx((cur) => (cur === id ? null : cur)), 1300);
            // Antes dele aparecer, a moita brilha e treme diferente (com um tilintar).
            audio.sfx('itemGet');
            setShinyBush(id);
            setTimeout(() => setShinyBush((cur) => (cur === id ? null : cur)), 1500);
          }
        } else if (e.type === 'levelUp' && e.uid === st.activeUid) {
          // Janela de nível do ativo: ganho de cada atributo e, depois, os valores novos.
          const found = st.collection.find((x) => x.uid === e.uid);
          // Se evoluiu no mesmo nível, a janela ainda é da forma antiga (a cena vem depois).
          const evo = events.find((x) => x.type === 'evolved' && x.uid === e.uid);
          const p = found && evo?.type === 'evolved' ? { ...found, speciesId: evo.from } : found;
          if (p) {
            const id = nextId.current++;
            setLevelUp({
              id,
              name: pokemonName(p),
              level: e.level,
              before: statsOf({ ...p, level: e.level - 1 }),
              after: statsOf({ ...p, level: e.level }),
            });
            setTimeout(() => setLevelUp((cur) => (cur?.id === id ? null : cur)), 3200 / speed);
          }
        } else if (e.type === 'evolved') {
          const p = st.collection.find((x) => x.uid === e.uid);
          setEvolutions((list) => [
            ...list,
            { id: nextId.current++, uid: e.uid, from: e.from, to: e.to, shiny: p?.shiny ?? false },
          ]);
        }
      }
    },
    [engine],
  );
  useGameEvents(onEvents);

  // A animação de captura dura ~2 s; depois some sozinha.
  useEffect(() => {
    if (!capture) return;
    const t = setTimeout(() => setCapture(null), captureAnimMs(capture.shakes, capture.success));
    return () => clearTimeout(t);
  }, [capture]);

  useEffect(() => {
    if (!shake) return;
    wrapRef.current?.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: 'translate(calc(var(--u) * -2), 0)' },
        { transform: 'translate(calc(var(--u) * 2), 0)' },
        { transform: 'translate(0,0)' },
      ],
      { duration: 200 / animSpeed, easing: 'steps(4, end)' },
    );
    // Só dispara quando um novo tremor é pedido; a velocidade vale a do momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shake]);

  // Raide: tique a cada segundo nos últimos 10 s.
  const raidSecs = b.kind === 'raid' && b.phase === 'fighting' ? Math.ceil((b.raidMs ?? 0) / 1000) : 0;
  useEffect(() => {
    if (raidSecs > 0 && raidSecs <= 10) audio.sfx('tick');
  }, [raidSecs]);

  const [treeMsg, setTreeMsg] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!treeMsg) return;
    const t = setTimeout(() => setTreeMsg(null), 1800);
    return () => clearTimeout(t);
  }, [treeMsg]);

  // Troca de área (e a chegada ao jogo, vindo da abertura): escurece e mostra o nome dela,
  // como nos jogos portáteis.
  const [areaBanner, setAreaBanner] = useState<{ id: number; name: string; region: string } | null>(null);
  const lastRoute = useRef<string | null>(null);
  useEffect(() => {
    if (lastRoute.current === b.routeId) return;
    lastRoute.current = b.routeId;
    const r = getRoute(b.routeId);
    const banner = { id: Date.now(), name: r.name, region: r.region };
    setAreaBanner(banner);
    const t = setTimeout(
      () => setAreaBanner((cur) => (cur?.id === banner.id ? null : cur)),
      1900 / animSpeed,
    );
    return () => clearTimeout(t);
  }, [b.routeId, animSpeed]);

  const player = useShownPokemon(activePokemon(state));
  const pStats = statsOf(player);
  // Alarme de HP baixo (barra vermelha) enquanto o ativo luta.
  const lowHp = b.phase === 'fighting' && player.currentHp > 0 && player.currentHp / pStats.hp <= 0.2;
  useEffect(() => {
    audio.lowHpAlarm(lowHp);
  }, [lowHp]);
  useEffect(() => () => audio.lowHpAlarm(false), []);
  // Entrada com Poké Ball: o sprite é recriado a cada Pokémon novo (key), e a animação de CSS
  // roda sozinha na montagem — para o jogador sempre, para o inimigo nas lutas de treinador.
  const trainerFoe =
    b.kind === 'boss' ||
    b.kind === 'rocket' ||
    b.kind === 'tower' ||
    b.kind === 'tournament' ||
    b.kind === 'ghost';
  const shownHp = useCountTo(player.currentHp);
  // Entardecer e amanhecer (só visual; o jogo conta dia e noite).
  const hour = new Date(state.lastTimerAt).getHours();
  const skyTint =
    b.kind === 'tower' || ['cave', 'icecave', 'dampcave', 'volcano', 'city', ...INDOOR_NEW].includes(sceneKey)
      ? null
      : hour >= 16 && hour < 18
        ? 'dusk'
        : hour >= 6 && hour < 8
          ? 'dawn'
          : null;
  const reserves = reservePokemon(state);
  const enemy = b.enemy;
  // Uma tentativa que falhou só é mostrada enquanto o mesmo inimigo está em campo.
  const staleEscape = capture !== null && !capture.success && keyOf(enemy) !== capture.enemyKey;
  // Só some o Pokémon que está dentro da bola: quem entra depois da captura aparece normalmente.
  const hideEnemy = capture !== null && keyOf(enemy) === capture.enemyKey;
  // Lendário em campo (desafio ou errante): aura, partículas, moldura dourada e efeitos.
  const legendHere = !!enemy && (b.kind === 'legendary' || !!legendaryDef(enemy.speciesId));
  const motionOn = !state.settings.reducedMotion && gfx !== 'performance';
  // Castform muda com o clima; Unown, Deerling e Spinda mostram a forma deles.
  const mega = megaActive(state, player);
  const playerForm = mega?.form ?? battleForm(player.speciesId, player.form, weather);
  const enemyForm = enemy ? battleForm(enemy.speciesId, enemy.form, weather) : undefined;
  const playerBox = spriteBox(player.speciesId, 'back', PLAYER_SCALE, PLAYER_MAX_H, playerForm);
  // Chefe de raide: gigante (maior que o normal, com teto mais alto).
  const raidHere = b.kind === 'raid';
  const enemyScale = raidHere ? ENEMY_SCALE * 1.1 : ENEMY_SCALE;
  const enemyMaxH = raidHere ? RAID_MAX_H : ENEMY_MAX_H;
  const enemyBox = enemy
    ? spriteBox(enemy.speciesId, 'front', enemyScale, enemyMaxH, enemyForm)
    : { w: 40, h: 40, bodyH: 40 };
  geo.current = { player: PLAYER_BASE, enemy: ENEMY_BASE, pH: playerBox.bodyH, eH: enemyBox.bodyH };

  // Árvore de berry da rota e foto da cena.
  const treeRouteId = route.kind === 'trial' && route.farm ? route.farm : route.id;
  const tree = b.kind === 'wild' ? treeBerry(treeRouteId) : null;
  const treeIsReady =
    !!tree && treeRouteId === state.currentRouteId && treeReady(state, treeRouteId, state.lastTimerAt);
  const harvest = () => {
    if (!treeIsReady) return;
    let got: { berry: string; qty: number } | null = null;
    engine.dispatch((s, now) => {
      got = harvestTree(s, now, rngFrom(s));
    });
    if (got) {
      const g = got as { berry: string; qty: number };
      setTreeMsg({ id: nextId.current++, text: `+${g.qty} ${itemName(g.berry)}` });
      audio.sfx('item');
    }
  };
  const photo = () => {
    if (!wrapRef.current) return;
    const caption = [
      state.trainerName,
      `${pokemonName(player)} Nv${player.level}`,
      enemy ? `vs ${speciesName(enemy.speciesId)}${enemy.shiny ? ' ★' : ''} Nv${enemy.level}` : '',
      route.name,
    ]
      .filter(Boolean)
      .join(' · ');
    void takePhoto(wrapRef.current, caption).then((ok) =>
      setTreeMsg({ id: nextId.current++, text: ok ? 'Foto salva!' : 'Não deu para salvar a foto.' }),
    );
    audio.sfx('click');
  };
  useHotkeys({ p: photo, b: harvest });

  return (
    <div
      className={`scene theme-${theme} ${enemy?.water ? `mode-${enemy.water}` : ''} ${legendHere ? 'legend-battle' : ''} ${legendHere && enemy?.rage ? 'legend-enraged' : ''} ${legendFx ? `legend-fx-${legendFx.kind}` : ''} ${b.kind === 'raid' ? `raid-battle raid-rage-${enemy?.rage ?? 0}` : ''}`}
      style={legendHere && enemy ? ({ ['--glow' as string]: legendGlow(enemy.speciesId) } as CSSProperties) : undefined}
      ref={wrapRef}
      aria-label="Campo de batalha"
    >
      <canvas ref={canvasRef} width={SCENE_W} height={SCENE_H} className="scene-canvas" />
      {state.settings.illustratedScenes && (
        <img
          className="scene-backdrop"
          fetchPriority="high"
          src={assetUrl(`sprites/backgrounds/${sceneKey}.png`)}
          alt=""
          draggable={false}
        />
      )}
      {night && <span className="scene-night" aria-hidden />}
      {skyTint && <span className={`scene-${skyTint}`} aria-hidden />}
      {enemy?.water === 'surf' && <span className="scene-water" aria-hidden />}

      {areaBanner && (
        <div
          key={`area-${areaBanner.id}`}
          className={`area-banner ${state.settings.reducedMotion || gfx === 'performance' ? 'still' : ''}`}
          style={{ ['--speed' as string]: animSpeed }}
          aria-live="polite"
        >
          <div className="area-sign frame frame-sign">
            <strong>{areaBanner.name}</strong>
            <small>{areaBanner.region}</small>
          </div>
        </div>
      )}
      {!state.settings.reducedMotion && gfx !== 'performance' && (
        <WeatherLayer weather={weather} night={state.env.period === 'night'} scene={sceneKey} />
      )}
      {motionOn && (
        <SceneLife
          scene={sceneKey}
          night={night}
          open={b.kind !== 'tower' && !['cave', 'icecave', 'dampcave', 'volcano', ...INDOOR_NEW].includes(sceneKey)}
          weather={weather}
        />
      )}
      {/* Aurora e chuva de meteoros: as animações de pixel art do pixelfx (as mesmas do céu de ambiente). Se a cena já
          as mostra de ambiente, não repete. O arco-íris é desenhado em CSS. */}
      {sky && motionOn && skyAnim && skyAnim !== ambientFor(sceneKey, night) && (
        <img
          className="scene-weather-anim scene-sky-anim"
          src={assetUrl(`sprites/weather/${skyAnim}.webp`)}
          alt=""
          aria-hidden
          draggable={false}
        />
      )}
      {sky === 'rainbow' && motionOn && <span className="scene-sky sky-rainbow" aria-hidden />}

      <div className="scene-hud">
        <EncounterModeSwitch state={state} />
        {(['repel', 'incense'] as const).map((kind) => {
          const lure = activeLure(state, kind);
          return lure ? (
            <span
              key={kind}
              className="scene-lure"
              title={`${itemName(lure.item)}: ${formatDuration(lure.ms)} restantes`}
            >
              <ItemIcon id={lure.item} size={16} />
              {Math.ceil(lure.ms / 60_000)} min
            </span>
          ) : null;
        })}
        {enemy?.water && b.kind !== 'wild' && (
          <span className="scene-mode-tag">
            <ItemIcon id={enemy.water === 'fish' ? (bestRod(state) ?? 'old-rod') : 'surf'} size={16} />
            {enemy.water === 'fish' ? 'PESCA' : 'SURF'}
          </span>
        )}
        {tree && (
          <button
            className={`scene-tool ${treeIsReady ? 'ready' : ''}`}
            disabled={!treeIsReady}
            onClick={harvest}
            title={
              treeIsReady
                ? `Colher ${itemName(tree)} (tecla B)`
                : `Árvore de ${itemName(tree)}: dá frutos de novo em ${formatDuration(
                    (state.berryTrees[treeRouteId] ?? 0) - state.lastTimerAt,
                  )}`
            }
          >
            <PixelIcon name="tree" scale={2} />
            <ItemIcon id={tree} size={16} />
            <kbd>B</kbd>
          </button>
        )}
        <button className="scene-tool" onClick={photo} title="Tirar foto da cena (tecla P)">
          <PixelIcon name="camera" scale={2} />
          <kbd>P</kbd>
        </button>
      </div>
      {treeMsg && (
        <span key={`tree-${treeMsg.id}`} className="scene-toast">
          {treeMsg.text}
        </span>
      )}

      {enemy && !hideEnemy && (
        <BattleSprite
          speciesId={enemy.speciesId}
          form={enemyForm}
          kind="front"
          shiny={enemy.shiny}
          base={ENEMY_BASE}
          scale={enemyScale}
          maxH={enemyMaxH}
          innerRef={enemyRef}
          className={`idle-a ${raidHere ? 'raid-giant' : ''} ${enemy.shield ? 'raid-shielded' : ''} ${enemy.charging ? 'raid-charging' : ''} ${enemy.stunMs ? 'raid-stunned' : ''} ${enemy.rage ? `rage-${enemy.rage}` : ''} ${enemy.status ? `st-${enemy.status.kind}` : ''} ${trainerFoe ? 'sending-out' : ''}`}
        />
      )}
      {capture && !staleEscape && <CaptureGhost anim={capture} base={ENEMY_BASE} />}
      {legendHere && enemy && !hideEnemy && motionOn && (
        <span className={`legend-particles type-${getSpecies(enemy.speciesId).types[0]}`} aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ ['--i' as string]: i } as CSSProperties} />
          ))}
        </span>
      )}
      {legendFx?.kind === 'caught' && (
        <span className="legend-caught-burst" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} style={{ ['--a' as string]: `${i * 22.5}deg` } as CSSProperties} />
          ))}
        </span>
      )}
      {legendIntro && (
        <div key={legendIntro.id} className="legend-intro" aria-live="polite">
          <span className="legend-intro-dark" />
          <span className="legend-intro-silhouette">
            <PokemonSprite speciesId={legendIntro.speciesId} kind="front" silhouette />
          </span>
          <span className="legend-intro-flash" />
          <div className="legend-intro-card frame frame-dialog">
            <small>{legendaryDef(legendIntro.speciesId)?.tier === 'pseudo' ? 'QUASE LENDÁRIO' : 'LENDÁRIO'}</small>
            <strong>Um {speciesName(legendIntro.speciesId).toUpperCase()} apareceu!</strong>
          </div>
        </div>
      )}

      <BattleSprite
        key={`mon-${player.uid}-${mega?.form ?? ''}`}
        speciesId={player.speciesId}
        form={playerForm}
        kind="back"
        shiny={player.shiny}
        base={PLAYER_BASE}
        scale={PLAYER_SCALE}
        maxH={PLAYER_MAX_H}
        innerRef={playerRef}
        className={`idle-b ${mega ? 'mega-flash' : ''} ${b.phase === 'defeat' ? 'fainted' : ''} ${b.playerStatus ? `st-${b.playerStatus.kind}` : ''} sending-out`}
      />

      {enemy && (
        <div className={`status-box status-enemy frame frame-status ${legendHere ? 'legend' : ''}`}>
          <div className="status-name">
            <span>
              {isMegaForm(enemy.speciesId, enemy.form) && (
                <b className="mega-tag">{megaLabel(enemy.form)} </b>
              )}
              {(enemy.nickname ?? getSpecies(enemy.speciesId).name).toUpperCase()}
              <GenderMark gender={genderOf(enemy)} />
              {enemy.shiny && <Shiny />}
              <StatusTag status={enemy.status} />
              {enemy.held && <ItemIcon id={enemy.held} size={14} className="held-mark" />}
              {isPerfect(enemy.ivs) && !enemy.boost && b.kind === 'wild' && (
                <span className="perfect-tag">PERFEITO</span>
              )}
            </span>
            <span className="status-level">Nv{enemy.level}</span>
          </div>
          <div className="status-row">
            {state.pokedex[enemy.speciesId]?.caught ? (
              <PixelIcon name="miniBall" scale={2} title="Já capturado" />
            ) : (
              <span className="status-ball-gap" />
            )}
            <HpBar value={enemy.hp} max={enemy.maxHp} />
          </div>
          <MatchupRow speciesId={enemy.speciesId} />
        </div>
      )}

      <div className={`status-box status-player frame frame-status ${levelUp ? 'leveling' : ''}`}>
        <div className="status-name">
          <span>
            {mega && <b className="mega-tag">{megaLabel(mega.form)} </b>}
            {pokemonName(player).toUpperCase()}
            <GenderMark gender={genderOf(player)} />
            {player.shiny && <Shiny />}
            <StatusTag status={b.playerStatus} />
            {player.held && <ItemIcon id={player.held} size={14} className="held-mark" />}
          </span>
          <span className="status-level">Nv{player.level}</span>
        </div>
        {reserves.length > 0 && (
          <div className="party-balls" title="Equipe (o 1º luta)">
            {[player, ...reserves].map((p) => (
              <span key={p.uid} className={p.currentHp > 0 ? '' : 'fainted'}>
                <PixelIcon name="miniBall" scale={2} />
              </span>
            ))}
          </div>
        )}
        <HpBar value={player.currentHp} max={pStats.hp} />
        <div className="status-hp">
          <span className="hp-now">{shownHp}</span>
          <span className="hp-max">/{pStats.hp}</span>
        </div>
        <ExpBar progress={levelProgress(player)} />
      </div>

      {floaters.map((f) => (
        <span
          key={f.id}
          className={`floater floater-${f.side} tone-${f.tone}`}
          style={
            f.side === 'enemy'
              ? {
                  left: `calc(var(--u) * ${ENEMY_BASE.x})`,
                  top: `calc(var(--u) * ${ENEMY_BASE.y - enemyBox.h - 4})`,
                }
              : {
                  left: `calc(var(--u) * ${PLAYER_BASE.x + 12})`,
                  top: `calc(var(--u) * ${PLAYER_BASE.y - playerBox.h - 2})`,
                }
          }
        >
          {f.text}
        </span>
      ))}
      {shots.map((s) => (
        <span
          key={s.id}
          className={`proj proj-${s.style}`}
          style={
            {
              left: `calc(var(--u) * ${s.x})`,
              top: `calc(var(--u) * ${s.y})`,
              '--dx': `calc(var(--u) * ${s.dx})`,
              '--dy': `calc(var(--u) * ${s.dy})`,
              '--len': `calc(var(--u) * ${Math.hypot(s.dx, s.dy).toFixed(1)})`,
              '--ang': `${((Math.atan2(s.dy, s.dx) * 180) / Math.PI).toFixed(1)}deg`,
              '--c': s.color,
              '--ms': `${s.ms}ms`,
            } as CSSProperties
          }
          aria-hidden
        >
          {s.style === 'spray' && (
            <>
              <i />
              <i />
              <i />
              <i />
            </>
          )}
        </span>
      ))}
      {sparks.map((s) => {
        const base = s.side === 'enemy' ? ENEMY_BASE : PLAYER_BASE;
        const box = s.side === 'enemy' ? enemyBox : playerBox;
        if (s.art) {
          return (
            <ArtFx
              key={s.id}
              art={s.art}
              x={base.x}
              y={s.art.at === 'floor' ? base.y - 1 : base.y - box.bodyH / 2}
              speed={animSpeed}
              flip={s.side === 'player'}
            />
          );
        }
        return (
          <MoveFx
            key={s.id}
            id={s.id}
            type={s.type}
            big={s.big}
            speed={animSpeed}
            x={base.x}
            y={base.y - box.bodyH / 2}
          />
        );
      })}
      {/* Status em loop sobre o Pokémon: sono, paralisia, queimadura, congelamento e veneno */}
      {!state.settings.reducedMotion &&
        gfx !== 'performance' &&
        (
          [
            ['enemy', hideEnemy ? undefined : enemy?.status?.kind, ENEMY_BASE, enemyBox],
            ['player', b.playerStatus?.kind, PLAYER_BASE, playerBox],
          ] as const
        ).map(([side, kind, base, box]) => {
          const art = kind ? statusArt(kind) : undefined;
          return art ? (
            <ArtFx
              key={`status-${side}-${kind}`}
              art={art}
              x={base.x}
              y={art.at === 'head' ? base.y - box.bodyH - 2 : base.y - 1}
              speed={animSpeed}
              low
            />
          ) : null;
        })}
      {raidHere && enemy && !hideEnemy && motionOn && (() => {
        const cy = ENEMY_BASE.y - enemyBox.bodyH / 2;
        const shield = enemy.shield ? activityArt('shield') : undefined;
        const charge = enemy.charging ? activityArt('charge') : undefined;
        const shatter = shieldBreak !== null ? activityArt('shatter') : undefined;
        return (
          <span className="raid-fx-layer">
            {shield && (
              <ArtFx
                art={{ ...shield, k: (enemyBox.bodyH * 1.05) / shield.h, ax: shield.w / 2, ay: shield.h / 2 }}
                x={ENEMY_BASE.x}
                y={cy}
                speed={1}
              />
            )}
            {charge && (
              <ArtFx
                art={{ ...charge, k: (enemyBox.bodyH * 0.7) / charge.h }}
                x={ENEMY_BASE.x}
                y={ENEMY_BASE.y - 2}
                speed={1}
                low
              />
            )}
            {shatter && (
              <ArtFx
                key={`shatter-${shieldBreak}`}
                art={{ ...shatter, k: 1.6, ax: shatter.w / 2, ay: shatter.h / 2 }}
                x={ENEMY_BASE.x}
                y={cy}
                speed={1}
              />
            )}
          </span>
        );
      })()}
      {shinyFx !== null && enemy?.shiny && (
        <ShinySparkle key={`shiny-${shinyFx}`} x={ENEMY_BASE.x} y={ENEMY_BASE.y - enemyBox.bodyH / 2} />
      )}
      {mega && (
        <span
          key={`mega-${player.uid}-${mega.form}`}
          className="mega-burst"
          style={{
            left: `calc(var(--u) * ${PLAYER_BASE.x})`,
            top: `calc(var(--u) * ${PLAYER_BASE.y - 34})`,
          }}
          aria-hidden
        />
      )}
      {motionOn && (
        <span key={`throw-${player.uid}`} className="trainer-throw" aria-hidden>
          <TrainerSprite id={state.trainerAvatar} outfit={state.trainerOutfit} size={80} />
        </span>
      )}
      <SendOutBall key={`p-${player.uid}`} x={PLAYER_BASE.x} y={PLAYER_BASE.y - 12} />
      {trainerFoe && enemy && <SendOutBall key={`e-${keyOf(enemy)}`} x={ENEMY_BASE.x} y={ENEMY_BASE.y - 8} />}

      {levelUp && (
        <LevelUpWindow
          key={`lvl-${levelUp.id}`}
          name={levelUp.name}
          level={levelUp.level}
          before={levelUp.before}
          after={levelUp.after}
          speed={animSpeed}
        />
      )}
      <RareBanner />
      {encounter &&
        (encounter.trainer ? (
          <TrainerIntro
            key={`enc-${encounter.id}`}
            name={encounter.trainer.name}
            sprite={encounter.trainer.sprite}
            outfit={encounter.trainer.outfit}
            title={encounter.trainer.title}
            line={encounter.trainer.line}
          />
        ) : (
          <EncounterFlash key={`enc-${encounter.id}`} />
        ))}
      {b.phase === 'defeat' && (
        <PokemonCenter
          balls={Math.min(6, 1 + reserves.length)}
          reducedMotion={state.settings.reducedMotion || gfx === 'performance'}
        />
      )}

      {b.kind !== 'wild' && b.trainer && (
        <>
          <TrainerImage
            className="boss-trainer"
            id={b.trainer.sprite}
            outfit={b.trainer.outfit}
            alt={b.trainer.name}
            style={{
              left: `calc(var(--u) * ${ENEMY_BASE.x + 26})`,
              top: `calc(var(--u) * ${ENEMY_BASE.y - 58})`,
            }}
          />
          <div className="boss-banner">
            {b.trainer.name.toUpperCase()}
            <small>
              {b.kind === 'tower' ? `TORRE · ANDAR ${b.floor}` : b.trainer.title.toUpperCase()}
              {' · '}
              {b.team.map((_, i) => (
                <span key={i} className={`team-pip ${i < b.bossIndex ? 'down' : ''}`} />
              ))}
            </small>
          </div>
        </>
      )}
      {b.kind === 'raid' && (
        <>
          <div className="raid-aura" aria-hidden>
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
          <div className="raid-vignette" aria-hidden />
          {raidAllies(state).length > 0 && (
            <div className="raid-allies" title="Times de amigos ajudando na raide">
              {raidAllies(state).map((a) => (
                <span
                  key={a.name}
                  className={`raid-ally ${allyHit?.speciesId === a.speciesId ? 'hit' : ''}`}
                  title={`${a.name} · ${speciesName(a.speciesId)}`}
                >
                  <PokemonSprite speciesId={a.speciesId} kind="icon" />
                  <small>{a.name}</small>
                </span>
              ))}
              {allyHit && <span key={allyHit.id} className="raid-ally-bolt" aria-hidden />}
            </div>
          )}
          {!!enemy?.rage && <div key={enemy.rage} className="raid-flash" aria-hidden />}
          <div
            className={`boss-banner raid-banner ${(b.raidMs ?? 0) < 30_000 ? 'urgent' : ''} ${(b.raidMs ?? 0) < 10_000 ? 'final' : ''} rage-${enemy?.rage ?? 0}`}
          >
            RAIDE
            <small>
              <b key={raidSecs <= 10 ? raidSecs : 'n'} className="raid-secs">
                {Math.ceil((b.raidMs ?? 0) / 1000)} S
              </b>{' '}
              · FÚRIA {enemy?.rage ?? 0}/{BALANCE.raid.rageAt.length}
            </small>
          </div>
        </>
      )}
      {b.kind === 'raid' && enemy && (!!enemy.shield || enemy.charging || !!enemy.stunMs) && (
        <div className="raid-hud">
          {!!enemy.shield && (
            <div className="raid-shield" title="Golpes destes tipos atravessam o escudo e o quebram rápido">
              <span className="raid-shield-bar">
                <i style={{ width: `${(enemy.shield / BALANCE.raid.shield) * 100}%` }} />
              </span>
              <small>ESCUDO · QUEBRA COM</small>
              {raidBreakers(enemy.speciesId).map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>
          )}
          {enemy.charging && (
            <div className="raid-charge">
              GOLPE GIGANTE EM {Math.ceil((enemy.chargeMs ?? 0) / 1000)} S
              <small>Quebre o escudo ou troque para quem resiste!</small>
            </div>
          )}
          {!!enemy.stunMs && <div className="raid-stun">ATORDOADO!</div>}
        </div>
      )}
      {raidWin && <RaidVictory win={raidWin} />}
      {shinyBush !== null && motionOn && (
        <span key={shinyBush} className="shiny-bush" aria-hidden>
          <i />
          <b>!</b>
        </span>
      )}
      {b.kind === 'legendary' && (
        <div className="boss-banner">
          {enemy && legendaryDef(enemy.speciesId)?.tier === 'pseudo' ? 'QUASE LENDÁRIO' : 'LENDÁRIO'}
          <small>
            JOGUE AS BOLAS À MÃO · {legendaryRules(enemy?.speciesId ?? 0).throwLimit - (enemy?.throws ?? 0)}{' '}
            TENTATIVAS
          </small>
        </div>
      )}
      {enemy?.roamer && enemy.fleeMs !== undefined && (
        <div className="roamer-timer frame frame-menu">FOGE EM {Math.ceil(enemy.fleeMs / 1000)}s</div>
      )}

      {/* Como nos portáteis: primeiro a janela de nível, depois a evolução. */}
      {evolutions[0] && !levelUp && (
        <EvolutionOverlay
          key={`evo-${evolutions[0].id}`}
          from={evolutions[0].from}
          to={evolutions[0].to}
          shiny={evolutions[0].shiny}
          reducedMotion={state.settings.reducedMotion || gfx === 'performance'}
          onReveal={() => setEvolving(null)}
          onDone={() => setEvolutions((list) => list.slice(1))}
        />
      )}
    </div>
  );
}

/** Bola arremessada + Pokémon sendo "sugado" para dentro, com balanço e resultado. */
function CaptureGhost({ anim, base: ENEMY_BASE }: { anim: CaptureAnim; base: { x: number; y: number } }) {
  const box = spriteBox(anim.speciesId, 'front', ENEMY_SCALE, ENEMY_MAX_H);
  const src = battleSpritePath(anim.speciesId, 'front', anim.shiny);
  return (
    <>
      <div
        className={`capture-ghost ${anim.success ? 'caught' : `escape s${anim.shakes}`}`}
        style={{
          left: `calc(var(--u) * ${ENEMY_BASE.x - box.feetX})`,
          top: `calc(var(--u) * ${ENEMY_BASE.y - box.feetY + 1})`,
          width: `calc(var(--u) * ${box.w})`,
          height: `calc(var(--u) * ${box.h})`,
        }}
      >
        <SpriteImage className="sprite" src={assetUrl(src)} alt="" />
      </div>
      <img
        className={`capture-ball ${anim.success ? 'caught' : `escape s${anim.shakes}`}`}
        src={assetUrl(getItem(anim.ball)?.sprite)}
        alt=""
        style={{
          ['--tx' as string]: `calc(var(--u) * ${ENEMY_BASE.x - 12})`,
          ['--ty' as string]: `calc(var(--u) * ${ENEMY_BASE.y - 22})`,
        }}
      />
      {anim.success && (
        <span
          className="capture-stars"
          style={{
            left: `calc(var(--u) * ${ENEMY_BASE.x - 4})`,
            top: `calc(var(--u) * ${ENEMY_BASE.y - 30})`,
          }}
        >
          <PixelIcon name="star" scale={2} />
          <PixelIcon name="star" scale={2} />
          <PixelIcon name="star" scale={2} />
        </span>
      )}
    </>
  );
}
