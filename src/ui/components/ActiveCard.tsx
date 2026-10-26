// Ficha do Pokémon ativo, no estilo da tela de resumo dos jogos de GBA.

import { getItem, getSpecies } from '../../game-data';
import { masteryOf, passivePokemon } from '../../core/bonuses';
import { activePokemon, type GameState } from '../../core/game';
import { statsOf } from '../../core/pokemon';
import { levelProgress } from '../../core/progression';
import { expForLevel } from '../../core/stats';
import { speciesName } from '../i18n/pt-BR';
import { ExpBar, HpBar, PokemonSprite, Shiny, TypeBadge } from './common';

export function evolutionHint(state: GameState, uid: number): string | null {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p) return null;
  if (p.pendingEvolution) return `Pronto para evoluir em ${speciesName(p.pendingEvolution)}!`;
  for (const e of getSpecies(p.speciesId).evolutions) {
    if (e.trigger === 'level') return `Evolui no Nv. ${e.minLevel} → ${speciesName(e.to)}`;
    if (e.trigger === 'item') {
      const has = (state.items[e.item] ?? 0) > 0;
      return `${has ? 'Use' : 'Precisa de'} ${getItem(e.item)?.name ?? e.item} → ${speciesName(e.to)}`;
    }
  }
  return null;
}

export function ActiveCard({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  const p = activePokemon(state);
  const species = getSpecies(p.speciesId);
  const stats = statsOf(p);
  const hint = evolutionHint(state, p.uid);
  const rate = species.growthRate;
  const toNext = Math.max(0, expForLevel(rate, p.level + 1) - p.exp);
  const mastery = masteryOf(state, p.speciesId);
  const support = passivePokemon(state);

  return (
    <section className="active-card frame frame-menu">
      <button className="active-sprite" onClick={onOpen} title="Abrir equipe">
        <PokemonSprite speciesId={p.speciesId} kind="front" shiny={p.shiny} pixelScale={2} />
      </button>
      <div className="active-info">
        <div className="active-name">
          <strong>
            {species.name.toUpperCase()}
            {p.shiny && <Shiny />}
          </strong>
          <span className="lv">Nv{p.level}</span>
        </div>
        <div className="types">
          {species.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
          {mastery.level > 0 && <span className="mastery-tag">MAESTRIA {mastery.level}</span>}
        </div>
        <HpBar value={p.currentHp} max={stats.hp} />
        <div className="active-hp">
          {p.currentHp}/{stats.hp}
        </div>
        <ExpBar progress={levelProgress(p)} />
        <div className="active-next">
          Faltam {toNext} EXP para o Nv. {p.level + 1}
        </div>
        {hint && <div className={`evo-hint ${p.pendingEvolution ? 'ready' : ''}`}>{hint}</div>}
      </div>
      <div className="active-support">
        <span>APOIO</span>
        {support.length ? (
          support.map((s) => <PokemonSprite key={s.uid} speciesId={s.speciesId} kind="icon" />)
        ) : (
          <em>nenhum</em>
        )}
      </div>
    </section>
  );
}
