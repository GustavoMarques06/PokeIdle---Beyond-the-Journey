import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
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
  useHotkeys(Object.fromEntries(MENU_ITEMS.map((item, i) => [String(i + 1), () => setScreen(item.id)])));

  return (
    <div className="game">
      <Hud state={state} onOpenMap={() => setScreen('map')} />
      <main className="battle-column">
        <BattleScene state={state} />
        <BattleDialog state={state} onOpen={setScreen} />
      </main>
      <aside className="side-column">
        <ActiveCard state={state} onOpen={() => setScreen('party')} />
        <GameMenu state={state} current={screen} onSelect={setScreen} />
        <div className="screen-area">
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
