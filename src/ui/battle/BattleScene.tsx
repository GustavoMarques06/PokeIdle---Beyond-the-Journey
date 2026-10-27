// Campo de batalha: cenário em pixel art, plataformas, sprites em escala real,
// caixas de status e efeitos (dano, impacto, captura, subida de nível).
// Só apresentação — a simulação continua no GameEngine independentemente daqui.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { assetUrl, getItem, getMove, getRoute, getSpecies, trainerSprite } from '../../game-data';
import { routeWeather } from '../../core/env';
import { legendaryDef, legendaryRules } from '../../core/legendary';
import { activePokemon, type GameEvent, type GameState, type StatusState } from '../../core/game';
import { reservePokemon } from '../../core/team';
import { isPerfect, statsOf } from '../../core/pokemon';
import { levelProgress } from '../../core/progression';
import { ExpBar, HpBar, PixelIcon, Shiny } from '../components/common';
import { STATUS_TEXT } from '../i18n/pt-BR';
import { useEngine, useGameEvents } from '../useGame';
import { ENEMY_BASE, PLAYER_BASE, SCENE_H, SCENE_THEMES, SCENE_W, paintScene } from './scene';
import { EvolutionOverlay } from './EvolutionOverlay';

const TYPE_SPARK: Record<string, string> = {
  fire: '#f89030',
  water: '#58a8f8',
  grass: '#78d050',
  electric: '#f8e030',
  ice: '#a0f0f8',
  poison: '#c060d0',
  psychic: '#f870a8',
  ghost: '#8870c8',
  dark: '#806860',
  fairy: '#f8a8d8',
  dragon: '#8068f8',
  fighting: '#e06040',
  rock: '#c8a858',
  ground: '#d8b868',
  bug: '#b8d030',
  steel: '#b8c0d8',
  flying: '#b0c8f8',
};

interface Floater {
  id: number;
  side: 'player' | 'enemy';
  text: string;
  tone: 'normal' | 'super' | 'weak' | 'miss' | 'crit' | 'status';
}

/** Sigla de status ao lado do nome (QMD, ENV, PAR, DRM, CGL), como nas caixas do GBA. */
function StatusTag({ status }: { status?: StatusState | null }) {
  if (!status) return null;
  const t = STATUS_TEXT[status.kind];
  return (
    <span className={`status-tag status-${status.kind}`} title={t.name}>
      {t.short}
    </span>
  );
}

interface Spark {
  id: number;
  side: 'player' | 'enemy';
  color: string;
  big: boolean;
}

interface CaptureAnim {
  id: number;
  ball: string;
  success: boolean;
  speciesId: number;
  shiny: boolean;
  /** Identidade do inimigo no momento do arremesso. */
  enemyKey: string | null;
}

const keyOf = (e: { speciesId: number; level: number; maxHp: number } | null) =>
  e ? `${e.speciesId}:${e.level}:${e.maxHp}` : null;

/** Escala dos sprites (pixels virtuais por pixel do sprite) e altura máxima no cenário. */
const ENEMY_SCALE = 1.25;
const ENEMY_MAX_H = 66;
const PLAYER_SCALE = 1.65;
const PLAYER_MAX_H = 96;

