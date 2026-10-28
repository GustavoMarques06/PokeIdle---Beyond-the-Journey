// Laboratório: a escolha do inicial como um ritual, em falas do professor.
//   escolher a bola → ela se abre e o Pokémon salta no tapete → "Quer ficar com ele?"
//   SIM → "<nome> recebeu <Pokémon>!" → apelido (opcional) → o rival da região chega e
//   leva o que tem vantagem → começa o jogo.
//   NÃO → a bola fecha e dá para escolher outra (ou trocar de região nas setas da placa).
// Nome e avatar já vêm do prólogo. Teclado como nos portáteis: setas, Enter/Z e Esc/X.

import { useEffect, useState } from 'react';
import { STARTER_GENERATIONS, getSpecies } from '../../game-data';
import type { PlayerAvatar } from '../../game-data';
import { NICKNAME_MAX, setNickname } from '../../core/pokemon';
import { audio } from '../audio';
import { PixelIcon } from '../components/common';
import { T, TYPE_NAMES } from '../i18n/pt-BR';
import { useEngine } from '../useGame';
import { LabScene } from './LabScene';
import { MusicToggle } from './MusicToggle';
import { StarterStatus } from './StarterStatus';
import { prefersReducedMotion, useTypewriter } from './useTypewriter';

type Phase = 'browse' | 'ask' | 'received' | 'nickAsk' | 'naming' | 'rival';
/** Fases que o jogador só avança (clique, Enter): sem pergunta nem campo. */
const ADVANCE_PHASES: Phase[] = ['received', 'rival'];
/** Fases com SIM / NÃO. */
const QUESTION_PHASES: Phase[] = ['ask', 'nickAsk'];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
/** Rival de cada região (na ordem de STARTER_GENERATIONS), como nos chefes do jogo. */
const RIVALS = [
  { name: 'Blue', sprite: 'kanto-blue' },
  { name: 'Silver', sprite: 'johto-silver' },
  { name: 'May', sprite: 'hoenn-may' },
  { name: 'Barry', sprite: 'sinnoh-barry' },
  { name: 'Cheren', sprite: 'unova-cheren' },
  { name: 'Calem', sprite: 'kalos-calem' },
];

