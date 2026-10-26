// MISSÕES: tarefas diárias e semanais com recompensas.

import { claimMission, nextReset, type Mission, type MissionScope } from '../../core/missions';
import type { GameState } from '../../core/game';
import { Bar, ItemIcon, PixelIcon, Window } from '../components/common';
import { MISSION_TEXT, formatDuration, formatNumber, itemName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

function rewardText(m: Mission): string {
  const r = m.reward;
  return [
    r.coins ? `₽${formatNumber(r.coins)}` : '',
    r.research ? `${r.research} pesquisa` : '',
    r.tokens ? `${r.tokens} fichas` : '',
    ...Object.entries(r.items ?? {}).map(([id, n]) => `${itemName(id)} ×${n}`),
  ]
    .filter(Boolean)
    .join(' · ');
}

function MissionList({ state, scope }: { state: GameState; scope: MissionScope }) {
  const engine = useEngine();
  const list = state.missions[scope];
  const now = state.lastTimerAt;
  return (
    <Window
      title={scope === 'daily' ? 'MISSÕES DO DIA' : 'MISSÕES DA SEMANA'}
      icon={<ItemIcon id={scope === 'daily' ? 'fame-checker' : 'teachy-tv'} size={24} />}
      actions={<small>novas em {formatDuration(nextReset(now, scope) - now)}</small>}
    >
      {list.length === 0 && <p className="hint">Nenhuma missão disponível.</p>}
      <ul className="mission-list">
        {list.map((m) => {
          const done = m.progress >= m.target;
          return (
            <li key={m.id} className={`mission ${done ? 'done' : ''} ${m.claimed ? 'claimed' : ''}`}>
              {m.claimed ? <PixelIcon name="check" scale={2} /> : <PixelIcon name="star" scale={2} />}
              <div>
                <strong>{MISSION_TEXT[m.kind](m.target, m.type)}</strong>
                <Bar value={m.progress} max={m.target} tone={done ? 'gold' : 'grass'} />
                <small>
                  {Math.floor(m.progress)}/{m.target} · {rewardText(m)}
                </small>
              </div>
              {done && !m.claimed && (
                <button
                  className="pbtn small primary"
                  onClick={() => engine.dispatch((s) => void claimMission(s, scope, m.id))}
                >
                  Receber
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Window>
  );
}

export function MissionsScreen({ state }: { state: GameState }) {
  return (
    <div className="missions-screen">
      <MissionList state={state} scope="daily" />
      <MissionList state={state} scope="weekly" />
      <p className="hint">
        As missões mudam à meia-noite (diárias) e na segunda-feira (semanais). Missões de atividades só
        aparecem depois que elas forem liberadas.
      </p>
    </div>
  );
}
