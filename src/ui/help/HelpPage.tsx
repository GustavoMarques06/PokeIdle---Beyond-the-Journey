// A página de AJUDA (ajuda.html): o guia do jogo explicado do zero, numa aba separada. Não depende do
// jogo nem do save; o conteúdo vem de ./content e a marcação dos textos, de ./Rich.

import { useMemo, useState } from 'react';
import { ItemIcon, PixelIcon } from '../components/common';
import { SECTIONS } from './content';
import { Blocks, plainBlock } from './Rich';
import type { Question, Section } from './types';

/** Minúsculas e sem acento: "evolucao" acha "evolução". */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function searchText(section: Section, q: Question): string {
  return fold([section.title, q.q, q.keywords ?? '', ...q.a.map(plainBlock)].join(' '));
}

function SectionIcon({ icon }: { icon: string }) {
  return icon === 'help' ? <PixelIcon name="help" scale={2} /> : <ItemIcon id={icon} size={26} />;
}

/** `onClose`: aberta dentro do jogo (o botão volta ao jogo em vez de trocar de página). */
export function HelpPage({ onClose }: { onClose?: () => void } = {}) {
  const [query, setQuery] = useState('');

  // Todos os termos digitados precisam aparecer na pergunta ou na resposta.
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const index = useMemo(
    () => new Map(SECTIONS.flatMap((s) => s.items.map((q) => [q.id, searchText(s, q)] as const))),
    [],
  );
  const shown = SECTIONS.map((section) => ({
    section,
    items: section.items.filter((q) => terms.every((t) => index.get(q.id)!.includes(t))),
  })).filter((x) => x.items.length > 0);
  const total = shown.reduce((n, x) => n + x.items.length, 0);
  const searching = terms.length > 0;

  return (
    <div className="help-page">
      <header className="help-head frame frame-menu">
        <img className="help-logo" src={`${import.meta.env.BASE_URL}brand/logo.png`} alt="PokéIdle" />
        <div className="help-head-text">
          <h1>Como jogar</h1>
          <p>Tudo sobre o jogo explicado do zero, sem termos difíceis.</p>
        </div>
        {onClose ? (
          <button className="pbtn primary help-back" onClick={onClose}>
            ← Voltar ao jogo
          </button>
        ) : (
          <a className="pbtn primary help-back" href="./">
            ← Voltar ao jogo
          </a>
        )}
      </header>

      <div className="help-layout">
        <nav className="help-side frame frame-menu" aria-label="Assuntos">
          <input
            className="help-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar (ex.: shiny, capturar)…"
            aria-label="Procurar na ajuda"
          />
          <p className="help-count" aria-live="polite">
            {searching ? `${total} ${total === 1 ? 'resposta' : 'respostas'}` : `${SECTIONS.length} assuntos`}
          </p>
          <ul className="help-toc">
            {shown.map(({ section, items }) => (
              <li key={section.id}>
                <a href={`#secao-${section.id}`}>
                  <SectionIcon icon={section.icon} />
                  <span>{section.title}</span>
                  {searching && <small>{items.length}</small>}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="help-main">
          {shown.length === 0 && (
            <section className="window frame frame-menu">
              <p>
                Nada encontrado. Tente uma palavra mais simples (como <em>equipe</em>, <em>loja</em> ou{' '}
                <em>evoluir</em>).
              </p>
            </section>
          )}
          {shown.map(({ section, items }) => (
            <section
              key={section.id}
              id={`secao-${section.id}`}
              className="window frame frame-menu help-section"
            >
              <header className="window-title">
                <SectionIcon icon={section.icon} />
                <h2>{section.title}</h2>
              </header>
              <p className="hint">{section.blurb}</p>
              {items.map((q, i) => (
                <details
                  key={`${q.id}:${searching ? 'o' : 'c'}`}
                  className="help-q"
                  open={searching || (section.id === SECTIONS[0].id && i === 0)}
                  id={`ajuda-${q.id}`}
                >
                  <summary>{q.q}</summary>
                  <div className="help-a">
                    <Blocks blocks={q.a} ctx={{}} />
                  </div>
                </details>
              ))}
            </section>
          ))}
          <footer className="help-foot">
            PokéIdle é um projeto de fã, sem fins lucrativos e sem relação com a Nintendo, a Game Freak, a
            Creatures ou a The Pokémon Company.
          </footer>
        </main>
      </div>
    </div>
  );
}
