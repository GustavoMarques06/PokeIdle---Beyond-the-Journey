// Campo de Treino: o Pokémon escolhido acumula EVs em tempo real (também com o jogo fechado). Cada vaga é uma estação
// animada do atributo (saco de pancada, esteira, escudo, orbe, meditação, halteres), com o hexágono dos EVs e o plano
// de treino (quando um atributo enche, passa para o próximo). Duplicatas viram EVs na hora (sparring).

import { useState, type CSSProperties } from 'react';
import { BALANCE, type StatKey } from '../../../game-data';
import { activityUnlocked, busyUids, findPokemon } from '../../../core/collection';
import { TRAINING_PLANS, setTrainingPlan } from '../../../core/training';
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

/** O que a treinadora diz de cada atributo. */
const COACH: Record<StatKey, string> = {
  hp: 'Levantando peso: resistência é tudo numa batalha longa!',
  atk: 'Isso, mais força nesse golpe! O saco de pancada aguenta!',
  def: 'Firme atrás do escudo! Nada passa por essa defesa!',
  spAtk: 'Concentre a energia no orbe… sinta o poder!',
  spDef: 'Respire fundo. A mente calma resiste a tudo.',
  spe: 'Mais rápido! Quem ataca primeiro, ganha!',
};

/** Hexágono dos EVs (cada ponta até o máximo por atributo). */
function EvHex({ evs, max, active }: { evs: Record<StatKey, number>; max: number; active: StatKey }) {
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
  };
  const ring = (f: number) => STAT_KEYS.map((_, i) => pt(i, 40 * f)).join(' ');
  return (
    <svg className="ev-hex" viewBox="0 0 100 100" aria-hidden>
      <polygon points={ring(1)} className="grid" />
      <polygon points={ring(0.5)} className="grid" />
      <polygon
        points={STAT_KEYS.map((k, i) => pt(i, 40 * Math.max(0.04, (evs[k] ?? 0) / max))).join(' ')}
        className="fill"
      />
      {STAT_KEYS.map((k, i) => {
        const [x, y] = pt(i, 47).split(',').map(Number);
        return (
          <text key={k} x={x} y={y + 2} className={k === active ? 'on' : ''}>
            {STAT_NAMES[k].slice(0, 3)}
          </text>
        );
      })}
    </svg>
  );
}

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
        <ul className="train-stations">
          {state.training.slots.map((slot) => {
            const p = findPokemon(state, slot.uid);
            if (!p) return null;
            const evs = evsOf(p);
            const planId = slot.plan
              ? (TRAINING_PLANS.find((pl) => pl.stats.join() === slot.plan!.join())?.id ?? '')
              : '';
            return (
              <li key={slot.uid} className={`train-station st-${slot.stat}`}>
                <div
                  className="train-ground"
                  style={{ '--rate': trainingRate(p) / t.evsPerHour } as CSSProperties}
                >
                  <span className="train-gear" aria-hidden>
                    <i />
                    <i />
                  </span>
                  <span className="train-mon">
                    <PokemonSprite speciesId={p.speciesId} kind="front" shiny={p.shiny} pixelScale={1} />
                  </span>
                  <span className="train-sweat" aria-hidden>
                    <i />
                    <i />
                  </span>
                  <span className="train-plus" aria-hidden>
                    +EV
                  </span>
                </div>
                <div className="train-info">
                  <strong>
                    {speciesName(p.speciesId).toUpperCase()} Nv{p.level}
                  </strong>
                  <p className="train-coach">
                    <span className="caretaker-tag">TREINADORA</span> {COACH[slot.stat]}
                  </p>
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
                  <label className="train-plan">
                    Plano:{' '}
                    <select
                      value={planId}
                      onChange={(e) => {
                        const plan = TRAINING_PLANS.find((pl) => pl.id === e.target.value);
                        engine.dispatch((s) => setTrainingPlan(s, p.uid, plan ? plan.stats : null));
                      }}
                    >
                      <option value="">só {STAT_NAMES[slot.stat]}</option>
                      {TRAINING_PLANS.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} ({pl.stats.map((k) => STAT_NAMES[k]).join(' → ')})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="pbtn small"
                    onClick={() => engine.dispatch((s) => stopTraining(s, p.uid))}
                  >
                    Parar
                  </button>
                </div>
                <EvHex evs={evs as Record<StatKey, number>} max={t.maxPerStat} active={slot.stat} />
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
