// Renderiza os textos da AJUDA (ver types.ts para a marcação) e os blocos de cada resposta.

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { assetUrl, badgeSprite, getSpecies } from '../../game-data';
import { ItemIcon, PokemonSprite, TypeBadge } from '../components/common';
import type { ScreenId } from '../battle/BattleDialog';
import type { Block } from './types';

const TOKEN = /\*\*(.+?)\*\*|\[\[(item|type|mon|badge|key|go):([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Sem `go`, os botões "abrir aba" não existem (a AJUDA é uma página à parte, fora do jogo). */
export interface RichContext {
  /** A aba já está liberada para abrir? */
  canGo?: (screen: ScreenId) => boolean;
  go?: (screen: ScreenId) => void;
}

/** Texto sem a marcação (para a busca e para os leitores de tela). */
export function plain(text: string): string {
  return text.replace(TOKEN, (_m, bold: string | undefined, kind: string, arg: string, label?: string) => {
    if (bold) return bold;
    if (kind === 'go') return label ?? arg;
    if (kind === 'key') return arg;
    if (kind === 'mon') return getSpecies(Number(arg)).name;
    return arg.replace(/-/g, ' ');
  });
}

export function plainBlock(b: Block): string {
  if ('p' in b) return plain(b.p);
  if ('ul' in b || 'ol' in b) return ('ul' in b ? b.ul : b.ol).map(plain).join(' ');
  if ('tip' in b) return plain(b.tip);
  if ('warn' in b) return plain(b.warn);
  if ('img' in b) return `${b.alt} ${b.caption ?? ''}`;
  return [...b.table.head, ...b.table.rows.flat()].map(plain).join(' ');
}

export function Rich({ text, ctx }: { text: string; ctx: RichContext }) {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const [, bold, kind, arg, label] = m;
    const key = `t${i++}`;
    if (bold) out.push(<strong key={key}>{bold}</strong>);
    else if (kind === 'item') out.push(<ItemIcon key={key} id={arg} size={24} className="help-inline" />);
    else if (kind === 'type') out.push(<TypeBadge key={key} type={arg} />);
    else if (kind === 'mon')
      out.push(<PokemonSprite key={key} speciesId={Number(arg)} kind="icon" className="help-mon" />);
    else if (kind === 'badge')
      out.push(
        <img key={key} className="help-badge" src={assetUrl(badgeSprite(arg))} alt="" draggable={false} />,
      );
    else if (kind === 'key') out.push(<kbd key={key}>{arg}</kbd>);
    else if (kind === 'go') {
      const screen = arg as ScreenId;
      const open = ctx.canGo?.(screen) ?? false;
      out.push(
        <button
          key={key}
          className="pbtn tiny help-go"
          disabled={!open}
          title={open ? undefined : 'Essa aba ainda não está liberada no seu jogo.'}
          onClick={() => ctx.go?.(screen)}
        >
          {label ?? arg}
        </button>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** Imagem com legenda; um toque a amplia (Esc ou outro toque fecha). */
/** Imagens que também têm versão de celular (public/help/cel). */
const CEL_IMAGES = new Set(
  [
    'tela-principal',
    'equipe',
    'ficha-pokemon',
    'pokedex',
    'mochila',
    'loja',
    'mapa',
    'atividades',
    'missoes',
    'treinador',
    'melhorias',
    'pc',
  ].map((n) => `${n}.webp`),
);

function Figure({
  src,
  alt,
  caption,
  ctx,
}: {
  src: string;
  alt: string;
  caption?: string;
  ctx: RichContext;
}) {
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);
  const url = assetUrl(`help/${src}`);
  return (
    <figure className="help-figure">
      <button className="help-figure-btn" onClick={() => setZoom(true)} aria-label={`Ampliar: ${alt}`}>
        <picture>
          {/* Em telas de celular, a imagem mostra o jogo como ele aparece ali. */}
          {CEL_IMAGES.has(src) && <source media="(max-width: 700px)" srcSet={assetUrl(`help/cel/${src}`)} />}
          <img src={url} alt={alt} loading="lazy" draggable={false} />
        </picture>
      </button>
      <figcaption>
        {caption && <Rich text={caption} ctx={ctx} />} <em>Toque na imagem para ampliar.</em>
      </figcaption>
      {zoom && (
        <div
          className="help-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setZoom(false)}
        >
          <picture>
            {CEL_IMAGES.has(src) && (
              <source media="(max-width: 700px)" srcSet={assetUrl(`help/cel/${src}`)} />
            )}
            <img src={url} alt={alt} draggable={false} />
          </picture>
          <span>Toque para fechar</span>
        </div>
      )}
    </figure>
  );
}

export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: RichContext }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ('p' in b) {
          if (!ctx.go && /^\[\[go:[^\]]+\]\]$/.test(b.p)) return null;
          return (
            <p key={i}>
              <Rich text={b.p} ctx={ctx} />
            </p>
          );
        }
        if ('ul' in b)
          return (
            <ul key={i}>
              {b.ul.map((t, j) => (
                <li key={j}>
                  <Rich text={t} ctx={ctx} />
                </li>
              ))}
            </ul>
          );
        if ('ol' in b)
          return (
            <ol key={i}>
              {b.ol.map((t, j) => (
                <li key={j}>
                  <Rich text={t} ctx={ctx} />
                </li>
              ))}
            </ol>
          );
        if ('tip' in b)
          return (
            <aside key={i} className="help-note tip">
              <strong>Dica</strong>
              <span>
                <Rich text={b.tip} ctx={ctx} />
              </span>
            </aside>
          );
        if ('warn' in b)
          return (
            <aside key={i} className="help-note warn">
              <strong>Atenção</strong>
              <span>
                <Rich text={b.warn} ctx={ctx} />
              </span>
            </aside>
          );
        if ('img' in b) return <Figure key={i} src={b.img} alt={b.alt} caption={b.caption} ctx={ctx} />;
        return (
          <div key={i} className="help-table-wrap">
            <table className="help-table">
              <thead>
                <tr>
                  {b.table.head.map((h, j) => (
                    <th key={j}>
                      <Rich text={h} ctx={ctx} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.table.rows.map((row, j) => (
                  <tr key={j}>
                    {row.map((cell, k) => (
                      <Fragment key={k}>
                        <td>
                          <Rich text={cell} ctx={ctx} />
                        </td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
