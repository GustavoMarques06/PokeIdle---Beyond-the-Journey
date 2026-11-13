// Cerimônias dos grandes momentos, como nos jogos:
// - Insígnia: o líder entrega, a insígnia gira grande no meio e cai no estojo da região, que acende o lugar dela.
// - Hall da Fama: a equipe campeã desfila um por um, com luz e fogos.
// - Faixas no alto (não travam o jogo): medalha conquistada, nível de treinador e "dados registrados" na Pokédex.
// Fecham com um toque (as faixas somem sozinhas). Várias de uma vez entram em fila.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ACHIEVEMENTS, BADGES, getRoute, type MedalTier } from '../../game-data';
import type { GameEvent, GameState } from '../../core/game';
import { trainerLevel } from '../../core/meta';
import { REGION_NAMES, badgeWord, formatNumber, speciesName, withBadgeArticle } from '../i18n/pt-BR';
import { audio } from '../audio';
import { useGameEvents } from '../useGame';
import { BadgeIcon, PixelIcon, PokemonSprite, TrainerSprite } from './common';
import { PixelFx } from './PixelFx';
import { Award } from './PixelUi';

type Modal = { kind: 'badge'; routeId: string } | { kind: 'hof'; regionId: string; at: number };
type Banner =
  | { kind: 'medal'; id: string }
  | { kind: 'trainer'; level: number }
  | { kind: 'dex'; speciesId: number; shiny: boolean };

const METAL: Record<MedalTier, 'bronze' | 'silver' | 'gold'> = {
  bronze: 'bronze',
  silver: 'silver',
  gold: 'gold',
  platinum: 'gold',
};
const TIER_NAME: Record<MedalTier, string> = {
  bronze: 'BRONZE',
  silver: 'PRATA',
  gold: 'OURO',
  platinum: 'PLATINA',
};

const BANNER_MS = 2800;

// Cerimônia na tela (insígnia, Hall da Fama): a história espera ela acabar para abrir o capítulo (senão o capítulo
// do Campeão cobria o Hall da Fama). Marcado já ao chegar o evento, para o capítulo não piscar antes.
let ceremonyOpen = false;
const listeners = new Set<() => void>();
function setCeremonyOpen(open: boolean): void {
  if (open === ceremonyOpen) return;
  ceremonyOpen = open;
  for (const l of listeners) l();
}
export function useCeremonyOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => ceremonyOpen,
  );
}

export function Ceremonies({ state }: { state: GameState }) {
  const [modals, setModals] = useState<(Modal & { n: number })[]>([]);
  const [banners, setBanners] = useState<(Banner & { n: number })[]>([]);
  const n = useRef(0);

  const onEvents = useCallback((events: GameEvent[]) => {
    const m: (Modal & { n: number })[] = [];
    const b: (Banner & { n: number })[] = [];
    for (const e of events) {
      if (e.type === 'bossDefeated' && e.badge) m.push({ kind: 'badge', routeId: e.routeId, n: ++n.current });
      else if (e.type === 'hallOfFame')
        m.push({ kind: 'hof', regionId: e.regionId, at: Date.now(), n: ++n.current });
      else if (e.type === 'achievement') b.push({ kind: 'medal', id: e.id, n: ++n.current });
      else if (e.type === 'captured' && e.isNew)
        b.push({ kind: 'dex', speciesId: e.speciesId, shiny: e.shiny, n: ++n.current });
    }
    if (m.length) {
      setCeremonyOpen(true);
      setModals((q) => [...q, ...m].slice(0, 4));
    }
    // Muitas de uma vez (ao voltar de longe, por exemplo): só as primeiras viram faixa.
    if (b.length) setBanners((q) => [...q, ...b].slice(0, 4));
  }, []);
  useGameEvents(onEvents);

  // Nível de treinador: não há evento, então compara com o último visto.
  const level = trainerLevel(state).level;
  const lastLevel = useRef(level);
  useEffect(() => {
    if (level > lastLevel.current)
      setBanners((q) => [...q, { kind: 'trainer' as const, level, n: ++n.current }].slice(0, 4));
    lastLevel.current = level;
  }, [level]);

  const modal = modals[0];
  const banner = banners[0];
  const closeModal = useCallback(() => setModals((q) => q.slice(1)), []);

  useEffect(() => {
    setCeremonyOpen(!!modal);
    if (!modal) return;
    audio.sfx('fanfare');
  }, [modal]);
  useEffect(() => () => setCeremonyOpen(false), []);

  useEffect(() => {
    if (!banner) return;
    audio.sfx(banner.kind === 'medal' ? 'achievement' : banner.kind === 'trainer' ? 'levelUp' : 'itemGet');
    const t = setTimeout(() => setBanners((q) => q.slice(1)), BANNER_MS);
    return () => clearTimeout(t);
  }, [banner]);

  return (
    <>
      {banner && <CeremonyBanner key={banner.n} banner={banner} />}
      {modal?.kind === 'badge' && (
        <BadgeCeremony key={modal.n} state={state} routeId={modal.routeId} onClose={closeModal} />
      )}
      {modal?.kind === 'hof' && (
        <HallOfFame key={modal.n} state={state} regionId={modal.regionId} onClose={closeModal} />
      )}
    </>
  );
}

