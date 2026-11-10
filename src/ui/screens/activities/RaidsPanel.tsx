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
import {
  raidBreakers,
  raidHpMultiplier,
  raidLootRolls,
  raidModifier,
  type RaidModId,
  raidPerfectIvs,
  raidStarBonus,
  raidStars,
  raidTimeLimit,
} from '../../../core/raids';
import { audio } from '../../audio';
import { ItemIcon, PokemonSprite, TrainerSprite, TypeBadge, Window } from '../../components/common';
import { formatDuration, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Countdown, Locked } from './shared';

/** Nome e efeito de cada regra da semana. */
const RAID_MOD_TEXT: Record<RaidModId, [string, string]> = {
  storm: ['Tempestade', 'Golpes Elétricos e de Água batem 50% mais forte, os seus e os do chefe.'],
  frenzy: ['Frenesi', 'O chefe ataca 25% mais rápido, mas a vitória rende 50% mais moedas.'],
  treasure: ['Tesouro', 'O chefe tem 25% mais HP e a vitória dá dois sorteios de item a mais.'],
  blitz: ['Relâmpago', 'Você tem 25% menos tempo, mas a captura do chefe é garantida.'],
};

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
  // A vitória mais rápida de todas ganha o selo de recorde no livro.
  const fastest = Object.entries(state.raidBest ?? {}).reduce<[number, number] | null>(
    (acc, [id, ms]) => (!acc || ms < acc[1] ? [+id, ms] : acc),
    null,
  )?.[0];
  const cfg = BALANCE.raid;
  // A raide em campo guarda a regra da semana em que surgiu; sem raide, vale a desta semana.
  const modId = raid?.mod ?? raidModifier(now);
  // Sinal de energia: enche conforme a próxima raide chega (a janela máxima entre raides é a régua).
  const windowMs = cfg.maxHours * 3_600_000;
  const signal = raid ? 1 : Math.max(0.05, Math.min(1, 1 - (state.nextRaidAt - now) / windowMs));
  const stars = raid ? raidStars(raid.speciesId) : 0;
  const left = raid ? Math.max(0, (raid.until - now) / (cfg.activeMinutes * 60_000)) : 0;

  return (
    <>
      <Window title="RAIDES" icon={<ItemIcon id="dynamax-band" size={24} />} frame="dialog">
        <div
          className={`raid-den ${raid ? 'active' : 'quiet'} stars-${stars} ${raid && left < 0.25 ? 'urgent' : ''} ${signal > 0.85 ? 'charged' : ''}`}
          style={{ '--signal': signal, '--left': left } as CSSProperties}
        >
          <span className="raid-pillar" aria-hidden />
          <span className="raid-clouds" aria-hidden />
          <span className="raid-runes" aria-hidden />
          <span className="raid-bolt" aria-hidden />
          <span className="raid-embers" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </span>
          {raid ? (
            <>
              <span key={`${raid.speciesId}-${raid.until}`} className="raid-boss">
                <span className="raid-boss-inner">
                  <PokemonSprite speciesId={raid.speciesId} kind="front" pixelScale={2} />
                </span>
              </span>
              {stars >= 5 && (
                <span className="raid-sparks" aria-hidden>
                  {Array.from({ length: 8 }, (_, i) => (
                    <i key={i} style={{ '--i': i } as CSSProperties} />
                  ))}
                </span>
              )}
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
            <span className="raid-breakers" title="Golpes destes tipos atravessam o escudo e o quebram rápido">
              <small>O escudo quebra com</small>
              {raidBreakers(raid.speciesId).map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </span>
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
        <div className={`raid-mod mod-${modId}`}>
          <strong>
            {raid ? 'REGRA DESTA RAIDE' : 'REGRA DA SEMANA'}: {RAID_MOD_TEXT[modId][0].toUpperCase()}
          </strong>
          <small>{RAID_MOD_TEXT[modId][1]}</small>
        </div>
        <details className="fold">
          <summary>Como funciona</summary>
          <ul className="raid-rules">
          <li>
            O chefe entra com um <strong>escudo</strong> e o ergue de novo a cada fúria. Golpes super efetivos
            atravessam o escudo e o quebram em dois acertos; os outros batem com{' '}
            {Math.round(cfg.shieldDamage * 100)}% da força e levam {cfg.shield} acertos. Quebrar o escudo
            atordoa o chefe por {cfg.stunMs / 1000} s.
          </li>
          <li>
            A cada fúria ele carrega um <strong>golpe gigante</strong> por {cfg.chargeMs / 1000} s, que bate{' '}
            {String(cfg.chargeDamage).replace('.', ',')}× mais forte. Quebre o escudo a tempo para cancelar, ou
            troque para um Pokémon que resista.
          </li>
          <li>
            {raid
              ? `Este chefe tem ${raidHpMultiplier(raid.speciesId, raid.mod)}× mais HP, `
              : `O chefe tem de ${cfg.hpByStars[0]}× (1★) a ${cfg.hpByStars[4]}× (5★) mais HP, `}
            segura um item e tem habilidade própria.
          </li>
          <li>Ele fica furioso em 2/3 e em 1/3 da vida: bate mais forte e mais rápido.</li>
          <li>
            {raid
              ? `Você tem ${Math.round(raidTimeLimit(raid.speciesId, raid.mod) / 1000)} s.`
              : `Você tem de ${Math.round(cfg.timeByStars[0] / 1000)} s (1★) a ${Math.round(cfg.timeByStars[4] / 1000)} s (5★).`}{' '}
            Mais estrelas dão mais moedas, mais itens e mais IVs perfeitos no chefe
            {raid ? ` (${raidLootRolls(raid.speciesId, raid.mod)} sorteios de item, ${raidPerfectIvs(raid.speciesId)} IVs perfeitos)` : ''}.
          </li>
          <li>
            Vencer rende moedas, itens raros e {Math.round(cfg.catchChance * 100)}% de chance de capturar o
            chefe, com o item dele.
          </li>
          </ul>
        </details>
      </Window>

      <Window
        title={`LIVRO DE RAIDES · ${state.stats.raidWins} vitórias`}
        icon={<ItemIcon id="dynamax-band" size={24} />}
      >
        {book.length ? (
          <ul className="raid-book">
            {book.map(([id, n]) => (
              <li key={id} className={`stars-${raidStars(+id)} ${+id === fastest ? 'record' : ''}`}>
                {+id === fastest && <span className="raid-record-seal">RECORDE</span>}
                <PokemonSprite speciesId={+id} kind="front" pixelScale={1} />
                <strong>{speciesName(+id)}</strong>
                <Stars n={raidStars(+id)} />
                <small>
                  ×{n}
                  {state.raidBest?.[+id] ? ` · ${(state.raidBest[+id] / 1000).toFixed(1)} s` : ''}
                </small>
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
