// Momentos clássicos de batalha dos portáteis, desenhados sobre a cena:
//  - EncounterFlash: a tela pisca quando um selvagem aparece (curta: num idle os encontros
//    são frequentes).
//  - TrainerIntro: faixas pretas se fecham, o treinador entra e "X quer batalhar!".
//  - LevelUpWindow: a janela com o ganho de cada atributo e, depois, os valores novos.
//  - PokemonCenter: ao perder, os Pokémon vão ao Centro, a máquina de cura acende bola por
//    bola com o jingle, e todos saem recuperados.

import { useEffect, useState } from 'react';
import { assetUrl, getItem, type TrainerOutfit } from '../../game-data';
import type { Stats } from '../../core/stats';
import { audio } from '../audio';
import { useTrainerSprite } from '../outfit';

export function EncounterFlash() {
  return <div className="enc-flash" aria-hidden />;
}

export function TrainerIntro({
  name,
  sprite,
  outfit,
}: {
  name: string;
  sprite: string;
  outfit?: TrainerOutfit;
}) {
  const src = useTrainerSprite(sprite, outfit);
  return (
    <div className="enc-trainer" aria-live="polite">
      <span className="enc-bar top" aria-hidden />
      <span className="enc-bar bottom" aria-hidden />
      <img className="enc-trainer-sprite" src={src} alt="" draggable={false} />
      <div className="enc-trainer-text frame frame-dialog">{name.toUpperCase()} quer batalhar!</div>
    </div>
  );
}

/** Atributos na ordem das fichas, com os rótulos curtos das placas. */
const STAT_ROWS: [keyof Stats, string][] = [
  ['hp', 'HP'],
  ['atk', 'ATQ'],
  ['def', 'DEF'],
  ['spAtk', 'A.ESP'],
  ['spDef', 'D.ESP'],
  ['spe', 'VEL'],
];

/** Primeiro o quanto cada atributo subiu; depois, os valores novos (como nos portáteis). */
export function LevelUpWindow({
  name,
  level,
  before,
  after,
  speed,
}: {
  name: string;
  level: number;
  before: Stats;
  after: Stats;
  speed: number;
}) {
  const [totals, setTotals] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTotals(true), 1500 / speed);
    return () => clearTimeout(t);
  }, [speed]);
  return (
    <div className="levelup-window frame frame-menu" role="status">
      <strong>
        {name.toUpperCase()} · Nv. {level}
      </strong>
      <dl>
        {STAT_ROWS.map(([k, label]) => (
          <div key={k}>
            <dt>{label}</dt>
            <dd>{totals ? after[k] : `+${after[k] - before[k]}`}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Derrota: a máquina de cura do Centro Pokémon, uma bola por Pokémon da equipe. */
export function PokemonCenter({ balls, reducedMotion }: { balls: number; reducedMotion: boolean }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    audio.sfx('heal');
    const t = setTimeout(() => setDone(true), reducedMotion ? 0 : 2000);
    return () => clearTimeout(t);
  }, [reducedMotion]);
  const ball = assetUrl(getItem('poke-ball')?.sprite);
  return (
    <div className={`pkcenter ${done ? 'done' : ''}`} role="status">
      <div className="pkcenter-room" aria-hidden>
        <span className="pkcenter-stripe" />
        <span className="pkcenter-counter" />
        <div className="pkcenter-machine">
          <span className="pkcenter-screen" />
          <div className="pkcenter-slots">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="pkcenter-slot">
                {i < balls && <img src={ball} alt="" style={{ animationDelay: `${0.25 * i}s` }} />}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="pkcenter-text frame frame-dialog">
        {done
          ? 'Pronto! Seus Pokémon estão totalmente recuperados. Até a próxima!'
          : 'Você correu para o Centro Pokémon… Deixe seus Pokémon comigo um instante.'}
      </div>
    </div>
  );
}
