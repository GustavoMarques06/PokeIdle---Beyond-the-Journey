// Raides e revanches: chefes gigantes por tempo limitado e a segunda chance contra os chefes vencidos.

import { BALANCE, ROUTES, getRoute } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import {
  canChallengeRaid,
  canRematch,
  challengeRaid,
  challengeRematch,
  type GameState,
} from '../../../core/game';
import { ItemIcon, PokemonSprite, TrainerSprite, Window } from '../../components/common';
import { formatDuration, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Countdown, Locked } from './shared';

export function RaidsPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  if (!activityUnlocked(state, 'raids')) return <Locked routeId={BALANCE.raid.unlock} />;
  const now = state.lastTimerAt;
  const raid = state.raid;
  const idle = state.battle.kind === 'wild';
  const defeated = ROUTES.filter((r) => r.boss && state.routes[r.id]?.bossDefeated);

  return (
    <>
      <Window title="RAIDES" icon={<ItemIcon id="dynamax-band" size={24} />} frame="dialog">
        {raid ? (
          <div className="raid-card">
            <PokemonSprite speciesId={raid.speciesId} kind="front" pixelScale={1} />
            <div>
              <strong>
                {speciesName(raid.speciesId).toUpperCase()} Nv{raid.level}
              </strong>
              <small>
                Apareceu em {getRoute(raid.routeId).name} · some em <Countdown until={raid.until} now={now} />
              </small>
              <button
                className="pbtn primary"
                disabled={!canChallengeRaid(state)}
                onClick={() => engine.dispatch(challengeRaid)}
              >
                {idle ? 'Enfrentar a raide' : 'Termine a batalha atual'}
              </button>
            </div>
          </div>
        ) : (
          <p className="hint">
            Nenhuma raide no momento
            {state.nextRaidAt > now
              ? `; a próxima pode surgir em cerca de ${formatDuration(state.nextRaidAt - now)}`
              : ''}
            .
          </p>
        )}
        <ul className="raid-rules">
          <li>O chefe tem {BALANCE.raid.hpMultiplier}× mais HP, segura um item e tem habilidade própria.</li>
          <li>Ele fica furioso em 2/3 e em 1/3 da vida: bate mais forte e mais rápido.</li>
          <li>Você tem {Math.round(BALANCE.raid.timeLimitMs / 1000)} s.</li>
          <li>
            Vencer rende moedas, itens raros (vitaminas, Tampa de Garrafa, itens seguráveis…) e{' '}
            {Math.round(BALANCE.raid.catchChance * 100)}% de chance de capturar o chefe, com o item dele.
          </li>
        </ul>
      </Window>

      <Window title="REVANCHES" icon={<ItemIcon id="vs-seeker" size={24} />}>
        <p className="hint">
          Chefes já vencidos aceitam uma revanche a cada {BALANCE.rematch.cooldownHours} h, com{' '}
          {BALANCE.rematch.levelBonus} níveis a mais e itens nos Pokémon. Sem insígnia, mas com moedas e itens
          raros.
        </p>
        <ul className="rematch-list">
          {defeated.map((r) => {
            const ready = canRematch(state, r.id, now);
            const wait = (state.rematchAt[r.id] ?? 0) - now;
            return (
              <li key={r.id} className={ready ? '' : 'missing'}>
                <TrainerSprite id={r.boss!.trainer} size={40} head />
                <div>
                  <strong>{r.boss!.name}</strong>
                  <small>
                    {r.name} · {ready ? 'pronto' : `volta em ${formatDuration(wait)}`}
                  </small>
                </div>
                <button
                  className="pbtn small"
                  disabled={!ready || !idle}
                  onClick={() => engine.dispatch((s, t) => challengeRematch(s, r.id, t))}
                >
                  Revanche
                </button>
              </li>
            );
          })}
          {!defeated.length && <li className="hint">Vença um chefe para liberar a revanche.</li>}
        </ul>
      </Window>
    </>
  );
}
