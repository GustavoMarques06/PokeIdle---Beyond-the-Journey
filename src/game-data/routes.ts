// Mundo do jogo: regiões, rotas, chefes e conteúdos ligados a espécies, gerados a
// partir de scripts/world.mjs (edite lá e rode `npm run data:fetch`).

import worldJson from './generated/world.json';
import type { WorldData } from './types';

const WORLD = worldJson as unknown as WorldData;

export const ROUTES = WORLD.routes;
export const REGIONS = WORLD.regions;
export const ROAMERS = WORLD.roamers;
export const FOSSILS = WORLD.fossils;
export const TM_POOL = WORLD.tmPool;
export const EXPEDITIONS = WORLD.expeditions;
export const PRIZES = WORLD.prizes;

/** Iniciais das Gerações I–V (as que têm sprites animados), agrupados para a tela de escolha. */
export const STARTER_GENERATIONS = WORLD.starters;
export const STARTERS = STARTER_GENERATIONS.flatMap((g) => g.ids);

/** Insígnias de todas as regiões, na ordem dos ginásios, com a rota de cada líder. */
export const BADGES: { id: string; name: string; routeId: string; regionId: string }[] = ROUTES.flatMap(
  (r) =>
    r.boss?.badge
      ? [{ id: r.boss.badge.id, name: r.boss.badge.name, routeId: r.id, regionId: r.regionId }]
      : [],
);

/** Avatares do jogador disponíveis. */
export const PLAYER_AVATARS = ['red', 'leaf'] as const;
export type PlayerAvatar = (typeof PLAYER_AVATARS)[number];
