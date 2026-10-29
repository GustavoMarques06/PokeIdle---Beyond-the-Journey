import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import type { GameEvent, GameState } from '../core/game';
import { audio } from './audio';
import { BattleDialog, type ScreenId } from './battle/BattleDialog';
import { BattleScene } from './battle/BattleScene';
import { GameMenu, MENU_ITEMS, menuKey } from './components/GameMenu';
import { Hud } from './components/Hud';
import { OfflineReport } from './components/OfflineReport';
import { ProfessorCall } from './components/ProfessorCall';
import { SaveIndicator } from './components/SaveIndicator';
import { Intro } from './intro/Intro';
import { Toasts } from './components/Toasts';
import { useHotkeys } from './hotkeys';
import { PartyScreen } from './screens/PartyScreen';
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
  const state = useGameState();
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
  const reducedMotion =
    state?.settings.reducedMotion ?? !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    document.documentElement.classList.toggle('hc', highContrast);
    document.documentElement.classList.toggle('large-text', largeText);
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [highContrast, largeText, reducedMotion]);
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
      {inGame ? <GameScreen state={state} /> : <Intro save={state} onEnter={() => setAtTitle(false)} />}
      {inGame && !engine.offlineReport && <ProfessorCall state={state} />}
      {inGame && engine.offlineReport && (
        <OfflineReport report={engine.offlineReport} onClose={() => engine.dismissOfflineReport()} />
      )}
      {inGame && <Toasts />}
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

function GameScreen({ state }: { state: GameState }) {
  const [screen, setScreen] = useState<ScreenId>('party');
  // Aba de ATIVIDADES pedida pelo painel de próximos passos (abre direto nela).
  const [activityTab, setActivityTab] = useState<Tab | undefined>(undefined);
  const area = useRef<HTMLDivElement>(null);
  const idle = useIdle();
  // Baixa as outras telas quando o navegador estiver ocioso (ou logo depois, sem essa API).
  useEffect(() => {
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(() => void preloadScreens(), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => void preloadScreens(), 200);
    return () => window.clearTimeout(id);
  }, []);
  const open = useCallback((id: ScreenId, viaKeyboard = false, tab?: Tab) => {
    setScreen(id);
    setActivityTab(tab);
    // No celular (uma coluna), a tela aberta fica abaixo da batalha: rola até ela.
    if (window.matchMedia?.('(max-width: 900px)').matches) {
      requestAnimationFrame(() => area.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    // Pelo teclado, o foco vai para a tela aberta (leitores de tela anunciam o conteúdo novo).
    if (viaKeyboard) requestAnimationFrame(() => area.current?.focus({ preventScroll: true }));
  }, []);
  useHotkeys(Object.fromEntries(MENU_ITEMS.map((item, i) => [menuKey(i), () => open(item.id, true)])));
  // Música: tema de chefe nas lutas que valem algo (líder, rival, Elite, lendário, raide); fora
  // delas, o tema das rotas de dia ou o da noite, pelo relógio do jogo.
  const bossFight = BOSS_MUSIC.has(state.battle.kind);
  const night = state.env.period === 'night';
  useEffect(() => audio.setTrack(bossFight ? 'boss' : night ? 'night' : 'game'), [bossFight, night]);
  // Onboarding: quem já jogava antes desta versão não vê como NOVAS as atividades que já conhece.
  const engine = useEngine();
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
    <div className={`game game-enter ${idle ? 'idle' : ''}`}>
      <nav className="skip-links" aria-label="Atalhos de navegação">
        <a href="#game-menu">Pular para o menu</a>
        <a href="#screen-area">Pular para a tela aberta</a>
      </nav>
      <Hud state={state} onOpenMap={() => open('map')} />
      <main className="battle-column">
        <BattleScene state={state} />
        <BattleDialog state={state} onOpen={open} />
      </main>
      <aside className="side-column">
        <GameMenu state={state} current={screen} onSelect={open} />
        {state.settings.nextSteps && (
          <NextSteps
            state={state}
            onOpen={(t) => open(t.screen, false, t.screen === 'activities' ? (t.tab as Tab) : undefined)}
          />
        )}
        {/* key: ao trocar de tela o conteúdo entra com uma cortina rápida (effects.css). */}
        <div
          className="screen-area screen-enter"
          key={`${screen}:${activityTab ?? ''}`}
          ref={area}
          id="screen-area"
          tabIndex={-1}
          role="region"
          aria-label={MENU_ITEMS.find((m) => m.id === screen)?.label}
        >
          <Suspense fallback={<p className="screen-loading">Carregando…</p>}>
            {screen === 'party' && <PartyScreen state={state} onOpenPc={() => open('pc')} />}
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
      </aside>
    </div>
  );
}