export function StarterSelect({
  name,
  avatar,
  onEditTrainer,
  onStart,
}: {
  name: string;
  avatar: PlayerAvatar;
  onEditTrainer: () => void;
  onStart: () => void;
}) {
  const engine = useEngine();
  const [regionIndex, setRegionIndex] = useState(0);
  const [focus, setFocus] = useState(0);
  const [phase, setPhase] = useState<Phase>('browse');
  const [nickname, setNicknameText] = useState('');
  const [reduced] = useState(prefersReducedMotion);

  const group = STARTER_GENERATIONS[regionIndex];
  const chosen = group.ids[focus];
  const species = getSpecies(chosen);
  const rival = getSpecies(group.ids[(focus + 1) % group.ids.length]);
  const rivalTrainer = RIVALS[regionIndex] ?? RIVALS[0];
  const trainerName = (name.trim() || (avatar === 'red' ? 'Red' : 'Leaf')).toUpperCase();
  const partner = (nickname.trim() || species.name).toUpperCase();
  const type = (TYPE_NAMES[species.types[0]] ?? species.types[0]).toLowerCase();

  const texts: Record<Phase, string> = {
    browse: T.starterLab.browse(trainerName, group.region),
    ask: `${T.starterFlavor[chosen] ?? ''} ${T.starterLab.ask(species.name.toUpperCase(), type)}`.trim(),
    received: T.starterLab.received(trainerName, species.name.toUpperCase()),
    nickAsk: T.starterLab.nickAsk(species.name.toUpperCase()),
    naming: T.starterLab.nickPrompt(species.name.toUpperCase()),
    rival: T.starterLab.rival(partner, rival.name.toUpperCase(), rivalTrainer.name.toUpperCase()),
  };
  const { shown, done, finish } = useTypewriter(texts[phase], reduced);

  const changeRegion = (delta: number) => {
    if (phase !== 'browse') return;
    const n = STARTER_GENERATIONS.length;
    setRegionIndex((r) => (r + delta + n) % n);
    setFocus(0);
    audio.sfx('click');
  };

  const open = (index: number) => {
    if (phase !== 'browse') return;
    setFocus(index);
    setPhase('ask');
    audio.sfx('throw');
    audio.cry(group.ids[index]);
  };

  const toRival = () => {
    setPhase('rival');
    audio.cry(rival.id);
  };

  const answer = (yes: boolean) => {
    if (phase === 'ask') {
      setPhase(yes ? 'received' : 'browse');
      audio.sfx(yes ? 'levelUp' : 'click');
    } else if (phase === 'nickAsk') {
      if (yes) setPhase('naming');
      else toRival();
    }
  };

  const begin = () => {
    engine.newGame(chosen, name.trim() || (avatar === 'red' ? 'Red' : 'Leaf'), avatar);
    if (nickname.trim()) {
      engine.dispatch((s) => {
        const starter = s.collection.find((p) => p.uid === s.activeUid);
        if (starter) setNickname(starter, nickname);
      });
    }
    onStart();
  };

  /** Avança as falas sem pergunta; a do rival é a última e começa o jogo. */
  const advance = () => {
    if (!done) return finish();
    if (phase === 'received') setPhase('nickAsk');
    else if (phase === 'rival') begin();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || e.repeat) return;
      const key = e.key.toLowerCase();
      const confirm = key === 'enter' || key === ' ' || key === 'z';
      const cancel = key === 'escape' || key === 'x' || key === 'backspace';
      // Botão com foco (SIM, NÃO, uma bola): Enter/Espaço ficam com o próprio botão.
      if ((e.target as HTMLElement).tagName === 'BUTTON' && (key === 'enter' || key === ' ')) return;
      if (phase === 'browse') {
        if (key === 'arrowright') setFocus((f) => (f + 1) % 3);
        else if (key === 'arrowleft') setFocus((f) => (f + 2) % 3);
        else if (key === 'arrowdown') changeRegion(1);
        else if (key === 'arrowup') changeRegion(-1);
        else if (confirm) {
          if (!done) finish();
          else open(focus);
        } else return;
      } else if (QUESTION_PHASES.includes(phase)) {
        if (!done && confirm) finish();
        else if (confirm) answer(true);
        else if (cancel) answer(false);
        else return;
      } else if (ADVANCE_PHASES.includes(phase) && confirm) advance();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const advancing = ADVANCE_PHASES.includes(phase);

  return (
    <div className={`intro lab-screen phase-${phase}`}>
      <MusicToggle />
      <div className="lab-stage">
        <LabScene
          ids={group.ids}
          region={group.region}
          numeral={ROMAN[regionIndex]}
          focus={focus}
          opened={phase === 'browse' ? null : chosen}
          taken={phase === 'rival' ? rival.id : null}
          rivalSprite={phase === 'rival' ? rivalTrainer.sprite : null}
          onFocus={setFocus}
          onPick={open}
          onPrevRegion={() => changeRegion(-1)}
          onNextRegion={() => changeRegion(1)}
        />
        {phase === 'ask' && done && (
          <div className="lab-card">
            <StarterStatus speciesId={chosen} />
          </div>
        )}
      </div>

      <div
        className="lab-dialog frame frame-dialog"
        onClick={advancing ? advance : !done ? finish : undefined}
        aria-live="polite"
      >
        <div className="dialog-speech">
          <span className="speaker">PROF. CARVALHO</span>
          <p>
            {shown}
            {done && advancing && <PixelIcon name="arrowDown" scale={2} className="prologue-more" />}
          </p>
          {phase === 'browse' && done && (
            <span className="lab-hint">
              <span className="hint-keys">{T.starterLab.hintKeys}</span>
              <span className="hint-touch">{T.starterLab.hintTouch}</span>
            </span>
          )}
        </div>

        {QUESTION_PHASES.includes(phase) && done && (
          <div className="lab-choice frame frame-menu" role="group" aria-label="Resposta">
            <button className="lab-option" onClick={() => answer(true)} autoFocus>
              SIM
            </button>
            <button className="lab-option" onClick={() => answer(false)}>
              NÃO
            </button>
          </div>
        )}
        {phase === 'naming' && done && (
          <form
            className="prologue-name"
            onSubmit={(e) => {
              e.preventDefault();
              toRival();
            }}
          >
            <input
              className="name-field"
              value={nickname}
              maxLength={NICKNAME_MAX}
              placeholder={species.name.toUpperCase()}
              onChange={(e) => setNicknameText(e.target.value)}
              aria-label="Apelido do inicial"
              autoFocus
            />
            <button type="submit" className="pbtn primary">
              OK
            </button>
          </form>
        )}
        {phase === 'browse' && (
          <button type="button" className="link-btn lab-trainer" onClick={onEditTrainer}>
            {trainerName} · trocar
          </button>
        )}
      </div>
    </div>
  );
}
