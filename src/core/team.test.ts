import { describe, expect, it } from 'vitest';
import { ROUTES, TEAM_SIZE } from '../game-data';
import { passiveContributions } from './bonuses';
import { addToCollection } from './collection';
import { newGame, setActive, type GameState } from './game';
import { parseSave, serialize } from './save';
import { addToTeam, moveInTeam, removeFromTeam, teamPokemon, teamSlotsUnlocked } from './team';

const IVS = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };

function allOpen(): GameState {
  const s = newGame(4, 0, 1);
  for (const r of ROUTES) {
    s.routes[r.id] = { unlocked: true, kills: r.killsRequired, bossDefeated: !!r.boss };
  }
  return s;
}

const mon = (s: GameState, speciesId: number) =>
  addToCollection(s, speciesId, 20, { ...IVS }, false, 0, 'teste');
const order = (s: GameState) => teamPokemon(s).map((p) => p.uid);

describe('equipe de 6', () => {
  it('cabe até 6 e todos dão bônus', () => {
    const s = allOpen();
    expect(teamSlotsUnlocked(s)).toBe(TEAM_SIZE);
    const extra = [7, 25, 74, 16, 63, 129].map((id) => mon(s, id));
    const added = extra.map((p) => addToTeam(s, p.uid));
    expect(added).toEqual([true, true, true, true, true, false]);
    expect(teamPokemon(s)).toHaveLength(6);
    expect(passiveContributions(s)).toHaveLength(6);
  });

  it('subir e descer muda a ordem; subir para o 1º lugar põe para lutar', () => {
    const s = allOpen();
    const a = mon(s, 7);
    const b = mon(s, 25);
    addToTeam(s, a.uid);
    addToTeam(s, b.uid);
    const starter = s.activeUid;
    expect(moveInTeam(s, b.uid, -1)).toBe(true);
    expect(order(s)).toEqual([starter, b.uid, a.uid]);
    expect(moveInTeam(s, b.uid, -1)).toBe(true);
    expect(s.activeUid).toBe(b.uid);
    expect(order(s)).toEqual([b.uid, starter, a.uid]);
    expect(moveInTeam(s, b.uid, -1)).toBe(false);
    expect(moveInTeam(s, a.uid, 1)).toBe(false);
  });

  it('tirar quem luta passa a vez ao próximo; o último não sai', () => {
    const s = allOpen();
    const a = mon(s, 7);
    addToTeam(s, a.uid);
    const starter = s.activeUid;
    expect(removeFromTeam(s, starter)).toBe(true);
    expect(s.activeUid).toBe(a.uid);
    expect(order(s)).toEqual([a.uid]);
    expect(removeFromTeam(s, a.uid)).toBe(false);
  });

  it('pôr para lutar quem está no PC mantém o antigo na equipe se houver vaga', () => {
    const s = allOpen();
    const a = mon(s, 7);
    const starter = s.activeUid;
    setActive(s, a.uid);
    expect(order(s)).toEqual([a.uid, starter]);
  });

  it('save antigo: o apoio entra na equipe depois das reservas', () => {
    const s = allOpen();
    const [r, p1, p2] = [7, 25, 74].map((id) => mon(s, id));
    const old = JSON.parse(serialize(s, 1));
    old.state.battleTeam = [r.uid];
    old.state.passives = [p1.uid, p2.uid, r.uid];
    const result = parseSave(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const st = result.file.state;
    expect(st.battleTeam).toEqual([r.uid, p1.uid, p2.uid]);
    expect('passives' in st).toBe(false);
  });
});
