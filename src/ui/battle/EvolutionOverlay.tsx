// Cena de evolução sobre o campo de batalha, no estilo de HeartGold/SoulSilver: fundo azul
// profundo com um brilho atrás do Pokémon e pontos de luz subindo; o sprite pisca entre
// as duas formas, cada vez mais rápido, enquanto anéis de luz se fecham sobre ele, e um
// clarão revela a nova forma. É só visual — a evolução já aconteceu no estado do jogo.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { assetUrl, getSpecies } from '../../game-data';
import { speciesName } from '../i18n/pt-BR';
import { PixelIcon } from '../components/common';

type Stage = 'start' | 'morph' | 'done';

/** Duração de cada etapa (ms). O CSS (game.css) usa os mesmos valores. */
const STAGE_MS: Record<Stage, number> = { start: 1800, morph: 4000, done: 3200 };

/** Pontos de luz que sobem pelo fundo: posição horizontal, atraso, duração e tamanho. */
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37) % 100,
  delay: ((i * 0.53) % 3).toFixed(2),
  duration: (2.6 + ((i * 0.71) % 1.8)).toFixed(2),
  size: 1 + (i % 3),
}));

export function EvolutionOverlay({
  from,
  to,
  shiny,
  reducedMotion,
  onReveal,
  onDone,
}: {
  from: number;
  to: number;
  shiny: boolean;
  reducedMotion: boolean;
  /** O clarão revelou a nova forma: o resto da interface pode mostrá-la. */
  onReveal: () => void;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>(reducedMotion ? 'done' : 'start');
  // O pai recria `onDone` a cada render (o jogo atualiza 10×/s); guardar numa ref evita
  // que os temporizadores das etapas sejam reiniciados sem parar.
  const doneRef = useRef(onDone);
  const revealRef = useRef(onReveal);
  useEffect(() => {
    doneRef.current = onDone;
    revealRef.current = onReveal;
  });

  useEffect(() => {
    if (stage === 'done') revealRef.current();
  }, [stage]);

  useEffect(() => {
    const next = () => {
      if (stage === 'start') setStage('morph');
      else if (stage === 'morph') setStage('done');
      else doneRef.current();
    };
    const t = setTimeout(next, STAGE_MS[stage]);
    return () => clearTimeout(t);
  }, [stage]);

  const sprite = (id: number) => {
    const s = getSpecies(id).sprites;
    return assetUrl((shiny && s.frontShiny) || s.front);
  };

  return (
    <div
      className={`evolution stage-${stage}`}
      onClick={() => {
        revealRef.current();
        doneRef.current();
      }}
      role="dialog"
      aria-label="Evolução"
    >
      <div className="evolution-bg" />
      <div className="evolution-motes" aria-hidden>
        {MOTES.map((m, i) => (
          <span
            key={i}
            style={
              {
                left: `${m.x}%`,
                animationDelay: `${m.delay}s`,
                animationDuration: `${m.duration}s`,
                '--mote': m.size,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="evolution-stage">
        <div className="evo-halo" aria-hidden />
        {stage === 'morph' && (
          <div className="evo-rings" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        )}
        {stage !== 'done' && <img className="evo-from" src={sprite(from)} alt={speciesName(from)} />}
        {stage !== 'start' && <img className="evo-to" src={sprite(to)} alt={speciesName(to)} />}
        {stage === 'done' && (
          <span className="evo-sparkles">
            <PixelIcon name="star" scale={3} />
            <PixelIcon name="star" scale={2} />
            <PixelIcon name="star" scale={3} />
          </span>
        )}
      </div>
      {stage === 'done' && <div className="evo-flash" aria-hidden />}
      <div className="evolution-text frame frame-dialog">
        {stage === 'done'
          ? `Parabéns! Seu ${speciesName(from)} evoluiu para ${speciesName(to)}!`
          : `O quê? ${speciesName(from)} está evoluindo!`}
      </div>
    </div>
  );
}