function spriteBox(speciesId: number, kind: 'front' | 'back', scale: number, maxH: number) {
  const [w, h] = getSpecies(speciesId).spriteSize?.[kind] ?? [64, 64];
  const k = Math.min(scale, maxH / h);
  return { w: w * k, h: h * k };
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
}: {
  speciesId: number;
  kind: 'front' | 'back';
  shiny: boolean;
  base: { x: number; y: number };
  scale: number;
  maxH: number;
  className?: string;
  innerRef?: Ref<HTMLDivElement>;
}) {
  const s = getSpecies(speciesId).sprites;
  const src = kind === 'front' ? (shiny && s.frontShiny) || s.front : (shiny && s.backShiny) || s.back;
  const box = spriteBox(speciesId, kind, scale, maxH);
  return (
    <>
      <span
        className="ground-shadow"
        style={{
          left: `calc(var(--u) * ${base.x - box.w * 0.36})`,
          top: `calc(var(--u) * ${base.y - 3})`,
          width: `calc(var(--u) * ${box.w * 0.72})`,
          height: `calc(var(--u) * 6)`,
        }}
      />
      <div
        ref={innerRef}
        className={`battle-mon battle-mon-${kind} ${className}`}
        style={{
          left: `calc(var(--u) * ${base.x - box.w / 2})`,
          top: `calc(var(--u) * ${base.y - box.h + 1})`,
          width: `calc(var(--u) * ${box.w})`,
          height: `calc(var(--u) * ${box.h})`,
        }}
      >
        <img className="sprite" src={assetUrl(src)} alt={getSpecies(speciesId).name} draggable={false} />
      </div>
    </>
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
  const [capture, setCapture] = useState<CaptureAnim | null>(null);
  const [levelUp, setLevelUp] = useState<{ id: number; level: number } | null>(null);
  const [evolutions, setEvolutions] = useState<{ id: number; from: number; to: number; shiny: boolean }[]>(
    [],
  );
  const [shake, setShake] = useState(0);

  const b = state.battle;
  const route = getRoute(b.routeId);
  // A Torre de Batalha é sempre num salão; o resto segue o cenário da rota.
  const sceneKey = b.kind === 'tower' ? 'city' : route.scene;
  const theme = SCENE_THEMES[sceneKey] ?? 'meadow';
  const weather = b.kind === 'tower' ? 'clear' : routeWeather(route, state.env);
  const night =
    state.env.period === 'night' &&
    b.kind !== 'tower' &&
    !['cave', 'icecave', 'dampcave', 'volcano'].includes(sceneKey);

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
      const motion = !st.settings.reducedMotion;
      for (const e of events) {
        if (e.type === 'attack') {
          const target = e.side === 'player' ? 'enemy' : 'player';
          const r = e.result;
          if (motion) {
            const [attackerEl, targetEl] =
              e.side === 'player'
                ? [playerRef.current, enemyRef.current]
                : [enemyRef.current, playerRef.current];
            const dir = e.side === 'player' ? 1 : -1;
            attackerEl?.animate(
              [
                { transform: 'translate(0, 0)' },
                { transform: `translate(calc(var(--u) * ${dir * 10}), calc(var(--u) * ${-dir * 5}))` },
                { transform: 'translate(0, 0)' },
              ],
              { duration: 240, easing: 'steps(3, end)' },
            );
            if (r.damage > 0) {
              targetEl?.animate(
                [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
                {
                  duration: 320,
                  delay: 140,
                  easing: 'steps(1, end)',
                },
              );
              const id = nextId.current++;
              const color = TYPE_SPARK[getMove(r.moveId).type] ?? '#ffffff';
              setSparks((list) => [
                ...list.slice(-4),
                { id, side: target, color, big: r.effectiveness > 1 || r.crit },
              ]);
              setTimeout(() => setSparks((list) => list.filter((x) => x.id !== id)), 300);
              if (r.effectiveness > 1 || r.crit) setShake((n) => n + 1);
            }
          }
          if (st.settings.showDamageNumbers) {
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
            setFloaters((list) => [...list.slice(-6), f]);
            setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
          }
        } else if (e.type === 'statusDamage' && st.settings.showDamageNumbers) {
          const f: Floater = { id: nextId.current++, side: e.side, text: `-${e.damage}`, tone: 'status' };
          setFloaters((list) => [...list.slice(-6), f]);
          setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
        } else if (e.type === 'captureAttempt') {
          const enemy = st.battle.enemy;
          setCapture({
            id: nextId.current++,
            ball: e.ball,
            success: e.success,
            speciesId: e.speciesId,
            shiny: enemy?.shiny ?? false,
            enemyKey: keyOf(enemy),
          });
        } else if (e.type === 'levelUp') {
          const id = nextId.current++;
          setLevelUp({ id, level: e.level });
          setTimeout(() => setLevelUp((cur) => (cur?.id === id ? null : cur)), 1500);
        } else if (e.type === 'evolved') {
          const p = st.collection.find((x) => x.uid === e.uid);
          setEvolutions((list) => [
            ...list,
            { id: nextId.current++, from: e.from, to: e.to, shiny: p?.shiny ?? false },
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
    const t = setTimeout(() => setCapture(null), capture.success ? 2300 : 1500);
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
      { duration: 200, easing: 'steps(4, end)' },
    );
  }, [shake]);

  const player = activePokemon(state);
  const pStats = statsOf(player);
  const reserves = reservePokemon(state);
  const enemy = b.enemy;
  // Uma tentativa que falhou só é mostrada enquanto o mesmo inimigo está em campo.
  const staleEscape = capture !== null && !capture.success && keyOf(enemy) !== capture.enemyKey;
  const hideEnemy = capture !== null && !staleEscape;
  const playerBox = spriteBox(player.speciesId, 'back', PLAYER_SCALE, PLAYER_MAX_H);
  const enemyBox = enemy ? spriteBox(enemy.speciesId, 'front', ENEMY_SCALE, ENEMY_MAX_H) : { w: 40, h: 40 };

  return (
    <div className={`scene theme-${theme}`} ref={wrapRef} aria-label="Campo de batalha">
      <canvas ref={canvasRef} width={SCENE_W} height={SCENE_H} className="scene-canvas" />
      {state.settings.illustratedScenes && (
        <img
          className="scene-backdrop"
          src={assetUrl(`sprites/backgrounds/${sceneKey}.png`)}
          alt=""
          draggable={false}
        />
      )}
      {night && <span className="scene-night" aria-hidden />}
      {weather !== 'clear' && !state.settings.reducedMotion && (
        <span className={`scene-weather weather-${weather}`} aria-hidden />
      )}

      {enemy && !hideEnemy && (
        <BattleSprite
          speciesId={enemy.speciesId}
          kind="front"
          shiny={enemy.shiny}
          base={ENEMY_BASE}
          scale={ENEMY_SCALE}
          maxH={ENEMY_MAX_H}
          innerRef={enemyRef}
          className="idle-a"
        />
      )}
      {capture && !staleEscape && <CaptureGhost anim={capture} />}

      <BattleSprite
        speciesId={player.speciesId}
        kind="back"
        shiny={player.shiny}
        base={PLAYER_BASE}
        scale={PLAYER_SCALE}
        maxH={PLAYER_MAX_H}
        innerRef={playerRef}
        className={`idle-b ${b.phase === 'defeat' ? 'fainted' : ''}`}
      />

      {enemy && (
        <div className="status-box status-enemy frame frame-status">
          <div className="status-name">
            <span>
              {getSpecies(enemy.speciesId).name.toUpperCase()}
              {enemy.shiny && <Shiny />}
              <StatusTag status={enemy.status} />
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
        </div>
      )}

      <div className="status-box status-player frame frame-status">
        <div className="status-name">
          <span>
            {getSpecies(player.speciesId).name.toUpperCase()}
            {player.shiny && <Shiny />}
            <StatusTag status={b.playerStatus} />
          </span>
          <span className="status-level">Nv{player.level}</span>
        </div>
        {reserves.length > 0 && (
          <div className="party-balls" title="Equipe de batalha: ativo + reservas">
            {[player, ...reserves].map((p) => (
              <span key={p.uid} className={p.currentHp > 0 ? '' : 'fainted'}>
                <PixelIcon name="miniBall" scale={2} />
              </span>
            ))}
          </div>
        )}
        <HpBar value={player.currentHp} max={pStats.hp} />
        <div className="status-hp">
          {player.currentHp}/ {pStats.hp}
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
      {sparks.map((s) => (
        <span
          key={s.id}
          className={`spark ${s.big ? 'big' : ''}`}
          style={
            s.side === 'enemy'
              ? {
                  left: `calc(var(--u) * ${ENEMY_BASE.x})`,
                  top: `calc(var(--u) * ${ENEMY_BASE.y - enemyBox.h / 2})`,
                }
              : {
                  left: `calc(var(--u) * ${PLAYER_BASE.x})`,
                  top: `calc(var(--u) * ${PLAYER_BASE.y - playerBox.h / 2})`,
                }
          }
        >
          <PixelIcon name="spark" scale={1} palette={{ c: s.color }} />
        </span>
      ))}

      {levelUp && (
        <div key={levelUp.id} className="levelup-pop frame frame-menu">
          <PixelIcon name="arrowUp" scale={2} /> Nv. {levelUp.level}!
        </div>
      )}

      {b.kind !== 'wild' && b.trainer && (
        <>
          <img
            className="boss-trainer"
            src={assetUrl(trainerSprite(b.trainer.sprite))}
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

      {evolutions[0] && (
        <EvolutionOverlay
          key={evolutions[0].id}
          from={evolutions[0].from}
          to={evolutions[0].to}
          shiny={evolutions[0].shiny}
          reducedMotion={state.settings.reducedMotion}
          onDone={() => setEvolutions((list) => list.slice(1))}
        />
      )}
    </div>
  );
}

/** Bola arremessada + Pokémon sendo "sugado" para dentro, com balanço e resultado. */
function CaptureGhost({ anim }: { anim: CaptureAnim }) {
  const box = spriteBox(anim.speciesId, 'front', ENEMY_SCALE, ENEMY_MAX_H);
  const s = getSpecies(anim.speciesId).sprites;
  const src = (anim.shiny && s.frontShiny) || s.front;
  return (
    <>
      <div
        className={`capture-ghost ${anim.success ? 'caught' : 'escape'}`}
        style={{
          left: `calc(var(--u) * ${ENEMY_BASE.x - box.w / 2})`,
          top: `calc(var(--u) * ${ENEMY_BASE.y - box.h + 1})`,
          width: `calc(var(--u) * ${box.w})`,
          height: `calc(var(--u) * ${box.h})`,
        }}
      >
        <img className="sprite" src={assetUrl(src)} alt="" />
      </div>
      <img
        className={`capture-ball ${anim.success ? 'caught' : 'escape'}`}
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
