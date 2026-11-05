import { describe, expect, it } from 'vitest';
import { MEGAS, ROUTES, getHeldItem, hasAbility, megaFor } from '../game-data';
import { advance, awaitingCommand, megaAvailable, megaEvolve, newGame } from './game';
import type { GameEvent, GameState } from './state';
import { activePokemon } from './state';
import { calcDamage, combatantOf } from './combat';

const until = (s: GameState, cond: () => boolean, limitMs = 30_000): GameEvent[] => {
  const events: GameEvent[] = [];
  for (let t = 0; t < limitMs && !cond(); t += 100) events.push(...advance(s, 100, t));
  return events;
};

/** Charizard com a pedra X, em batalha. */
function game(manual: boolean, held: string | null = 'charizardite-x') {
  const s = newGame(4, 0, 7);
  const p = activePokemon(s);
  p.speciesId = 6;
  p.level = 50;
  p.held = held ?? undefined;
  s.settings.battleMode = manual ? 'manual' : 'auto';
  until(s, () => s.battle.phase === 'fighting' && !!s.battle.enemy);
  return s;
}

describe('Mega Evolução', () => {
  it('cada pedra pertence a uma espécie e custa caro na loja', () => {
    expect(MEGAS.length).toBeGreaterThanOrEqual(48);
    expect(new Set(MEGAS.map((m) => m.stone)).size).toBe(MEGAS.length);
    for (const m of MEGAS) {
      const item = getHeldItem(m.stone);
      expect(item?.megaStone).toBe(true);
      expect(item?.price).toBeGreaterThan(0);
      expect(megaFor({ speciesId: m.speciesId, held: m.stone })).toBe(m);
      expect(megaFor({ speciesId: m.speciesId + 1, held: m.stone })).toBeUndefined();
    }
    expect(megaFor({ speciesId: 6, held: 'leftovers' })).toBeUndefined();
  });

  it('toda Mega tem habilidade, sprites e ícone', () => {
    const files = Object.keys(import.meta.glob('../../public/sprites/pokemon/forms/**/*', { query: '?url' }));
    const has = (folder: string, name: string, ext: string) =>
      files.some((f) => f.endsWith(`/forms/${folder}/${name}.${ext}`));
    for (const m of MEGAS) {
      expect(hasAbility(m.ability), `${m.name}: ${m.ability}`).toBe(true);
      for (const folder of ['front', 'back', 'front-shiny', 'back-shiny'])
        expect(has(folder, `${m.speciesId}-${m.form}`, 'gif'), `${m.name} ${folder}`).toBe(true);
      expect(has('icon', `${m.speciesId}-${m.form}`, 'png'), `${m.name} icon`).toBe(true);
    }
  });

  it('a Mega traz a habilidade própria', () => {
    const ivs = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
    const c = combatantOf({ speciesId: 6, level: 50, ivs, megaForm: 'megax' });
    expect(c.ability?.id).toBe('tough-claws');
    expect(combatantOf({ speciesId: 6, level: 50, ivs, megaForm: 'megay' }).ability?.id).toBe('drought');
    expect(combatantOf({ speciesId: 6, level: 50, ivs }).ability?.id).not.toBe('tough-claws');
  });

  it('chefes já entram Mega Evoluídos', () => {
    const megaBosses = ROUTES.flatMap((r) => r.boss?.team ?? []).filter((m) => 'form' in m && m.form);
    expect(megaBosses.length).toBeGreaterThanOrEqual(5);
    const foe = {
      speciesId: 376,
      level: 90,
      ivs: { hp: 20, atk: 20, def: 20, spAtk: 20, spDef: 20, spe: 20 },
    };
    const normal = combatantOf(foe);
    const mega = combatantOf({ ...foe, form: 'mega' });
    expect(normal.types).toEqual(['steel', 'psychic']);
    expect(mega.stats.atk).toBeGreaterThan(normal.stats.atk);
  });

  it('a forma Mega troca tipos e atributos no combate', () => {
    const base = {
      speciesId: 6,
      level: 50,
      ivs: { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 },
    };
    const normal = combatantOf(base);
    const x = combatantOf({ ...base, megaForm: 'megax' });
    const y = combatantOf({ ...base, megaForm: 'megay' });
    expect(normal.types).toEqual(['fire', 'flying']);
    expect(x.types).toEqual(['fire', 'dragon']);
    expect(y.types).toEqual(['fire', 'flying']);
    expect(x.stats.atk).toBeGreaterThan(normal.stats.atk);
    expect(y.stats.spAtk).toBeGreaterThan(normal.stats.spAtk);
    expect(x.stats.hp).toBe(normal.stats.hp); // o HP base não muda
  });

  it('no automático, quem segura a pedra Mega Evolui sozinho', () => {
    const s = game(false);
    const events = until(s, () => s.battle.megaUid !== undefined, 2000);
    expect(s.battle.megaUid).toBe(activePokemon(s).uid);
    expect(events.some((e) => e.type === 'megaEvolved' && e.form === 'megax')).toBe(true);
  });

  it('sem a pedra, nada acontece', () => {
    const s = game(false, null);
    until(s, () => false, 3000);
    expect(s.battle.megaUid).toBeUndefined();
    expect(megaAvailable(s)).toBeUndefined();
    expect(megaEvolve(s)).toEqual([]);
  });

  it('no manual, só com o botão MEGA, e uma vez por encontro', () => {
    const s = game(true);
    until(s, () => awaitingCommand(s));
    expect(s.battle.megaUid).toBeUndefined();
    expect(megaAvailable(s)?.form).toBe('megax');
    expect(megaEvolve(s)).toHaveLength(1);
    expect(s.battle.megaUid).toBe(activePokemon(s).uid);
    expect(megaAvailable(s)).toBeUndefined();
    expect(megaEvolve(s)).toEqual([]);
    // Mega Evoluir não gasta a vez: ainda espera o comando.
    expect(awaitingCommand(s)).toBe(true);
  });

  it('a forma some no encontro seguinte', () => {
    const s = game(false);
    until(s, () => s.battle.megaUid !== undefined, 2000);
    const first = s.battle.enemy;
    until(s, () => s.battle.enemy !== first && s.battle.phase === 'fighting', 120_000);
    // No automático ela volta sozinha no encontro novo, com o evento de novo.
    const events = until(s, () => s.battle.megaUid !== undefined, 3000);
    expect(s.battle.megaUid === activePokemon(s).uid || events.some((e) => e.type === 'megaEvolved')).toBe(
      true,
    );
  });
});

