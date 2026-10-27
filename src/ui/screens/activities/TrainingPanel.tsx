// Campo de Treino: o Pokémon escolhido acumula EVs em tempo real (também com o jogo fechado).
// Duplicatas da mesma espécie viram EVs na hora (sparring).

import { useState } from 'react';
import { BALANCE, type StatKey } from '../../../game-data';
import { activityUnlocked, busyUids, findPokemon } from '../../../core/collection';
import {
  retarget,
  startTraining,
  stopTraining,
  trainWithDuplicate,
  trainingRate,
  trainingSlotsUnlocked,
  type GameState,
} from '../../../core/game';
import { evRoom, evsOf, evTotal, type PokemonInstance } from '../../../core/pokemon';
import { Bar, ItemIcon, PokemonSprite, Window } from '../../components/common';
import { STAT_NAMES, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked, PokemonPicker } from './shared';

const STAT_KEYS = Object.keys(STAT_NAMES) as StatKey[];

function StatPick({
  value,
  onPick,
  disabled,
}: {
  value: StatKey;
  onPick: (k: StatKey) => void;
  disabled?: (k: StatKey) => boolean;
}) {
  return (
    <div className="stat-pick" role="radiogroup" aria-label="Atributo">
      {STAT_KEYS.map((k) => (
        <button
          key={k}
          role="radio"
          aria-checked={value === k}
          className={`pbtn small ${value === k ? 'primary' : ''}`}
          disabled={disabled?.(k)}
          onClick={() => onPick(k)}
        >
          {STAT_NAMES[k]}
        </button>
      ))}
    </div>
  );
}

export function TrainingPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [stat, setStat] = useState<StatKey>('atk');
  const [target, setTarget] = useState<number | null>(null);
  if (!activityUnlocked(state, 'training')) return <Locked routeId={BALANCE.training.slots[0]} />;

  const slots = trainingSlotsUnlocked(state);
  const free = slots - state.training.slots.length;
  const now = state.lastTimerAt;
  const t = BALANCE.training;

  const busy = busyUids(state);
  const dupes = (p: PokemonInstance) =>
    state.collection.some((x) => x.uid !== p.uid && x.speciesId === p.speciesId && !busy.has(x.uid));
  const targetMon = target !== null ? findPokemon(state, target) : undefined;

  return (
    <>
      <Window title="CAMPO DE TREINO" icon={<ItemIcon id="macho-brace" size={24} />} frame="dialog">
        <p className="hint">
          Treine um atributo e acumule EVs ({t.evsPerHour} por hora; a Macho Brace dobra). Cada 4 EVs valem +1
          no atributo, até {t.maxPerStat} por atributo e {t.maxTotal} no total. Vagas:{' '}
          {state.training.slots.length}/{slots}.
        </p>
        <ul className="fossil-runs">
          {state.training.slots.map((slot) => {
            const p = findPokemon(state, slot.uid);
            if (!p) return null;
            const evs = evsOf(p);
            return (
              <li key={slot.uid} className="fossil-run">
                <PokemonSprite speciesId={p.speciesId} kind="icon" />
                <div>
                  <strong>
                    {speciesName(p.speciesId).toUpperCase()} Nv{p.level}
                  </strong>
                  <StatPick
                    value={slot.stat}
                    onPick={(k) => engine.dispatch((s) => retarget(s, p.uid, k))}
                    disabled={(k) => evRoom(p, k) <= 0}
                  />
                  <Bar value={evs[slot.stat]} max={t.maxPerStat} tone="exp" />
                  <small>
                    {STAT_NAMES[slot.stat]}: {evs[slot.stat]}/{t.maxPerStat} EVs · {trainingRate(p)}/h · total{' '}
                    {evTotal(p)}/{t.maxTotal}
                  </small>
                </div>
                <button className="pbtn small" onClick={() => engine.dispatch((s) => stopTraining(s, p.uid))}>
                  Parar
                </button>
              </li>
            );
          })}
        </ul>
        {free > 0 && (
          <>
            <h4 className="panel-sub">
              NOVA VAGA ({free} livre{free > 1 ? 's' : ''})
            </h4>
            <StatPick value={stat} onPick={setStat} />
            <PokemonPicker
              state={state}
              filter={(p) => evRoom(p, stat) > 0}
              onPick={(p) => engine.dispatch((s) => startTraining(s, p.uid, stat, now))}
              empty="Nenhum Pokémon livre que ainda possa treinar esse atributo."
            />
          </>
        )}
        {free <= 0 && slots < t.slots.length && (
          <p className="hint">Mais vagas de treino ao concluir as próximas áreas.</p>
        )}
      </Window>

      <Window title="SPARRING COM DUPLICATAS" icon={<ItemIcon id="exp-share" size={24} />}>
        <p className="hint">
          Escolha o treinado e o atributo; depois uma duplicata da mesma espécie. Ela se despede e rende{' '}
          {t.duplicateEvs} EVs.
        </p>
        <StatPick value={stat} onPick={setStat} />
        {!targetMon ? (
          <PokemonPicker
            state={state}
            filter={(p) => dupes(p) && evRoom(p, stat) > 0}
            onPick={(p) => setTarget(p.uid)}
            empty="Sem duplicatas livres (que não estejam na equipe, na creche, em expedição ou no treino)."
          />
        ) : (
          <>
            <p>
              Treinando <strong>{speciesName(targetMon.speciesId)}</strong> — {STAT_NAMES[stat]}{' '}
              {evsOf(targetMon)[stat]}/{t.maxPerStat}.{' '}
              <button className="pbtn small" onClick={() => setTarget(null)}>
                Trocar
              </button>
            </p>
            <PokemonPicker
              state={state}
              filter={(p) => p.uid !== targetMon.uid && p.speciesId === targetMon.speciesId}
              onPick={(dup) => {
                engine.dispatch((s) => trainWithDuplicate(s, targetMon.uid, dup.uid, stat));
                if (evRoom(targetMon, stat) <= 0) setTarget(null);
              }}
              empty="Acabaram as duplicatas livres."
            />
          </>
        )}
      </Window>
    </>
  );
}
