// Torre de Batalha: subida infinita com o Pokémon ativo, ranking local e loja de BP. O prédio mostra os andares em
// volta do atual (ou do recorde), com o elevador aceso, a marca do recorde e a coroa nos andares do Cérebro da Torre.

import type { CSSProperties } from 'react';
import { BALANCE, TOWER_SHOP, WEEKLY_TOWER_MILESTONES } from '../../../game-data';
import {
  activePokemon,
  challengeTower,
  challengeWeeklyTower,
  weekOf,
  type GameState,
} from '../../../core/game';
import { buyTowerReward, floorLevel, towerUnlocked, weeklyBlocker, weeklyRule } from '../../../core/tower';
import { ItemIcon, PixelIcon, PokemonSprite, TrainerSprite, TypeBadge, Window } from '../../components/common';
import { TYPE_NAMES, formatDuration, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked } from './shared';
import { Empty } from '../../components/Dynamic';

const SHOP_ICONS: Record<string, string> = {
  tm: 'tm',
  ultra: 'ultra-ball',
  candy: 'rare-candy',
  research: 'up-grade',
  master: 'master-ball',
};

function TowerBuilding({ state }: { state: GameState }) {
  const t = state.tower;
  const climbing = state.battle.kind === 'tower';
  const current = climbing ? (state.battle.floor ?? 1) : 0;
  const focus = Math.max(1, current || t.best || 1);
  // Mostra 9 andares, com o foco perto do meio.
  const top = Math.max(9, focus + 4);
  const floors = Array.from({ length: 9 }, (_, i) => top - i);
  const every = BALANCE.tower.bossEvery;
  const nextBoss = Math.ceil(Math.max(1, current || t.best + 1) / every) * every;
  return (
    <div className={`tw-building ${climbing ? 'climbing' : ''}`}>
      <span className="tw-roof" aria-hidden />
      <span className="tw-shaft" aria-hidden style={{ '--car': top - focus } as CSSProperties}>
        <span className="tw-car">
          <i className="tw-car-door l" />
          <i className="tw-car-door r" />
          <b>{focus}</b>
        </span>
      </span>
      <ol className="tw-floors">
        {floors.map((f) => {
          const boss = f % every === 0;
          return (
            <li
              key={f}
              className={`${f === current ? 'here' : ''} ${f === t.best ? 'best' : ''} ${boss ? 'boss' : ''} ${f < (current || 0) ? 'cleared' : ''}`}
            >
              <span className="tw-num">{f}</span>
              <span className="tw-windows" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              {boss && (
                <span className="tw-crown" title="Cérebro da Torre" aria-hidden>
                  👑
                </span>
              )}
              {f === current && (
                <span className="tw-you">
                  <PokemonSprite speciesId={activePokemon(state).speciesId} kind="icon" />
                </span>
              )}
              {f === t.best && f !== current && <span className="tw-flag">RECORDE</span>}
            </li>
          );
        })}
      </ol>
      <span className="tw-base" aria-hidden />
      <small className="tw-next">
        {climbing
          ? `Andar ${current} · próximo Cérebro no ${nextBoss}`
          : `Próximo Cérebro no andar ${nextBoss}`}
      </small>
    </div>
  );
}

export function TowerPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  if (!towerUnlocked(state)) return <Locked routeId={BALANCE.tower.unlock} />;
  const t = state.tower;
  const climbing = state.battle.kind === 'tower';
  const next = floorLevel(climbing ? (state.battle.floor ?? 1) : 1);

  return (
    <>
      <Window title="TORRE DE BATALHA" icon={<ItemIcon id="rainbow-pass" size={24} />} frame="dialog">
        <TowerBuilding state={state} />
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
        {climbing && state.battle.trainer && (
          <div className={`tw-foe ${state.battle.trainer.line ? 'brain' : ''}`}>
            <TrainerSprite id={state.battle.trainer.sprite} size={48} head />
            <span>
              <small>{state.battle.trainer.title.toUpperCase()}</small>
              <strong>{state.battle.trainer.name}</strong>
              {state.battle.trainer.line && <em>“{state.battle.trainer.line}”</em>}
            </span>
            <span className="tw-foe-team">
              {state.battle.team.map((m, i) => (
                <span key={i} className={i < state.battle.bossIndex ? 'down' : ''}>
                  <PokemonSprite speciesId={m.speciesId} kind="icon" />
                </span>
              ))}
            </span>
          </div>
        )}
        <p className="hint">
          Cada andar tem 3 Pokémon, começando no Nv{BALANCE.tower.baseLevel}. A cada {BALANCE.tower.bossEvery}{' '}
          andares, um Cérebro da Torre com um lendário. Entre andares você recupera{' '}
          {BALANCE.tower.healPerFloor * 100}% do HP. Perder encerra a subida.
        </p>
      </Window>

      <WeeklyTower state={state} />

      <Window title="RANKING" icon={<ItemIcon id="rainbow-pass" size={24} />}>
        {t.runs.length === 0 && <Empty icon="rainbow-pass">Nenhuma subida registrada.</Empty>}
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
        <p className="hint alert">
          Toda a equipe precisa ser do tipo {TYPE_NAMES[rule.type] ?? rule.type}. Troque a equipe na tela
          POKéMON.
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