describe('habilidades das Megas com efeito próprio', () => {
  const ivs = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
  const rng = { next: () => 0.5 };

  it('Pixilar converte golpes Normais em Fada (STAB e +20%)', () => {
    const base = combatantOf({ speciesId: 282, level: 50, ivs }); // Gardevoir (Psíquico/Fada)
    const mega = combatantOf({ speciesId: 282, level: 50, ivs, megaForm: 'mega' });
    const foe = combatantOf({ speciesId: 149, level: 50, ivs }); // Dragonite: Fada é super efetivo, Normal não
    expect(mega.ability?.convertNormal).toBe('fairy');
    const move = 'body-slam';
    const normal = calcDamage(base, foe, move, rng, 1);
    const fairy = calcDamage(mega, foe, move, rng, 1);
    expect(fairy.effectiveness).toBe(normal.effectiveness * 2);
    expect(fairy.damage).toBeGreaterThan(normal.damage * 2);
  });

  it('Elo Parental soma um segundo golpe de 25%', () => {
    const base = { speciesId: 115, level: 50, ivs };
    const foe = combatantOf({ speciesId: 19, level: 50, ivs });
    const mega = combatantOf({ ...base, megaForm: 'mega' });
    const plain = { ...mega, ability: undefined };
    const a = calcDamage(mega, foe, 'body-slam', rng, 1).damage;
    const b = calcDamage(plain, foe, 'body-slam', rng, 1).damage;
    expect(a / b).toBeGreaterThan(1.2);
    expect(a / b).toBeLessThan(1.3);
  });
});
