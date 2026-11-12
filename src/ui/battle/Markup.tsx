// Destaque das palavras na caixa de batalha: nomes dos Pokémon, golpes na cor do tipo, números, e os avisos
// de efetividade (super efetivo em vermelho, crítico em laranja, pouco efetivo em cinza). Funciona com o texto
// pela metade (efeito de digitação): o que ainda não apareceu não é marcado.

import { Fragment, useMemo, type ReactNode } from 'react';
import { MOVE_IDS, getMove } from '../../game-data';
import { moveName } from '../i18n/pt-BR';

/** Nome do golpe (como aparece no texto) → tipo. */
let moveTypes: Map<string, string> | null = null;
function typeOfMoveName(name: string): string | undefined {
  if (!moveTypes) {
    moveTypes = new Map();
    for (const id of MOVE_IDS) moveTypes.set(moveName(id), getMove(id).type);
  }
  return moveTypes.get(name);
}

const FIXED: [RegExp, string][] = [
  [/É super efetivo!/, 'hl-super'],
  [/Um golpe crítico!/, 'hl-crit'],
  [/Não é muito efetivo…/, 'hl-weak'],
  [/Mas errou!/, 'hl-weak'],
  [/Ele parece PERFEITO!/, 'hl-crit'],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Markup({ text, names }: { text: string; names: string[] }) {
  const pattern = useMemo(() => {
    const parts = [
      ...FIXED.map(([r]) => r.source),
      'usou ([^!\\n]+)!',
      // Os mais longos primeiro: "Mewtwo" não pode virar "Mew" + "two".
      ...[...new Set(names)]
        .filter((n) => n.length > 2)
        .sort((x, y) => y.length - x.length)
        .map(escape),
      '\\d[\\d.]*',
    ];
    return new RegExp(`(${parts.join('|')})`, 'g');
  }, [names]);

  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0;
    if (at > last) out.push(<Fragment key={k++}>{text.slice(last, at)}</Fragment>);
    const word = m[0];
    const fixed = FIXED.find(([r]) => r.test(word));
    if (fixed) out.push(<b key={k++} className={fixed[1]}>{word}</b>);
    else if (word.startsWith('usou ')) {
      const move = m[2] ?? word.slice(5, -1);
      const type = typeOfMoveName(move);
      out.push(
        <Fragment key={k++}>
          usou <b className={`hl-move ${type ? `type-text-${type}` : ''}`}>{move}</b>!
        </Fragment>,
      );
    } else if (/^\d/.test(word)) out.push(<b key={k++} className="hl-num">{word}</b>);
    else out.push(<b key={k++} className="hl-name">{word}</b>);
    last = at + word.length;
  }
  if (last < text.length) out.push(<Fragment key={k}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}
