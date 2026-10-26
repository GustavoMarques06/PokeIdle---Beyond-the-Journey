import { useCallback, useEffect, useState } from 'react';
import type { GameEvent, GameState } from '../core/game';
import { audio } from './audio';
import { BattleDialog, type ScreenId } from './battle/BattleDialog';
import { BattleScene } from './battle/BattleScene';
import { ActiveCard } from './components/ActiveCard';
import { GameMenu } from './components/GameMenu';
import { Hud } from './components/Hud';
import { OfflineReport } from './components/OfflineReport';
import { StarterSelect } from './intro/StarterSelect';
import { Toasts } from './components/Toasts';
import { ActivitiesScreen } from './screens/ActivitiesScreen';
import { BagScreen } from './screens/BagScreen';
import { DexScreen } from './screens/DexScreen';
import { MapScreen } from './screens/MapScreen';
import { MissionsScreen } from './screens/MissionsScreen';
import { PartyScreen } from './screens/PartyScreen';
import { TrainerScreen } from './screens/TrainerScreen';
import { UpgradesScreen } from './screens/UpgradesScreen';
import { useEngine, useGameEvents, useGameState } from './useGame';

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
          {screen === 'party' && <PartyScreen state={state} />}
          {screen === 'dex' && <DexScreen state={state} />}
          {screen === 'bag' && <BagScreen state={state} />}
          {screen === 'map' && <MapScreen state={state} />}
          {screen === 'activities' && <ActivitiesScreen state={state} />}
          {screen === 'missions' && <MissionsScreen state={state} />}
          {screen === 'trainer' && <TrainerScreen state={state} />}
          {screen === 'upgrades' && <UpgradesScreen state={state} />}
        </div>
      </aside>
    </div>
  );
}
