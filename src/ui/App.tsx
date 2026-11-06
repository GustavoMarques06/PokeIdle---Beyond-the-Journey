import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from 'react';
import type { GameEvent, GameState } from '../core/game';
import { pokemonName } from '../core/pokemon';
import { audio } from './audio';
import { BattleDialog, type ScreenId } from './battle/BattleDialog';
import { openHelp } from './help/open';
import { BattleScene } from './battle/BattleScene';
import { GameMenu, MENU_ITEMS, menuFlag, menuKey, menuUnlocked } from './components/GameMenu';
import { Hud } from './components/Hud';
import { OfflineReport } from './components/OfflineReport';
import { ProfessorCall } from './components/ProfessorCall';
import { SaveIndicator } from './components/SaveIndicator';
import { Intro } from './intro/Intro';
import { SafetyNotice } from './components/SafetyNotice';
import { PerfSuggest } from './components/PerfSuggest';
import { setPerfMode, usePerfMode } from './perfMode';
import { Toasts } from './components/Toasts';
import { TouchTips } from './components/TouchTips';
import { UpdateNotice } from './components/UpdateNotice';
import { useHotkeys } from './hotkeys';
import { MonSheet, PartyScreen, TeamDetails } from './screens/PartyScreen';
import { seenFlag, tipFlag, unseenTabs, type Tab } from './screens/activities/tabs';
import { NextSteps } from './components/NextSteps';
import { useEngine, useGameEvents, useGameState } from './useGame';

// A tela de equipe abre primeiro; as demais vêm em pedaços separados, baixados em segundo
// plano logo depois que o jogo abre (preloadScreens). Sem isso, a primeira abertura de cada
// aba mostrava "Carregando…" por no mínimo ~300 ms (o React segura o aviso para não piscar).
const screenLoaders: (() => Promise<unknown>)[] = [];
type ScreenModule<P = { state: GameState }> = { default: ComponentType<P> };

function lazyScreen<P = { state: GameState }>(load: () => Promise<ScreenModule<P>>) {
  screenLoaders.push(load);
  return lazy(load);
}

/** Baixa (no teste: compila) todas as telas sob demanda. */
export function preloadScreens(): Promise<void> {
  return Promise.all(screenLoaders.map((load) => load())).then(() => undefined);
}

const ActivitiesScreen = lazyScreen(() =>
  import('./screens/ActivitiesScreen').then((m) => ({ default: m.ActivitiesScreen })),
);
const BagScreen = lazyScreen(() => import('./screens/BagScreen').then((m) => ({ default: m.BagScreen })));
const DexScreen = lazyScreen(() => import('./screens/DexScreen').then((m) => ({ default: m.DexScreen })));
const MapScreen = lazyScreen(() => import('./screens/MapScreen').then((m) => ({ default: m.MapScreen })));
const ShopScreen = lazyScreen(() => import('./screens/ShopScreen').then((m) => ({ default: m.ShopScreen })));
const MissionsScreen = lazyScreen(() =>
  import('./screens/MissionsScreen').then((m) => ({ default: m.MissionsScreen })),
);
const TrainerScreen = lazyScreen(() =>
  import('./screens/TrainerScreen').then((m) => ({ default: m.TrainerScreen })),
);
const PcScreen = lazyScreen(() => import('./screens/PcScreen').then((m) => ({ default: m.PcScreen })));
const UpgradesScreen = lazyScreen(() =>
  import('./screens/UpgradesScreen').then((m) => ({ default: m.UpgradesScreen })),
);

