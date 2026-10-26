// Creche: dois hóspedes compatíveis geram ovos com as vitórias; os ovos chocam com
// vitórias ou com o tempo.

import { BALANCE, getSpecies } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import {
  compatible,
  daycareCompatible,
  daycarePokemon,
  eggSpeciesOf,
  putInDaycare,
  takeFromDaycare,
} from '../../../core/daycare';
import type { GameState } from '../../../core/game';
import { Bar, PixelIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { formatDuration, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked, PokemonPicker } from './shared';

export function DaycarePanel({ state }: { state: GameState }) {
  const engine = useEngine();
  if (!activityUnlocked(state, 'daycare')) return <Locked routeId={BALANCE.daycare.unlock} />;
  const d = BALANCE.daycare;
  const guests = daycarePokemon(state);
  const [a, b] = guests;
  const ok = daycareCompatible(state);
  const full = state.eggs.length >= d.maxEggs;

  return (
    <>
      <Window title="CRECHE POKéMON" icon={<PixelIcon name="egg" scale={2} />} frame="dialog">
        <div className="daycare-yard">
          {[0, 1].map((i) => {
            const p = guests[i];
            return p ? (
              <button
                key={p.uid}
                className="daycare-guest frame frame-slot"
                onClick={() => engine.dispatch((s) => takeFromDaycare(s, p.uid))}
                title="Retirar da creche"
              >
                <PokemonSprite speciesId={p.speciesId} kind="front" shiny={p.shiny} pixelScale={1} />
                <span>
                  {speciesName(p.speciesId).toUpperCase()} Nv{p.level}
                  {p.shiny && <Shiny />}
                </span>
                <small>Retirar</small>
              </button>
            ) : (
              <div key={i} className="daycare-guest frame frame-slotEmpty">
                <span>VAGA {i + 1}</span>
                <small>Escolha abaixo</small>
              </div>
            );
          })}
        </div>
        <p className="daycare-status">
          {guests.length < 2
            ? 'Deixe dois Pokémon aqui. Eles ganham 1 nível a cada ' + d.killsPerLevel + ' vitórias suas.'
            : ok
              ? `Os dois se dão muito bem! Ovo de ${speciesName(eggSpeciesOf(a, b))} a caminho.`
              : 'Esses dois não parecem se gostar… (precisam de um grupo de ovos em comum, ou de um Ditto).'}
        </p>
        {ok && (
          <div className="node-progress">
            <Bar value={full ? 0 : state.daycare.eggProgress} max={d.killsPerEgg} tone="gold" />
            <span>
              {full
                ? 'Ninho cheio — espere chocar'
                : `${Math.floor(state.daycare.eggProgress)}/${d.killsPerEgg} vitórias`}
            </span>
          </div>
        )}
      </Window>

      <Window title={`OVOS · ${state.eggs.length}/${d.maxEggs}`} icon={<PixelIcon name="egg" scale={2} />}>
        {state.eggs.length === 0 && <p className="hint">Nenhum ovo ainda.</p>}
        <ul className="egg-list">
          {state.eggs.map((egg) => {
            const left = Math.max(0, egg.cycles - egg.progress);
            const kills = Math.ceil(left * d.killsPerCycle);
            const minutes = left * d.minutesPerCycle * 60_000;
            return (
              <li key={egg.id} className="egg-row">
                <PixelIcon
                  name="egg"
                  scale={3}
                  className={egg.progress / egg.cycles > 0.8 ? 'egg-wobble' : ''}
                />
                <div>
                  <strong>
                    {egg.progress / egg.cycles > 0.5 ? 'Dá para ouvir algo lá dentro!' : 'Um ovo misterioso.'}
                  </strong>
                  <Bar value={egg.progress} max={egg.cycles} tone="exp" />
                  <small>
                    Choca em {kills} vitórias ou {formatDuration(minutes)}
                  </small>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="hint">
          Ovos herdam {d.inheritedIvs} IVs dos pais e têm chance de shiny {d.shinyMultiplier}× maior.
        </p>
      </Window>

      {guests.length < d.slots && (
        <Window title="ESCOLHER HÓSPEDE">
          <PokemonPicker
            state={state}
            onPick={(p) => engine.dispatch((s) => putInDaycare(s, p.uid))}
            filter={(p) => !getSpecies(p.speciesId).legendary}
          />
          {a && (
            <p className="hint">
              Compatíveis com {speciesName(a.speciesId)}:{' '}
              {state.collection.filter((p) => p.uid !== a.uid && compatible(a, p)).length} na coleção.
            </p>
          )}
        </Window>
      )}
    </>
  );
}
