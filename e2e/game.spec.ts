// O jogo aberto de verdade: cada tela do menu abre sem erro, a batalha anda, os botões de batalha cabem
// inteiros com uma janela aberta e a Loja compra. Usa o motor exposto em `window.__engine` (só no `vite` de
// desenvolvimento) para preparar situações.

import { expect, test, type Page } from '@playwright/test';
import fixture from './fixtures/save.json' with { type: 'json' };
import { CHANGELOG } from '../src/game-data/changelog';

type Engine = { dispatch: (fn: (s: Record<string, unknown>) => unknown) => void; state: Record<string, unknown> };

/** Abre o jogo com o save de teste (sem janelas de novidade nem dicas) e entra na partida. */
async function openGame(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /React|key/.test(m.text()))) errors.push(m.text());
  });
  const save = structuredClone(fixture.save) as { state: { flags: string[] } };
  save.state.flags.push(...CHANGELOG.map((c) => `news:${c.id}`));
  await page.clock.install({ time: fixture.now });
  await page.clock.resume();
  await page.addInitScript((raw) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('pokeidle.save', raw);
    localStorage.setItem('pokeidle.introMusic', 'off');
  }, JSON.stringify(save));
  await page.goto('/');
  for (let i = 0; i < 6 && !(await page.locator('.game').count()); i++) {
    const btn = page.getByRole('button', { name: /continuar|jogar|começar|entrar/i }).first();
    if (await btn.count()) await btn.click().catch(() => {});
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
  }
  await expect(page.locator('.game')).toBeVisible();
  await page.addStyleTag({ content: '.coach{display:none!important}' });
  // Fecha o relatório de tempo fora, se abrir.
  const close = page.locator('.modal-backdrop button').first();
  if (await close.count()) await close.click().catch(() => {});
  return errors;
}

const engine = (page: Page, fn: string) =>
  page.evaluate((code) => {
    const e = (window as unknown as { __engine: Engine }).__engine;
    e.dispatch(new Function('s', code) as (s: Record<string, unknown>) => unknown);
  }, fn);

const MENUS = ['POKéDEX', 'MOCHILA', 'LOJA', 'MAPA', 'ATIVIDADES', 'MISSÕES', 'TREINADOR', 'MELHORIAS'];

test('cada tela do menu abre sem erro', async ({ page }) => {
  const errors = await openGame(page);
  for (const label of MENUS) {
    await page.locator('.game-menu .menu-item', { hasText: label }).first().click();
    await expect(page.locator('.screen-window')).toBeVisible();
    await expect(page.locator('.screen-window .screen-loading')).toHaveCount(0, { timeout: 10_000 });
  }
  expect(errors).toEqual([]);
});

test('a batalha anda sozinha: inimigos caem e novos aparecem', async ({ page }) => {
  const errors = await openGame(page);
  const kills = () =>
    page.evaluate(() => ((window as unknown as { __engine: Engine }).__engine.state.stats as { totalKills: number }).totalKills);
  const before = await kills();
  await page.waitForTimeout(12_000);
  expect(await kills()).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});

test('o desmaio do ativo põe o próximo em campo sem erro', async ({ page }) => {
  const errors = await openGame(page);
  // Espera um inimigo em campo (entre uma luta e outra não há), senão a vitória cura o ativo.
  await expect
    .poll(() => page.evaluate(() => !!((window as unknown as { __engine: Engine }).__engine.state.battle as { enemy: unknown }).enemy))
    .toBe(true);
  await engine(
    page,
    `const p = s.collection.find((x) => x.uid === s.activeUid); p.currentHp = 1;
     if (s.battle.enemy) { s.battle.enemy.maxHp = 99999; s.battle.enemy.hp = 99999; s.battle.enemy.moveset = ['flamethrower']; }`,
  );
  const active = () => page.evaluate(() => (window as unknown as { __engine: Engine }).__engine.state.activeUid);
  const first = await active();
  await expect.poll(active, { timeout: 15_000 }).not.toBe(first);
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

for (const [w, h] of [
  [1912, 858],
  [1280, 720],
]) {
  test(`botões de batalha cabem inteiros com a Loja aberta (${w}×${h}, manual)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openGame(page);
    await engine(page, `s.settings.battleMode = 'manual';`);
    await page.locator('.game-menu .menu-item', { hasText: 'LOJA' }).first().click();
    await page.waitForTimeout(600);
    const box = await page.locator('.battle-cmds').boundingBox();
    for (const btn of await page.locator('.bc-main .bc-big').all()) {
      const b = await btn.boundingBox();
      expect(b && box && b.y + b.height <= box.y + box.height + 1).toBeTruthy();
    }
  });
}

test('a Loja compra: o dinheiro cai e o item vai para a mochila', async ({ page }) => {
  const errors = await openGame(page);
  await page.locator('.game-menu .menu-item', { hasText: 'LOJA' }).first().click();
  const coins = () => page.evaluate(() => (window as unknown as { __engine: Engine }).__engine.state.coins as number);
  const before = await coins();
  await page.locator('.niche').first().click();
  await page.locator('.buy-go').click();
  await expect.poll(coins).toBeLessThan(before);
  await expect(page.locator('.ss-bag')).toBeVisible();
  expect(errors).toEqual([]);
});