export function App() {
  const engine = useEngine();
  // O App só decide abertura × jogo, opções e música: uma vez por segundo basta (as regiões do
  // jogo assinam por conta própria; ações do jogador chegam na hora).
  const state = useGameState(1000);
  // Quem abre o jogo com save começa na tela de título (CONTINUAR); quem acabou de criar ou
  // carregar uma jornada entra direto.
  const [atTitle, setAtTitle] = useState(() => engine.state !== null);
  const inGame = !!state && !atTitle;
  const inGameRef = useRef(inGame);
  useEffect(() => {
    inGameRef.current = inGame;
  }, [inGame]);

  // Áudio: liberado no primeiro gesto do usuário e alimentado pelos eventos do jogo.
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  if (state) audio.configure(state.settings);
  const highContrast = state?.settings.highContrast ?? false;
  const largeText = state?.settings.largeText ?? false;
  // Sem save ainda, segue a preferência do sistema (o jogador pode mudar nas Opções).
  const graphics = state?.settings.graphics ?? 'normal';
  const reducedMotion =
    state?.settings.reducedMotion ?? !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    document.documentElement.classList.toggle('hc', highContrast);
    document.documentElement.classList.toggle('large-text', largeText);
    // O Desempenho aproveita tudo o que já desliga movimento (são dezenas de regras).
    document.documentElement.classList.toggle('reduced-motion', reducedMotion || graphics === 'performance');
    document.documentElement.classList.toggle('gfx-performance', graphics === 'performance');
    setPerfMode(graphics === 'performance');
  }, [highContrast, largeText, reducedMotion, graphics]);
  // Na abertura, a batalha que segue rodando ao fundo fica em silêncio.
  useGameEvents(useCallback((events: GameEvent[]) => inGameRef.current && audio.play(events), []));

  useHotkeys({
    Escape: () => {
      if (engine.offlineReport) engine.dismissOfflineReport();
      else if (engine.notice) engine.dismissNotice();
    },
  });

  return (
    <>
      {engine.notice && (
        <div className="notice frame frame-dialog" role="alert">
          <p>{engine.notice}</p>
          <button className="pbtn small" onClick={() => engine.dismissNotice()}>
            OK
          </button>
        </div>
      )}
      <UpdateNotice />
      <TouchTips />
      {inGame ? <GameScreen state={state} /> : <Intro save={state} onEnter={() => setAtTitle(false)} />}
      {inGame && !engine.offlineReport && <ProfessorCall state={state} />}
      {inGame && engine.offlineReport && (
        <OfflineReport report={engine.offlineReport} onClose={() => engine.dismissOfflineReport()} />
      )}
      {inGame && <Toasts />}
      {inGame && <SafetyNotice />}
      {inGame && <PerfSuggest />}
      {inGame && <SaveIndicator />}
    </>
  );
}

const BOSS_MUSIC = new Set<GameState['battle']['kind']>(['boss', 'legendary', 'raid', 'ghost']);

const IDLE_MS = 12_000;

/** true depois de IDLE_MS sem mouse, toque ou teclado: o HUD esmaece e a batalha fica em foco. */
function useIdle(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = 0;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    wake();
    return () => {
      clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, []);
  return idle;
}

/** O que abre na janela além das telas do menu: a ficha de um Pokémon ou os bônus e equipes salvas. */
type Detail = number | 'team' | null;

