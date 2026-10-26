// Laboratório de fósseis (Ilha Cinnabar): reviver fósseis leva algumas horas reais.

import { BALANCE, FOSSILS } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import { claimFossil, startRevive } from '../../../core/fossils';
import type { GameState } from '../../../core/game';
import { Bar, ItemIcon, PokemonSprite, Window } from '../../components/common';
import { itemName, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Countdown, Locked } from './shared';

export function FossilPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  if (!activityUnlocked(state, 'fossils')) return <Locked routeId={BALANCE.fossils.unlock} />;
  const now = state.lastTimerAt;
  const busy = state.fossils.length >= BALANCE.fossils.slots;

  return (
    <>
      <Window title="LABORATÓRIO POKéMON" icon={<ItemIcon id="old-amber" size={24} />} frame="dialog">
        {state.fossils.length === 0 && (
          <p className="hint">A máquina de reviver está livre. Entregue um fóssil.</p>
        )}
        <ul className="fossil-runs">
          {state.fossils.map((run, i) => {
            const def = FOSSILS.find((f) => f.item === run.item)!;
            const ready = now >= run.readyAt;
            return (
              <li key={i} className={`fossil-run ${ready ? 'done' : ''}`}>
                <PokemonSprite speciesId={run.speciesId} kind="front" silhouette={!ready} pixelScale={1} />
                <div>
                  <strong>
                    {ready ? `${speciesName(run.speciesId).toUpperCase()} voltou à vida!` : 'Revivendo…'}
                  </strong>
                  <Bar
                    value={now - (run.readyAt - def.hours * 3_600_000)}
                    max={def.hours * 3_600_000}
                    tone="exp"
                  />
                  <Countdown until={run.readyAt} now={now} />
                </div>
                {ready && (
                  <button
                    className="pbtn small primary"
                    onClick={() => engine.dispatch((s, t) => void claimFossil(s, i, t))}
                  >
                    Receber
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Window>

      <Window title="FÓSSEIS" icon={<ItemIcon id="helix-fossil" size={24} />}>
        <ul className="fossil-list">
          {FOSSILS.map((f) => {
            const qty = state.items[f.item] ?? 0;
            return (
              <li key={f.item} className={qty ? '' : 'missing'}>
                <ItemIcon id={f.item} size={28} />
                <div>
                  <strong>
                    {itemName(f.item).toUpperCase()} ×{qty}
                  </strong>
                  <small>
                    → {state.pokedex[f.speciesId]?.caught ? speciesName(f.speciesId) : '???'} · {f.hours} h
                  </small>
                </div>
                <button
                  className="pbtn small"
                  disabled={!qty || busy}
                  onClick={() => engine.dispatch((s, t) => startRevive(s, f.item, t))}
                >
                  Reviver
                </button>
              </li>
            );
          })}
        </ul>
        <p className="hint">Fósseis aparecem em chefes, nas Ruínas, no Subterrâneo e em outras expedições.</p>
      </Window>
    </>
  );
}
