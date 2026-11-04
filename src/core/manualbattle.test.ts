import { describe, expect, it } from 'vitest';
import { speciesId } from '../game-data';
import { addToCollection } from './collection';
import {
  activePokemon,
  advance,
  awaitingCommand,
  newGame,
  runAway,
  selectMove,
  switchActive,
  throwBall,
  type GameEvent,
  type GameState,
} from './game';
import { movesOf } from './pokemon';

const IVS = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };

/** Avança em passos curtos até a condição (ou desiste depois de `limitMs`). */
function until(s: GameState, cond: () => boolean, limitMs = 20_000): GameEvent[] {
  const events: GameEvent[] = [];
  for (let t = 0; t < limitMs && !cond(); t += 100) events.push(...advance(s, 100, t));
  return events;
}

function manualGame() {
  const s = newGame(4, 0, 7);
  s.settings.battleMode = 'manual';
  until(s, () => awaitingCommand(s));
  return s;
}

describe('batalha manual', () => {
  it('na vez do ativo, a batalha espera o comando (nem o inimigo age)', () => {
    const s = manualGame();
    expect(awaitingCommand(s)).toBe(true);
    const hp = activePokemon(s).currentHp;
    const enemyHp = s.battle.enemy!.hp;
    const events = advance(s, 30_000, 30_000);
    expect(events.filter((e) => e.type === 'attack')).toHaveLength(0);
    expect(activePokemon(s).currentHp).toBe(hp);
    expect(s.battle.enemy!.hp).toBe(enemyHp);
  });

  it('LUTAR usa o golpe escolhido e volta a esperar na próxima vez', () => {
    const s = manualGame();
    const move = movesOf(activePokemon(s)).at(-1)!;
    expect(selectMove(s, 'golpe-que-nao-existe')).toBe(false);
    expect(selectMove(s, move)).toBe(true);
    expect(awaitingCommand(s)).toBe(false);
    const events = until(s, () => awaitingCommand(s) || s.battle.phase !== 'fighting');
    const mine = events.find((e) => e.type === 'attack' && e.side === 'player');
    expect(mine && mine.type === 'attack' && mine.result.moveId).toBe(move);
  });

  it('lançar uma bola gasta a vez', () => {
    const s = manualGame();
    s.items['poke-ball'] = 5;
    s.battle.enemy!.hp = s.battle.enemy!.maxHp; // captura improvável com HP cheio
    const before = s.items['poke-ball'];
    throwBall(s, 'poke-ball', 0);
    expect(s.items['poke-ball']).toBe(before - 1);
    if (s.battle.phase === 'fighting' && s.battle.enemy) expect(awaitingCommand(s)).toBe(false);
  });

  it('POKéMON troca por uma reserva de pé e gasta a vez', () => {
    const s = manualGame();
    // A primeira vaga de reserva abre depois do Mt. Moon.
    Object.assign(s.routes['mt-moon'], { unlocked: true, bossDefeated: true, kills: 999 });
    const reserve = addToCollection(s, speciesId('pidgey'), 20, IVS, false, 0, 't');
    s.battleTeam = [reserve.uid];
    const old = s.activeUid;
    const events = switchActive(s, reserve.uid);
    expect(events.some((e) => e.type === 'switched' && e.reason === 'manual')).toBe(true);
    expect(s.activeUid).toBe(reserve.uid);
    expect(s.battleTeam).toEqual([old]);
    expect(awaitingCommand(s)).toBe(false);
  });

  it('FUGIR de um selvagem começa outro encontro, sem recompensa', () => {
    const s = manualGame();
    const coins = s.coins;
    const events = runAway(s, 0);
    expect(events[0].type).toBe('ranAway');
    expect(s.battle.enemy).toBeNull();
    expect(s.coins).toBe(coins);
  });
});

describe('batalha automática', () => {
  it('não espera comando e não aceita golpe escolhido (os golpes saem no tempo de cada um)', () => {
    const s = newGame(4, 0, 7);
    until(s, () => s.battle.phase === 'fighting');
    expect(awaitingCommand(s)).toBe(false);
    const move = movesOf(activePokemon(s)).at(-1)!;
    expect(selectMove(s, move)).toBe(false);
    expect(s.battle.pendingMove).toBeUndefined();
  });

  it('no manual, só dá para escolher o golpe quando o cronômetro chega', () => {
    const s = newGame(4, 0, 7);
    s.settings.battleMode = 'manual';
    until(s, () => s.battle.phase === 'fighting' && s.battle.playerTimerMs > 200);
    const move = movesOf(activePokemon(s)).at(-1)!;
    expect(awaitingCommand(s)).toBe(false);
    expect(selectMove(s, move)).toBe(false);
    until(s, () => awaitingCommand(s));
    expect(selectMove(s, move)).toBe(true);
    expect(selectMove(s, move)).toBe(false);
  });
});
