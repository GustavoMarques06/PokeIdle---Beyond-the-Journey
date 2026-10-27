// Ficha do Pokémon ativo, no estilo da tela de resumo dos jogos de GBA.

import { getItem, getSpecies, type Evolution } from '../../game-data';
import { masteryOf, passivePokemon } from '../../core/bonuses';
import { activePokemon, type GameState } from '../../core/game';
import { friendshipOf, statsOf } from '../../core/pokemon';
import { levelProgress } from '../../core/progression';
import { expForLevel } from '../../core/stats';
import { speciesName } from '../i18n/pt-BR';
import { ExpBar, HpBar, PokemonSprite, Shiny, TypeBadge } from './common';

const COND_TEXT = {
  'atk>def': 'com Ataque maior que a Defesa',
  'def>atk': 'com Defesa maior que o Ataque',
  'atk=def': 'com Ataque igual à Defesa',
  'uid-even': 'em um dos dois caminhos (sorteio do indivíduo)',
  'uid-odd': 'em um dos dois caminhos (sorteio do indivíduo)',
} as const;

const TIME_TEXT = { day: ' de dia', night: ' à noite' } as const;

/** Requisito de uma evolução, em texto. */
export function evolutionRequirement(e: Evolution, state: GameState, friendship: number): string {
  const when = e.time ? TIME_TEXT[e.time] : '';
  switch (e.trigger) {
    case 'level':
      return `Nv. ${e.minLevel}${e.cond ? ` ${COND_TEXT[e.cond]}` : ''}${when}`;
    case 'item': {
      const has = (state.items[e.item] ?? 0) > 0;
      return `${has ? 'usar' : 'precisa de'} ${getItem(e.item)?.name ?? e.item}${when}`;
    }
    case 'friendship':
      return `amizade ${Math.min(friendship, e.minFriendship)}/${e.minFriendship}${when}`;
  }
}

export function evolutionHint(state: GameState, uid: number): string | null {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p) return null;
  if (p.pendingEvolution) return `Pronto para evoluir em ${speciesName(p.pendingEvolution)}!`;
  const evo = getSpecies(p.speciesId).evolutions[0];
  if (!evo) return null;
  const others = getSpecies(p.speciesId).evolutions.length - 1;
  return `Evolui → ${speciesName(evo.to)}: ${evolutionRequirement(evo, state, friendshipOf(p))}${others > 0 ? ` (+${others} caminho${others > 1 ? 's' : ''})` : ''}`;
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
