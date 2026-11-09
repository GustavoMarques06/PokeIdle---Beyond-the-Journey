// Expedições: monte um grupo de até 3 Pokémon livres e mande-o por 1, 4 ou 8 horas.

import { useState } from 'react';
import { BALANCE, EXPEDITIONS, getSpecies, type ExpeditionDef } from '../../../game-data';
import {
  availableExpeditions,
  claimExpedition,
  expeditionDone,
  expeditionRolls,
  expeditionSlots,
  recallExpedition,
  startExpedition,
  typeMatches,
  type ExpeditionLoot,
} from '../../../core/expeditions';
import type { GameState } from '../../../core/game';
import { Bar, ItemIcon, PokemonSprite, TypeBadge, Window } from '../../components/common';
import { itemName, moveName, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Countdown, Locked, PokemonPicker } from './shared';

function LootSummary({ loot }: { loot: ExpeditionLoot }) {
  return (
    <ul className="loot-list">
      {loot.coins > 0 && <li>+{loot.coins} moedas</li>}
      {loot.research > 0 && <li>+{loot.research} pesquisa</li>}
      {Object.entries(loot.items).map(([id, n]) => (
        <li key={id}>
          <ItemIcon id={id} size={20} /> {itemName(id)} ×{n}
        </li>
      ))}
      {loot.tms.map((m) => (
        <li key={m}>
          <ItemIcon id="tm" size={20} /> TM {moveName(m)}
        </li>
      ))}
      {loot.pokemon.map((p) => (
        <li key={p.uid}>
          <PokemonSprite speciesId={p.speciesId} kind="icon" /> {speciesName(p.speciesId)} entrou para a
          equipe!
        </li>
      ))}
      {loot.eggs > 0 && (
        <li>
          <ItemIcon id="mystery-egg" size={20} /> Um ovo raro! Foi para o ninho da Creche.
        </li>
      )}
      {loot.levels.map((l) => (
        <li key={l.uid}>
          Nv{l.from} → Nv{l.to}
        </li>
      ))}
    </ul>
  );
}

export function ExpeditionsPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [choice, setChoice] = useState<string | null>(null);
  const [party, setParty] = useState<number[]>([]);
  const [hours, setHours] = useState(BALANCE.expeditions.durations[0]);
  const [loot, setLoot] = useState<{ name: string; loot: ExpeditionLoot } | null>(null);
  const slots = expeditionSlots(state);
  if (slots === 0) return <Locked routeId={BALANCE.expeditions.slots[0]} />;
  const now = state.lastTimerAt;
  const open = availableExpeditions(state).filter((e) => !state.expeditions.some((r) => r.id === e.id));
  const def = open.find((e) => e.id === choice);
  const free = state.expeditions.length < slots;

  const claim = (id: string) => {
    const name = EXPEDITIONS.find((e) => e.id === id)?.name ?? id;
    engine.dispatch((s, t) => {
      const events: never[] = [];
      const result = claimExpedition(s, id, t, events);
      if (result) setLoot({ name, loot: result });
      return events;
    });
  };

  return (
    <>
      <Window
        title={`EM ANDAMENTO · ${state.expeditions.length}/${slots}`}
        icon={<ItemIcon id="explorer-kit" size={24} />}
      >
        {state.expeditions.length === 0 && <p className="hint">Nenhuma expedição em andamento.</p>}
        <ul className="expedition-runs">
          {state.expeditions.map((run) => {
            const d = EXPEDITIONS.find((e) => e.id === run.id)!;
            const done = expeditionDone(run, now);
            return (
              <li key={run.id} className={`expedition-run ${done ? 'done' : ''}`}>
                <div className="run-party">
                  {run.uids.map((uid) => {
                    const p = state.collection.find((x) => x.uid === uid);
                    return p && <PokemonSprite key={uid} speciesId={p.speciesId} kind="icon" />;
                  })}
                </div>
                <div className="run-info">
                  <strong>{d.name.toUpperCase()}</strong>
                  <Bar value={now - run.startedAt} max={run.endsAt - run.startedAt} tone="grass" />
                  <Countdown until={run.endsAt} now={now} done="VOLTOU!" />
                </div>
                {done ? (
                  <button className="pbtn small primary" onClick={() => claim(run.id)}>
                    Receber
                  </button>
                ) : (
                  <button
                    className="pbtn small"
                    onClick={() => engine.dispatch((s) => recallExpedition(s, run.id))}
                  >
                    Chamar de volta
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {loot && (
          <div className="loot frame frame-dialog">
            <strong>{loot.name}: a equipe voltou com…</strong>
            <LootSummary loot={loot.loot} />
            <button className="pbtn small" onClick={() => setLoot(null)}>
              OK
            </button>
          </div>
        )}
      </Window>

      {free && (
        <Window title="NOVA EXPEDIÇÃO" icon={<ItemIcon id="town-map" size={24} />}>
          <ul className="expedition-list">
            {open.map((e) => (
              <li key={e.id}>
                <button
                  className={`expedition-card frame frame-slot ${choice === e.id ? 'selected' : ''}`}
                  onClick={() => setChoice(e.id)}
                >
                  <strong>{e.name.toUpperCase()}</strong>
                  <small>{e.description}</small>
                  <span className="types">
                    {e.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {def && (
            <ExpeditionSetup
              state={state}
              def={def}
              party={party}
              hours={hours}
              setHours={setHours}
              setParty={setParty}
              onStart={() => {
                engine.dispatch((s, t) => startExpedition(s, def.id, party, hours, t));
                setParty([]);
                setChoice(null);
              }}
            />
          )}
        </Window>
      )}
    </>
  );
}

function ExpeditionSetup({
  state,
  def,
  party,
  hours,
  setHours,
  setParty,
  onStart,
}: {
  state: GameState;
  def: ExpeditionDef;
  party: number[];
  hours: number;
  setHours: (h: number) => void;
  setParty: (p: number[]) => void;
  onStart: () => void;
}) {
  const max = BALANCE.expeditions.maxParty;
  const matches = typeMatches(state, def, party);
  const species = [...new Set(def.rewards.flatMap((r) => ('speciesId' in r ? [r.speciesId] : [])))];
  return (
    <div className="expedition-setup">
      <p className="hint">
        Tipos favorecidos rendem mais achados ({matches}/{party.length || 0} no grupo).
        {species.length > 0 && ' Pode trazer: '}
        {species.map((id) => (
          <PokemonSprite key={id} speciesId={id} kind="icon" silhouette={!state.pokedex[id]?.seen} />
        ))}
      </p>
      <PokemonPicker
        state={state}
        selected={party}
        onPick={(p) =>
          setParty(party.includes(p.uid) ? party.filter((u) => u !== p.uid) : [...party, p.uid].slice(-max))
        }
      />
      <div className="expedition-start">
        {BALANCE.expeditions.durations.map((h) => (
          <button
            key={h}
            className={`pbtn small ${hours === h ? 'primary' : ''}`}
            onClick={() => setHours(h)}
          >
            {h} h
          </button>
        ))}
        <span className="hint">
          ~{party.length ? expeditionRolls(state, def, party, hours) : 0} achados ·{' '}
          {party
            .map((uid) => getSpecies(state.collection.find((p) => p.uid === uid)!.speciesId).name)
            .join(', ') || 'escolha até 3 Pokémon'}
        </span>
        <button className="pbtn primary" disabled={!party.length} onClick={onStart}>
          Partir
        </button>
      </div>
    </div>
  );
}
