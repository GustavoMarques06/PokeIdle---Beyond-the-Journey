// Torre de Batalha: subida infinita com o Pokémon ativo, ranking local e loja de BP.

import { BALANCE, TOWER_SHOP, WEEKLY_TOWER_MILESTONES } from '../../../game-data';
import {
  activePokemon,
  challengeTower,
  challengeWeeklyTower,
  weekOf,
  type GameState,
} from '../../../core/game';
import { buyTowerReward, floorLevel, towerUnlocked, weeklyBlocker, weeklyRule } from '../../../core/tower';
import { ItemIcon, PixelIcon, PokemonSprite, TypeBadge, Window } from '../../components/common';
import { TYPE_NAMES, formatDuration, speciesName } from '../../i18n/pt-BR';
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

      <WeeklyTower state={state} />

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

const WEEK_MS = 7 * 24 * 3_600_000;
/** Início (ms) da semana `week` (ver weekOf: troca na segunda-feira, UTC). */
const weekStart = (week: number) => week * WEEK_MS - 3 * 24 * 3_600_000;

/** Torre semanal: regra da semana, recorde, marcos e o histórico de semanas. */
function WeeklyTower({ state }: { state: GameState }) {
  const engine = useEngine();
  const now = state.lastTimerAt;
  const rule = weeklyRule(now);
  const blocker = weeklyBlocker(state, now);
  const w = state.tower.weekly.week === rule.week ? state.tower.weekly : { best: 0, claimed: [] as number[] };
  const climbing = state.battle.kind === 'tower' && state.battle.weekly;
  const history = state.tower.weeklyHistory;
  const bestEver = history.reduce((m, r) => Math.max(m, r.floor), 0);

  return (
    <Window title="TORRE SEMANAL" icon={<PixelIcon name="star" scale={2} />} frame="dialog">
      <div className="weekly-rule">
        <div>
          <strong>
            Semana: só <TypeBadge type={rule.type} />
          </strong>
          <small>
            {rule.mod.name}: {rule.mod.description}
          </small>
          <small>Nova regra em {formatDuration(weekStart(rule.week + 1) - now)}</small>
        </div>
        {climbing ? (
          <span className="tag tag-active">SUBINDO · ANDAR {state.battle.floor}</span>
        ) : (
          <button
            className="pbtn primary"
            disabled={!!blocker}
            onClick={() => engine.dispatch((s, t) => void challengeWeeklyTower(s, t))}
          >
            Subir na semanal
          </button>
        )}
      </div>
      {blocker === 'type' && (
        <p className="hint">
          O ativo e as reservas precisam ser do tipo {TYPE_NAMES[rule.type] ?? rule.type}. Troque a equipe na
          tela POKéMON.
        </p>
      )}
      <p className="hint">
        Os andares desta semana são os mesmos para todos os jogadores: compare seu andar com o dos amigos.
        Recorde da semana: <strong>andar {w.best}</strong>
        {bestEver > 0 && ` · melhor semana: andar ${bestEver}`}.
      </p>
      <ul className="weekly-milestones" aria-label="Marcos da semana">
        {WEEKLY_TOWER_MILESTONES.map((m) => {
          const done = w.claimed.includes(m.floor);
          return (
            <li key={m.floor} className={done ? 'done' : ''}>
              {done && <PixelIcon name="check" scale={1} />} Andar {m.floor}: +{m.bp} BP
            </li>
          );
        })}
      </ul>
      {history.length > 0 && (
        <ol className="ranking">
          {history.map((r) => (
            <li key={r.week}>
              <span className="rank">{r.week === weekOf(now) ? 'AGORA' : `S${r.week}`}</span>
              <PokemonSprite speciesId={r.speciesId} kind="icon" />
              <span>
                {speciesName(r.speciesId)} ·{' '}
                <TypeBadge type={weeklyRule(weekStart(r.week) + 3_600_000).type} />
              </span>
              <strong>ANDAR {r.floor}</strong>
              <small>{new Date(weekStart(r.week)).toLocaleDateString('pt-BR')}</small>
            </li>
          ))}
        </ol>
      )}
    </Window>
  );
}
