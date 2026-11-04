// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getItem, getSpecies } from '../../game-data';
import { HelpPage } from './HelpPage';
import { SECTIONS } from './content';
import type { Block } from './types';

const IMAGES = Object.keys(import.meta.glob('../../../public/help/*.webp', { query: '?url' })).map((f) =>
  f.split('/').pop(),
);
const SPRITES = Object.keys(import.meta.glob('../../../public/sprites/items/*.png', { query: '?url' })).map(
  (f) => f.split('/').pop()!.replace('.png', ''),
);
const BADGES = Object.keys(import.meta.glob('../../../public/sprites/badges/*.png', { query: '?url' })).map(
  (f) => f.split('/').pop()!.replace('.png', ''),
);
const SCREENS = [
  'party',
  'dex',
  'bag',
  'shop',
  'map',
  'activities',
  'missions',
  'trainer',
  'upgrades',
  'pc',
  'help',
];
const TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];

function texts(b: Block): string[] {
  if ('p' in b) return [b.p];
  if ('ul' in b) return b.ul;
  if ('ol' in b) return b.ol;
  if ('tip' in b) return [b.tip];
  if ('warn' in b) return [b.warn];
  if ('img' in b) return b.caption ? [b.caption] : [];
  return [...b.table.head, ...b.table.rows.flat()];
}

describe('conteúdo da AJUDA', () => {
  const questions = SECTIONS.flatMap((s) => s.items);

  it('tem seções e perguntas, com ids únicos', () => {
    expect(SECTIONS.length).toBeGreaterThanOrEqual(10);
    expect(questions.length).toBeGreaterThanOrEqual(60);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
    for (const q of questions) expect(q.a.length, q.id).toBeGreaterThan(0);
  });

  it('as imagens existem e as marcações são válidas', () => {
    for (const q of questions) {
      for (const b of q.a) {
        if ('img' in b) {
          expect(IMAGES, `${q.id}: ${b.img}`).toContain(b.img);
          expect(b.alt.length).toBeGreaterThan(5);
        }
        for (const t of texts(b)) {
          // Marcação aberta e não fechada.
          expect((t.match(/\*\*/g) ?? []).length % 2, `${q.id}: ** sem par em "${t}"`).toBe(0);
          expect((t.match(/\[\[/g) ?? []).length, `${q.id}: [[ sem ]] em "${t}"`).toBe(
            (t.match(/\]\]/g) ?? []).length,
          );
          for (const m of t.matchAll(/\[\[(item|type|mon|badge|key|go):([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
            const [, kind, arg] = m;
            if (kind === 'item')
              expect(SPRITES.includes(arg) || !!getItem(arg), `${q.id}: item ${arg}`).toBe(true);
            if (kind === 'type') expect(TYPES, `${q.id}: tipo ${arg}`).toContain(arg);
            if (kind === 'mon') expect(getSpecies(Number(arg)), `${q.id}: Pokémon ${arg}`).toBeTruthy();
            if (kind === 'badge') expect(BADGES, `${q.id}: insígnia ${arg}`).toContain(arg);
            if (kind === 'go') expect(SCREENS, `${q.id}: aba ${arg}`).toContain(arg);
          }
        }
      }
    }
  });

  it('os ícones das seções existem', () => {
    for (const s of SECTIONS) expect(s.icon === 'help' || SPRITES.includes(s.icon), s.id).toBe(true);
  });
});

describe('página de AJUDA (ajuda.html)', () => {
  afterEach(cleanup);

  it('mostra todos os assuntos e abre só a primeira resposta', () => {
    render(<HelpPage />);
    expect(screen.getByText('O que é este jogo? Como ele funciona em 1 minuto?')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Voltar ao jogo/ }).getAttribute('href')).toBe('./');
    expect(document.querySelectorAll('.help-toc li').length).toBe(SECTIONS.length);
    expect(document.querySelectorAll('.help-q').length).toBeGreaterThanOrEqual(60);
    expect(document.querySelectorAll('.help-q[open]').length).toBe(1);
  });

  it('a busca ignora acentos e filtra as perguntas e os assuntos', () => {
    render(<HelpPage />);
    fireEvent.change(screen.getByLabelText('Procurar na ajuda'), { target: { value: 'evolucao' } });
    const shown = document.querySelectorAll('.help-q');
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(40);
    expect(document.querySelectorAll('.help-q[open]').length).toBe(shown.length);
    expect(document.querySelectorAll('.help-toc li').length).toBeLessThan(SECTIONS.length);
    fireEvent.change(screen.getByLabelText('Procurar na ajuda'), { target: { value: 'zzzxxqq' } });
    expect(screen.getByText(/Nada encontrado/)).toBeTruthy();
  });

  it('não tem botões que abrem abas do jogo (a página é separada)', () => {
    render(<HelpPage />);
    expect(screen.queryAllByRole('button', { name: /^Abrir /i }).length).toBe(0);
  });

  it('tocar numa imagem a amplia e Esc fecha', () => {
    render(<HelpPage />);
    fireEvent.change(screen.getByLabelText('Procurar na ajuda'), { target: { value: 'partes da tela' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Ampliar:/ })[0]);
    expect(document.querySelector('.help-zoom img')).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('.help-zoom')).toBeNull();
  });
});
