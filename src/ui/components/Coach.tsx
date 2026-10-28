// Primeiros passos: o Prof. Carvalho aparece num balão sobre a cena de batalha com uma dica
// de cada vez, só quando ela faz sentido (o primeiro selvagem, a primeira captura...). Cada
// dica é vista uma vez (marcada em `state.flags`); quem já jogava não recebe nenhuma.

import { useEffect } from 'react';
import type { GameState } from '../../core/game';
import { pokemonName } from '../../core/pokemon';
import { getSpecies } from '../../game-data';
import { useEngine } from '../useGame';
import { TrainerSprite } from './common';

/** Marca de versão: jogos que já tinham batalhas antes desta versão pulam o tutorial. */
const SEEN_FLAG = 'coach';
const stepFlag = (id: string) => `coach:${id}`;

interface Step {
  id: string;
  when: (s: GameState) => boolean;
  text: (s: GameState) => string;
}

const partner = (s: GameState) => {
  const p = s.collection.find((x) => x.uid === s.activeUid);
  return (p ? pokemonName(p) : 'Seu Pokémon').toUpperCase();
};

const STEPS: Step[] = [
  {
    id: 'battle',
    when: () => true,
    text: (s) =>
      `Chegamos à primeira rota! ${partner(s)} luta sozinho: ataca, ganha EXP e sobe de nível sem você precisar fazer nada.`,
  },
  {
    id: 'ball',
    when: (s) => s.battle.kind === 'wild' && s.battle.phase === 'fighting' && !!s.battle.enemy,
    text: (s) =>
      `Um ${getSpecies(s.battle.enemy!.speciesId).name.toUpperCase()} selvagem! Aperte Q ou toque em POKé BALL para tentar capturar. Com pouco HP, fica bem mais fácil.`,
  },
  {
    id: 'box',
    when: (s) => s.stats.totalCaptures >= 1,
    text: () =>
      'Capturou! Os Pokémon novos vão para a Caixa. Em POKéMON você escolhe quem luta, quem fica de reserva e quem dá apoio.',
  },
  {
    id: 'route',
    when: (s) => s.stats.totalKills >= 5,
    text: () =>
      'Cada vitória enche a barra da rota, lá no alto. Quando ela completa, a próxima área abre... ou aparece um treinador para você DESAFIAR.',
  },
  {
    id: 'idle',
    when: (s) => s.stats.totalKills >= 15,
    text: () =>
      'Última dica: pode fechar o jogo quando quiser. Seus Pokémon continuam treinando, e quando você voltar eu conto tudo o que aconteceu!',
  },
];

export function Coach({ state }: { state: GameState }) {
  const engine = useEngine();
  const migrated = state.flags.includes(SEEN_FLAG);

  useEffect(() => {
    if (migrated) return;
    engine.dispatch((s) => {
      // Quem já tinha batalhas antes desta versão não precisa do tutorial.
      if (s.stats.totalKills > 0) for (const step of STEPS) s.flags.push(stepFlag(step.id));
      s.flags.push(SEEN_FLAG);
    });
  }, [engine, migrated]);

  // As dicas seguem a ordem: a próxima só aparece depois que a anterior foi lida.
  const next = migrated ? STEPS.find((step) => !state.flags.includes(stepFlag(step.id))) : undefined;
  const step = next && next.when(state) ? next : undefined;
  if (!step) return null;
  return (
    <CoachBubble
      key={step.id}
      text={step.text(state)}
      onClose={() => engine.dispatch((s) => void s.flags.push(stepFlag(step.id)))}
    />
  );
}

function CoachBubble({ text, onClose }: { text: string; onClose: () => void }) {
  // Texto inteiro de uma vez: digitar letra a letra aqui redesenharia a tela o tempo todo
  // enquanto o jogo roda (e atrasaria o carregamento das outras telas).
  return (
    <aside className="coach frame frame-dialog" aria-live="polite">
      <TrainerSprite id="oak" size={56} head />
      <div className="dialog-speech">
        <span className="speaker">PROF. CARVALHO</span>
        <p>{text}</p>
      </div>
      <button className="pbtn small primary" onClick={onClose}>
        OK
      </button>
    </aside>
  );
}
