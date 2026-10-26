// Abertura: o jogador escolhe a região, o inicial (clicando numa Poké Ball ou na lista),
// o avatar e o nome. Hierarquia: o Pokémon no cenário > janela de status > região > diálogo.

import { useEffect, useState } from 'react';
import { STARTER_GENERATIONS } from '../../game-data';
import type { PlayerAvatar } from '../../game-data';
import { useEngine } from '../useGame';
import { IntroDialog } from './IntroDialog';
import { LabScene } from './LabScene';
import { RegionMenu } from './RegionMenu';
import { StarterStatus } from './StarterStatus';

export function StarterSelect() {
  const engine = useEngine();
  const [generation, setGeneration] = useState(1);
  const [chosen, setChosen] = useState(STARTER_GENERATIONS[0].ids[0]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<PlayerAvatar>('red');
  const group = STARTER_GENERATIONS.find((g) => g.generation === generation)!;

  const confirm = () => engine.newGame(chosen, name.trim() || (avatar === 'red' ? 'Red' : 'Leaf'), avatar);

  // Ao trocar de região, o primeiro inicial dela já fica em cena.
  const selectRegion = (g: number) => {
    setGeneration(g);
    setChosen(STARTER_GENERATIONS.find((x) => x.generation === g)!.ids[0]);
  };

  // Setas: ←/→ trocam de inicial, ↑/↓ de região (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const idx = group.ids.indexOf(chosen);
      if (e.key === 'ArrowRight') setChosen(group.ids[(idx + 1) % group.ids.length]);
      else if (e.key === 'ArrowLeft') setChosen(group.ids[(idx + group.ids.length - 1) % group.ids.length]);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const n = STARTER_GENERATIONS.length;
        const i = STARTER_GENERATIONS.findIndex((g) => g.generation === generation);
        const next = STARTER_GENERATIONS[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n];
        selectRegion(next.generation);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="intro">
      <div className="intro-stage">
        <LabScene ids={group.ids} chosen={chosen} onChoose={setChosen} />
      </div>
      <aside className="intro-side">
        <RegionMenu generation={generation} chosen={chosen} onRegion={selectRegion} onChoose={setChosen} />
        <StarterStatus speciesId={chosen} />
      </aside>
      <IntroDialog
        chosen={chosen}
        name={name}
        avatar={avatar}
        onName={setName}
        onAvatar={setAvatar}
        onConfirm={confirm}
      />
    </div>
  );
}
