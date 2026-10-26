// Menu de regiões: a região escolhida se expande e mostra os três iniciais em tamanho
// legível (e clicável); as demais ficam em linhas compactas com os ícones ao lado.

import { STARTER_GENERATIONS, getSpecies } from '../../game-data';
import { PokemonSprite, Window } from '../components/common';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export function RegionMenu({
  generation,
  chosen,
  onRegion,
  onChoose,
}: {
  generation: number;
  chosen: number;
  onRegion: (generation: number) => void;
  onChoose: (id: number) => void;
}) {
  return (
    <Window title="REGIÃO" className="region-menu">
      <ul className="region-list" role="radiogroup" aria-label="Região">
        {STARTER_GENERATIONS.map((g) => {
          const active = g.generation === generation;
          return (
            <li key={g.generation} className={`region ${active ? 'active' : ''}`}>
              <button
                className="region-head"
                role="radio"
                aria-checked={active}
                onClick={() => onRegion(g.generation)}
              >
                <span className="region-numeral">{ROMAN[g.generation - 1]}</span>
                <span className="region-name">{g.region}</span>
                {!active && (
                  <span className="region-icons" aria-hidden>
                    {g.ids.map((id) => (
                      <PokemonSprite key={id} speciesId={id} kind="icon" />
                    ))}
                  </span>
                )}
              </button>
              {active && (
                <div className="region-starters">
                  {g.ids.map((id) => (
                    <button
                      key={id}
                      className={`starter-pick ${id === chosen ? 'selected' : ''}`}
                      aria-pressed={id === chosen}
                      onClick={() => onChoose(id)}
                    >
                      <PokemonSprite speciesId={id} kind="icon" />
                      <span>{getSpecies(id).name}</span>
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Window>
  );
}
