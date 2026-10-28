import { describe, expect, it } from 'vitest';
import { addToCollection } from './collection';
import { newGame } from './game';
import {
  BOX_SIZE,
  MIN_BOXES,
  boxName,
  findInPc,
  movePc,
  pcLayout,
  renameBox,
  setWallpaper,
  sortPc,
  syncPc,
} from './pc';
import { memoryStorage, loadGame, saveGame } from './save';

const IVS = { hp: 10, atk: 10, def: 10, spAtk: 10, spDef: 10, spe: 10 };

function setup(n = 3) {
  const s = newGame(1, 0, 1);
  const mons = Array.from({ length: n }, (_, i) =>
    addToCollection(s, 16 + (i % 3), 5 + i, { ...IVS }, false, 0, 'teste'),
  );
  return { s, mons };
}

describe('PC', () => {
  it('guarda a coleção nas caixas em ordem, sem a equipe', () => {
    const { s, mons } = setup();
    const boxes = pcLayout(s);
    expect(boxes.length).toBe(MIN_BOXES);
    expect(boxes[0].slots.slice(0, 3)).toEqual(mons.map((p) => p.uid));
    expect(findInPc(boxes, s.activeUid)).toBeNull();
  });

  it('quem entra na equipe sai da caixa e quem sai volta para um espaço livre', () => {
    const { s, mons } = setup();
    syncPc(s);
    s.passives.push(mons[0].uid);
    expect(findInPc(pcLayout(s), mons[0].uid)).toBeNull();
    s.passives = [];
    expect(findInPc(pcLayout(s), mons[0].uid)).not.toBeNull();
  });

  it('mover troca os dois Pokémon de lugar e a posição fica salva', () => {
    const { s, mons } = setup();
    expect(movePc(s, { box: 0, slot: 0 }, { box: 2, slot: 7 })).toBe(true);
    expect(findInPc(pcLayout(s), mons[0].uid)).toEqual({ box: 2, slot: 7 });
    movePc(s, { box: 0, slot: 1 }, { box: 2, slot: 7 });
    expect(findInPc(pcLayout(s), mons[1].uid)).toEqual({ box: 2, slot: 7 });
    expect(findInPc(pcLayout(s), mons[0].uid)).toEqual({ box: 0, slot: 1 });
    // Mover um espaço vazio não faz nada.
    expect(movePc(s, { box: 5, slot: 0 }, { box: 0, slot: 0 })).toBe(false);

    const storage = memoryStorage();
    saveGame(storage, s, 0);
    const loaded = loadGame(storage);
    expect(findInPc(pcLayout(loaded.file!.state), mons[1].uid)).toEqual({ box: 2, slot: 7 });
  });

  it('quem sai da coleção libera o espaço; capturado vai para o primeiro livre', () => {
    const { s, mons } = setup();
    movePc(s, { box: 0, slot: 2 }, { box: 1, slot: 0 });
    s.collection = s.collection.filter((p) => p.uid !== mons[0].uid);
    const boxes = pcLayout(s);
    expect(findInPc(boxes, mons[0].uid)).toBeNull();
    const fresh = addToCollection(s, 19, 5, { ...IVS }, false, 0, 'teste');
    expect(findInPc(pcLayout(s), fresh.uid)).toEqual({ box: 0, slot: 0 });
  });

  it('abre caixas novas quando as anteriores enchem', () => {
    const { s } = setup(MIN_BOXES * BOX_SIZE);
    const boxes = pcLayout(s);
    expect(boxes.length).toBe(MIN_BOXES + 1);
    expect(boxes[MIN_BOXES].slots.every((u) => !u)).toBe(true);
  });

  it('nome, papel de parede e organização automática', () => {
    const { s, mons } = setup(4);
    renameBox(s, 0, '  lendários  ');
    setWallpaper(s, 0, 'neve');
    expect(boxName(pcLayout(s)[0], 0)).toBe('LENDÁRIOS');
    expect(pcLayout(s)[0].wallpaper).toBe('neve');
    renameBox(s, 0, '');
    expect(boxName(pcLayout(s)[0], 0)).toBe('CAIXA 1');

    movePc(s, { box: 0, slot: 0 }, { box: 3, slot: 29 });
    sortPc(s, 'level');
    const first = pcLayout(s)[0].slots.slice(0, 4);
    expect(first).toEqual([...mons].sort((a, b) => b.level - a.level).map((p) => p.uid));
  });

  it('save com PC corrompido é limpo ao carregar', () => {
    const { s, mons } = setup();
    const storage = memoryStorage();
    saveGame(storage, s, 0);
    const raw = JSON.parse(storage.getItem('pokeidle.save')!);
    raw.state.pc = { boxes: [{ slots: [mons[0].uid, -3, 'x'], wallpaper: 'lava' }, null, { slots: 'oops' }] };
    storage.setItem('pokeidle.save', JSON.stringify(raw));
    const loaded = loadGame(storage);
    const st = loaded.file!.state;
    expect(st.pc!.boxes).toEqual([{ slots: [mons[0].uid, 0, 0] }]);
    expect(findInPc(pcLayout(st), mons[2].uid)).not.toBeNull();
  });
});
