// @vitest-environment jsdom
// Teste de fumaça da interface: abre o jogo, começa uma partida, percorre todas as telas
// do menu (inclusive as carregadas sob demanda) e confere que o save sobrevive a recarregar.

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { advance } from '../core/game';
import { memoryStorage } from '../core/save';
import { GameEngine } from '../engine/GameEngine';
import { App } from './App';
import { MENU_ITEMS } from './components/GameMenu';
import { pickNotifications } from './notify';
import { EngineContext } from './useGame';

beforeAll(() => {
  // APIs de navegador que o jsdom não implementa.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.animate ??= vi.fn(() => ({ cancel() {}, finished: Promise.resolve() })) as never;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
  window.scrollTo = vi.fn() as never;
});

afterEach(cleanup);

function mount(engine: GameEngine) {
  return render(
    <EngineContext.Provider value={engine}>
      <App />
    </EngineContext.Provider>,
  );
}

describe('interface', () => {
  it('começa na escolha do inicial e abre todas as telas depois de começar', async () => {
    const storage = memoryStorage();
    const engine = new GameEngine(storage);
    engine.load();
    mount(engine);
    expect(engine.state).toBeNull();
    expect(document.querySelector('.intro')).not.toBeNull();

    act(() => engine.newGame(4, 'Teste'));
    expect(document.querySelector('.game')).not.toBeNull();
    expect(screen.getByText('POKéDEX')).toBeTruthy();

    for (const [i, item] of MENU_ITEMS.entries()) {
      await act(async () => {
        fireEvent.keyDown(window, { key: String(i + 1) });
      });
      const button = screen.getByTitle(`${item.label} (tecla ${i + 1})`);
      expect(button.getAttribute('aria-current')).toBe('true');
      // Telas carregadas sob demanda aparecem depois do Suspense.
      await waitFor(() => {
        const area = document.querySelector('.screen-area')!;
        expect(area.querySelector('.screen-loading')).toBeNull();
        expect(area.children.length).toBeGreaterThan(0);
      });
    }

    // O loop do jogo funciona com a interface montada.
    await act(async () => engine.dispatch((s) => void (s.coins = 1234)));
    engine.save();
    const reloaded = new GameEngine(storage);
    reloaded.load();
    expect(reloaded.state?.coins).toBe(1234);
    expect(reloaded.state?.trainerName).toBe('Teste');
  });

  it('atalhos de batalha: Q lança a Poké Ball quando há um selvagem', async () => {
    const engine = new GameEngine(memoryStorage());
    engine.newGame(7);
    mount(engine);
    const s = engine.state!;
    act(() =>
      engine.dispatch((st) => {
        while (st.battle.phase !== 'fighting') advance(st, 100, 0);
      }),
    );
    const before = s.items['poke-ball'];
    await act(async () => {
      fireEvent.keyDown(window, { key: 'q' });
    });
    expect(s.items['poke-ball']).toBe(before - 1);
  });
});

describe('notificações', () => {
  it('avisam só eventos relevantes, uma vez por minuto por tipo', () => {
    const last = new Map<string, number>();
    const hatched = { type: 'hatched', uid: 1, speciesId: 1, shiny: false, isNew: true } as const;
    const attack = {
      type: 'attack',
      side: 'player',
      attacker: 1,
      target: 2,
      result: { moveId: 'tackle', damage: 1, missed: false, crit: false, effectiveness: 1 },
    } as const;
    expect(pickNotifications([hatched, attack], last, 0)).toHaveLength(1);
    expect(pickNotifications([hatched], last, 30_000)).toHaveLength(0);
    expect(pickNotifications([hatched], last, 61_000)).toHaveLength(1);
  });

  it('juntam eventos iguais, respeitam categorias desligadas e avisam shiny', () => {
    const egg = (uid: number) =>
      ({ type: 'hatched', uid, speciesId: 1, shiny: false, isNew: false }) as const;
    const caught = (shiny: boolean) =>
      ({ type: 'captured', uid: 9, speciesId: 25, shiny, isNew: false }) as const;
    const grouped = pickNotifications([egg(1), egg(2), egg(3)], new Map(), 0);
    expect(grouped).toEqual([{ type: 'hatched', text: '3 ovos chocaram na creche.' }]);
    expect(pickNotifications([egg(1)], new Map(), 0, ['breeding'])).toHaveLength(0);
    expect(pickNotifications([caught(false)], new Map(), 0)).toHaveLength(0);
    expect(pickNotifications([caught(true)], new Map(), 0)[0].text).toContain('Shiny capturado');
    expect(pickNotifications([caught(true)], new Map(), 0, ['rare'])).toHaveLength(0);
  });
});
