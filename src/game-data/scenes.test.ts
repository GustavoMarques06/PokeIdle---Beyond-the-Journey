import { describe, expect, it } from 'vitest';
import { INDOOR_NEW } from '../core/env';
import { SCENE_THEMES, sceneBases } from '../ui/battle/scene';
import { ROUTES, type SceneKey } from '.';

// Só os nomes dos arquivos (a URL de cada um não importa aqui).
const IMAGES = Object.keys(import.meta.glob('../../public/sprites/backgrounds/*.png', { query: '?url' })).map(
  (f) => f.split('/').pop()!.replace('.png', ''),
);

describe('cenários das rotas', () => {
  const scenes = [...new Set(ROUTES.map((r) => r.scene))];

  it.each(scenes)('"%s" tem imagem e tema', (scene) => {
    expect(IMAGES).toContain(scene);
    expect(SCENE_THEMES[scene]).toBeTruthy();
  });

  it('as salas da Liga usam a sala do tipo e o inimigo fica à direita, acima do jogador', () => {
    const league = ROUTES.filter((r) => r.kind === 'trial');
    expect(league.length).toBeGreaterThan(0);
    for (const r of league) {
      expect(r.scene).toMatch(/^league-/);
      const { enemy, player } = sceneBases(r.scene);
      expect(enemy.x).toBeGreaterThan(player.x);
      expect(enemy.y).toBeLessThan(player.y);
    }
  });

  it('os cenários fechados novos existem', () => {
    for (const s of INDOOR_NEW) expect(SCENE_THEMES[s as SceneKey]).toBeTruthy();
  });
});
