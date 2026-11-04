import type { Section } from '../types';
import { ACTIVITIES } from './activities';
import { BATTLE } from './battle';
import { COLLECTION, EVOLUTION } from './collection';
import { ITEMS } from './items';
import { PROGRESS } from './progress';
import { SCREEN } from './screen';
import { START } from './start';
import { GLOSSARY, SYSTEM, TROUBLE } from './system';
import { TEAM } from './team';
import { MONEY, WORLD } from './world';

/** Ordem em que as seções aparecem na AJUDA (a 1ª pergunta da 1ª seção já abre aberta). */
export const SECTIONS: Section[] = [
  START,
  SCREEN,
  BATTLE,
  TEAM,
  COLLECTION,
  EVOLUTION,
  ITEMS,
  WORLD,
  MONEY,
  ACTIVITIES,
  PROGRESS,
  SYSTEM,
  TROUBLE,
  GLOSSARY,
];
