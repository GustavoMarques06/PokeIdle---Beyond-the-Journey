// PRÓXIMOS PASSOS: o que vale a pena fazer agora, na coluna do menu. Mostra a sugestão
// mais urgente (o resto num clique) e, quando dá, a ação direto no botão.

import { useMemo, useState } from 'react';
import { nextSteps, type NextStep, type StepAction, type StepTarget } from '../../core/agenda';
import {
  challengeBoss,
  challengeRaid,
  challengeRematch,
  challengeRocket,
  selectRoute,
  type GameEvent,
  type GameState,
} from '../../core/game';
import { harvestAll } from '../../core/garden';
import { claimMission, type MissionScope } from '../../core/missions';
import type { IconName } from '../theme/icons';
import { audio } from '../audio';
import { useEngine } from '../useGame';
import { ItemIcon, PixelIcon } from './common';

// Só a sugestão mais urgente: a coluna lateral é da equipe, e o resto está em "Todos".
const SHOWN = 1;

const ACTION_LABEL: Record<StepAction['kind'], string> = {
  boss: 'Desafiar',
  rematch: 'Revanche',
  raid: 'Enfrentar',
  rocket: 'Enfrentar',
  route: 'Ir',
  harvest: 'Colher',
  claimMissions: 'Resgatar',
};

function runAction(state: GameState, action: StepAction, now: number): GameEvent[] | boolean {
  switch (action.kind) {
    case 'boss':
      return challengeBoss(state, action.routeId);
    case 'rematch':
      return challengeRematch(state, action.routeId, now);
    case 'raid':
      return challengeRaid(state);
    case 'rocket':
      return challengeRocket(state);
    case 'route':
      return selectRoute(state, action.routeId, now);
    case 'harvest': {
      const events: GameEvent[] = [];
      harvestAll(state, now, events);
      return events;
    }
    case 'claimMissions':
      for (const scope of ['daily', 'weekly'] as MissionScope[])
        for (const m of state.missions[scope]) claimMission(state, scope, m.id);
      return true;
  }
}

function StepIcon({ icon }: { icon: NextStep['icon'] }) {
  return 'item' in icon ? (
    <ItemIcon id={icon.item} size={24} />
  ) : (
    <PixelIcon name={icon.pixel as IconName} scale={2} />
  );
}

export function NextSteps({ state, onOpen }: { state: GameState; onOpen: (target: StepTarget) => void }) {
  const engine = useEngine();
  const [expanded, setExpanded] = useState(false);
  // O motor atualiza a cada passo; a lista só muda com os cronômetros (uma vez por segundo).
  const now = state.lastTimerAt;
  const steps = useMemo(() => nextSteps(state, now), [state, now]);
  const shown = expanded ? steps : steps.slice(0, SHOWN);

  return (
    <section className="next-steps frame frame-dialog" aria-label="Próximos passos">
      <header>
        <h3>PRÓXIMOS PASSOS</h3>
        {steps.length > SHOWN && (
          <button className="pbtn tiny" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            {expanded ? 'Menos' : `Todos (${steps.length})`}
          </button>
        )}
        <button
          className="pbtn tiny"
          title="Esconder (volta nas Opções da tela TREINADOR)"
          aria-label="Esconder os próximos passos"
          onClick={() =>
            engine.dispatch((s) => {
              s.settings.nextSteps = false;
            })
          }
        >
          ×
        </button>
      </header>
      {steps.length === 0 ? (
        <p className="hint">Tudo em dia! A equipe segue treinando.</p>
      ) : (
        <ol>
          {shown.map((step) => (
            <li key={step.id}>
              <StepIcon icon={step.icon} />
              <button
                className="step-text"
                disabled={!step.target}
                onClick={() => {
                  if (!step.target) return;
                  audio.sfx('click');
                  onOpen(step.target);
                }}
              >
                <span>{step.text}</span>
                {step.detail && <small>{step.detail}</small>}
              </button>
              {step.action && (
                <button
                  className="pbtn tiny primary"
                  onClick={() => {
                    audio.sfx('click');
                    const action = step.action!;
                    engine.dispatch((s, t) => runAction(s, action, t));
                  }}
                >
                  {ACTION_LABEL[step.action.kind]}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
