// O Prof. Carvalho aparece quando uma região nova é liberada (e ao vencer a última Liga),
// para a história não parar no prólogo: fala em máquina de escrever, com o lendário da
// região em silhueta ao lado (o mesmo da tela de "Pressione Start"). Cada fala é vista uma
// vez: fica marcada em `state.flags`, então também aparece se a região foi liberada com o
// jogo fechado.

import { useEffect } from 'react';
import { REGIONS, assetUrl, trainerSprite } from '../../game-data';
import type { GameState } from '../../core/game';
import { T } from '../i18n/pt-BR';
import { legendOf } from '../intro/legends';
import { useTypewriter } from '../intro/useTypewriter';
import { useEngine } from '../useGame';
import { PokemonSprite } from './common';

/** Marca de versão: quem já jogava não recebe de uma vez as falas de regiões antigas. */
const SEEN_FLAG = 'professor';
const FINALE = 'finale';
const callFlag = (id: string) => `professor:${id}`;

function pendingCalls(state: GameState): string[] {
  const ids = REGIONS.slice(1)
    .filter((r) => state.routes[r.routes[0]]?.unlocked)
    .map((r) => r.id);
  const last = REGIONS[REGIONS.length - 1].id;
  if (state.hallOfFame.some((h) => h.regionId === last)) ids.push(FINALE);
  return ids.filter((id) => !state.flags.includes(callFlag(id)));
}

export function ProfessorCall({ state }: { state: GameState }) {
  const engine = useEngine();
  const migrated = state.flags.includes(SEEN_FLAG);
  const pending = migrated ? pendingCalls(state)[0] : undefined;

  useEffect(() => {
    if (migrated) return;
    engine.dispatch((s) => {
      for (const id of pendingCalls(s)) s.flags.push(callFlag(id));
      s.flags.push(SEEN_FLAG);
    });
  }, [engine, migrated]);

  if (!pending) return null;
  const name = state.trainerName.toUpperCase();
  const text = pending === FINALE ? T.professor.finale(name) : T.professor.arrival[pending]?.(name);
  if (!text) return null;
  const close = () => engine.dispatch((s) => void s.flags.push(callFlag(pending)));
  return (
    <CallDialog
      key={pending}
      text={text}
      legend={pending === FINALE ? undefined : legendOf(pending)}
      button={pending === FINALE ? 'Obrigado, Professor!' : 'Vamos lá!'}
      reduced={state.settings.reducedMotion}
      onClose={close}
    />
  );
}

function CallDialog({
  text,
  legend,
  button,
  reduced,
  onClose,
}: {
  text: string;
  legend?: { id: number; color: string };
  button: string;
  reduced: boolean;
  onClose: () => void;
}) {
  const { shown, done, finish } = useTypewriter(text, reduced);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Prof. Carvalho">
      <div
        className="professor-call frame frame-dialog"
        style={legend ? { ['--glow' as string]: legend.color } : undefined}
        onClick={() => !done && finish()}
      >
        <div className="professor-call-art">
          {legend && (
            <span className="professor-call-legend" aria-hidden>
              <PokemonSprite speciesId={legend.id} kind="front" />
            </span>
          )}
          <img
            className="professor-call-sprite"
            src={assetUrl(trainerSprite('oak'))}
            alt=""
            draggable={false}
          />
        </div>
        <div className="dialog-speech">
          <span className="speaker">PROF. CARVALHO</span>
          <p>{shown}</p>
          {done ? (
            <button className="pbtn primary" onClick={onClose} autoFocus>
              {button}
            </button>
          ) : (
            <button className="pbtn" onClick={finish}>
              ▸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
