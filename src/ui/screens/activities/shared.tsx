// Peças comuns das telas de atividades: seletor de Pokémon, cronômetro e aviso de bloqueio.

import type { ReactNode } from 'react';
import { getRoute } from '../../../game-data';
import { busyUids } from '../../../core/collection';
import type { GameState } from '../../../core/game';
import type { PokemonInstance } from '../../../core/pokemon';
import { PixelIcon, PokemonSprite, Shiny } from '../../components/common';
import { formatDuration, speciesName } from '../../i18n/pt-BR';

/** Grade de Pokémon livres (fora da batalha, do apoio, da creche e das expedições). */
export function PokemonPicker({
  state,
  selected = [],
  onPick,
  filter,
  empty = 'Nenhum Pokémon livre. Capture mais ou tire alguém do apoio.',
}: {
  state: GameState;
  selected?: number[];
  onPick: (p: PokemonInstance) => void;
  filter?: (p: PokemonInstance) => boolean;
  empty?: string;
}) {
  const busy = busyUids(state);
  const list = state.collection
    .filter((p) => !busy.has(p.uid) && (!filter || filter(p)))
    .sort((a, b) => b.level - a.level || a.uid - b.uid);
  if (!list.length) return <p className="hint">{empty}</p>;
  return (
    <ul className="pc-box picker">
      {list.map((p) => (
        <li key={p.uid}>
          <button
            className={`pc-cell ${selected.includes(p.uid) ? 'selected' : ''}`}
            onClick={() => onPick(p)}
            title={`${speciesName(p.speciesId)} Nv. ${p.level}`}
          >
            <PokemonSprite speciesId={p.speciesId} kind="icon" />
            <span>Nv{p.level}</span>
            {p.shiny && <Shiny />}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Countdown({ until, now, done = 'PRONTO!' }: { until: number; now: number; done?: string }) {
  const left = until - now;
  return (
    <span className={`countdown ${left <= 0 ? 'done' : ''}`}>{left <= 0 ? done : formatDuration(left)}</span>
  );
}

export function Locked({ routeId, children }: { routeId: string; children?: ReactNode }) {
  return (
    <div className="activity-locked">
      <PixelIcon name="lock" scale={3} />
      <p>
        Libera ao concluir <strong>{getRoute(routeId).name}</strong>.
      </p>
      {children}
    </div>
  );
}
