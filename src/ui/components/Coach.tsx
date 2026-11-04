// Primeiros passos: o Prof. Carvalho aparece de corpo inteiro no centro da tela com uma dica
// de cada vez, só quando ela faz sentido (o primeiro selvagem, a primeira captura...). Cada
// dica é vista uma vez (marcada em `state.flags`); quem já jogava não recebe nenhuma.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState } from '../../core/game';
import { pokemonName } from '../../core/pokemon';
import { assetUrl, getSpecies, trainerSprite } from '../../game-data';
import { useTypewriter } from '../intro/useTypewriter';
import { useEngine } from '../useGame';

/** Marca de versão: jogos que já tinham batalhas antes desta versão pulam o tutorial. */
const SEEN_FLAG = 'coach';
const stepFlag = (id: string) => `coach:${id}`;

interface Step {
  id: string;
  when: (s: GameState) => boolean;
  text: (s: GameState) => string;
  /** Dica só informativa: sai sozinha depois deste tempo, para não segurar as seguintes. */
  autoCloseMs?: number;
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
    autoCloseMs: 12_000,
  },
  {
    id: 'ball',
    when: (s) => s.battle.kind === 'wild' && s.battle.phase === 'fighting' && !!s.battle.enemy,
    text: (s) =>
      `Um ${getSpecies(s.battle.enemy!.speciesId).name.toUpperCase()} selvagem! Para capturar, toque em MOCHILA e escolha a Poké Ball (ou aperte Q). Com pouco HP, fica bem mais fácil.`,
  },
  {
    id: 'box',
    when: (s) => s.stats.totalCaptures >= 1,
    text: () =>
      'Capturou! Os Pokémon novos vão para a Caixa. Em POKéMON você monta a equipe de até 6: o 1º luta e todos dão bônus.',
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

  // A primeira dica ainda não lida cuja hora chegou (na ordem da lista). Não espera pelas
  // anteriores: quem nunca captura nada também recebe as dicas da rota e do jogo fechado.
  const step = migrated
    ? STEPS.find((s) => !state.flags.includes(stepFlag(s.id)) && s.when(state))
    : undefined;
  if (!step) return null;
  return (
    <CoachBubble
      key={step.id}
      text={step.text(state)}
      reduced={state.settings.reducedMotion}
      autoCloseMs={step.autoCloseMs}
      onClose={() => engine.dispatch((s) => void s.flags.push(stepFlag(step.id)))}
    />
  );
}

function CoachBubble({
  text,
  reduced,
  onClose,
  autoCloseMs,
}: {
  text: string;
  reduced: boolean;
  onClose: () => void;
  autoCloseMs?: number;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!autoCloseMs) return;
    const id = setTimeout(() => closeRef.current(), autoCloseMs);
    return () => clearTimeout(id);
  }, [autoCloseMs]);
  // Os avisos ficam no canto inferior esquerdo, onde o professor aparece: enquanto ele fala,
  // vão para o outro lado (ver effects.css).
  useEffect(() => {
    document.documentElement.classList.add('coach-open');
    return () => document.documentElement.classList.remove('coach-open');
  }, []);
  // O estado da máquina de escrever mora só neste componente: a batalha não é redesenhada
  // a cada letra. Tocar na fala completa o texto de uma vez.
  const { shown, finish } = useTypewriter(text, reduced);
  // O professor fica em pé, grande, no canto esquerdo da tela, com um balão de fala ao lado.
  // Sem fundo escurecido: a batalha continua à vista. Portal no <body>: não depende do layout.
  return createPortal(
    <aside className="coach" aria-live="polite" aria-label="Prof. Carvalho" onClick={finish}>
      <img className="coach-sprite" src={assetUrl(trainerSprite('oak'))} alt="" draggable={false} />
      <div className="coach-bubble">
        <span className="speaker">PROF. CARVALHO</span>
        <p>
          {shown}
          {/* O resto da fala ocupa o lugar desde o início: o balão não cresce enquanto digita. */}
          <span className="coach-rest" aria-hidden>
            {text.slice(shown.length)}
          </span>
        </p>
        <button
          className="pbtn primary"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          autoFocus
        >
          OK
        </button>
      </div>
    </aside>,
    document.body,
  );
}
