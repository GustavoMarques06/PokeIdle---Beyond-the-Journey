// Prólogo: o Professor apresenta o mundo, pergunta quem é o jogador (avatar e nome) e o
// manda para o laboratório. Texto em máquina de escrever; clique, Enter, Espaço ou Z
// avançam (o primeiro toque completa a fala, o segundo passa para a próxima).

import { useEffect, useRef, useState } from 'react';
import { PLAYER_AVATARS, STARTER_GENERATIONS, assetUrl, getSpecies, trainerSprite } from '../../game-data';
import type { PlayerAvatar } from '../../game-data';
import { audio } from '../audio';
import { PixelIcon, PokemonSprite } from '../components/common';
import { MusicToggle } from './MusicToggle';
import { prefersReducedMotion, useTypewriter } from './useTypewriter';

/** O que aparece no palco durante cada fala. */
type Scene = 'oak' | 'pokemon' | 'world' | 'player' | 'rival' | 'farewell';
type Input = 'avatar' | 'name' | 'confirm';

interface Line {
  scene: Scene;
  text: (name: string) => string;
  input?: Input;
}

const PARTNER = 133; // Eevee: muitos caminhos possíveis, como a jornada.
const RIVAL_SPRITE = 'kanto-blue';

const LINES: Line[] = [
  { scene: 'oak', text: () => 'Ah, aí está você! Desculpe, eu estava terminando umas anotações…' },
  {
    scene: 'oak',
    text: () =>
      'Bem-vindo ao mundo dos Pokémon! Eu sou o Professor Carvalho, e estudo essas criaturas há mais tempo do que gosto de admitir.',
  },
  {
    scene: 'pokemon',
    text: () =>
      'Este mundo é habitado por criaturas chamadas Pokémon. Elas vivem na grama alta, nas cavernas, nos mares… e até entre as nuvens.',
  },
  {
    scene: 'pokemon',
    text: () =>
      'Para algumas pessoas, são companheiros. Para outras, parceiros de batalha. Para mim, um mistério que nunca para de me surpreender!',
  },
  {
    scene: 'world',
    text: () =>
      'Seis regiões esperam por um novo treinador: Kanto, Johto, Hoenn, Sinnoh, Unova… e, para quem for longe o bastante, Kalos.',
  },
  {
    scene: 'world',
    text: () =>
      'E tem uma coisa curiosa: a jornada não para quando você descansa. Seus Pokémon seguem treinando, explorando e crescendo, mesmo com o jogo fechado.',
  },
  {
    scene: 'player',
    input: 'avatar',
    text: () => 'Mas chega de falar de mim. Conte-me sobre você! Como você é?',
  },
  { scene: 'player', input: 'name', text: () => 'E qual é o seu nome?' },
  { scene: 'player', input: 'confirm', text: (n) => `${n}, não é? Belo nome de treinador!` },
  {
    scene: 'rival',
    text: () =>
      'Ah, e um aviso: em cada região, um rival vai cruzar o seu caminho, sempre com o Pokémon que tem vantagem sobre o seu.',
  },
  {
    scene: 'rival',
    text: () => 'E não pense que vai ficar fácil: a cada nova jornada, os rivais voltam mais fortes.',
  },
  {
    scene: 'farewell',
    text: (n) =>
      `${n}! A sua jornada, e tudo o que vem além dela, está para começar. Venha ao meu laboratório: alguns Pokémon estão esperando um parceiro!`,
  },
];

/** Índice da primeira pergunta sobre o jogador (onde "Pular" e "Trocar" levam). */
export const PROLOGUE_IDENTITY = LINES.findIndex((l) => l.input === 'avatar');

const defaultName = (avatar: PlayerAvatar) => (avatar === 'red' ? 'Red' : 'Leaf');

