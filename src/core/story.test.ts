// História "Além da Jornada": todo capítulo tem título e falas, quem já jogava não recebe de uma vez os capítulos
// novos que já passou, e os novos chegam na hora certa.

import { describe, expect, it } from 'vitest';
import { REGIONS } from '../game-data';
import { CHAPTER_TITLES, STORY } from '../ui/i18n/story';
import { newGame } from './game';
import {
  CHAPTERS,
  STORY_MIGRATION,
  chapterSeen,
  markChapterSeen,
  migrateStory,
  nextChapter,
  pendingChapter,
} from './story';

const ctxs = [
  { n: 'ASH', p: 'PIKACHU', loops: 0 },
  { n: 'ASH', p: 'PIKACHU', loops: 3, choice: 'loop' as const },
];

describe('história', () => {
  it('todo capítulo tem título e falas, com ou sem a escolha do final', () => {
    for (const c of CHAPTERS) {
      expect(CHAPTER_TITLES[c.id], c.id).toBeTruthy();
      expect(STORY[c.id]?.length, c.id).toBeGreaterThan(0);
      for (const line of STORY[c.id])
        for (const ctx of ctxs) expect(line.text(ctx).length).toBeGreaterThan(10);
    }
  });

  it('save antigo: as chegadas e páginas já passadas não tocam de uma vez', () => {
    const s = newGame(1, 0, 1);
    for (const r of REGIONS.slice(0, 3)) for (const id of r.routes) s.routes[id].unlocked = true;
    s.stats.evolutions = 3;
    s.flags.push(STORY_MIGRATION);
    migrateStory(s);
    expect(chapterSeen(s, 'johto-arrive')).toBe(true);
    expect(chapterSeen(s, 'diary-evolve')).toBe(true);
    expect(pendingChapter(s)?.id.endsWith('-arrive')).not.toBe(true);
  });

  it('jogo novo: a chegada a Johto aparece quando Johto abre, e as páginas não viram objetivo', () => {
    const s = newGame(1, 0, 1);
    migrateStory(s);
    s.stats.totalKills = 5;
    expect(pendingChapter(s)?.id).toBe('start');
    markChapterSeen(s, 'start');
    s.routes[REGIONS[1].routes[0]].unlocked = true;
    for (const c of CHAPTERS.filter((x) => x.regionId === 'kanto' && x.id !== 'start'))
      markChapterSeen(s, c.id);
    expect(pendingChapter(s)?.id).toBe('johto-arrive');
    expect(nextChapter(s)?.side).toBeFalsy();
  });
});
