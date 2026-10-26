// Caixa de diálogo inferior: fala do professor à esquerda e, à direita, o "formulário"
// (avatar, nome e confirmação) no mesmo estilo dos menus do jogo.

import { PLAYER_AVATARS, getSpecies } from '../../game-data';
import type { PlayerAvatar } from '../../game-data';
import { TrainerSprite } from '../components/common';
import { TYPE_NAMES } from '../i18n/pt-BR';

export function IntroDialog({
  chosen,
  name,
  avatar,
  onName,
  onAvatar,
  onConfirm,
}: {
  chosen: number;
  name: string;
  avatar: PlayerAvatar;
  onName: (name: string) => void;
  onAvatar: (avatar: PlayerAvatar) => void;
  onConfirm: () => void;
}) {
  const species = getSpecies(chosen);
  const type = (TYPE_NAMES[species.types[0]] ?? species.types[0]).toLowerCase();
  const placeholder = avatar === 'red' ? 'RED' : 'LEAF';

  return (
    <div className="intro-dialog frame frame-dialog">
      <div className="dialog-speech">
        <span className="speaker">PROF. CARVALHO</span>
        <p>
          Então você escolheu <strong>{species.name}</strong>, o parceiro do tipo {type}! Ele vai crescer ao
          seu lado em cada rota. Antes de partir… como devo chamar você?
        </p>
      </div>

      <form
        className="dialog-form frame frame-menu"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <div className="form-field">
          <span className="field-label">AVATAR</span>
          <div className="avatar-pick" role="radiogroup" aria-label="Avatar">
            {PLAYER_AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                role="radio"
                aria-checked={avatar === a}
                className={`avatar-btn ${avatar === a ? 'active' : ''}`}
                onClick={() => onAvatar(a)}
                title={a === 'red' ? 'Menino (Red)' : 'Menina (Leaf)'}
              >
                <TrainerSprite id={a} size={44} head />
              </button>
            ))}
          </div>
        </div>
        <label className="form-field">
          <span className="field-label">NOME</span>
          <input
            className="name-field"
            value={name}
            maxLength={12}
            placeholder={placeholder}
            onChange={(e) => onName(e.target.value)}
            aria-label="Nome do treinador"
          />
        </label>
        <button type="submit" className="pbtn primary confirm">
          Escolher {species.name}!
        </button>
      </form>
    </div>
  );
}
