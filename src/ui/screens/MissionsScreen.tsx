// MISSÕES: tarefas diárias e semanais com recompensas.

import { useState } from 'react';
import { claimMission, nextReset, type Mission, type MissionScope } from '../../core/missions';
import type { GameState } from '../../core/game';
import { Bar, ItemIcon, PixelIcon, Window } from '../components/common';
import { MISSION_TEXT, formatDuration, formatNumber, itemName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';
import { audio } from '../audio';
import { PixelFx } from '../components/PixelFx';
import { Empty } from '../components/Dynamic';

/** Ícone de cada tipo de missão: o que ela pede. */
const KIND_ICON: Record<string, string> = {
  kills: 'choice-band',
  captures: 'poke-ball',
  'capture-type': 'net-ball',
  evolutions: 'rare-candy',
  bosses: 'vs-seeker',
  'hatch-type': 'oval-charm',
  hatch: 'mystery-egg',
  harvest: 'berry-pouch',
  expeditions: 'town-map',
  'tower-floors': 'vs-recorder',
  slots: 'coin-case',
};

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
  // A missão recém-recebida ganha o carimbo e a chuva de moedas.
  const [stamped, setStamped] = useState<string | null>(null);
  return (
    <Window
      title={scope === 'daily' ? 'MISSÕES DO DIA' : 'MISSÕES DA SEMANA'}
      icon={<ItemIcon id={scope === 'daily' ? 'fame-checker' : 'teachy-tv'} size={24} />}
      actions={<small>novas em {formatDuration(nextReset(now, scope) - now)}</small>}
    >
      {list.length === 0 && <Empty icon="fame-checker">Nenhuma missão disponível agora.</Empty>}
      <ul className="mission-list">
        {list.map((m) => {
          const done = m.progress >= m.target;
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
          return (
            <li
              key={m.id}
              className={`mission ${done ? 'done' : ''} ${m.claimed ? 'claimed' : ''} ${stamped === m.id ? 'stamped' : ''}`}
              style={{ ['--pct' as string]: `${pct}%` }}
            >
              <span className="mission-icon">
                <ItemIcon id={KIND_ICON[m.kind] ?? 'fame-checker'} size={30} />
                {m.claimed ? (
                  <PixelIcon name="check" scale={2} className="mission-badge" />
                ) : (
                  done && <PixelIcon name="star" scale={2} className="mission-badge" />
                )}
              </span>
              {m.claimed && <span className="mission-stamp">CONCLUÍDA</span>}
              {stamped === m.id && (
                <span className="mission-fx" aria-hidden>
                  <PixelFx fx="coins" scale={2} x="70%" y="50%" />
                  <PixelFx fx="stars" scale={2} x="20%" y="40%" />
                </span>
              )}
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
                  onClick={() => {
                    engine.dispatch((s) => void claimMission(s, scope, m.id));
                    audio.sfx('itemGet');
                    setStamped(m.id);
                  }}
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
