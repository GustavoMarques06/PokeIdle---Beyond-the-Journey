// Recursos da 0.6: venda de itens, mercador viajante, pesca e surf, medalhas e molduras.

import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  BALANCE,
  CARD_FRAMES,
  RODS,
  ROUTES,
  SHOWCASE_SLOTS,
  WATER_SPOTS,
  hasRoute,
  itemValue,
  speciesId,
  waterEncounters,
} from '../game-data';
import {
  activeMode,
  buy,
  buyFromMerchant,
  freshBattle,
  modesAt,
  newGame,
  sellItem,
  sellPrice,
  setEncounterMode,
  step,
  type GameEvent,
  type GameState,
} from './game';
import { checkAchievements, frameUnlocked, medalPoints, setCardFrame, toggleShowcase } from './meta';
import { rollOffers, updateMerchant } from './market';
import { estimateRoute } from './offline';
import { rngFrom, type Rng } from './rng';
import { parseSave, serialize } from './save';

const seq = (values: number[]): Rng => {
  let i = 0;
  return { next: () => values[i++ % values.length] };
};

function beatBosses(s: GameState, upTo: string): void {
  for (const r of ROUTES) {
    s.routes[r.id].unlocked = true;
    s.routes[r.id].bossDefeated = !!r.boss;
    s.routes[r.id].kills = r.killsRequired;
    if (r.id === upTo) break;
  }
}

describe('venda de itens', () => {
  it('vende pela metade do preço da loja e conta nas estatísticas', () => {
    const s = newGame(1, 0, 1);
    s.items.leftovers = 2;
    const unit = sellPrice('leftovers');
    expect(unit).toBe(Math.floor(itemValue('leftovers') * BALANCE.market.sellRate));
    expect(unit).toBeGreaterThan(0);
    expect(sellItem(s, 'leftovers', 5)).toBe(unit * 2);
    expect(s.items.leftovers).toBeUndefined();
    expect(s.coins).toBe(unit * 2);
    expect(s.stats.itemsSold).toBe(2);
  });

  it('não vende o que não tem nem o que não tem valor', () => {
    const s = newGame(1, 0, 1);
    expect(sellItem(s, 'rare-candy')).toBe(0);
    s.items['item-sem-preco'] = 3;
    expect(sellItem(s, 'item-sem-preco')).toBe(0);
    expect(s.items['item-sem-preco']).toBe(3);
  });
});

describe('mercador viajante', () => {
  it('chega depois do intervalo, vende com desconto e estoque limitado, e vai embora', () => {
    const s = newGame(1, 0, 1);
    const rng = rngFrom(s);
    const events: GameEvent[] = [];
    updateMerchant(s, 1000, rng, events);
    expect(s.merchant).toBeNull(); // ainda não liberado
    beatBosses(s, BALANCE.merchant.unlock);
    updateMerchant(s, 1000, rng, events); // agenda a primeira visita
    expect(s.nextMerchantAt).toBeGreaterThan(1000);
    updateMerchant(s, s.nextMerchantAt, rng, events);
    expect(events.some((e) => e.type === 'merchantAppeared')).toBe(true);
    const m = s.merchant!;
    expect(m.offers.length).toBeGreaterThan(0);
    for (const o of m.offers) {
      expect(o.price).toBeLessThan(o.fullPrice);
      expect(o.price).toBeGreaterThanOrEqual(o.fullPrice * (1 - BALANCE.merchant.discount[1]) - 50);
    }
    const offer = m.offers[0];
    s.coins = offer.price * 10;
    const at = m.until - 1;
    for (let i = 0; i < offer.stock; i++) expect(buyFromMerchant(s, offer.id, at)).toBe(true);
    expect(buyFromMerchant(s, offer.id, at)).toBe(false); // esgotado
    expect(s.stats.merchantBuys).toBeGreaterThan(0);
    updateMerchant(s, m.until, rng, events);
    expect(s.merchant).toBeNull();
    expect(events.some((e) => e.type === 'merchantLeft')).toBe(true);
  });

  it('não repete itens nas ofertas', () => {
    const offers = rollOffers(seq([0.1, 0.9, 0.3, 0.7, 0.5, 0.2]));
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  });
});

