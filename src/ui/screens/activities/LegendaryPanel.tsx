// Lendários: desafios manuais, liberados ao vencer o Campeão da região; capturados, voltam depois de um tempo.

import { BALANCE, LEGENDARIES, REGIONS, type LegendaryDef } from '../../../game-data';
import { challengeLegendary, type GameState } from '../../../core/game';
import { legendaryRegionOpen, legendaryStatus } from '../../../core/legendary';
import { ItemIcon, PixelIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { formatDuration, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';

const BALLS = ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball'];

function LegendaryCard({ state, def, now }: { state: GameState; def: LegendaryDef; now: number }) {
  const engine = useEngine();
  const status = legendaryStatus(state, def, now);
  const locked = status === 'locked';
  const wait = (state.legends.cooldowns[def.speciesId] ?? 0) - now;
  const busy = state.battle.kind !== 'wild';
  const owned = state.collection.filter((p) => p.speciesId === def.speciesId).length;
  const caught = state.legends.caught.includes(def.speciesId);
  return (
    <li className={`legend-card frame frame-slot ${status}`}>
      <PokemonSprite speciesId={def.speciesId} kind="front" silhouette={locked} pixelScale={1} />
      <strong>{locked ? '???' : speciesName(def.speciesId).toUpperCase()}</strong>
      <small>
        Nv{def.level} · +{Math.round((def.boost - 1) * 100)}% atributos
      </small>
      {state.pokedex[def.speciesId]?.shinyCaught && <Shiny />}
      {caught && (
        <span className="tag tag-active" title="Exemplares na sua coleção">
          CAPTURADO{owned > 1 ? ` ×${owned}` : ''}
        </span>
      )}
      {status === 'cooldown' && <span className="tag">VOLTA EM {formatDuration(wait)}</span>}
      {status === 'locked' && <PixelIcon name="lock" scale={2} />}
      {status === 'ready' && (
        <button
          className="pbtn small primary"
          disabled={busy}
          title={
            busy
              ? 'Termine a batalha atual primeiro'
              : caught
                ? 'Enfrentar de novo para capturar outro'
                : 'Iniciar a batalha'
          }
          onClick={() => engine.dispatch((s, t) => challengeLegendary(s, def.speciesId, t))}
        >
          {caught ? 'Enfrentar de novo' : 'Enfrentar'}
        </button>
      )}
    </li>
  );
}

export function LegendaryPanel({ state }: { state: GameState }) {
  const now = state.lastTimerAt;
  const rule = (r: typeof BALANCE.legendary) =>
    `${r.throwLimit} bolas falhas e ele foge; se você desmaiar, desistir ou ele fugir, volta em ${r.cooldownMinutes} min; depois de capturado, volta em ${formatDuration(r.recaptureMinutes * 60_000)} para você pegar outro; ${r.guaranteedPerfectIvs} IVs em 31`;
  return (
    <>
      <Window
        title="LENDÁRIOS E QUASE LENDÁRIOS"
        icon={<ItemIcon id="master-ball" size={24} />}
        frame="dialog"
      >
        <p className="hint">
          Vença o Campeão de uma região para liberar os desafios dela. A batalha é de verdade: o Pokémon luta
          de volta e não pode ser derrotado (fica com 1 de HP). Capture-o{' '}
          <strong>lançando as bolas à mão</strong> — a captura automática não funciona.
        </p>
        <p className="hint">
          <strong>Lendários:</strong> taxa de captura minúscula; {rule(BALANCE.legendary)}.
        </p>
        <p className="hint">
          <strong>Quase lendários</strong> (Dragonite, Tyranitar, Salamence, Metagross, Garchomp, Hydreigon):
          mais fáceis, mas ainda duros; {rule(BALANCE.pseudo)}.
        </p>
        <ul className="legend-balls">
          {BALLS.map((b) => (
            <li key={b}>
              <ItemIcon id={b} size={24} /> ×{state.items[b] ?? 0}
            </li>
          ))}
        </ul>
      </Window>
      {REGIONS.map((region) => {
        const all = LEGENDARIES.filter((l) => l.regionId === region.id);
        if (!all.length) return null;
        const open = legendaryRegionOpen(state, region.id);
        const groups = [
          { label: 'QUASE LENDÁRIOS', list: all.filter((l) => l.tier === 'pseudo') },
          { label: 'LENDÁRIOS', list: all.filter((l) => l.tier !== 'pseudo') },
        ];
        return (
          <Window key={region.id} title={`${region.name.toUpperCase()}${open ? '' : ' · BLOQUEADO'}`}>
            {!open && <p className="hint">Vença o Campeão de {region.name} para desafiar.</p>}
            {groups.map(
              (g) =>
                g.list.length > 0 && (
                  <section key={g.label}>
                    <h4 className="legend-group">{g.label}</h4>
                    <ul className="legend-list">
                      {g.list.map((def) => (
                        <LegendaryCard key={def.speciesId} state={state} def={def} now={now} />
                      ))}
                    </ul>
                  </section>
                ),
            )}
          </Window>
        );
      })}
    </>
  );
}
