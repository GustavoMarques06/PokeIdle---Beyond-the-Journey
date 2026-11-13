// História "Além da Jornada": capítulos que disparam com o progresso que o jogo já tem (o meio e o Campeão de cada
// região, o final em Kalos e cada nova jornada). Cada capítulo é visto uma vez (fica em `state.flags`) e pode ser
// revisto no Diário da Jornada. Os textos ficam em ui/i18n/story.ts.

import { LEGENDARY_REGION_UNLOCK, REGIONS, ROUTES } from '../game-data';
import { routeDone } from './collection';
import type { GameState } from './game';

export interface Chapter {
  id: string;
  /** Capítulo (número mostrado no Diário). */
  no: number;
  /** Região do capítulo (para a cor e o lendário). */
  regionId?: string;
  /** Já pode ser visto? */
  reached: (state: GameState) => boolean;
  /** O que falta, em poucas palavras (para o Diário mostrar o próximo objetivo). */
  goal: string;
  /** Página solta do diário do parceiro (um marco: primeiro shiny, primeiro ovo…), fora da ordem dos capítulos. */
  side?: boolean;
}

/** O 5º chefe da região: o meio da jornada nela. */
function midRoute(regionId: string): string | undefined {
  return ROUTES.filter((r) => r.regionId === regionId && r.boss)[4]?.id;
}

const regionName = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? id;

export const CHAPTERS: Chapter[] = (() => {
  const out: Chapter[] = [
    {
      id: 'start',
      no: 1,
      regionId: 'kanto',
      reached: (s) => s.stats.totalKills >= 3,
      goal: 'Vença as primeiras batalhas',
    },
  ];
  for (const region of REGIONS) {
    // Chegada a cada região (Kanto é o primeiro dia): quando a primeira área dela abre.
    const first = region.routes[0];
    if (region.id !== 'kanto' && first)
      out.push({
        id: `${region.id}-arrive`,
        no: out.length + 1,
        regionId: region.id,
        reached: (s) => !!s.routes[first]?.unlocked,
        goal: `Chegue a ${regionName(region.id)}`,
      });
    const mid = midRoute(region.id);
    const champ = LEGENDARY_REGION_UNLOCK[region.id];
    if (mid)
      out.push({
        id: `${region.id}-mid`,
        no: out.length + 1,
        regionId: region.id,
        reached: (s) => routeDone(s, mid),
        goal: `Avance pelos líderes de ${regionName(region.id)}`,
      });
    if (champ)
      out.push({
        id: region.id === 'kalos' ? 'finale' : `${region.id}-end`,
        no: out.length + 1,
        regionId: region.id,
        reached: (s) => routeDone(s, champ),
        goal: `Vença o Campeão de ${regionName(region.id)}`,
      });
  }
  out.push(
    {
      id: 'loop-1',
      no: out.length + 1,
      reached: (s) => s.prestige.count >= 1,
      goal: 'Comece uma nova jornada',
    },
    {
      id: 'loop-2',
      no: out.length + 2,
      reached: (s) => s.prestige.count >= 2,
      goal: 'Comece outra nova jornada',
    },
    {
      id: 'loop-3',
      no: out.length + 3,
      reached: (s) => s.prestige.count >= 3,
      goal: 'Comece a terceira nova jornada',
    },
  );
  // Páginas soltas do diário: marcos que o parceiro anota quando acontecem.
  const side = (id: string, goal: string, reached: (s: GameState) => boolean): Chapter => ({
    id,
    no: 0,
    side: true,
    reached,
    goal,
  });
  out.push(
    side('diary-evolve', 'Evolua um Pokémon', (s) => s.stats.evolutions >= 1),
    side('diary-hatch', 'Choque um ovo', (s) => s.stats.hatched >= 1),
    side('diary-shiny', 'Capture um Pokémon brilhante', (s) => s.collection.some((p) => p.shiny)),
    side('diary-legend', 'Capture um lendário', (s) => s.legends.caught.length > 0),
    side(
      'diary-dex100',
      'Registre 100 espécies na Pokédex',
      (s) => Object.values(s.pokedex).filter((d) => d.caught).length >= 100,
    ),
  );
  return out;
})();

export const storyFlag = (id: string) => `story:${id}`;
/** Marca de versão: quem já jogava não recebe de uma vez todos os capítulos que já passou. */
export const STORY_MIGRATION = 'story-v1';
/** Segunda leva (chegadas às regiões, páginas do diário, terceira volta): o que já passou fica como visto. */
export const STORY_MIGRATION_2 = 'story-v2';
const STORY_V2_CHAPTERS = (id: string) => id.endsWith('-arrive') || id.startsWith('diary-') || id === 'loop-3';

export const chapterSeen = (state: GameState, id: string) => state.flags.includes(storyFlag(id));

/** O próximo capítulo a mostrar (o primeiro alcançado e ainda não visto, na ordem). */
export function pendingChapter(state: GameState): Chapter | undefined {
  if (!state.flags.includes(STORY_MIGRATION_2)) return undefined;
  return CHAPTERS.find((c) => c.reached(state) && !chapterSeen(state, c.id));
}

/** O próximo objetivo da história (o primeiro capítulo ainda não alcançado). */
export function nextChapter(state: GameState): Chapter | undefined {
  return CHAPTERS.find((c) => !c.side && !c.reached(state));
}

/**
 * Saves de antes da história: os capítulos já passados ficam como vistos, menos o mais recente, que toca como
 * "onde a história está".
 */
export function migrateStory(state: GameState): void {
  if (!state.flags.includes(STORY_MIGRATION)) {
    const reached = CHAPTERS.filter((c) => !STORY_V2_CHAPTERS(c.id) && c.reached(state));
    for (const c of reached.slice(0, -1)) state.flags.push(storyFlag(c.id));
    state.flags.push(STORY_MIGRATION);
  }
  // Os capítulos da segunda leva que o jogador já passou não tocam de uma vez: ficam no Diário para rever.
  if (!state.flags.includes(STORY_MIGRATION_2)) {
    for (const c of CHAPTERS)
      if (STORY_V2_CHAPTERS(c.id) && c.reached(state) && !chapterSeen(state, c.id)) state.flags.push(storyFlag(c.id));
    state.flags.push(STORY_MIGRATION_2);
  }
}

export function markChapterSeen(state: GameState, id: string): void {
  if (!chapterSeen(state, id)) state.flags.push(storyFlag(id));
}

/** Escolha do final: quebrar o laço do tempo ou seguir viajando. */
export type FinaleChoice = 'break' | 'loop';
export const finaleChoice = (state: GameState): FinaleChoice | undefined =>
  state.flags.includes('story:choice:break')
    ? 'break'
    : state.flags.includes('story:choice:loop')
      ? 'loop'
      : undefined;

export function chooseFinale(state: GameState, choice: FinaleChoice): void {
  state.flags = state.flags.filter((f) => !f.startsWith('story:choice:'));
  state.flags.push(`story:choice:${choice}`);
}