/** Insígnia: o líder, a insígnia girando grande e o estojo da região acendendo o lugar dela. */
function BadgeCeremony({
  state,
  routeId,
  onClose,
}: {
  state: GameState;
  routeId: string;
  onClose: () => void;
}) {
  const route = getRoute(routeId);
  const boss = route.boss!;
  const badge = boss.badge!;
  const region = BADGES.filter((b) => b.regionId === route.regionId);
  return (
    <div className="cer-backdrop" role="dialog" aria-modal="true" aria-label={badge.name} onClick={onClose}>
      <div className="cer-badge">
        <span className="cer-rays" aria-hidden />
        <div className="cer-leader">
          <span className="cer-leader-sprite">
            <TrainerSprite id={boss.trainer} size={160} />
          </span>
          <p className="cer-quote">
            <b>{boss.name.toUpperCase()}</b>
            Você venceu! Esta é a prova da sua força: {withBadgeArticle(badge.name)}.
          </p>
        </div>
        <span className="cer-big-badge" aria-hidden>
          <BadgeIcon id={badge.id} name={badge.name} earned size={120} />
          <PixelFx fx="stars" scale={2} x="50%" y="50%" />
        </span>
        <h2 className="cer-title">{badge.name.toUpperCase()}!</h2>
        <div
          className="cer-case"
          aria-label={`${badgeWord(route.regionId, true)} de ${REGION_NAMES[route.regionId] ?? route.region}`}
        >
          {region.map((b, i) => (
            <span
              key={b.id}
              className={`cer-slot ${b.id === badge.id ? 'new' : ''}`}
              style={{ ['--i' as string]: i }}
            >
              <BadgeIcon id={b.id} name={b.name} size={40} earned={!!state.routes[b.routeId]?.bossDefeated} />
            </span>
          ))}
        </div>
        <small className="cer-tap">toque para continuar</small>
      </div>
    </div>
  );
}

/** Hall da Fama: a equipe campeã desfila um por um, com luz e fogos. */
function HallOfFame({
  state,
  regionId,
  onClose,
}: {
  state: GameState;
  regionId: string;
  onClose: () => void;
}) {
  const entry = [...state.hallOfFame].reverse().find((h) => h.regionId === regionId);
  if (!entry) return null;
  return (
    <div
      className="cer-backdrop hof"
      role="dialog"
      aria-modal="true"
      aria-label="Hall da Fama"
      onClick={onClose}
    >
      <div className="cer-hof">
        <span className="cer-rays" aria-hidden />
        <span className="cer-fireworks" aria-hidden>
          <PixelFx fx="firework" scale={3} x="15%" y="30%" />
          <PixelFx fx="firework" scale={3} x="85%" y="26%" speed={0.8} />
          <PixelFx fx="firework" scale={2} x="50%" y="12%" speed={1.2} />
        </span>
        <h2 className="cer-title">HALL DA FAMA</h2>
        <p className="cer-sub">
          CAMPEÃO DE {(REGION_NAMES[regionId] ?? regionId).toUpperCase()} · {state.trainerName.toUpperCase()}
        </p>
        <div className="hof-parade">
          {entry.team.map((m, i) => (
            <span key={i} className="hof-member" style={{ ['--i' as string]: i }}>
              <span className="hof-light" aria-hidden />
              <PokemonSprite speciesId={m.speciesId} kind="front" shiny={m.shiny} pixelScale={1} />
              <b>{speciesName(m.speciesId).toUpperCase()}</b>
              <small>Nv{m.level}</small>
            </span>
          ))}
        </div>
        <small className="cer-tap">toque para continuar</small>
      </div>
    </div>
  );
}

/** Faixa no alto: medalha, nível de treinador ou espécie nova na Pokédex. */
function CeremonyBanner({ banner }: { banner: Banner }) {
  if (banner.kind === 'medal') {
    const def = ACHIEVEMENTS.find((a) => a.id === banner.id);
    if (!def) return null;
    const reward = [
      def.reward.coins ? `₽${formatNumber(def.reward.coins)}` : '',
      def.reward.research ? `${def.reward.research} pesquisa` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <div className={`cer-banner medal tier-${def.tier}`} role="status">
        <span className="cer-medal">
          <Award kind="medal" metal={METAL[def.tier]} scale={2} />
        </span>
        <span className="cer-banner-text">
          <small>MEDALHA DE {TIER_NAME[def.tier]}!</small>
          <b>{def.name}</b>
          {reward && <small>{reward}</small>}
        </span>
        <PixelFx fx="stars" scale={2} x="16%" y="50%" />
      </div>
    );
  }
  if (banner.kind === 'trainer') {
    return (
      <div className="cer-banner trainer" role="status">
        <span className="cer-medal">
          <PixelIcon name="star" scale={3} />
        </span>
        <span className="cer-banner-text">
          <small>SUBIU DE NÍVEL!</small>
          <b>TREINADOR NÍVEL {banner.level}</b>
        </span>
        <PixelFx fx="levelup" scale={1} x="16%" y="70%" pivot />
      </div>
    );
  }
  return (
    <div className="cer-banner dex" role="status">
      <span className="cer-dex-mon">
        <PokemonSprite speciesId={banner.speciesId} kind="icon" shiny={banner.shiny} />
      </span>
      <span className="cer-banner-text">
        <small>POKéDEX · DADOS REGISTRADOS!</small>
        <b>{speciesName(banner.speciesId).toUpperCase()}</b>
      </span>
    </div>
  );
}
