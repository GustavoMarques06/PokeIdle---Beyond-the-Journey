// O Prof. Carvalho aparece quando uma região nova é liberada (e ao vencer a última Liga),
// para a história não parar no prólogo: fala em máquina de escrever, com o lendário da
// região em silhueta ao lado (o mesmo da tela de "Pressione Start"). Cada fala é vista uma
// vez: fica marcada em `state.flags`, então também aparece se a região foi liberada com o
// jogo fechado.

import { useEffect } from 'react';
import { LEGENDARIES, REGIONS, assetUrl, trainerSprite } from '../../game-data';
import type { GameState } from '../../core/game';
import { legendaryDef } from '../../core/legendary';
import { T, speciesName } from '../i18n/pt-BR';
import { LEGEND_LORE, legendGlow, legendTitle } from '../i18n/legends';
import { legendOf } from '../intro/legends';
import { useTypewriter } from '../intro/useTypewriter';
import { useEngine } from '../useGame';
import { PokemonSprite } from './common';

/** Marca de versão: quem já jogava não recebe de uma vez as falas de regiões antigas. */
const SEEN_FLAG = 'professor';
const FINALE = 'finale';
const callFlag = (id: string) => `professor:${id}`;

/** Marca de versão das falas de lendário: quem já tinha lendários não recebe todas de uma vez. */
const LEGENDS_SEEN = 'professor-legends';
const legendCall = (speciesId: number) => `legend:${speciesId}`;

function pendingCalls(state: GameState): string[] {
  const ids = REGIONS.slice(1)
    .filter((r) => state.routes[r.routes[0]]?.unlocked)
    .map((r) => r.id);
  const last = REGIONS[REGIONS.length - 1].id;
  if (state.hallOfFame.some((h) => h.regionId === last)) ids.push(FINALE);
  // Primeira captura de cada lendário (os quase lendários não ganham ligação).
  for (const id of state.legends.caught) if (legendaryDef(id)?.tier !== 'pseudo') ids.push(legendCall(id));
  return ids.filter((id) => !state.flags.includes(callFlag(id)));
}

function legendText(name: string, speciesId: number, count: number, total: number): string {
  const lore = LEGEND_LORE[speciesId] ?? '';
  const title = legendTitle(count, total);
  return (
    `${name}! É verdade que você capturou ${speciesName(speciesId).toUpperCase()}?! Incrível! ${lore} ` +
    `Registrei tudo na sua Pokédex. ${count} de ${total} lendários já estão com você` +
    (title ? ` — agora você é ${title.toUpperCase()}!` : '!')
  );
}

export function ProfessorCall({ state }: { state: GameState }) {
  const engine = useEngine();
  const migrated = state.flags.includes(SEEN_FLAG);
  const pending = migrated ? pendingCalls(state)[0] : undefined;

  const legendsMigrated = state.flags.includes(LEGENDS_SEEN);
  useEffect(() => {
    if (migrated && legendsMigrated) return;
    engine.dispatch((s) => {
      if (!s.flags.includes(SEEN_FLAG)) {
        for (const id of pendingCalls(s)) s.flags.push(callFlag(id));
        s.flags.push(SEEN_FLAG);
      }
      if (!s.flags.includes(LEGENDS_SEEN)) {
        for (const id of s.legends.caught) s.flags.push(callFlag(legendCall(id)));
        s.flags.push(LEGENDS_SEEN);
      }
    });
  }, [engine, migrated, legendsMigrated]);

  if (!pending || !legendsMigrated) return null;
  const name = state.trainerName.toUpperCase();
  const legendId = pending.startsWith('legend:') ? Number(pending.slice(7)) : undefined;
  const all = LEGENDARIES.filter((l) => l.tier !== 'pseudo');
  const text =
    legendId !== undefined
      ? legendText(
          name,
          legendId,
          all.filter((l) => state.legends.caught.includes(l.speciesId)).length,
          all.length,
        )
      : pending === FINALE
        ? T.professor.finale(name)
        : T.professor.arrival[pending]?.(name);
  if (!text) return null;
  const close = () => engine.dispatch((s) => void s.flags.push(callFlag(pending)));
  return (
    <CallDialog
      key={pending}
      text={text}
      legend={
        legendId !== undefined
          ? { id: legendId, color: legendGlow(legendId) }
          : pending === FINALE
            ? undefined
            : legendOf(pending)
      }
      button={legendId !== undefined ? 'Obrigado, Professor!' : pending === FINALE ? 'Obrigado, Professor!' : 'Vamos lá!'}
      reduced={state.settings.reducedMotion}
      onClose={close}
    />
  );
}

function CallDialog({
  text,
  legend,
  button,
  reduced,
  onClose,
}: {
  text: string;
  legend?: { id: number; color: string };
  button: string;
  reduced: boolean;
  onClose: () => void;
}) {
  const { shown, done, finish } = useTypewriter(text, reduced);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Prof. Carvalho">
      <div
        className="professor-call frame frame-dialog"
        style={legend ? { ['--glow' as string]: legend.color } : undefined}
        onClick={() => !done && finish()}
      >
        <div className="professor-call-art">
          {legend && (
            <span className="professor-call-legend" aria-hidden>
              <PokemonSprite speciesId={legend.id} kind="front" />
            </span>
          )}
          <img
            className="professor-call-sprite"
            src={assetUrl(trainerSprite('oak'))}
            alt=""
            draggable={false}
          />
        </div>
        <div className="dialog-speech">
          <span className="speaker">PROF. CARVALHO</span>
          <p>{shown}</p>
          {done ? (
            <button className="pbtn primary" onClick={onClose} autoFocus>
              {button}
            </button>
          ) : (
            <button className="pbtn" onClick={finish}>
              ▸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
