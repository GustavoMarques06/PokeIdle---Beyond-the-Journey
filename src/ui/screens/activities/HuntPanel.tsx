// Caça ao shiny: escolha de alvo, contador de encontros e sequência.

import { BALANCE, getRoute } from '../../../game-data';
import { computeModifiers } from '../../../core/bonuses';
import { currentEncounters, type GameState } from '../../../core/game';
import { huntShinyMultiplier, setHuntTarget } from '../../../core/hunt';
import { Bar, ItemIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { formatNumber, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';

export function HuntPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const h = state.hunt;
  const route = getRoute(state.currentRouteId);
  const encounters = currentEncounters(state, route.id);
  const total = encounters.reduce((s, e) => s + e.weight, 0);
  const target = h.target;
  const odds = target
    ? 1 / (BALANCE.capture.shinyChance * computeModifiers(state).shiny * huntShinyMultiplier(state, target))
    : 1 / (BALANCE.capture.shinyChance * computeModifiers(state).shiny);
  const here = target ? encounters.find((e) => e.speciesId === target) : undefined;

  return (
    <>
      <Window title="CAÇA AO SHINY" icon={<ItemIcon id="poke-radar" size={24} />} frame="dialog">
        {target ? (
          <div className="hunt-target">
            <PokemonSprite speciesId={target} kind="front" shiny pixelScale={1} />
            <div>
              <strong>ALVO: {speciesName(target).toUpperCase()}</strong>
              <small>
                {formatNumber(h.encounters)} encontros nesta caçada · sequência {h.chain} (recorde{' '}
                {h.bestChain})
              </small>
              <Bar value={Math.min(h.chain, BALANCE.hunt.chainCap)} max={BALANCE.hunt.chainCap} tone="gold" />
              <small>
                Chance atual: 1 em {formatNumber(odds)}
                {here
                  ? ` · aparece em ${Math.round((here.weight / total) * 100)}% dos encontros aqui`
                  : ' · não aparece na rota atual'}
              </small>
            </div>
            <button className="pbtn small" onClick={() => engine.dispatch((s) => setHuntTarget(s, null))}>
              Parar
            </button>
          </div>
        ) : (
          <p className="hint">
            Escolha uma espécie que você já viu. Ela aparece {BALANCE.hunt.targetWeight}× mais e cada encontro
            seguido soma +{BALANCE.hunt.chainBonus * 100}% de chance de shiny (até {BALANCE.hunt.chainCap}).
            Trocar de rota ou ser derrotado quebra a sequência. Chance base atual: 1 em {formatNumber(odds)}.
          </p>
        )}
      </Window>

      <Window title={`ESPÉCIES DE ${route.name.toUpperCase()}`}>
        <ul className="hunt-options">
          {encounters.map((e) => {
            const seen = state.pokedex[e.speciesId]?.seen;
            return (
              <li key={e.speciesId}>
                <button
                  className={`pc-cell ${target === e.speciesId ? 'selected' : ''}`}
                  disabled={!seen}
                  onClick={() => engine.dispatch((s) => setHuntTarget(s, e.speciesId))}
                  title={seen ? `Caçar ${speciesName(e.speciesId)}` : 'Ainda não visto'}
                >
                  <PokemonSprite speciesId={e.speciesId} kind="icon" silhouette={!seen} />
                  <span>{formatNumber(h.counts[e.speciesId] ?? 0)}</span>
                  {state.pokedex[e.speciesId]?.shinyCaught && <Shiny />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="hint">O número é o total de encontros com cada espécie.</p>
      </Window>

      {h.log.length > 0 && (
        <Window title="SHINIES DA CAÇADA">
          <ul className="hunt-log">
            {h.log.map((l, i) => (
              <li key={i}>
                <PokemonSprite speciesId={l.speciesId} kind="icon" />
                <span>
                  {speciesName(l.speciesId)} <Shiny />
                </span>
                <small>
                  após {formatNumber(l.encounters)} encontros · {new Date(l.at).toLocaleDateString('pt-BR')}
                </small>
              </li>
            ))}
          </ul>
        </Window>
      )}
    </>
  );
}
