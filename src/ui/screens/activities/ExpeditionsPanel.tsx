// Expedições: monte um grupo de até 3 Pokémon livres e mande-o por 1, 4 ou 8 horas. Em andamento, o grupo anda por
// uma trilha com o cenário da expedição e um diário de viagem vai ganhando entradas; na volta chega um cartão-postal
// com a "foto" do grupo e o que ele trouxe.

import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BALANCE, EXPEDITIONS, getSpecies, type ExpeditionDef } from '../../../game-data';
import { seededRng } from '../../../core/rng';
import type { ExpeditionRun } from '../../../core/expeditions';
import { audio } from '../../audio';
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

/** Cor do cenário pelo primeiro tipo favorecido da expedição. */
const THEME: Record<string, string> = {
  normal: '#c8c098',
  flying: '#a8c8f0',
  bug: '#a8c050',
  grass: '#78c060',
  water: '#58a0e0',
  fire: '#e88048',
  rock: '#b8a068',
  ground: '#d8b868',
  ghost: '#8070b0',
  psychic: '#e878a8',
  ice: '#98d8e8',
  electric: '#e8c840',
  dark: '#706060',
  dragon: '#7868e0',
  steel: '#a8a8c0',
  poison: '#a060a8',
  fighting: '#c05838',
  fairy: '#e8a0c8',
};

/** Entradas do diário de viagem: sorteadas pela semente da expedição, aparecem conforme o tempo passa. */
const DIARY = [
  (n: string) => `${n} farejou algo interessante atrás de uma pedra.`,
  () => 'O grupo parou para descansar à sombra de uma árvore.',
  (n: string) => `${n} encontrou um treinador e trocaram dicas.`,
  (n: string) => `Começou a garoar. ${n} achou ótimo!`,
  (n: string) => `${n} espantou um bando de Spearow barulhentos.`,
  () => 'O grupo atravessou um riacho pulando de pedra em pedra.',
  (n: string) => `${n} cochilou um pouquinho no caminho.`,
  (n: string) => `Lá longe apareceu um brilho estranho… ${n} foi ver.`,
  (n: string) => `${n} dividiu uma berry com o resto do grupo.`,
  () => 'O grupo subiu uma colina e viu a paisagem toda.',
  (n: string) => `${n} treinou um golpe novo durante a pausa.`,
  () => 'Um Pokémon selvagem seguiu o grupo por um tempo, curioso.',
];

function diaryOf(state: GameState, run: ExpeditionRun, now: number): string[] {
  const names = run.uids
    .map((uid) => state.collection.find((p) => p.uid === uid))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => speciesName(p.speciesId));
  if (!names.length) return [];
  const steps = Math.min(6, Math.floor(((now - run.startedAt) / (run.endsAt - run.startedAt)) * 6));
  const rng = seededRng(run.seed);
  return Array.from({ length: Math.max(0, steps) }, () => {
    const line = DIARY[Math.floor(rng.next() * DIARY.length)];
    return line(names[Math.floor(rng.next() * names.length)]);
  });
}

function Trail({ state, run, def }: { state: GameState; run: ExpeditionRun; def: ExpeditionDef }) {
  const now = state.lastTimerAt;
  const progress = Math.min(1, (now - run.startedAt) / (run.endsAt - run.startedAt));
  return (
    <div
      className={`ex-trail ${progress >= 1 ? 'done' : ''}`}
      style={{ '--theme': THEME[def.types[0]] ?? '#88c070', '--p': progress } as CSSProperties}
    >
      <span className="ex-scenery" aria-hidden />
      <span className="ex-path" aria-hidden />
      <span className="ex-flag" aria-hidden />
      <span className="ex-party">
        {run.uids.map((uid, i) => {
          const p = state.collection.find((x) => x.uid === uid);
          return p ? (
            <span key={uid} className="ex-walker" style={{ animationDelay: `${i * 0.15}s` }}>
              <PokemonSprite speciesId={p.speciesId} kind="icon" shiny={p.shiny} />
            </span>
          ) : null;
        })}
      </span>
    </div>
  );
}

function Postcard({
  name,
  def,
  party,
  loot,
  onClose,
}: {
  name: string;
  def?: ExpeditionDef;
  party: number[];
  loot: ExpeditionLoot;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="modal-backdrop ex-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Cartão-postal da expedição"
      onClick={onClose}
    >
      <div className="ex-postcard" onClick={(e) => e.stopPropagation()}>
        <span className="ex-stamp" aria-hidden>
          <ItemIcon id="explorer-kit" size={28} />
        </span>
        <div
          className="ex-photo"
          style={{ '--theme': THEME[def?.types[0] ?? 'normal'] ?? '#88c070' } as CSSProperties}
        >
          {party.map((id, i) => (
            <span key={i} style={{ '--i': i } as CSSProperties}>
              <PokemonSprite speciesId={id} kind="front" pixelScale={1} />
            </span>
          ))}
        </div>
        <div className="ex-letter">
          <strong>Saudações de “{name}”!</strong>
          <p>A equipe voltou cansada, mas feliz, e trouxe:</p>
          <LootSummary loot={loot} />
          <button className="pbtn primary" onClick={onClose} autoFocus>
            Que viagem!
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ExpeditionsPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [choice, setChoice] = useState<string | null>(null);
  const [party, setParty] = useState<number[]>([]);
  const [hours, setHours] = useState(BALANCE.expeditions.durations[0]);
  const [loot, setLoot] = useState<{
    name: string;
    id: string;
    party: number[];
    loot: ExpeditionLoot;
  } | null>(null);
  const slots = expeditionSlots(state);
  if (slots === 0) return <Locked routeId={BALANCE.expeditions.slots[0]} />;
  const now = state.lastTimerAt;
  const open = availableExpeditions(state).filter((e) => !state.expeditions.some((r) => r.id === e.id));
  const def = open.find((e) => e.id === choice);
  const free = state.expeditions.length < slots;

  const claim = (id: string) => {
    const name = EXPEDITIONS.find((e) => e.id === id)?.name ?? id;
    const run = state.expeditions.find((r) => r.id === id);
    const party = (run?.uids ?? [])
      .map((uid) => state.collection.find((p) => p.uid === uid)?.speciesId)
      .filter((x): x is number => !!x);
    engine.dispatch((s, t) => {
      const events: never[] = [];
      const result = claimExpedition(s, id, t, events);
      if (result) {
        audio.sfx('itemGet');
        setLoot({ name, id, party, loot: result });
      }
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
              <li key={run.id} className={`expedition-run ex-run ${done ? 'done' : ''}`}>
                <Trail state={state} run={run} def={d} />
                <div className="run-info">
                  <strong>{d.name.toUpperCase()}</strong>
                  <Bar value={now - run.startedAt} max={run.endsAt - run.startedAt} tone="grass" />
                  <Countdown until={run.endsAt} now={now} done="VOLTOU!" />
                  {diaryOf(state, run, now).length > 0 && (
                    <ol className="ex-diary">
                      {diaryOf(state, run, now)
                        .slice(-3)
                        .map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                    </ol>
                  )}
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
          <Postcard
            name={loot.name}
            def={EXPEDITIONS.find((e) => e.id === loot.id)}
            party={loot.party}
            loot={loot.loot}
            onClose={() => setLoot(null)}
          />
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
