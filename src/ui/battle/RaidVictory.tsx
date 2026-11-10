// Raide vencida: o chefe gigante encolhe e se desfaz em partículas, chovem estrelas e moedas e aparece o cartão com
// as estrelas, o tempo, o recorde e os itens ganhos. Fica uns 5 s na cena e some sozinho.

import type { CSSProperties } from 'react';
import type { GameEvent } from '../../core/state';
import { ItemIcon, PokemonSprite } from '../components/common';
import { itemName, speciesName } from '../i18n/pt-BR';

type Win = Extract<GameEvent, { type: 'raidDefeated' }> & { id: number };

export function RaidVictory({ win }: { win: Win }) {
  const stars = win.stars ?? 1;
  const items = Object.entries(win.items);
  return (
    <div key={win.id} className={`raid-victory stars-${stars}`} aria-live="polite">
      <span className="raid-dissolve" aria-hidden>
        <PokemonSprite speciesId={win.speciesId} kind="front" shiny={win.shiny} pixelScale={2} />
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ '--i': i, '--a': `${i * 20}deg` } as CSSProperties} />
        ))}
      </span>
      <span className="raid-rain" aria-hidden>
        {Array.from({ length: 22 }, (_, i) => (
          <i key={i} className={i % 3 ? 'star' : 'coin'} style={{ '--i': i } as CSSProperties} />
        ))}
      </span>
      <div className="raid-card frame frame-dialog">
        <strong>RAIDE VENCIDA!</strong>
        <span className="raid-stars" aria-label={`${stars} estrelas`}>
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={i < stars ? 'on' : ''} style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
        <small>
          {speciesName(win.speciesId)}
          {win.timeMs ? ` · ${(win.timeMs / 1000).toFixed(1)} s` : ''}
        </small>
        {win.record && <span className="raid-record">NOVO RECORDE!</span>}
        <span className="raid-card-coins">+{win.coins.toLocaleString('pt-BR')} moedas</span>
        {items.length > 0 && (
          <ul className="raid-card-items">
            {items.map(([id, n], i) => (
              <li key={id} style={{ '--i': i } as CSSProperties} title={itemName(id)}>
                <ItemIcon id={id} size={20} />
                {n > 1 && <small>×{n}</small>}
              </li>
            ))}
          </ul>
        )}
        <small className={win.caught ? 'raid-card-caught' : 'raid-card-fled'}>
          {win.caught ? `${speciesName(win.speciesId)} foi capturado!` : 'Ele escapou antes da captura.'}
        </small>
      </div>
    </div>
  );
}
