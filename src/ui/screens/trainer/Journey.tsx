// Diário da Jornada: os capítulos da história "Além da Jornada" (os vistos podem ser revistos), o próximo objetivo
// e, depois do final, a escolha feita.

import { useState } from 'react';
import type { GameState } from '../../../core/game';
import { CHAPTERS, chapterSeen, finaleChoice, nextChapter } from '../../../core/story';
import { Window } from '../../components/common';
import { StoryScene, partnerOf } from '../../components/StoryScene';
import { PixelIcon, PokemonSprite } from '../../components/common';
import { CHAPTER_TITLES, FINALE_CHOICES } from '../../i18n/story';

export function Journey({ state }: { state: GameState }) {
  const [replay, setReplay] = useState<string | null>(null);
  const next = nextChapter(state);
  const choice = finaleChoice(state);
  const partner = partnerOf(state);
  return (
    <Window title="DIÁRIO DA JORNADA · ALÉM DA JORNADA">
      {replay && <StoryScene state={state} chapterId={replay} onClose={() => setReplay(null)} />}
      <div className="journey-head">
        {partner && <PokemonSprite speciesId={partner.speciesId} kind="front" shiny={partner.shiny} />}
        <p>
          O clima do mundo enlouqueceu, a Equipe Eclipse quer domar os lendários, e um Viajante de capuz parece
          conhecer você bem demais. {partner ? 'Seu parceiro escreve tudo neste diário.' : ''}
        </p>
      </div>
      {next && (
        <p className="journey-next">
          <strong>PRÓXIMO CAPÍTULO:</strong> {next.goal}.
        </p>
      )}
      {choice && (
        <p className="journey-next">
          <strong>SUA ESCOLHA:</strong> {FINALE_CHOICES[choice].label} · título {FINALE_CHOICES[choice].title}.
        </p>
      )}
      <ol className="journey-list">
        {CHAPTERS.filter((c) => !c.side).map((c) => {
          const seen = chapterSeen(state, c.id);
          return (
            <li key={c.id} className={seen ? 'seen' : 'locked'}>
              <span className="journey-no">{c.no}</span>
              <span className="journey-title">{seen ? CHAPTER_TITLES[c.id] : '???'}</span>
              {seen ? (
                <button className="pbtn small" onClick={() => setReplay(c.id)}>
                  Rever
                </button>
              ) : (
                <small>{c.goal}</small>
              )}
            </li>
          );
        })}
      </ol>
      <h3 className="journey-pages-title">PÁGINAS DO DIÁRIO</h3>
      <ol className="journey-list journey-pages">
        {CHAPTERS.filter((c) => c.side).map((c) => {
          const seen = chapterSeen(state, c.id);
          return (
            <li key={c.id} className={seen ? 'seen' : 'locked'}>
              <span className="journey-no">
                <PixelIcon name="star" scale={1} />
              </span>
              <span className="journey-title">{seen ? CHAPTER_TITLES[c.id] : '???'}</span>
              {seen ? (
                <button className="pbtn small" onClick={() => setReplay(c.id)}>
                  Rever
                </button>
              ) : (
                <small>{c.goal}</small>
              )}
            </li>
          );
        })}
      </ol>
    </Window>
  );
}
