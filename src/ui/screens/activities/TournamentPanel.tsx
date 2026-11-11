// Torneio semanal: a chave em árvore (quartas → semi → final → troféu), com linhas, o "VS" da partida atual e quem
// caiu riscado; o narrador comentando, o patrocinador da semana (prêmio extra do campeão), a festa do título e a sala
// de troféus (ouro, prata e bronze).

import type { CSSProperties } from 'react';
import { BALANCE } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import {
  ROUND_NAMES,
  bestPlace,
  canPlayTournament,
  playTournament,
  weekOf,
  type GameState,
} from '../../../core/game';
import { sponsorOf, type TournamentEntrant } from '../../../core/tournament';
import { ItemIcon, Money, TrainerSprite, Window } from '../../components/common';
import { TOURNAMENT_PLACES, itemName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked } from './shared';
import { PixelFx } from '../../components/PixelFx';
import { Award, Emote } from '../../components/PixelUi';

/**
 * Quem passou de cada fase. O jogador e os adversários dele são reais; o outro jogo de cada lado é só para mostrar a
 * chave (sorteado na montagem, fixo pela semana).
 */
function advance(t: GameState['tournament']): {
  semi: (number | null)[];
  final: (number | null)[];
  champ: number | null;
} {
  const [, semiFoe, finalFoe] = t.opponents;
  const lostAt = t.place === null ? null : ({ quarter: 0, semi: 1, final: 2, champion: 3 } as const)[t.place];
  const reached = lostAt ?? t.round; // fases que o jogador já passou
  const otherHalf = finalFoe !== undefined && finalFoe < 6 ? 6 + (t.season % 2) : 4 + (t.season % 2);
  const quartersDone = reached >= 1 || lostAt === 0;
  const semisDone = reached >= 2 || lostAt === 1;
  const finalDone = reached >= 3 || lostAt === 2;
  return {
    semi: quartersDone ? [lostAt === 0 ? 1 : 0, semiFoe, finalFoe, otherHalf] : [null, null, null, null],
    final: semisDone ? [lostAt === 1 ? semiFoe : 0, finalFoe] : [null, null],
    champ: finalDone ? (t.place === 'champion' ? 0 : finalFoe) : null,
  };
}

function Slot({
  e,
  idx,
  state,
  out,
  vs,
}: {
  e?: TournamentEntrant;
  idx: number | null;
  state: GameState;
  out?: boolean;
  vs?: boolean;
}) {
  if (idx === null || !e)
    return (
      <span className="br-slot empty">
        <span className="br-q">?</span>
      </span>
    );
  return (
    <span
      className={`br-slot ${idx === 0 ? 'you' : ''} ${out ? 'out' : ''} ${vs ? 'vs' : ''}`}
      title={idx === 0 ? state.trainerName : e.name}
    >
      <TrainerSprite id={e.sprite} outfit={e.outfit} size={30} head />
      <span className="br-name">{idx === 0 ? 'VOCÊ' : e.name}</span>
    </span>
  );
}

/** O que o narrador diz. */
function announcer(state: GameState, inBattle: boolean): string {
  const t = state.tournament;
  if (t.place === 'champion')
    return `E O CAMPEÃO DA SEMANA É ${state.trainerName.toUpperCase()}! Que torneio!`;
  if (t.place)
    return `Fim da linha para ${state.trainerName} nas ${TOURNAMENT_PLACES[t.place].toLowerCase()}… Semana que vem tem mais!`;
  if (!t.bracket)
    return 'Bem-vindos ao Torneio da Semana! Oito treinadores, um só campeão. Quem se inscreve?';
  const foe = t.bracket[t.opponents[t.round]]?.name ?? '';
  const [a, b] = t.score;
  if (a === 1 && b === 1) return `Empate em 1–1 contra ${foe}! A próxima batalha decide tudo!`;
  if (a === 1) return `${state.trainerName} abre vantagem: 1–0 contra ${foe}!`;
  if (b === 1) return `${foe} saiu na frente! ${state.trainerName} precisa reagir!`;
  return inBattle
    ? `Começa ${ROUND_NAMES[t.round].toLowerCase()}: ${state.trainerName} contra ${foe}!`
    : `Próxima: ${ROUND_NAMES[t.round].toLowerCase()} contra ${foe}. A torcida está esperando!`;
}

