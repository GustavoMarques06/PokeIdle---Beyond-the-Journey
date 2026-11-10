// Raides e revanches: a toca da raide (pilar de energia, o chefe gigante pulsando, estrelas de 1 a 5, anel com o tempo
// que sobra), o sinal de energia enquanto nenhuma aparece, o livro dos chefes vencidos e a segunda chance contra os
// chefes de rota.

import type { CSSProperties } from 'react';
import { BALANCE, ROUTES, getRoute } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import {
  canChallengeRaid,
  canRematch,
  challengeRaid,
  challengeRematch,
  type GameState,
} from '../../../core/game';
import { raidStarBonus, raidStars } from '../../../core/raids';
import { audio } from '../../audio';
import { ItemIcon, PokemonSprite, TrainerSprite, Window } from '../../components/common';
import { formatDuration, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Countdown, Locked } from './shared';

function Stars({ n }: { n: number }) {
  return (
    <span className="raid-stars" aria-label={`${n} estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

export function RaidsPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  if (!activityUnlocked(state, 'raids')) return <Locked routeId={BALANCE.raid.unlock} />;
  const now = state.lastTimerAt;
  const raid = state.raid && state.raid.until > now ? state.raid : null;
  const idle = state.battle.kind === 'wild';
  const defeated = ROUTES.filter((r) => r.boss && state.routes[r.id]?.bossDefeated);
  const book = Object.entries(state.raidLog ?? {}).sort(
    (a, b) => raidStars(+b[0]) - raidStars(+a[0]) || b[1] - a[1],
  );
  const cfg = BALANCE.raid;
  // Sinal de energia: enche conforme a próxima raide chega (a janela máxima entre raides é a régua).
  const windowMs = cfg.maxHours * 3_600_000;
  const signal = raid ? 1 : Math.max(0.05, Math.min(1, 1 - (state.nextRaidAt - now) / windowMs));
  const stars = raid ? raidStars(raid.speciesId) : 0;
  const left = raid ? Math.max(0, (raid.until - now) / (cfg.activeMinutes * 60_000)) : 0;

  return (
    <>
      <Window title="RAIDES" icon={<ItemIcon id="dynamax-band" size={24} />} frame="dialog">
        <div
          className={`raid-den ${raid ? 'active' : 'quiet'} stars-${stars}`}
          style={{ '--signal': signal, '--left': left } as CSSProperties}
        >
          <span className="raid-pillar" aria-hidden />
          <span className="raid-clouds" aria-hidden />
          {raid ? (
            <>
              <span className="raid-boss">
                <PokemonSprite speciesId={raid.speciesId} kind="front" pixelScale={2} />
              </span>
              <span className="raid-ring" aria-hidden>
                <span>
                  <Countdown until={raid.until} now={now} />
                </span>
              </span>
            </>
          ) : (
            <span className="raid-wait">
              <span className="raid-signal">
                <i />
              </span>
              <small>
                {signal > 0.85
                  ? 'A energia está muito forte…'
                  : signal > 0.5
                    ? 'Sinal de energia aumentando…'
                    : 'Tudo calmo por enquanto.'}
              </small>
            </span>
          )}
        </div>
        {raid ? (
          <div className="raid-info">
            <strong>
              {speciesName(raid.speciesId).toUpperCase()} GIGANTE · Nv{raid.level}
            </strong>
            <Stars n={stars} />
            <small>
              Em {getRoute(raid.routeId).name} · {stars}★ dá +{Math.round((raidStarBonus(stars) - 1) * 100)}%
              de moedas
            </small>
            <button
              className="pbtn primary raid-go"
              disabled={!canChallengeRaid(state)}
              onClick={() => {
                audio.sfx('raid');
                engine.dispatch(challengeRaid);
              }}
            >
              {idle ? 'ENFRENTAR A RAIDE!' : 'Termine a batalha atual'}
            </button>
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
          <li>O chefe tem {cfg.hpMultiplier}× mais HP, segura um item e tem habilidade própria.</li>
          <li>Ele fica furioso em 2/3 e em 1/3 da vida: bate mais forte e mais rápido.</li>
          <li>Você tem {Math.round(cfg.timeLimitMs / 1000)} s. Quanto mais estrelas, mais moedas.</li>
          <li>
            Vencer rende moedas, itens raros e {Math.round(cfg.catchChance * 100)}% de chance de capturar o
            chefe, com o item dele.
          </li>
        </ul>
      </Window>

      <Window
        title={`LIVRO DE RAIDES · ${state.stats.raidWins} vitórias`}
        icon={<ItemIcon id="dynamax-band" size={24} />}
      >
        {book.length ? (
          <ul className="raid-book">
            {book.map(([id, n]) => (
              <li key={id} className={`stars-${raidStars(+id)}`}>
                <PokemonSprite speciesId={+id} kind="front" pixelScale={1} />
                <strong>{speciesName(+id)}</strong>
                <Stars n={raidStars(+id)} />
                <small>×{n}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Vença uma raide para registrar o chefe aqui.</p>
        )}
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
              <li key={r.id} className={ready ? 'ready' : 'missing'}>
                <TrainerSprite id={r.boss!.trainer} size={40} head />
                <div>
                  <strong>{r.boss!.name}</strong>
                  <small>
                    {r.name} · {ready ? 'pronto para a revanche!' : `volta em ${formatDuration(wait)}`}
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
