// MISSÕES: o quadro de avisos do Centro Pokémon. A enfermeira comenta os pedidos do dia; cada missão é um bilhete
// preso por um alfinete de Poké Ball (amarelo do dia, azul da semana), com o prêmio desenhado, o progresso em Poké
// Balls (ou numa barra em blocos) e o carimbo FEITO! ao receber. O relógio mostra quando chegam as novas.

import { useState, type CSSProperties } from 'react';
import { claimMission, nextReset, type Mission, type MissionScope } from '../../core/missions';
import type { GameState } from '../../core/game';
import { ItemIcon, PixelIcon, TrainerSprite } from '../components/common';
import { MISSION_TEXT, formatDuration, formatNumber, itemName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';
import { audio } from '../audio';
import { PixelFx } from '../components/PixelFx';
import { Empty } from '../components/Dynamic';

/** Ícone de cada tipo de missão: o que ela pede. */
const KIND_ICON: Record<string, string> = {
  kills: 'choice-band',
  captures: 'poke-ball',
  'capture-type': 'net-ball',
  evolutions: 'rare-candy',
  bosses: 'vs-seeker',
  'hatch-type': 'oval-charm',
  hatch: 'mystery-egg',
  harvest: 'berry-pouch',
  expeditions: 'town-map',
  'tower-floors': 'vs-recorder',
  slots: 'coin-case',
};

/** Até este alvo, o progresso aparece como Poké Balls acendendo; acima, numa barra em blocos. */
const BALLS_UP_TO = 10;

/** O prêmio desenhado: moedas, fichas, pesquisa e itens, cada um com o seu ícone. */
function Reward({ m }: { m: Mission }) {
  const r = m.reward;
  return (
    <span className="note-reward">
      {!!r.coins && (
        <span title="Moedas">
          <PixelIcon name="pokedollar" scale={2} />
          {formatNumber(r.coins)}
        </span>
      )}
      {!!r.tokens && (
        <span title="Fichas do Game Corner">
          <ItemIcon id="coin-case" size={22} />
          {r.tokens}
        </span>
      )}
      {!!r.research && (
        <span title="Pontos de pesquisa">
          <ItemIcon id="fame-checker" size={22} />
          {r.research}
        </span>
      )}
      {Object.entries(r.items ?? {}).map(([id, n]) => (
        <span key={id} title={itemName(id)}>
          <ItemIcon id={id} size={22} />×{n}
        </span>
      ))}
    </span>
  );
}

function Progress({ m }: { m: Mission }) {
  const have = Math.min(m.target, Math.floor(m.progress));
  if (m.target <= BALLS_UP_TO)
    return (
      <span className="note-balls" aria-label={`${have} de ${m.target}`}>
        {Array.from({ length: m.target }, (_, i) => (
          <span key={i} className={i < have ? 'on' : ''}>
            <PixelIcon name="miniBall" scale={2} />
          </span>
        ))}
      </span>
    );
  const pct = Math.min(100, (m.progress / m.target) * 100);
  return (
    <span className="note-bar" aria-label={`${have} de ${m.target}`}>
      <span className="note-bar-fill" style={{ width: `${pct}%` }} />
      <small>
        {formatNumber(have)}/{formatNumber(m.target)}
      </small>
    </span>
  );
}

/** Reloginho em pixel art: o ponteiro anda enquanto as novas missões não chegam. */
function ResetClock({ ms }: { ms: number }) {
  return (
    <span className="note-clock">
      <span className="clock-face" aria-hidden>
        <i className="clock-hour" />
        <i className="clock-min" />
      </span>
      novas em {formatDuration(ms)}
    </span>
  );
}

function Board({ state, scope }: { state: GameState; scope: MissionScope }) {
  const engine = useEngine();
  const list = state.missions[scope];
  const now = state.lastTimerAt;
  // O bilhete recém-recebido ganha o carimbo, a chuva de moedas e o prêmio subindo.
  const [stamped, setStamped] = useState<{ id: string; n: number } | null>(null);
  return (
    <section className={`note-section scope-${scope}`}>
      <header className="note-section-head">
        <strong>{scope === 'daily' ? 'PEDIDOS DO DIA' : 'PEDIDOS DA SEMANA'}</strong>
        <ResetClock ms={nextReset(now, scope) - now} />
      </header>
      {list.length === 0 && <Empty icon="fame-checker">Nenhum pedido no quadro agora.</Empty>}
      <ul className="note-list">
        {list.map((m, i) => {
          const done = m.progress >= m.target;
          return (
            <li
              key={m.id}
              className={`note ${done ? 'done' : ''} ${m.claimed ? 'claimed' : ''} ${stamped?.id === m.id ? 'stamped' : ''}`}
              style={{ ['--tilt' as string]: `${[-1.6, 1.2, -0.6, 1.8, -1.2][i % 5]}deg` } as CSSProperties}
            >
              <span className="note-pin" aria-hidden />
              <span className="note-icon">
                <ItemIcon id={KIND_ICON[m.kind] ?? 'fame-checker'} size={30} />
              </span>
              <div className="note-body">
                <strong>{MISSION_TEXT[m.kind](m.target, m.type)}</strong>
                <Progress m={m} />
                <Reward m={m} />
              </div>
              {done && !m.claimed && (
                <button
                  className="pbtn small primary note-claim"
                  onClick={() => {
                    engine.dispatch((s) => void claimMission(s, scope, m.id));
                    audio.sfx('itemGet');
                    setStamped((v) => ({ id: m.id, n: (v?.n ?? 0) + 1 }));
                  }}
                >
                  RECEBER
                </button>
              )}
              {m.claimed && <span className="note-stamp">FEITO!</span>}
              {stamped?.id === m.id && (
                <span key={stamped.n} className="note-fx" aria-hidden>
                  <PixelFx fx="coins" scale={2} x="70%" y="50%" />
                  <PixelFx fx="stars" scale={2} x="20%" y="40%" />
                  <span className="note-fly">
                    <Reward m={m} />
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** O que a enfermeira diz, pelo estado dos pedidos do dia. */
function nurseLine(state: GameState): string {
  const daily = state.missions.daily;
  const ready = [...daily, ...state.missions.weekly].filter(
    (m) => m.progress >= m.target && !m.claimed,
  ).length;
  const open = daily.filter((m) => m.progress < m.target).length;
  if (ready > 0)
    return `Você terminou ${ready === 1 ? 'um pedido' : `${ready} pedidos`}! Venha buscar o prêmio.`;
  if (!daily.length) return 'O quadro está vazio por enquanto. Volte mais tarde!';
  if (open === 0) return 'Todos os pedidos de hoje estão feitos. Obrigada! Amanhã tem mais.';
  if (open === 1) return 'Falta só um pedido de hoje. Você consegue!';
  return `Tenho ${open} pedidos para hoje. Os da semana ficam no quadro azul.`;
}

export function MissionsScreen({ state }: { state: GameState }) {
  return (
    <div className="missions-screen notice-board">
      <div className="board-nurse">
        <span className="board-nurse-sprite">
          <TrainerSprite id="class-nurse" size={96} />
        </span>
        <p className="board-say frame frame-dialog">
          <b>ENFERMEIRA</b>
          {nurseLine(state)}
        </p>
      </div>
      <div className="cork">
        <Board state={state} scope="daily" />
        <Board state={state} scope="weekly" />
      </div>
      <p className="hint">
        Os pedidos do dia mudam à meia-noite e os da semana na segunda-feira. Pedidos de atividades só
        aparecem depois que elas forem liberadas.
      </p>
    </div>
  );
}