export function TournamentPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  if (!activityUnlocked(state, 'tournament')) return <Locked routeId={BALANCE.tournament.unlock} />;
  const now = state.lastTimerAt;
  const t = state.tournament;
  const current = t.season === weekOf(now);
  const bracket = current ? t.bracket : null;
  const inBattle = state.battle.kind === 'tournament';
  const nextMonday = (weekOf(now) + 1) * 7 * 24 * 3_600_000 - 3 * 24 * 3_600_000;
  const daysLeft = Math.max(1, Math.ceil((nextMonday - now) / (24 * 3_600_000)));
  const best = bestPlace(state);
  const sponsor = sponsorOf(weekOf(now));
  const adv = bracket ? advance(t) : null;
  const playing = bracket && !t.place;
  const foeNow = playing ? t.opponents[t.round] : null;
  const counts = { champion: 0, final: 0, semi: 0, quarter: 0 };
  for (const h of t.history) counts[h.place]++;
  const champion = current && t.place === 'champion';
  // A plateia: torce na partida, festeja o título, vai embora quando você cai, espera quando não há jogo.
  const crowd = champion
    ? 'party'
    : current && t.place
      ? 'out'
      : inBattle
        ? 'cheer'
        : 'wait';
  const rivals = Object.entries(t.rivals ?? {}).sort(
    (a, b) => b[1].wins + b[1].losses - (a[1].wins + a[1].losses),
  );

  // `col`: a fase da coluna (0 quartas, 1 semi, 2 final); o "VS" só pulsa na fase que está sendo jogada.
  const slot = (idx: number | null, lostHere: boolean, col: number) => (
    <Slot
      e={idx === null ? undefined : bracket?.[idx]}
      idx={idx}
      state={state}
      out={lostHere}
      vs={!!playing && col === t.round && (idx === 0 || idx === foeNow)}
    />
  );

  return (
    <>
      <Window title="TORNEIO DA SEMANA" icon={<ItemIcon id="relic-crown" size={24} />} frame="dialog">
        <div className={`tn-stage ${champion ? 'champion' : ''} crowd-${crowd}`}>
          <span className="tn-crowd" aria-hidden />
          {champion && (
            <span className="tn-fireworks" aria-hidden>
              <PixelFx fx="firework" scale={2} x="15%" y="45%" />
              <PixelFx fx="firework" scale={2} x="85%" y="40%" speed={0.8} />
            </span>
          )}
          {/* Bandeirinhas na plateia: balançam na torcida, caem quando você é eliminado. */}
          <span className="tn-flags" aria-hidden>
            {Array.from({ length: 7 }, (_, k) => (
              <i key={k} style={{ '--i': k } as CSSProperties} />
            ))}
          </span>
          {crowd === 'out' && <span className="tn-leaving" aria-hidden />}
          <div className="tn-announcer">
            <span className="caretaker-tag">NARRADOR</span>
            <p key={`${t.round}-${t.score.join()}-${t.place}`}>{announcer(state, inBattle)}</p>
          </div>
          {champion && (
            <span className="tn-confetti" aria-hidden>
              {Array.from({ length: 24 }, (_, k) => (
                <i key={k} style={{ '--k': k } as CSSProperties} />
              ))}
            </span>
          )}
        </div>

        {bracket && adv ? (
          <div className="br-tree">
            <div className="br-col">
              <small>QUARTAS</small>
              {[0, 2, 4, 6].map((a) => (
                <div key={a} className="br-match">
                  {slot(a, adv.semi[0] !== null && !adv.semi.includes(a), 0)}
                  {slot(a + 1, adv.semi[0] !== null && !adv.semi.includes(a + 1), 0)}
                </div>
              ))}
            </div>
            <div className="br-col">
              <small>SEMI</small>
              {[0, 2].map((a) => (
                <div key={a} className="br-match">
                  {slot(
                    adv.semi[a],
                    adv.final[0] !== null && adv.semi[a] !== null && !adv.final.includes(adv.semi[a]),
                    1,
                  )}
                  {slot(
                    adv.semi[a + 1],
                    adv.final[0] !== null && adv.semi[a + 1] !== null && !adv.final.includes(adv.semi[a + 1]),
                    1,
                  )}
                </div>
              ))}
            </div>
            <div className="br-col">
              <small>FINAL</small>
              <div className="br-match">
                {slot(adv.final[0], adv.champ !== null && adv.final[0] !== adv.champ, 2)}
                {slot(adv.final[1], adv.champ !== null && adv.final[1] !== adv.champ, 2)}
              </div>
            </div>
            <div className="br-col br-champ">
              <small>CAMPEÃO</small>
              <span className={`br-trophy ${adv.champ === 0 ? 'won' : ''}`} aria-hidden>
                🏆
              </span>
              {slot(adv.champ, false, 3)}
            </div>
          </div>
        ) : (
          <p className="hint">
            Oito treinadores (líderes e rivais que você já venceu, mais fortes que nas revanches) em chave:
            quartas, semifinal e final. Cada partida é melhor de três. O próximo torneio começa em {daysLeft}{' '}
            dia{daysLeft > 1 ? 's' : ''}.
          </p>
        )}

        {playing && (
          <div className="tn-score">
            <span>{ROUND_NAMES[t.round].toUpperCase()}</span>
            <b>
              {t.score[0]} – {t.score[1]}
            </b>
            <span>melhor de 3</span>
          </div>
        )}

        {current && t.place ? (
          <p className={`tournament-result place-${t.place}`}>
            Resultado desta semana: <strong>{TOURNAMENT_PLACES[t.place]}</strong>
          </p>
        ) : (
          <button
            className="pbtn primary tn-go"
            disabled={inBattle || !canPlayTournament(state, now)}
            onClick={() => engine.dispatch((s, n) => playTournament(s, n))}
          >
            {inBattle
              ? `Em jogo: ${ROUND_NAMES[t.round]} (${t.score[0]}–${t.score[1]})`
              : bracket
                ? `Continuar: ${ROUND_NAMES[t.round]} (${t.score[0]}–${t.score[1]})`
                : 'Inscrever-se e jogar'}
          </button>
        )}

        <div className="tn-prizes">
          <span>
            Por partida vencida:{' '}
            {BALANCE.tournament.coinsPerRound.map((c, i) => (
              <span key={i} className="tn-prize">
                {ROUND_NAMES[i]} <Money value={c} />
              </span>
            ))}
          </span>
          <span className="tn-sponsor">
            <ItemIcon id={sponsor.item} size={22} />
            <span>
              Patrocínio da semana: <strong>{sponsor.name}</strong> dá {itemName(sponsor.item)} ×{sponsor.qty}{' '}
              ao campeão (além dos itens raros).
            </span>
          </span>
        </div>
      </Window>

      {rivals.length > 0 && (
        <Window title={`RIVAIS · ${rivals.length}`} icon={<ItemIcon id="vs-seeker" size={24} />}>
          <ul className="tn-rivals">
            {rivals.map(([name, r], i) => (
              <li key={name} className={r.wins >= r.losses ? 'ahead' : 'behind'} style={{ '--i': i } as CSSProperties}>
                <TrainerSprite id={r.sprite} size={40} head />
                <strong>
                  {name} <Emote mood={r.wins > r.losses ? 'angry' : r.losses > r.wins ? 'veryhappy' : 'confused'} scale={1} />
                </strong>
                <span className="tn-rival-score">
                  <b>{r.wins}</b>–<b>{r.losses}</b>
                </span>
                <small>
                  {r.wins > r.losses
                    ? `voltou mais forte (+${Math.min(6, r.wins * 2)} níveis)`
                    : r.losses > r.wins
                      ? 'quer manter a vantagem'
                      : 'empatados'}
                </small>
              </li>
            ))}
          </ul>
          <p className="hint">
            Cada vitória sua deixa o rival 2 níveis mais forte na próxima vez (até +6), e um rival conhecido sempre
            aparece nas quartas.
          </p>
        </Window>
      )}

      <Window
        title={`SALA DE TROFÉUS · ${state.stats.tournamentTitles} títulos`}
        icon={<ItemIcon id="relic-crown" size={24} />}
      >
        <ul className="tn-trophies">
          {(
            [
              ['champion', 'gold', 'Campeão'],
              ['final', 'silver', 'Vice'],
              ['semi', 'bronze', 'Semifinal'],
            ] as const
          ).map(([place, metal, label]) => (
            <li key={place} className={`tn-trophy ${metal} ${counts[place] ? 'has' : ''}`}>
              <Award kind="cup" metal={metal} scale={3} className="tn-cup-px" />
              <strong>×{counts[place]}</strong>
              <small>{label}</small>
            </li>
          ))}
        </ul>
        <p className="hint">
          {best ? `Melhor colocação: ${TOURNAMENT_PLACES[best]}.` : 'Nenhum torneio disputado ainda.'}
        </p>
        {t.history.length > 0 && (
          <ol className="tournament-history">
            {t.history.map((h) => (
              <li key={h.season} className={`place-${h.place}`}>
                Semana {h.season}: <strong>{TOURNAMENT_PLACES[h.place]}</strong>
              </li>
            ))}
          </ol>
        )}
      </Window>
    </>
  );
}
