// Campo de batalha: cenário em pixel art, plataformas, sprites em escala real,
// caixas de status e efeitos (dano, impacto, captura, subida de nível).
// Só apresentação — a simulação continua no GameEngine independentemente daqui.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react';
import {
  BALANCE,
  assetUrl,
  formSet,
  formSprite,
  getItem,
  getMove,
  getRoute,
  getSpecies,
  spriteFeet,
  trainerSprite,
} from '../../game-data';
import { routeWeather } from '../../core/env';
import { legendaryDef, legendaryRules } from '../../core/legendary';
import {
  activePokemon,
  battleForm,
  bestRod,
  harvestTree,
  treeBerry,
  treeReady,
  type GameEvent,
  type GameState,
  type StatusState,
} from '../../core/game';
import { rngFrom } from '../../core/rng';
import { reservePokemon } from '../../core/team';
import { isPerfect, pokemonName, statsOf } from '../../core/pokemon';
import { levelProgress } from '../../core/progression';
import { ExpBar, HpBar, ItemIcon, PixelIcon, Shiny } from '../components/common';
import { STATUS_TEXT, formatDuration, itemName, speciesName } from '../i18n/pt-BR';
import { useEngine, useGameEvents } from '../useGame';
import { audio } from '../audio';
import { useHotkeys } from '../hotkeys';
import { takePhoto } from '../photo';
import { ENEMY_BASE, PLAYER_BASE, SCENE_H, SCENE_THEMES, SCENE_W, paintScene } from './scene';
import { EvolutionOverlay } from './EvolutionOverlay';
import { MoveFx, SendOutBall, ShinySparkle } from './effects';