export function Prologue({
  start = 0,
  name,
  avatar,
  onName,
  onAvatar,
  onDone,
}: {
  start?: number;
  name: string;
  avatar: PlayerAvatar;
  onName: (name: string) => void;
  onAvatar: (avatar: PlayerAvatar) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(start);
  const [leaving, setLeaving] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const line = LINES[step];
  const displayName = name.trim() || defaultName(avatar);
  const { shown, done, finish } = useTypewriter(line.text(displayName.toUpperCase()), reduced);
  const nameRef = useRef<HTMLInputElement>(null);

  const leave = () => {
    if (leaving) return;
    if (reduced) return onDone();
    setLeaving(true);
    setTimeout(onDone, 1400);
  };

  const next = () => {
    if (!done) return finish();
    if (line.input) return; // perguntas avançam pelos próprios botões
    audio.sfx('click');
    if (step + 1 < LINES.length) setStep(step + 1);
    else leave();
  };

  const skip = () => {
    if (step < PROLOGUE_IDENTITY) setStep(PROLOGUE_IDENTITY);
    else leave();
  };

  // Grito do Eevee quando ele sai da Poké Ball.
  useEffect(() => {
    if (line.scene === 'pokemon' && LINES[step - 1]?.scene !== 'pokemon') audio.cry(PARTNER);
  }, [step, line.scene]);

  useEffect(() => {
    if (line.input === 'name' && done) nameRef.current?.focus();
  }, [line.input, done]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'z') {
        e.preventDefault();
        next();
      } else if (line.input === 'avatar' && done && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        onAvatar(avatar === 'red' ? 'leaf' : 'red');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const answer = (input: Input) => (
    <div className="prologue-answer" onClick={(e) => e.stopPropagation()}>
      {input === 'avatar' && (
        <button className="pbtn primary" onClick={() => setStep(step + 1)}>
          Sou assim!
        </button>
      )}
      {input === 'name' && (
        <form
          className="prologue-name"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(step + 1);
          }}
        >
          <input
            ref={nameRef}
            className="name-field"
            value={name}
            maxLength={12}
            placeholder={defaultName(avatar).toUpperCase()}
            onChange={(e) => onName(e.target.value)}
            aria-label="Nome do treinador"
          />
          <button type="submit" className="pbtn primary">
            OK
          </button>
        </form>
      )}
      {input === 'confirm' && (
        <>
          <button className="pbtn primary" onClick={() => setStep(step + 1)}>
            Sim
          </button>
          <button className="pbtn" onClick={() => setStep(step - 1)}>
            Não
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className={`prologue ${leaving ? 'leaving' : ''}`}>
      <MusicToggle />
      <div className="prologue-stage" data-scene={line.scene} onClick={next}>
        <span className="prologue-platform" aria-hidden />
        <Stage
          scene={line.scene}
          step={step}
          avatar={avatar}
          choosing={line.input === 'avatar' && done}
          onAvatar={onAvatar}
        />
        <button
          className="pbtn small prologue-skip"
          onClick={(e) => {
            e.stopPropagation();
            skip();
          }}
        >
          {step < PROLOGUE_IDENTITY ? 'Pular história' : 'Pular'}
        </button>
      </div>

      <div className="prologue-dialog frame frame-dialog" onClick={next} aria-live="polite">
        <div className="dialog-speech">
          <span className="speaker">PROF. CARVALHO</span>
          <p>
            {shown}
            {done && !line.input && <PixelIcon name="arrowDown" scale={2} className="prologue-more" />}
          </p>
        </div>
        {done && line.input && answer(line.input)}
      </div>
    </div>
  );
}

function Stage({
  scene,
  step,
  avatar,
  choosing,
  onAvatar,
}: {
  scene: Scene;
  step: number;
  avatar: PlayerAvatar;
  choosing: boolean;
  onAvatar: (avatar: PlayerAvatar) => void;
}) {
  if (scene === 'oak' || scene === 'pokemon') {
    const partner = getSpecies(PARTNER);
    return (
      <>
        <img
          className={`prologue-actor oak ${scene === 'pokemon' ? 'aside' : ''}`}
          src={assetUrl(trainerSprite('oak'))}
          alt="Prof. Carvalho"
          draggable={false}
        />
        {scene === 'pokemon' && (
          <img
            className="prologue-actor partner"
            src={assetUrl(partner.sprites.front)}
            alt={partner.name}
            draggable={false}
          />
        )}
      </>
    );
  }

  if (scene === 'world') {
    return (
      <ul className="prologue-regions" key={step}>
        {STARTER_GENERATIONS.map((g, i) => (
          <li key={g.generation} style={{ animationDelay: `${i * 0.12}s` }}>
            <span className="prologue-region-sprite">
              <PokemonSprite speciesId={g.ids[(step + i) % g.ids.length]} kind="front" pixelScale={3} />
            </span>
            <span>{g.region}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (scene === 'player' && choosing) {
    return (
      <div
        className="prologue-avatars"
        role="radiogroup"
        aria-label="Avatar"
        onClick={(e) => e.stopPropagation()}
      >
        {PLAYER_AVATARS.map((a) => (
          <button
            key={a}
            role="radio"
            aria-checked={avatar === a}
            className={`prologue-avatar ${avatar === a ? 'active' : ''}`}
            onClick={() => onAvatar(a)}
          >
            <img src={assetUrl(trainerSprite(a))} alt="" draggable={false} />
            <span>{a === 'red' ? 'Menino' : 'Menina'}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <img
        key={scene === 'farewell' ? 'farewell' : 'player'}
        className={`prologue-actor player ${scene === 'rival' ? 'aside' : ''} ${scene === 'farewell' ? 'hero' : ''}`}
        src={assetUrl(trainerSprite(avatar))}
        alt=""
        draggable={false}
      />
      {scene === 'rival' && (
        <img
          className="prologue-actor rival"
          src={assetUrl(trainerSprite(RIVAL_SPRITE))}
          alt="Rival"
          draggable={false}
        />
      )}
    </>
  );
}
