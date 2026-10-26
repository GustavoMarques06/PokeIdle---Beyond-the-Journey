// Torre de Batalha: subida infinita com o Pokémon ativo, ranking local e loja de BP.

import { BALANCE, TOWER_SHOP } from '../../../game-data';
import { activePokemon, challengeTower, type GameState } from '../../../core/game';
import { buyTowerReward, floorLevel, towerUnlocked } from '../../../core/tower';
import { ItemIcon, PixelIcon, PokemonSprite, Window } from '../../components/common';
import { speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked } from './shared';

const SHOP_ICONS: Record<string, string> = {
  tm: 'tm',
  ultra: 'ultra-ball',
  candy: 'rare-candy',
  research: 'up-grade',
  master: 'master-ball',
};

export function TowerPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  if (!towerUnlocked(state)) return <Locked routeId={BALANCE.tower.unlock} />;
  const t = state.tower;
  const climbing = state.battle.kind === 'tower';
  const next = floorLevel(climbing ? (state.battle.floor ?? 1) : 1);

  return (
    <>
      <Window title="TORRE DE BATALHA" icon={<PixelIcon name="trophy" scale={2} />} frame="dialog">
        <div className="tower-head">
          <div>
            <strong>RECORDE: ANDAR {t.best}</strong>
            <small>{t.points} BP para gastar</small>
          </div>
          {climbing ? (
            <span className="tag tag-active">
              ANDAR {state.battle.floor} · Nv{next.level}
              {next.boost > 1 ? ` · +${Math.round((next.boost - 1) * 100)}%` : ''}
            </span>
          ) : (
            <button
              className="pbtn primary"
              disabled={state.battle.kind !== 'wild'}
              onClick={() => engine.dispatch(challengeTower)}
            >
              Subir com {speciesName(activePokemon(state).speciesId)}
            </button>
          )}
        </div>
        <p className="hint">
          Cada andar tem 3 Pokémon, começando no Nv{BALANCE.tower.baseLevel}. A cada {BALANCE.tower.bossEvery}{' '}
          andares, um Cérebro da Torre com um lendário. Entre andares você recupera{' '}
          {BALANCE.tower.healPerFloor * 100}% do HP. Perder encerra a subida.
        </p>
      </Window>

      <Window title="RANKING" icon={<PixelIcon name="trophy" scale={2} />}>
        {t.runs.length === 0 && <p className="hint">Nenhuma subida registrada.</p>}
        <ol className="ranking">
          {t.runs.map((r, i) => (
            <li key={`${r.at}-${i}`}>
              <span className="rank">{i + 1}º</span>
              <PokemonSprite speciesId={r.speciesId} kind="icon" />
              <span>{speciesName(r.speciesId)}</span>
              <strong>ANDAR {r.floor}</strong>
              <small>{new Date(r.at).toLocaleDateString('pt-BR')}</small>
            </li>
          ))}
        </ol>
      </Window>

      <Window title={`TROCAR BP · ${t.points}`} icon={<ItemIcon id="star-piece" size={24} />}>
        <ul className="shop-list">
          {TOWER_SHOP.map((e) => (
            <li key={e.id} className="shop-row">
              <ItemIcon id={SHOP_ICONS[e.id] ?? 'poke-ball'} size={28} />
              <span className="item-name">{e.name.toUpperCase()}</span>
              <button
                className="pbtn small"
                disabled={t.points < e.price}
                onClick={() => engine.dispatch((s) => void buyTowerReward(s, e.id))}
              >
                {e.price} BP
              </button>
            </li>
          ))}
        </ul>
      </Window>
    </>
  );
}
