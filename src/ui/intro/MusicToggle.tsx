// Liga/desliga o tema da abertura. Fica no canto da tela de título e do prólogo; a
// escolha vale só para este navegador (a música do jogo segue as Opções).

import { useState } from 'react';
import { audio } from '../audio';
import { T } from '../i18n/pt-BR';

export function MusicToggle() {
  const [on, setOn] = useState(audio.introMusicOn);
  const label = on ? T.intro.musicOn : T.intro.musicOff;
  return (
    <button
      type="button"
      className={`pbtn small music-toggle ${on ? '' : 'off'}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        audio.unlock();
        audio.setIntroMusic(!on);
        setOn(!on);
      }}
    >
      {'♪'} {on ? 'ON' : 'OFF'}
    </button>
  );
}
