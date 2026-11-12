// Selo do save: o save gravado pelo jogo passa limpo; editado à mão (ou sem o selo) fica marcado para sempre, e
// as equipes de duelo que saem dele levam o aviso.

import { describe, expect, it } from 'vitest';
import { ghostPacket, parsePacket } from './link';
import { MODIFIED_FLAG, SAVE_FORMAT_VERSION, parseSave, serialize } from './save';
import { newGame } from './state';

const flagged = (raw: string) => {
  const r = parseSave(raw);
  if (!r.ok) throw new Error(r.error);
  return r.file.state.flags.includes(MODIFIED_FLAG);
};

describe('selo do save', () => {
  it('o save gravado pelo jogo volta sem marca', () => {
    const s = newGame(1, 0, 1);
    expect(flagged(serialize(s, 0))).toBe(false);
  });

  it('editar o save à mão (dinheiro) deixa a marca, e ela continua depois de salvar de novo', () => {
    const s = newGame(1, 0, 1);
    const raw = serialize(s, 0).replace(/"coins":\d+/, '"coins":999999999');
    expect(flagged(raw)).toBe(true);
    const back = parseSave(raw);
    if (!back.ok) throw new Error(back.error);
    expect(flagged(serialize(back.file.state, 0))).toBe(true);
  });

  it('apagar o selo de um save novo também marca', () => {
    const s = newGame(1, 0, 1);
    const file = JSON.parse(serialize(s, 0));
    delete file.meta.seal;
    expect(file.meta.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(flagged(JSON.stringify(file))).toBe(true);
  });

  it('save de antes do selo (formato 6) carrega limpo', () => {
    const s = newGame(1, 0, 1);
    const file = JSON.parse(serialize(s, 0));
    delete file.meta.seal;
    file.meta.formatVersion = 6;
    expect(flagged(JSON.stringify(file))).toBe(false);
  });

  it('a equipe de duelo de um save modificado leva o aviso, e o aviso sobrevive ao código', () => {
    const s = newGame(1, 0, 1);
    expect(parsePacket(JSON.parse(JSON.stringify(ghostPacket(s, 0))))?.mod).toBeUndefined();
    s.flags.push(MODIFIED_FLAG);
    expect(parsePacket(JSON.parse(JSON.stringify(ghostPacket(s, 0))))?.mod).toBe(true);
  });
});