describe('pesca e surf', () => {
  it('as tabelas de água usam rotas e espécies que existem', () => {
    for (const [routeId, spot] of Object.entries(WATER_SPOTS)) {
      expect(hasRoute(routeId), routeId).toBe(true);
      for (const [slug] of [...(spot.fish ?? []), ...(spot.surf ?? [])]) {
        expect(() => speciesId(slug), `${routeId}: ${slug}`).not.toThrow();
      }
      if (spot.fish) expect(waterEncounters(routeId, 'fish', 'super-rod')!.length).toBeGreaterThan(0);
      if (spot.surf) expect(waterEncounters(routeId, 'surf', null)!.length).toBeGreaterThan(0);
    }
  });

  it('cada vara pesca a própria lista e as das anteriores, em níveis diferentes', () => {
    const old = waterEncounters('rota-24-25', 'fish', 'old-rod')!;
    const sup = waterEncounters('rota-24-25', 'fish', 'super-rod')!;
    expect(sup.length).toBeGreaterThan(old.length);
    expect(sup[0].minLevel).toBeGreaterThan(old[0].minLevel);
    expect(waterEncounters('rota-1', 'fish', 'super-rod')).toBeNull();
    expect(RODS).toEqual(['old-rod', 'good-rod', 'super-rod']);
  });

  it('as varas e o Surf são melhorias do Poké Mart liberadas por chefes', () => {
    const s = newGame(1, 0, 1);
    s.coins = 1e6;
    expect(buy(s, 'old-rod')).toBe(false);
    beatBosses(s, 'rota-4');
    expect(buy(s, 'old-rod')).toBe(true);
    expect(s.upgrades).toContain('old-rod');
    expect(buy(s, 'surf')).toBe(false);
  });

  it('pescando, os encontros vêm da água e contam vitórias de água', () => {
    const s = newGame(7, 0, 3);
    beatBosses(s, 'rota-24-25');
    s.upgrades.push('old-rod');
    s.currentRouteId = 'rota-24-25';
    s.battle = freshBattle('rota-24-25');
    expect(modesAt(s, 'rota-24-25')).toEqual(['land', 'fish']);
    setEncounterMode(s, 'surf'); // sem a HM: continua na grama
    expect(activeMode(s, 'rota-24-25')).toBe('land');
    setEncounterMode(s, 'fish');
    expect(activeMode(s, 'rota-24-25')).toBe('fish');
    s.collection[0].level = 60;
    const fishIds = new Set(waterEncounters('rota-24-25', 'fish', 'old-rod')!.map((e) => e.speciesId));
    const rng = rngFrom(s);
    const events: GameEvent[] = [];
    for (let i = 0; i < 3000 && s.stats.waterKills < 3; i++) step(s, BALANCE.tickMs, rng, 0, events);
    const spawns = events.filter((e): e is Extract<GameEvent, { type: 'spawn' }> => e.type === 'spawn');
    expect(spawns.length).toBeGreaterThan(0);
    for (const sp of spawns) {
      expect(sp.water).toBe('fish');
      expect(fishIds.has(sp.speciesId)).toBe(true);
    }
    expect(s.stats.waterKills).toBeGreaterThanOrEqual(3);
    // A estimativa offline também usa a tabela da água.
    const fishing = estimateRoute(s, 'rota-24-25');
    setEncounterMode(s, 'land');
    expect(estimateRoute(s, 'rota-24-25').coinsPerWin).not.toBe(fishing.coinsPerWin);
  });
});

describe('medalhas e molduras', () => {
  it('toda conquista tem um metal e ids únicos', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(['bronze', 'silver', 'gold', 'platinum']).toContain(a.tier);
    const total = ACHIEVEMENTS.reduce(
      (sum, a) => sum + { bronze: 1, silver: 2, gold: 4, platinum: 8 }[a.tier],
      0,
    );
    expect(CARD_FRAMES.at(-1)!.points).toBeLessThanOrEqual(total);
  });

  it('a vitrine aceita só medalhas conquistadas, até o limite', () => {
    const s = newGame(1, 0, 1);
    expect(toggleShowcase(s, 'kills-50')).toBe(false);
    s.achievements.push(...ACHIEVEMENTS.slice(0, SHOWCASE_SLOTS + 1).map((a) => a.id));
    for (const a of ACHIEVEMENTS.slice(0, SHOWCASE_SLOTS)) expect(toggleShowcase(s, a.id)).toBe(true);
    expect(toggleShowcase(s, ACHIEVEMENTS[SHOWCASE_SLOTS].id)).toBe(false);
    expect(toggleShowcase(s, ACHIEVEMENTS[0].id)).toBe(true); // tira
    expect(s.showcase).toHaveLength(SHOWCASE_SLOTS - 1);
  });

  it('as molduras liberam pelos pontos de medalha', () => {
    const s = newGame(1, 0, 1);
    expect(frameUnlocked(s, 'basic')).toBe(true);
    expect(setCardFrame(s, 'gold')).toBe(false);
    s.achievements = ACHIEVEMENTS.map((a) => a.id);
    expect(medalPoints(s)).toBeGreaterThanOrEqual(CARD_FRAMES.at(-1)!.points);
    expect(setCardFrame(s, 'platinum')).toBe(true);
    expect(s.cardFrame).toBe('platinum');
  });

  it('as metas novas contam insígnias, água e vendas', () => {
    const s = newGame(1, 0, 1);
    beatBosses(s, 'estrada-vitoria');
    s.stats.waterKills = 1;
    s.stats.itemsSold = 100;
    const got = checkAchievements(s).map((e) => (e.type === 'achievement' ? e.id : ''));
    expect(got).toEqual(expect.arrayContaining(['badges-8', 'water-1', 'sold-100']));
  });

  it('saves antigos ganham os campos novos', () => {
    const s = newGame(1, 0, 1);
    const file = JSON.parse(serialize(s, 1000));
    for (const k of ['encounterMode', 'merchant', 'nextMerchantAt', 'showcase', 'cardFrame'])
      delete file.state[k];
    for (const k of ['waterKills', 'itemsSold']) delete file.state.stats[k];
    file.state.showcase = ['conquista-que-nao-tem'];
    const parsed = parseSave(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const st = parsed.file.state;
    expect(st.encounterMode).toBe('land');
    expect(st.merchant).toBeNull();
    expect(st.showcase).toEqual([]);
    expect(st.cardFrame).toBe('basic');
    expect(st.stats.waterKills).toBe(0);
  });
});
