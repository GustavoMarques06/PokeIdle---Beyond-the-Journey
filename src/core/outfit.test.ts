// Roupa do treinador: cores por peça, troca de avatar, save e Cabo Link.

import { describe, expect, it } from 'vitest';
import { AVATAR_OUTFITS, BALANCE, OUTFIT_COLORS, PLAYER_AVATARS, ROUTES, cleanOutfit } from '../game-data';
import { newGame, setOutfitColor, setTrainerAvatar, type GameState } from './game';
import { challengeGhost, ghostPacket, importGhost, parsePacket } from './link';
import { parseSave, serialize } from './save';

function beatBosses(s: GameState, upTo: string): void {
  for (const r of ROUTES) {
    s.routes[r.id].unlocked = true;
    s.routes[r.id].bossDefeated = !!r.boss;
    s.routes[r.id].kills = r.killsRequired;
    if (r.id === upTo) break;
  }
}

describe('roupa do treinador', () => {
  it('todo avatar tem peças com retângulos dentro do quadro de 80×80', () => {
    for (const a of PLAYER_AVATARS) {
      expect(AVATAR_OUTFITS[a].length).toBeGreaterThanOrEqual(3);
      for (const piece of AVATAR_OUTFITS[a]) {
        for (const [x0, y0, x1, y1] of piece.rects) {
          expect(0 <= x0 && x0 <= x1 && x1 < 80 && 0 <= y0 && y0 <= y1 && y1 < 80).toBe(true);
        }
      }
    }
  });

  it('pinta e desfaz uma peça; peças que o avatar não tem e cores inválidas não entram', () => {
    const s = newGame(1, 0, 1);
    setOutfitColor(s, 'hat', 3);
    expect(s.trainerOutfit).toEqual({ hat: 3 });
    setOutfitColor(s, 'hat', null);
    expect(s.trainerOutfit).toEqual({});
    setTrainerAvatar(s, 'leaf');
    setOutfitColor(s, 'jacket', 2); // a Leaf não tem jaqueta
    expect(s.trainerOutfit).toEqual({});
    expect(cleanOutfit('red', { hat: OUTFIT_COLORS.length, top: -1, bottom: 1.5, jacket: 'x' })).toEqual({});
  });

  it('trocar de avatar mantém as cores das peças que o novo também tem', () => {
    const s = newGame(1, 0, 1);
    setOutfitColor(s, 'hat', 1);
    setOutfitColor(s, 'jacket', 2);
    setTrainerAvatar(s, 'leaf');
    expect(s.trainerOutfit).toEqual({ hat: 1 });
    setTrainerAvatar(s, 'brendan_rs');
    expect(s.trainerAvatar).toBe('brendan_rs');
    expect(s.trainerOutfit).toEqual({ hat: 1 });
  });

  it('volta do save; save antigo sem roupa e avatar desconhecido viram o padrão', () => {
    const s = newGame(1, 0, 1);
    setTrainerAvatar(s, 'may_rs');
    setOutfitColor(s, 'bottom', 5);
    const back = parseSave(serialize(s, 0));
    expect(back.ok && back.file.state.trainerOutfit).toEqual({ bottom: 5 });
    expect(back.ok && back.file.state.trainerAvatar).toBe('may_rs');

    const old = JSON.parse(serialize(s, 0));
    delete old.state.trainerOutfit;
    old.state.trainerAvatar = 'ethan';
    const migrated = parseSave(JSON.stringify(old));
    expect(migrated.ok && migrated.file.state.trainerAvatar).toBe('red');
    expect(migrated.ok && migrated.file.state.trainerOutfit).toEqual({});
  });

  it('o código do Cabo Link leva a roupa até o duelo fantasma', () => {
    const me = newGame(1, 1000, 11, 'Ana');
    const friend = newGame(4, 2000, 22, 'Bia');
    for (const g of [me, friend]) beatBosses(g, BALANCE.link.unlock);
    setTrainerAvatar(friend, 'brendan');
    setOutfitColor(friend, 'jacket', 7);
    const packet = parsePacket(JSON.parse(JSON.stringify(ghostPacket(friend, 3000))));
    expect(packet?.from.outfit).toEqual({ jacket: 7 });
    const out = importGhost(me, packet as ReturnType<typeof ghostPacket>, 4000);
    expect(out.ok).toBe(true);
    expect(challengeGhost(me, out.ok ? out.id : '')).toBe(true);
    expect(me.battle.trainer).toMatchObject({ sprite: 'brendan', outfit: { jacket: 7 } });
  });
});
