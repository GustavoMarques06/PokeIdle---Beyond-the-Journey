// Jogo do Safari: sem batalha — Safari Ball, isca e pedra até o saco de bolas acabar.

import { useCallback, useState } from 'react';
import { BALANCE } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import {
  leaveSafari,
  safariAct,
  safariCatchChance,
  safariFleeChance,
  startSafari,
  type GameEvent,
  type GameState,
  type SafariAction,
} from '../../../core/game';
import { ItemIcon, Money, PixelIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { SAFARI_TEXT, formatPercent, speciesName } from '../../i18n/pt-BR';
import { useEngine, useGameEvents } from '../../useGame';
import { Locked } from './shared';

export function SafariPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [log, setLog] = useState<string[]>([]);
  const onEvents = useCallback((events: GameEvent[]) => {
    const lines = events.flatMap((e) =>
      e.type === 'safariResult'
        ? [SAFARI_TEXT[e.outcome](speciesName(e.speciesId))]
        : e.type === 'safariEnded'
          ? [`Fim do Safari! ${e.caught} capturado(s).`]
          : [],
    );
    if (lines.length) setLog((l) => [...lines.reverse(), ...l].slice(0, 6));
  }, []);
  useGameEvents(onEvents);

  if (!activityUnlocked(state, 'safari')) return <Locked routeId={BALANCE.safari.unlock} />;
  const cfg = BALANCE.safari;
  const s = state.safari;
  const act = (a: SafariAction) => engine.dispatch((st, now) => safariAct(st, a, now));

  if (!s?.enemy) {
    return (
      <Window title="ZONA SAFARI" icon={<ItemIcon id="safari-ball" size={24} />} frame="dialog">
        <p className="hint">
          Sem batalhas: você recebe {cfg.balls} Safari Balls e, em cada encontro, escolhe entre jogar uma
          bola, uma isca (ele foge menos, mas fica mais difícil de pegar) ou uma pedra (o contrário). Depois
          de cada ação ele pode fugir. Algumas espécies só aparecem aqui: Chansey, Scyther, Pinsir, Tauros,
          Heracross, Dratini…
        </p>
        <button
          className="pbtn primary"
          disabled={state.coins < cfg.fee}
          onClick={() => engine.dispatch((st, now) => startSafari(st, now))}
        >
          Entrar (<Money value={cfg.fee} />)
        </button>
        {log.length > 0 && (
          <ul className="safari-log">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </Window>
    );
  }

  const e = s.enemy;
  return (
    <Window title="ZONA SAFARI" icon={<ItemIcon id="safari-ball" size={24} />} frame="dialog">
      <div className="safari-field">
        <div className="safari-mon">
          <PokemonSprite speciesId={e.speciesId} kind="front" shiny={e.shiny} form={e.form} pixelScale={2} />
          <strong>
            {speciesName(e.speciesId).toUpperCase()} Nv{e.level} {e.shiny && <Shiny />}
          </strong>
          <small>
            Captura {formatPercent(safariCatchChance(state, e))} · fuga {formatPercent(safariFleeChance(e))}
            {e.bait > 0 && ` · isca ×${e.bait}`}
            {e.rock > 0 && ` · pedra ×${e.rock}`}
          </small>
        </div>
        <div className="safari-actions">
          <button className="pbtn primary" onClick={() => act('ball')}>
            <ItemIcon id="safari-ball" size={20} /> BOLA ×{s.balls}
          </button>
          <button
            className="pbtn"
            onClick={() => act('bait')}
            title="Ele foge menos, mas fica mais difícil de pegar"
          >
            <ItemIcon id="oran-berry" size={20} /> ISCA
          </button>
          <button
            className="pbtn"
            onClick={() => act('rock')}
            title="Fica mais fácil de pegar, mas ele foge mais"
          >
            <PixelIcon name="sand" scale={2} /> PEDRA
          </button>
          <button className="pbtn" onClick={() => act('run')}>
            PRÓXIMO
          </button>
        </div>
      </div>
      <p className="hint">
        Capturados nesta visita: {s.caught.length ? s.caught.map(speciesName).join(', ') : 'nenhum ainda'}.
      </p>
      <ul className="safari-log">
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <button className="pbtn small danger" onClick={() => engine.dispatch(leaveSafari)}>
        Sair do Safari (as bolas que sobraram se perdem)
      </button>
    </Window>
  );
}
