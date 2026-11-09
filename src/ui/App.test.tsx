// @vitest-environment jsdom
// Teste de fumaça da interface: abre o jogo, começa uma partida, percorre todas as telas
// do menu (inclusive as carregadas sob demanda) e confere que o save sobrevive a recarregar.

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { advance } from '../core/game';
import { memoryStorage } from '../core/save';
import { GameEngine } from '../engine/GameEngine';
import { App, preloadScreens } from './App';
import { MENU_ITEMS, menuKey } from './components/GameMenu';
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

// O Vitest compila cada tela sob demanda no primeiro import dinâmico; com a CPU disputada isso
// passa de 1 s (no jogo, as telas já vêm compiladas). Compilar antes deixa o teste medir só
// se as telas abrem.
beforeAll(() => preloadScreens());

afterEach(cleanup);

function pressStart() {
  fireEvent.click(document.querySelector('.start-screen')!);
}

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
    expect(document.querySelector('.start-screen')).not.toBeNull();

    act(() => engine.newGame(4, 'Teste'));
    expect(document.querySelector('.game')).not.toBeNull();
    expect(screen.getByText('POKéDEX')).toBeTruthy();

    // Quem começa vê só as abas do início; as outras aparecem com o progresso.
    const shown = () => [...document.querySelectorAll('.menu-item .menu-label')].map((el) => el.textContent);
    expect(shown()).toEqual(['POKéMON', 'POKéDEX', 'MOCHILA', 'TREINADOR']);
    await act(async () => engine.dispatch((s) => void (s.stats.totalKills = 12)));
    expect(shown()).toContain('LOJA');
    expect(screen.getByTitle(/^LOJA .*novo!/)).toBeTruthy();

    // Com todas liberadas (uma nova jornada libera tudo), cada uma abre pela sua tecla.
    await act(async () => engine.dispatch((s) => void (s.prestige.count = 1)));
    // A AJUDA abre uma página à parte (outra aba) em vez de uma tela do jogo.
    const opened = vi.spyOn(window, 'open').mockReturnValue(null);
    for (const [i, item] of MENU_ITEMS.entries()) {
      if (item.id === 'help') {
        await act(async () => {
          fireEvent.keyDown(window, { key: menuKey(i) });
        });
        expect(opened).toHaveBeenCalledWith(expect.stringContaining('ajuda.html'), '_blank', 'noopener');
        continue;
      }
      await act(async () => {
        fireEvent.keyDown(window, { key: menuKey(i) });
      });
      const button = screen.getByTitle(new RegExp(`^${item.label} \\(tecla ${menuKey(i)}\\)`));
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

  it('abertura: título, prólogo com nome e avatar, laboratório e começo da jornada', async () => {
    const engine = new GameEngine(memoryStorage());
    engine.load();
    mount(engine);
    pressStart();
    fireEvent.click(screen.getByText('NOVO JOGO'));
    expect(document.querySelector('.prologue')).not.toBeNull();

    // "Pular história" vai direto às perguntas sobre o treinador.
    fireEvent.click(screen.getByText('Pular história'));
    const dialog = () => document.querySelector('.prologue-dialog')!;
    fireEvent.click(dialog()); // completa a fala
    fireEvent.click(screen.getByRole('radio', { name: /Leaf/ }));
    fireEvent.click(screen.getByText('Sou assim!'));
    fireEvent.click(dialog());
    fireEvent.change(screen.getByLabelText('Nome do treinador'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByText('OK'));
    fireEvent.click(dialog());
    expect(dialog().textContent).toContain('ANA');
    fireEvent.click(screen.getByText('Sim'));

    // Rival e despedida: cada clique completa a fala e o seguinte avança.
    while (document.querySelector('.prologue')) {
      await act(async () => {
        fireEvent.click(dialog());
        await new Promise((r) => setTimeout(r, 0));
      });
      if (document.querySelector('.prologue.leaving')) {
        await act(() => new Promise((r) => setTimeout(r, 1500)));
      }
    }
    // Laboratório: abrir uma bola, recusar, trocar de região e aceitar outra.
    expect(document.querySelector('.lab-screen')).not.toBeNull();
    const labDialog = () => document.querySelector('.lab-dialog')!;
    fireEvent.click(screen.getByLabelText(/Charmander/));
    fireEvent.click(labDialog()); // completa a fala
    fireEvent.click(screen.getByText('NÃO'));
    // Ao recusar, o inicial volta para a bola (animação) e depois some.
    expect(document.querySelector('.lab-starter.returning')).not.toBeNull();
    await waitFor(() => expect(document.querySelector('.lab-starter')).toBeNull(), { timeout: 2000 });
    fireEvent.click(screen.getByLabelText('Próxima região'));
    expect(document.querySelector('.lab-sign')!.textContent).toContain('Johto');
    fireEvent.click(screen.getByLabelText(/Totodile/));
    fireEvent.click(labDialog());
    expect(document.querySelector('.lab-card')).not.toBeNull();
    fireEvent.click(screen.getByText('SIM'));
    // "Recebeu": um clique completa a fala, o seguinte avança para o apelido.
    fireEvent.click(labDialog());
    fireEvent.click(labDialog());
    fireEvent.click(labDialog());
    fireEvent.click(screen.getByText('SIM'));
    fireEvent.click(labDialog());
    fireEvent.change(screen.getByLabelText('Apelido do inicial'), { target: { value: 'Croco' } });
    fireEvent.click(screen.getByText('OK'));
    // O rival chega e leva a bola com vantagem (o de Kanto, onde toda jornada começa, mesmo
    // com um inicial de Johto); a fala seguinte começa o jogo.
    expect(document.querySelector('.lab-rival')).not.toBeNull();
    fireEvent.click(labDialog());
    expect(labDialog().textContent).toContain('CROCO');
    expect(labDialog().textContent).toContain('BLUE');
    expect(labDialog().textContent).toContain('CHIKORITA');
    for (let i = 0; i < 3 && !engine.state; i++) fireEvent.click(labDialog());
    expect(engine.state?.starterId).toBe(158);
    expect(engine.state?.collection[0].nickname).toBe('Croco');
    expect(engine.state?.trainerName).toBe('Ana');
    expect(engine.state?.trainerAvatar).toBe('leaf');
  });

  it('com save, o título mostra a ficha e CONTINUAR leva ao jogo', () => {
    const engine = new GameEngine(memoryStorage());
    engine.newGame(1, 'Bia');
    mount(engine);
    expect(document.querySelector('.start-screen')).not.toBeNull();
    // Qualquer tecla passa do "Pressione Start" para o menu.
    fireEvent.keyDown(window, { key: 'x' });
    expect(document.querySelector('.title-screen')).not.toBeNull();
    expect(document.querySelector('.save-card')!.textContent).toContain('BIA');
    fireEvent.click(screen.getByText('CONTINUAR'));
    expect(document.querySelector('.game')).not.toBeNull();
  });

  it('o tutorial aparece num jogo novo, uma dica por vez, e some para quem já jogava', () => {
    const engine = new GameEngine(memoryStorage());
    engine.newGame(1, 'Bia');
    mount(engine);
    pressStart();
    fireEvent.click(screen.getByText('CONTINUAR'));
    // Um clique completa a fala (máquina de escrever).
    fireEvent.click(document.querySelector('.coach')!);
    expect(document.querySelector('.coach')!.textContent).toContain('primeira rota');
    fireEvent.click(document.querySelector('.coach .pbtn')!);
    expect(engine.state!.flags).toContain('coach:battle');

    // Sem nenhuma captura, a dica da Caixa não chega, mas a da rota não fica presa atrás dela.
    act(() =>
      engine.dispatch((s) => {
        s.flags.push('coach:ball');
        s.stats.totalKills = 6;
      }),
    );
    fireEvent.click(document.querySelector('.coach')!);
    expect(document.querySelector('.coach')!.textContent).toContain('barra da rota');
    cleanup();

    const veteran = new GameEngine(memoryStorage());
    veteran.newGame(1, 'Bia');
    veteran.state!.stats.totalKills = 300;
    mount(veteran);
    pressStart();
    fireEvent.click(screen.getByText('CONTINUAR'));
    expect(document.querySelector('.coach')).toBeNull();
  });

  it('momentos clássicos: destaque do shiny, janela de nível e Centro Pokémon', () => {
    const engine = new GameEngine(memoryStorage());
    engine.newGame(4, 'Bia');
    mount(engine);
    pressStart();
    fireEvent.click(screen.getByText('CONTINUAR'));
    const s = engine.state!;
    const uid = s.activeUid;

    // Encontro comum entra direto (num jogo idle, um clarão a cada luta cansa); o shiny ganha clarão e destaque.
    act(() => engine.dispatch(() => [{ type: 'spawn', speciesId: 19, level: 3, shiny: false, boss: false }]));
    expect(document.querySelector('.enc-flash')).toBeNull();
    expect(document.querySelector('.rare-banner')).toBeNull();
    act(() => engine.dispatch(() => [{ type: 'spawn', speciesId: 19, level: 3, shiny: true, boss: false }]));
    expect(document.querySelector('.enc-flash')).not.toBeNull();
    expect(document.querySelector('.rare-banner')?.textContent).toContain('SHINY');

    // Janela de nível: primeiro o ganho de cada atributo ("+N").
    act(() => engine.dispatch(() => [{ type: 'levelUp', uid, speciesId: 4, level: 6 }]));
    const win = document.querySelector('.levelup-window')!;
    expect(win.textContent).toContain('Nv. 6');
    expect(win.textContent).toMatch(/ATQ\+\d/);

    // Derrota: o Centro Pokémon aparece durante a recuperação.
    act(() => engine.dispatch((st) => void (st.battle.phase = 'defeat')));
    expect(document.querySelector('.pkcenter')!.textContent).toContain('Centro Pokémon');
  });

  it('a história abre o capítulo uma vez, fala a fala, e fica marcado como visto', () => {
    const engine = new GameEngine(memoryStorage());
    engine.newGame(1, 'Bia');
    mount(engine);
    pressStart();
    fireEvent.click(screen.getByText('CONTINUAR'));
    expect(document.querySelector('.story-scene')).toBeNull();
    // Primeiras vitórias: o capítulo 1 começa, com o diário do parceiro.
    act(() => engine.dispatch((s) => void (s.stats.totalKills = 3)));
    const scene = () => document.querySelector('.story-scene');
    expect(scene()!.textContent).toContain('O primeiro dia');
    expect(scene()!.textContent).toContain('DIÁRIO DE');
    // Cada clique completa a fala (máquina de escrever) e o seguinte avança, até o fim do capítulo.
    for (let i = 0; i < 20 && scene(); i++) fireEvent.click(scene()!);
    expect(scene()).toBeNull();
    expect(engine.state!.flags).toContain('story:start');
    // A chegada a Johto agora é da história: o Professor não liga mais sozinho.
    act(() => engine.dispatch((s) => void (s.routes['johto-rotas-29-31'].unlocked = true)));
    expect(document.querySelector('.professor-call')).toBeNull();
  });

  it('atalhos de batalha: Q lança a Poké Ball quando há um selvagem', async () => {
    const engine = new GameEngine(memoryStorage());
    engine.newGame(7);
    mount(engine);
    pressStart();
    fireEvent.click(screen.getByText('CONTINUAR'));
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
      result: {
        moveId: 'tackle',
        moveType: 'normal',
        damage: 1,
        missed: false,
        crit: false,
        effectiveness: 1,
      },
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