function GameScreen({ state }: { state: GameState }) {
  const [screen, setScreen] = useState<ScreenId>('party');
  const [detail, setDetail] = useState<Detail>(null);
  // Aba de ATIVIDADES pedida pelo painel de próximos passos (abre direto nela).
  const [activityTab, setActivityTab] = useState<Tab | undefined>(undefined);
  const area = useRef<HTMLDivElement>(null);
  const idle = useIdle();
  // O menu inicial pode ter rolado (no celular, o foco automático rola a página): o jogo sempre começa no topo.
  // (Entre chaves: nos navegadores novos, scrollTo devolve uma Promise, que o React tomaria por função de limpeza.)
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, []);
  // Baixa as outras telas quando o navegador estiver ocioso (ou logo depois, sem essa API).
  useEffect(() => {
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(() => void preloadScreens(), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => void preloadScreens(), 200);
    return () => window.clearTimeout(id);
  }, []);
  const engine = useEngine();
  const open = useCallback(
    (id: ScreenId, viaKeyboard = false, tab?: Tab) => {
      // Abrir uma aba (pelo menu, por atalho ou por outra tela) a deixa de vez no menu, sem o NOVO.
      if (!engine.state?.flags.includes(menuFlag(id)))
        engine.dispatch((s) => void s.flags.push(menuFlag(id)));
      // A AJUDA é uma página à parte, em outra aba do navegador.
      if (id === 'help') return openHelp();
      setScreen(id);
      setDetail(null);
      setActivityTab(tab);
      // Pelo teclado, o foco vai para a tela aberta (leitores de tela anunciam o conteúdo novo).
      if (viaKeyboard) requestAnimationFrame(() => area.current?.focus({ preventScroll: true }));
    },
    [engine],
  );
  const closeWindow = useCallback(() => {
    setScreen('party');
    setDetail(null);
  }, []);
  // Pelo menu ou pelo atalho, a tela que já está aberta fecha a janela.
  const toggle = useCallback<Open>(
    (id, viaKeyboard, tab) => (id === screen && id !== 'party' ? closeWindow() : open(id, viaKeyboard, tab)),
    [screen, open, closeWindow],
  );
  useHotkeys(
    Object.fromEntries(
      MENU_ITEMS.flatMap((item, i) =>
        menuUnlocked(state, item.id) ? [[menuKey(i), () => toggle(item.id, true)]] : [],
      ),
    ),
  );
  // Música: tema de chefe nas lutas que valem algo (líder, rival, Elite, lendário, raide); fora
  // delas, o tema das rotas de dia ou o da noite, pelo relógio do jogo.
  const bossFight = BOSS_MUSIC.has(state.battle.kind);
  const night = state.env.period === 'night';
  useEffect(() => audio.setTrack(bossFight ? 'boss' : night ? 'night' : 'game'), [bossFight, night]);
  // Onboarding: quem já jogava antes desta versão não vê como NOVAS as atividades que já conhece.
  const onboarded = state.flags.includes('onboarding');
  useEffect(() => {
    if (onboarded) return;
    engine.dispatch((s) => {
      if (s.stats.totalKills > 200) {
        for (const tab of unseenTabs(s)) s.flags.push(seenFlag(tab), tipFlag(tab));
      }
      s.flags.push('onboarding');
    });
  }, [engine, onboarded]);

  return (
    <div
      className={`game game-enter ${idle ? 'idle' : ''} ${screen !== 'party' || detail !== null ? 'window-open' : ''}`}
    >
      <nav className="skip-links" aria-label="Atalhos de navegação">
        <a href="#game-menu">Pular para o menu</a>
        <a href="#screen-area">Pular para a tela aberta</a>
      </nav>
      <LiveHud open={open} />
      <LiveBattle open={open} />
      <LiveSide screen={screen} detail={detail} open={open} toggle={toggle} onDetail={setDetail} />
      {(screen !== 'party' || detail !== null) && (
        <LiveWindow
          screen={screen}
          detail={detail}
          activityTab={activityTab}
          onClose={closeWindow}
          area={area}
        />
      )}
    </div>
  );
}

// Cada região assina o motor no seu ritmo (ver useGameState): a batalha a cada passo, o resto
// algumas vezes por segundo. Com `memo`, o GameScreen (que muda pouco) não as arrasta junto.
const HUD_MS = 250;
const SIDE_MS = 400;
// No Desempenho, menos ainda: as ações do jogador continuam chegando na hora.
const PERF_BATTLE_MS = 300;
const PERF_SLOW_MS = 1000;

type Open = (id: ScreenId, viaKeyboard?: boolean, tab?: Tab) => void;

const LiveHud = memo(function LiveHud({ open }: { open: Open }) {
  const state = useGameState(usePerfMode() ? PERF_SLOW_MS : HUD_MS)!;
  return <Hud state={state} onOpenMap={() => open('map')} />;
});

const LiveBattle = memo(function LiveBattle({ open }: { open: Open }) {
  const state = useGameState(usePerfMode() ? PERF_BATTLE_MS : 0)!;
  return (
    <main className="battle-column">
      <BattleScene state={state} />
      <BattleDialog state={state} onOpen={open} />
    </main>
  );
});

/** A coluna lateral é o que se olha o tempo todo: o menu e a equipe. Todo o resto abre na janela. */
const LiveSide = memo(function LiveSide({
  screen,
  detail,
  open,
  toggle,
  onDetail,
}: {
  screen: ScreenId;
  detail: Detail;
  open: Open;
  toggle: Open;
  onDetail: (d: Detail) => void;
}) {
  const state = useGameState(usePerfMode() ? PERF_SLOW_MS : SIDE_MS)!;
  const switchToParty = () => {
    if (screen !== 'party') open('party');
  };
  return (
    <aside className="side-column">
      <GameMenu state={state} current={screen} onSelect={toggle} />
      {state.settings.nextSteps && (
        <NextSteps
          state={state}
          onOpen={(t) => open(t.screen, false, t.screen === 'activities' ? (t.tab as Tab) : undefined)}
        />
      )}
      <div className="screen-area" role="region" aria-label="Equipe">
        <PartyScreen
          state={state}
          onOpenPc={() => open('pc')}
          onOpenMon={(uid) => {
            switchToParty();
            onDetail(uid);
          }}
          onOpenDetails={() => {
            switchToParty();
            onDetail('team');
          }}
          openMon={typeof detail === 'number' ? detail : undefined}
        />
      </div>
    </aside>
  );
});

