// Torneio semanal: chave de 8 (quartas, semi, final), partidas em melhor de três, ranking.

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
import { ItemIcon, Money, PixelIcon, TrainerSprite, Window } from '../../components/common';
import { TOURNAMENT_PLACES } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked } from './shared';

/** Pares da chave na ordem das posições (0–1, 2–3, 4–5, 6–7). */
const PAIRS = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
];

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

  return (
    <>
      <Window title="TORNEIO DA SEMANA" icon={<ItemIcon id="relic-crown" size={24} />} frame="dialog">
        <p className="hint">
          Oito treinadores (líderes e rivais que você já venceu, mais fortes que nas revanches) em chave:
          quartas, semifinal e final. Cada partida é melhor de três. Um torneio por semana; o próximo começa
          em {daysLeft} dia{daysLeft > 1 ? 's' : ''}.
        </p>
        <p className="hint">
          Prêmios por partida vencida:{' '}
          {BALANCE.tournament.coinsPerRound.map((c, i) => (
            <span key={i}>
              {ROUND_NAMES[i]} <Money value={c} />
              {i < 2 ? ' · ' : ''}
            </span>
          ))}
          . O campeão ainda leva itens raros.
        </p>
        {current && t.place ? (
          <p className={`tournament-result place-${t.place}`}>
            Resultado desta semana: <strong>{TOURNAMENT_PLACES[t.place]}</strong>
          </p>
        ) : (
          <button
            className="pbtn primary"
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
        {bracket && (
          <div className="bracket">
            {PAIRS.map((pair, i) => (
              <div key={i} className="bracket-pair">
                {pair.map((idx) => {
                  const e = bracket[idx];
                  const isPlayer = idx === 0;
                  const opponentNow = !t.place && t.opponents[t.round] === idx;
                  const beaten = t.opponents.slice(0, t.round).includes(idx);
                  return (
                    <span
                      key={idx}
                      className={`bracket-slot ${isPlayer ? 'you' : ''} ${opponentNow ? 'next' : ''} ${beaten ? 'beaten' : ''}`}
                    >
                      <TrainerSprite id={e.sprite} outfit={e.outfit} size={28} head />
                      {isPlayer ? 'VOCÊ' : e.name}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Window>

      <Window title="RANKING" icon={<PixelIcon name="star" scale={2} />}>
        <p className="hint">
          Títulos: {state.stats.tournamentTitles}
          {best ? ` · melhor colocação: ${TOURNAMENT_PLACES[best]}` : ''}
        </p>
        <ol className="tournament-history">
          {t.history.map((h) => (
            <li key={h.season} className={`place-${h.place}`}>
              Semana {h.season}: <strong>{TOURNAMENT_PLACES[h.place]}</strong>
            </li>
          ))}
          {!t.history.length && <li className="hint">Nenhum torneio disputado ainda.</li>}
        </ol>
      </Window>
    </>
  );
}
