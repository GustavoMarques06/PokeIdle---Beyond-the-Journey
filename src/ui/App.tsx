import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { GameEvent, GameState } from '../core/game';
import { audio } from './audio';
import { BattleDialog, type ScreenId } from './battle/BattleDialog';
import { BattleScene } from './battle/BattleScene';
import { ActiveCard } from './components/ActiveCard';
import { GameMenu, MENU_ITEMS } from './components/GameMenu';
import { Hud } from './components/Hud';
import { OfflineReport } from './components/OfflineReport';
import { StarterSelect } from './intro/StarterSelect';
import { Toasts } from './components/Toasts';
import { useHotkeys } from './hotkeys';
import { PartyScreen } from './screens/PartyScreen';
import { seenFlag, tipFlag, unseenTabs } from './screens/activities/tabs';
import { useEngine, useGameEvents, useGameState } from './useGame';

// A tela de equipe abre primeiro; as demais são carregadas quando o jogador as abre.
const ActivitiesScreen = lazy(() =>
  import('./screens/ActivitiesScreen').then((m) => ({ default: m.ActivitiesScreen })),
);
const BagScreen = lazy(() => import('./screens/BagScreen').then((m) => ({ default: m.BagScreen })));
const DexScreen = lazy(() => import('./screens/DexScreen').then((m) => ({ default: m.DexScreen })));
const MapScreen = lazy(() => import('./screens/MapScreen').then((m) => ({ default: m.MapScreen })));
const ShopScreen = lazy(() => import('./screens/ShopScreen').then((m) => ({ default: m.ShopScreen })));
const MissionsScreen = lazy(() =>
  import('./screens/MissionsScreen').then((m) => ({ default: m.MissionsScreen })),
);
const TrainerScreen = lazy(() =>
  import('./screens/TrainerScreen').then((m) => ({ default: m.TrainerScreen })),
);
const UpgradesScreen = lazy(() =>
  import('./screens/UpgradesScreen').then((m) => ({ default: m.UpgradesScreen })),
);

export function App() {
  const engine = useEngine();
  const state = useGameState();

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
  useGameEvents(useCallback((events: GameEvent[]) => audio.play(events), []));

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
      {state ? <GameScreen state={state} /> : <StarterSelect />}
      {state && engine.offlineReport && (
        <OfflineReport report={engine.offlineReport} onClose={() => engine.dismissOfflineReport()} />
      )}
      <Toasts />
    </>
  );
}

function GameScreen({ state }: { state: GameState }) {
  const [screen, setScreen] = useState<ScreenId>('party');
  const area = useRef<HTMLDivElement>(null);
  const open = useCallback((id: ScreenId, viaKeyboard = false) => {
    setScreen(id);
    // No celular (uma coluna), a tela aberta fica abaixo da batalha: rola até ela.
    if (window.matchMedia?.('(max-width: 900px)').matches) {
      requestAnimationFrame(() => area.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    // Pelo teclado, o foco vai para a tela aberta (leitores de tela anunciam o conteúdo novo).
    if (viaKeyboard) requestAnimationFrame(() => area.current?.focus({ preventScroll: true }));
  }, []);
  useHotkeys(Object.fromEntries(MENU_ITEMS.map((item, i) => [String(i + 1), () => open(item.id, true)])));
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
    <div className="game">
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
        <ActiveCard state={state} onOpen={() => open('party')} />
        <GameMenu state={state} current={screen} onSelect={open} />
        {/* key: ao trocar de tela o conteúdo entra com uma cortina rápida (effects.css). */}
        <div
          className="screen-area screen-enter"
          key={screen}
          ref={area}
          id="screen-area"
          tabIndex={-1}
          role="region"
          aria-label={MENU_ITEMS.find((m) => m.id === screen)?.label}
        >
          <Suspense fallback={<p className="screen-loading">Carregando…</p>}>
            {screen === 'party' && <PartyScreen state={state} />}
            {screen === 'dex' && <DexScreen state={state} />}
            {screen === 'bag' && <BagScreen state={state} />}
            {screen === 'shop' && <ShopScreen state={state} />}
            {screen === 'map' && <MapScreen state={state} />}
            {screen === 'activities' && <ActivitiesScreen state={state} />}
            {screen === 'missions' && <MissionsScreen state={state} />}
            {screen === 'trainer' && <TrainerScreen state={state} />}
            {screen === 'upgrades' && <UpgradesScreen state={state} />}
          </Suspense>
        </div>
      </aside>
    </div>
  );
}