/**
 * Janela flutuante: cada tela tem o espaço que precisa e a batalha nunca some. Ao abrir, a batalha encolhe e fica inteira
 * à esquerda, e a janela ocupa a direita, abaixo do menu; dá para arrastá-la pela barra e redimensioná-la pelo canto.
 * No celular, a batalha fica fixa no alto e a janela embaixo dela, acima do menu.
 */
const LiveWindow = memo(function LiveWindow({
  screen,
  detail,
  activityTab,
  onClose,
  area,
}: {
  screen: ScreenId;
  detail: Detail;
  activityTab: Tab | undefined;
  onClose: () => void;
  area: RefObject<HTMLDivElement | null>;
}) {
  const state = useGameState(usePerfMode() ? PERF_SLOW_MS : SIDE_MS)!;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const monUid = typeof detail === 'number' ? detail : null;
  const mon = monUid === null ? undefined : state.collection.find((p) => p.uid === monUid);
  const title =
    detail === 'team'
      ? 'BÔNUS E EQUIPES SALVAS'
      : mon
        ? `FICHA DE ${pokemonName(mon).toUpperCase()}`
        : MENU_ITEMS.find((m) => m.id === screen)?.label;
  // O Esc é primeiro de quem está por cima: avisos abertos e um Pokémon sendo movido no PC.
  useHotkeys({
    Escape: () => {
      if (!document.querySelector('.modal-backdrop, .pcs-grid.holding')) onClose();
    },
  });
  return (
    <section
      className="screen-window frame frame-menu"
      role="dialog"
      aria-label={title}
      style={offset.x || offset.y ? { translate: `${offset.x}px ${offset.y}px` } : undefined}
    >
      <header
        className="screen-window-bar"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          if (!window.matchMedia?.('(min-width: 901px) and (min-height: 521px)').matches) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, ...offset };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const bar = e.currentTarget.getBoundingClientRect();
          // Em monitores grandes a interface tem zoom: o mouse anda em pixels da tela, a janela em pixels do zoom.
          const zoom = bar.width / e.currentTarget.offsetWidth || 1;
          const x = d.x + (e.clientX - d.px) / zoom;
          const y = d.y + (e.clientY - d.py) / zoom;
          // A barra nunca sai da tela: sempre dá para pegar a janela de volta.
          const left = bar.left + (x - offset.x) * zoom;
          const top = bar.top + (y - offset.y) * zoom;
          setOffset({
            x:
              x +
              (Math.max(0, 40 - (left + bar.width)) - Math.max(0, left - (window.innerWidth - 40))) / zoom,
            y: y + (Math.max(0, -top) - Math.max(0, top + bar.height - window.innerHeight)) / zoom,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <h2>{title}</h2>
        <button className="pbtn small" onClick={onClose} title="Fechar (Esc)">
          ✕ Fechar
        </button>
      </header>
      {/* key: ao trocar de tela o conteúdo entra com uma cortina rápida (effects.css). */}
      <div
        className="screen-area screen-window-body screen-enter"
        key={`${screen}:${String(detail)}:${activityTab ?? ''}`}
        ref={area}
        id="screen-area"
        tabIndex={-1}
      >
        <Suspense fallback={<p className="screen-loading">Carregando…</p>}>
          {detail === 'team' && <TeamDetails state={state} />}
          {monUid !== null && <MonSheet state={state} uid={monUid} />}
          {screen === 'dex' && <DexScreen state={state} />}
          {screen === 'bag' && <BagScreen state={state} />}
          {screen === 'shop' && <ShopScreen state={state} />}
          {screen === 'map' && <MapScreen state={state} />}
          {screen === 'activities' && <ActivitiesScreen state={state} initialTab={activityTab} />}
          {screen === 'missions' && <MissionsScreen state={state} />}
          {screen === 'trainer' && <TrainerScreen state={state} />}
          {screen === 'upgrades' && <UpgradesScreen state={state} />}
          {screen === 'pc' && <PcScreen state={state} />}
        </Suspense>
      </div>
    </section>
  );
});
