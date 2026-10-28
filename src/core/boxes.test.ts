import { describe, expect, it } from 'vitest';
import { addToCollection } from './collection';
import {
  EMPTY_FILTER,
  filterActive,
  filterBox,
  renameTag,
  setFavorite,
  setTag,
  tagName,
  toggleFavorite,
  transferMany,
  transferPlan,
} from './boxes';
import { newGame } from './game';
import { canTransfer, surplusDuplicates } from './meta';
import { PERFECT_IVS } from './pokemon';
import { memoryStorage, loadGame, saveGame } from './save';

const IVS = { hp: 10, atk: 10, def: 10, spAtk: 10, spDef: 10, spe: 10 };

function setup() {
  const s = newGame(1, 0, 1);
  const pidgeys = [1, 2, 3].map((lv) => addToCollection(s, 16, 5 + lv, { ...IVS }, false, 0, 'teste'));
  const shiny = addToCollection(s, 19, 5, { ...IVS }, true, 0, 'teste');
  const perfect = addToCollection(s, 19, 6, { ...PERFECT_IVS }, false, 0, 'teste');
  return { s, pidgeys, shiny, perfect };
}

const name = (id: number) => (id === 16 ? 'Pidgey' : id === 19 ? 'Rattata' : 'Bulbasaur');

describe('Caixa', () => {
  it('favoritos não podem ser transferidos nem entram na limpeza de duplicatas', () => {
    const { s, pidgeys } = setup();
    expect(canTransfer(s, pidgeys[0].uid)).toBe(true);
    toggleFavorite(s, pidgeys[0].uid);
    expect(pidgeys[0].favorite).toBe(true);
    expect(canTransfer(s, pidgeys[0].uid)).toBe(false);
    expect(surplusDuplicates(s).some((p) => p.uid === pidgeys[0].uid)).toBe(false);
    toggleFavorite(s, pidgeys[0].uid);
    expect(pidgeys[0].favorite).toBeUndefined();
  });

  it('filtra por nome, número, tipo, etiqueta, shiny, perfeitos e repetidos', () => {
    const { s, pidgeys, shiny, perfect } = setup();
    setTag(s, [pidgeys[1].uid, shiny.uid], 'blue');
    const f = (patch: Partial<typeof EMPTY_FILTER>) => filterBox(s, { ...EMPTY_FILTER, ...patch }, name);
    expect(f({ text: 'pidg' })).toHaveLength(3);
    expect(f({ text: '19' })).toHaveLength(2);
    expect(f({ type: 'flying' })).toHaveLength(3);
    expect(f({ tag: 'blue' }).map((p) => p.uid)).toEqual([pidgeys[1].uid, shiny.uid]);
    expect(f({ tag: 'none' })).toHaveLength(4);
    expect(f({ shiny: true })).toEqual([shiny]);
    expect(f({ perfect: true })).toEqual([perfect]);
    expect(f({ duplicates: true })).toHaveLength(5);
    expect(filterActive(EMPTY_FILTER)).toBe(false);
    expect(filterActive({ ...EMPTY_FILTER, shiny: true })).toBe(true);
  });

  it('transferência em lote nunca leva o último de uma espécie nem os ocupados', () => {
    const { s, pidgeys } = setup();
    const all = s.collection.map((p) => p.uid);
    const plan = transferPlan(s, all);
    // Ativo (Bulbasaur) fica; dos 3 Pidgey vão 2; dos 2 Rattata vai 1.
    expect(plan.map((p) => p.speciesId).sort()).toEqual([16, 16, 19]);
    setFavorite(s, [pidgeys[0].uid, pidgeys[1].uid], true);
    const before = s.research.points;
    const { count, points } = transferMany(s, all);
    expect(count).toBe(2);
    expect(s.research.points).toBe(before + points);
    expect(s.collection.filter((p) => p.speciesId === 16)).toHaveLength(2);
    expect(s.collection.filter((p) => p.speciesId === 19)).toHaveLength(1);
  });

  it('nomes das etiquetas são editáveis e sobrevivem ao save', () => {
    const { s, pidgeys } = setup();
    renameTag(s, 'red', '  Time de raide  ');
    expect(tagName(s, 'red')).toBe('Time de raide');
    setTag(s, [pidgeys[0].uid], 'red');
    toggleFavorite(s, pidgeys[2].uid);
    const storage = memoryStorage();
    saveGame(storage, s, 1);
    const loaded = loadGame(storage).file!.state;
    expect(tagName(loaded, 'red')).toBe('Time de raide');
    expect(loaded.collection.find((p) => p.uid === pidgeys[0].uid)?.tag).toBe('red');
    expect(loaded.collection.find((p) => p.uid === pidgeys[2].uid)?.favorite).toBe(true);
    renameTag(s, 'red', '');
    expect(tagName(s, 'red')).toBe('Batalha');
  });
});
