// Abertura completa: "Pressione Start" → menu inicial → prólogo com o Professor → laboratório (escolha do
// inicial). Nome e avatar respondidos no prólogo seguem para o laboratório. Com save no
// aparelho, o título oferece CONTINUAR; `onEnter` leva ao jogo.

import { useEffect, useState } from 'react';
import type { PlayerAvatar } from '../../game-data';
import type { GameState } from '../../core/game';
import { audio } from '../audio';
import { Prologue, PROLOGUE_IDENTITY } from './Prologue';
import { StartScreen } from './StartScreen';
import { StarterSelect } from './StarterSelect';
import { TitleScreen } from './TitleScreen';

type Phase = { id: 'start' } | { id: 'title' } | { id: 'prologue'; start: number } | { id: 'lab' };

export function Intro({ save, onEnter }: { save: GameState | null; onEnter: () => void }) {
  const [phase, setPhase] = useState<Phase>({ id: 'start' });
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<PlayerAvatar>('red');

  // Tema próprio enquanto a abertura estiver na tela; ao sair, volta a música do jogo.
  useEffect(() => {
    audio.setTrack('intro');
    return () => audio.setTrack('game');
  }, []);

  if (phase.id === 'start') return <StartScreen onStart={() => setPhase({ id: 'title' })} />;
  if (phase.id === 'title') {
    return (
      <TitleScreen
        save={save}
        onContinue={onEnter}
        onNewGame={() => setPhase({ id: 'prologue', start: 0 })}
        onBack={() => setPhase({ id: 'start' })}
      />
    );
  }
  if (phase.id === 'prologue') {
    return (
      <Prologue
        key={phase.start}
        start={phase.start}
        name={name}
        avatar={avatar}
        onName={setName}
        onAvatar={setAvatar}
        onDone={() => setPhase({ id: 'lab' })}
      />
    );
  }
  return (
    <StarterSelect
      name={name}
      avatar={avatar}
      onEditTrainer={() => setPhase({ id: 'prologue', start: PROLOGUE_IDENTITY })}
      onStart={onEnter}
    />
  );
}
