// Cena de evolução sobre o campo de batalha: o sprite pisca entre as duas formas,
// cada vez mais rápido, até revelar a nova forma. É só visual — a evolução já
// aconteceu no estado do jogo.

import { useEffect, useRef, useState } from 'react';
import { assetUrl, getSpecies } from '../../game-data';
import { speciesName } from '../i18n/pt-BR';
import { PixelIcon } from '../components/common';

type Stage = 'start' | 'morph' | 'done';

export function EvolutionOverlay({
  from,
  to,
  shiny,
  reducedMotion,
  onDone,
}: {
  from: number;
  to: number;
  shiny: boolean;
  reducedMotion: boolean;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>(reducedMotion ? 'done' : 'start');
  // O pai recria `onDone` a cada render (o jogo atualiza 10×/s); guardar numa ref evita
  // que os temporizadores das etapas sejam reiniciados sem parar.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    if (stage === 'start') {
      const t = setTimeout(() => setStage('morph'), 1100);
      return () => clearTimeout(t);
    }
    if (stage === 'morph') {
      const t = setTimeout(() => setStage('done'), 2600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => doneRef.current(), 2600);
    return () => clearTimeout(t);
  }, [stage]);

  const sprite = (id: number) => {
    const s = getSpecies(id).sprites;
    return assetUrl((shiny && s.frontShiny) || s.front);
  };

  return (
    <div
      className={`evolution stage-${stage}`}
      onClick={() => doneRef.current()}
      role="dialog"
      aria-label="Evolução"
    >
      <div className="evolution-rays" />
      <div className="evolution-stage">
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
      <div className="evolution-text frame frame-dialog">
        {stage === 'done'
          ? `Parabéns! Seu ${speciesName(from)} evoluiu para ${speciesName(to)}!`
          : `O quê? ${speciesName(from)} está evoluindo!`}
      </div>
    </div>
  );
}
