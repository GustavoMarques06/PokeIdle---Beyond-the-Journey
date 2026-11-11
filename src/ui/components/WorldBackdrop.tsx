// Fundo da página: o chão do lugar onde o treinador está (grama, areia, neve, rocha, água, cidade…), escurecido
// pela hora do jogo, e partículas soltas por cima (pólen de dia, vaga-lumes à noite, neve, poeira, bolhas).
// Fica atrás de tudo e não recebe cliques; some no modo Desempenho e com movimento reduzido (só as partículas).

import { memo } from 'react';
import { getRoute } from '../../game-data';
import type { GameState } from '../../core/game';

const BIOME_OF: Record<string, string> = {
  meadow: 'grass',
  route: 'grass',
  plains: 'grass',
  forest: 'forest',
  jungle: 'forest',
  swamp: 'forest',
  beach: 'sand',
  desert: 'sand',
  river: 'water',
  sea: 'water',
  seafloor: 'water',
  snowfield: 'snow',
  icecave: 'snow',
  cave: 'rock',
  dampcave: 'rock',
  mountain: 'rock',
  summit: 'rock',
  ruins: 'rock',
  volcano: 'lava',
  city: 'city',
  street: 'city',
  lab: 'city',
  tower: 'city',
  powerplant: 'city',
  'rocket-base': 'city',
};

/** Tipo de chão do fundo para a cena da rota (salas da Liga ficam com o piso de mármore). */
export function biomeOf(scene: string): string {
  if (scene.startsWith('league')) return 'league';
  return BIOME_OF[scene] ?? 'grass';
}

/** Fase do dia para o fundo: o jogo só tem dia e noite; amanhecer e entardecer são visuais. */
export function phaseOf(state: GameState): 'day' | 'dawn' | 'dusk' | 'night' {
  const h = new Date(state.lastTimerAt).getHours();
  if (h >= 6 && h < 8) return 'dawn';
  if (h >= 16 && h < 18) return 'dusk';
  return state.env.period === 'night' ? 'night' : 'day';
}

/** Partículas por chão e hora: o que flutua no ar daquele lugar. */
function particleKind(biome: string, phase: string): string {
  if (biome === 'snow') return 'snow';
  if (biome === 'water') return 'bubble';
  if (biome === 'sand') return 'dust';
  if (biome === 'lava') return 'ember';
  if (biome === 'rock' || biome === 'city' || biome === 'league') return 'mote';
  return phase === 'night' || phase === 'dusk' ? 'firefly' : 'pollen';
}

const COUNT = 14;

export const WorldBackdrop = memo(function WorldBackdrop({ scene, phase }: { scene: string; phase: string }) {
  const biome = biomeOf(scene);
  const kind = particleKind(biome, phase);
  return (
    <div className={`world-ambient wa-${kind}`} aria-hidden>
      {Array.from({ length: COUNT }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 61 + 23) % 100}%`,
            animationDelay: `${-((i * 1.7) % 9)}s`,
            animationDuration: `${7 + ((i * 3) % 6)}s`,
          }}
        />
      ))}
    </div>
  );
});

/** Atributos do `.game` que escolhem o chão e a luz do fundo. */
export function backdropAttrs(state: GameState) {
  const scene = getRoute(state.currentRouteId).scene;
  return { 'data-biome': biomeOf(scene), 'data-phase': phaseOf(state), scene };
}