interface Floater {
  id: number;
  side: 'player' | 'enemy';
  text: string;
  tone: 'normal' | 'super' | 'weak' | 'miss' | 'crit' | 'status' | 'heal';
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
  /** Tipo do golpe (define o efeito). */
  type: string;
  big: boolean;
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

/**
 * Tamanho do sprite no cenário e onde ficam os pés: `feetX` é a distância da borda esquerda ao
 * centro dos pés e `feetY` a do topo à linha mais baixa desenhada (o ponto que pousa sobre a
 * base); `feetW` é a largura da sombra.
 */
function spriteBox(speciesId: number, kind: 'front' | 'back', scale: number, maxH: number, form?: string) {
  const feet = spriteFeet(speciesId, kind, formSprite(speciesId, form, kind) ? form : undefined);
  const [w, h] = feet ? [feet[5], feet[6]] : (getSpecies(speciesId).spriteSize?.[kind] ?? [64, 64]);
  const [cx, fw, bottom, top, hover] = feet ?? [w / 2, w * 0.6, h, 0, 0];
  // A altura máxima vale para o desenho, não para a margem vazia em volta dele.
  const k = Math.min(scale, maxH / Math.max(1, bottom - top));
  // Asas e caudas muito longas não podem empurrar o corpo para fora do cenário.
  const feetX = Math.min(0.72, Math.max(0.28, cx / w)) * w * k;
  const feetW = Math.min(0.85, Math.max(0.4, (fw * 1.25) / w)) * w * k;
  // Quem voa/flutua na animação ganha uma sombra menor, que pulsa com o bater de asas.
  return { w: w * k, h: h * k, feetX, feetY: bottom * k, feetW, hovering: hover >= 0.1 };
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
  const s = getSpecies(speciesId).sprites;
  const src =
    formSprite(speciesId, form, kind, shiny) ??
    (kind === 'front' ? (shiny && s.frontShiny) || s.front : (shiny && s.backShiny) || s.back);
  const box = spriteBox(speciesId, kind, scale, maxH, form);
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
        <img className="sprite" src={assetUrl(src)} alt={getSpecies(speciesId).name} draggable={false} />
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
  const [capture, setCapture] = useState<CaptureAnim | null>(null);
  const [levelUp, setLevelUp] = useState<{ id: number; level: number } | null>(null);
  const [evolutions, setEvolutions] = useState<{ id: number; from: number; to: number; shiny: boolean }[]>(
    [],
  );
  const [shake, setShake] = useState(0);
  const [shinyFx, setShinyFx] = useState<number | null>(null);

  const animSpeed = state.settings.animSpeed || 1;
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
      const speed = st.settings.animSpeed || 1;
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
              { duration: 240 / speed, easing: 'steps(3, end)' },
            );
            if (r.damage > 0) {
              targetEl?.animate(
                [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
                {
                  duration: 320 / speed,
                  delay: 140 / speed,
                  easing: 'steps(1, end)',
                },
              );
              const id = nextId.current++;
              const type = getMove(r.moveId).type;
              setSparks((list) => [
                ...list.slice(-4),
                { id, side: target, type, big: r.effectiveness > 1 || r.crit },
              ]);
              setTimeout(() => setSparks((list) => list.filter((x) => x.id !== id)), 700 / speed);
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
        } else if (e.type === 'effect' && e.amount && st.settings.showDamageNumbers) {
          const f: Floater = { id: nextId.current++, side: e.side, text: `+${e.amount}`, tone: 'heal' };
          setFloaters((list) => [...list.slice(-6), f]);
          setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== f.id)), 800);
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
        } else if (e.type === 'spawn' && motion) {
          if (e.shiny) {
            const id = nextId.current++;
            setShinyFx(id);
            setTimeout(() => setShinyFx((cur) => (cur === id ? null : cur)), 1300);
          }
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
      { duration: 200 / animSpeed, easing: 'steps(4, end)' },
    );
    // Só dispara quando um novo tremor é pedido; a velocidade vale a do momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shake]);

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

  const player = activePokemon(state);
  const pStats = statsOf(player);
  // Entrada com Poké Ball: o sprite é recriado a cada Pokémon novo (key), e a animação de CSS
  // roda sozinha na montagem — para o jogador sempre, para o inimigo nas lutas de treinador.
  const trainerFoe =
    b.kind === 'boss' || b.kind === 'rocket' || b.kind === 'tower' || b.kind === 'tournament';
  const shownHp = useCountTo(player.currentHp);
  // Entardecer e amanhecer (só visual; o jogo conta dia e noite).
  const hour = new Date(state.lastTimerAt).getHours();
  const skyTint =
    b.kind === 'tower' || ['cave', 'icecave', 'dampcave', 'volcano', 'city'].includes(sceneKey)
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
  const hideEnemy = capture !== null && !staleEscape;
  // Castform muda com o clima; Unown, Deerling e Spinda mostram a forma deles.
  const playerForm = battleForm(player.speciesId, player.form, weather);
  const enemyForm = enemy ? battleForm(enemy.speciesId, enemy.form, weather) : undefined;
  const playerBox = spriteBox(player.speciesId, 'back', PLAYER_SCALE, PLAYER_MAX_H, playerForm);
  const enemyBox = enemy
    ? spriteBox(enemy.speciesId, 'front', ENEMY_SCALE, ENEMY_MAX_H, enemyForm)
    : { w: 40, h: 40 };

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
      className={`scene theme-${theme} ${enemy?.water ? `mode-${enemy.water}` : ''}`}
      ref={wrapRef}
      aria-label="Campo de batalha"
    >
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
      {skyTint && <span className={`scene-${skyTint}`} aria-hidden />}
      {enemy?.water === 'surf' && <span className="scene-water" aria-hidden />}

      {areaBanner && (
        <div
          key={areaBanner.id}
          className={`area-banner ${state.settings.reducedMotion ? 'still' : ''}`}
          style={{ ['--speed' as string]: animSpeed }}
          aria-live="polite"
        >
          <div className="area-sign frame frame-sign">
            <strong>{areaBanner.name}</strong>
            <small>{areaBanner.region}</small>
          </div>
        </div>
      )}
      {weather !== 'clear' && !state.settings.reducedMotion && (
        <span
          className={`scene-weather weather-${weather}`}
          style={{ backgroundImage: `url(${assetUrl(`sprites/weather/${weather}.png`)})` }}
          aria-hidden
        />
      )}

      <div className="scene-hud">
        {enemy?.water && (
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
        <span key={treeMsg.id} className="scene-toast">
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
          scale={ENEMY_SCALE}
          maxH={ENEMY_MAX_H}
          innerRef={enemyRef}
          className={`idle-a ${enemy.rage ? `rage-${enemy.rage}` : ''} ${enemy.status ? `st-${enemy.status.kind}` : ''} ${trainerFoe ? 'sending-out' : ''}`}
        />
      )}
      {capture && !staleEscape && <CaptureGhost anim={capture} />}

      <BattleSprite
        key={player.uid}
        speciesId={player.speciesId}
        form={playerForm}
        kind="back"
        shiny={player.shiny}
        base={PLAYER_BASE}
        scale={PLAYER_SCALE}
        maxH={PLAYER_MAX_H}
        innerRef={playerRef}
        className={`idle-b ${b.phase === 'defeat' ? 'fainted' : ''} ${b.playerStatus ? `st-${b.playerStatus.kind}` : ''} sending-out`}
      />

      {enemy && (
        <div className="status-box status-enemy frame frame-status">
          <div className="status-name">
            <span>
              {getSpecies(enemy.speciesId).name.toUpperCase()}
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
        </div>
      )}

      <div className="status-box status-player frame frame-status">
        <div className="status-name">
          <span>
            {pokemonName(player).toUpperCase()}
            {player.shiny && <Shiny />}
            <StatusTag status={b.playerStatus} />
            {player.held && <ItemIcon id={player.held} size={14} className="held-mark" />}
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
          {shownHp}/ {pStats.hp}
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
        <MoveFx
          key={s.id}
          id={s.id}
          type={s.type}
          big={s.big}
          speed={animSpeed}
          x={s.side === 'enemy' ? ENEMY_BASE.x : PLAYER_BASE.x}
          y={s.side === 'enemy' ? ENEMY_BASE.y - enemyBox.h / 2 : PLAYER_BASE.y - playerBox.h / 2}
        />
      ))}
      {shinyFx !== null && enemy?.shiny && (
        <ShinySparkle key={shinyFx} x={ENEMY_BASE.x} y={ENEMY_BASE.y - enemyBox.h / 2} />
      )}
      <SendOutBall key={`p-${player.uid}`} x={PLAYER_BASE.x} y={PLAYER_BASE.y - 12} />
      {trainerFoe && enemy && <SendOutBall key={`e-${keyOf(enemy)}`} x={ENEMY_BASE.x} y={ENEMY_BASE.y - 8} />}

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
      {b.kind === 'raid' && (
        <div className="boss-banner raid-banner">
          RAIDE
          <small>
            {Math.ceil((b.raidMs ?? 0) / 1000)} S · FÚRIA {enemy?.rage ?? 0}/{BALANCE.raid.rageAt.length}
          </small>
        </div>
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
          left: `calc(var(--u) * ${ENEMY_BASE.x - box.feetX})`,
          top: `calc(var(--u) * ${ENEMY_BASE.y - box.feetY + 1})`,
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
