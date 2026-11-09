// Cenas da história "Além da Jornada": fala a fala, em máquina de escrever, com o retrato de quem fala (o parceiro,
// o Professor, o Viajante em silhueta azulada, Vesper da Equipe Eclipse). O capítulo novo abre sozinho; os vistos
// podem ser revistos no Diário da Jornada. No final, a escolha entre quebrar o laço e seguir viajando.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl, trainerSprite } from '../../game-data';
import type { GameState } from '../../core/game';
import { pokemonName } from '../../core/pokemon';
import {
  CHAPTERS,
  chooseFinale,
  finaleChoice,
  markChapterSeen,
  migrateStory,
  pendingChapter,
  type FinaleChoice,
} from '../../core/story';
import { audio } from '../audio';
import { useTypewriter } from '../intro/useTypewriter';
import { legendOf } from '../intro/legends';
import { CHAPTER_TITLES, FINALE_CHOICES, SPEAKER_NAME, STORY, type Speaker, type StoryCtx } from '../i18n/story';
import { useEngine } from '../useGame';
import { PokemonSprite } from './common';

/** O parceiro: o inicial (ou o primeiro da coleção, se ele não estiver mais com você). */
export function partnerOf(state: GameState) {
  return state.collection.find((p) => p.speciesId === state.starterId) ?? state.collection[0];
}

export function storyCtx(state: GameState): StoryCtx {
  const partner = partnerOf(state);
  return {
    n: state.trainerName.toUpperCase(),
    p: partner ? pokemonName(partner).toUpperCase() : 'PARCEIRO',
    loops: state.prestige.count,
  };
}

function Portrait({ who, state }: { who: Speaker; state: GameState }) {
  const partner = partnerOf(state);
  if (who === 'narrator') return null;
  if (who === 'diary' || who === 'partner')
    return partner ? (
      <PokemonSprite speciesId={partner.speciesId} kind="front" shiny={partner.shiny} form={partner.form} />
    ) : null;
  const sprite = who === 'oak' ? 'oak' : who === 'ghost' ? state.trainerAvatar : 'rocketf';
  return (
    <img
      className={`story-trainer ${who === 'ghost' ? 'story-ghost' : who === 'vesper' ? 'story-eclipse' : ''}`}
      src={assetUrl(trainerSprite(sprite))}
      alt=""
      draggable={false}
    />
  );
}

export function StoryScene({
  state,
  chapterId,
  onClose,
}: {
  state: GameState;
  chapterId: string;
  onClose: () => void;
}) {
  const engine = useEngine();
  const lines = STORY[chapterId] ?? [];
  const ctx = storyCtx(state);
  const [i, setI] = useState(0);
  const [after, setAfter] = useState<string | null>(null);
  const line = lines[i];
  const text = after ?? (line ? line.text(ctx) : '');
  const { shown, done, finish } = useTypewriter(text, state.settings.reducedMotion);
  const chapter = CHAPTERS.find((c) => c.id === chapterId);
  const last = i >= lines.length - 1;
  const choosing = chapterId === 'finale' && last && done && !after;
  const legend = chapter?.regionId ? legendOf(chapter.regionId) : undefined;

  useEffect(() => {
    audio.sfx('cursor');
  }, [i]);

  const next = () => {
    if (!done) return finish();
    if (after || (last && chapterId !== 'finale')) return onClose();
    if (!last) setI((v) => v + 1);
  };
  const choose = (c: FinaleChoice) => {
    engine.dispatch((s) => chooseFinale(s, c));
    audio.sfx('fanfare');
    setAfter(FINALE_CHOICES[c].after(ctx));
  };

  const who: Speaker = after ? 'ghost' : (line?.who ?? 'narrator');
  return createPortal(
    <div className="modal-backdrop story-backdrop" role="dialog" aria-modal="true" aria-label="História">
      <div
        className={`story-scene frame frame-dialog speaker-${who}`}
        style={legend ? { ['--glow' as string]: legend.color } : undefined}
        onClick={() => !choosing && next()}
      >
        <header className="story-head">
          <small>CAPÍTULO {chapter?.no ?? ''}</small>
          <strong>{CHAPTER_TITLES[chapterId] ?? ''}</strong>
        </header>
        <div className="story-body">
          <div className="story-portrait" key={`${who}-${i}`}>
            <Portrait who={who} state={state} />
          </div>
          <div className="story-speech">
            {SPEAKER_NAME[who](ctx) && <span className="speaker">{SPEAKER_NAME[who](ctx)}</span>}
            <p className={who === 'diary' ? 'diary' : who === 'narrator' ? 'narration' : ''}>{shown}</p>
          </div>
        </div>
        <footer className="story-foot">
          <span className="story-dots" aria-hidden>
            {lines.map((_, k) => (
              <i key={k} className={k <= i ? 'on' : ''} />
            ))}
          </span>
          {choosing ? (
            <span className="story-choices">
              {(Object.keys(FINALE_CHOICES) as FinaleChoice[]).map((c) => (
                <button key={c} className="pbtn primary" onClick={() => choose(c)}>
                  {FINALE_CHOICES[c].label}
                </button>
              ))}
            </span>
          ) : (
            done && (
              <button className="pbtn primary" onClick={next} autoFocus>
                {after || (last && chapterId !== 'finale') ? 'Fim do capítulo' : 'Continuar ▸'}
              </button>
            )
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Abre sozinho o capítulo novo (e migra saves de antes da história). */
export function StoryHost({ state }: { state: GameState }) {
  const engine = useEngine();
  const migrated = state.flags.includes('story-v1');
  useEffect(() => {
    if (!migrated) engine.dispatch((s) => migrateStory(s));
  }, [engine, migrated]);
  const chapter = pendingChapter(state);
  if (!chapter) return null;
  return (
    <StoryScene
      key={chapter.id}
      state={state}
      chapterId={chapter.id}
      onClose={() => engine.dispatch((s) => markChapterSeen(s, chapter.id))}
    />
  );
}

/** Título do final escolhido (para o cartão de treinador). */
export function finaleTitle(state: GameState): string | undefined {
  const c = finaleChoice(state);
  return c ? FINALE_CHOICES[c].title : undefined;
}
