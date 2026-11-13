// MELHORIAS: laboratório (pesquisa com duplicatas) e nova jornada (prestígio).

import { useEffect, useRef, useState } from 'react';
import { CHALLENGES, PRESTIGE_UPGRADES, RESEARCH, type ChallengeId } from '../../game-data';
import { prestigeLevel, researchLevel } from '../../core/bonuses';
import type { GameState } from '../../core/game';
import {
  abandonChallenge,
  buyPrestige,
  challengeBonus,
  buyResearch,
  canPrestige,
  prestigePreview,
  prestigeReset,
  surplusDuplicates,
  transferDuplicates,
  transferValue,
  upgradeCost,
} from '../../core/meta';
import { ItemIcon, PokemonSprite, TrainerSprite, Window } from '../components/common';
import { PixelFx } from '../components/PixelFx';
import { T, formatPercent } from '../i18n/pt-BR';
import { useEngine } from '../useGame';
import { askConfirm } from '../components/GameConfirm';

const RESEARCH_ICONS: Record<string, string> = {
  exp: 'exp-share',
  coins: 'amulet-coin',
  capture: 'great-ball',
  heal: 'potion',
  'offline-hours': 'town-map',
  'offline-eff': 'macho-brace',
};

const PRESTIGE_ICONS: Record<string, string> = {
  power: 'muscle-band',
  fortune: 'lucky-egg',
  veteran: 'rare-candy',
  supplies: 'explorer-kit',
  shiny: 'shiny-charm',
};

function UpgradeRow({
  icon,
  name,
  description,
  level,
  maxLevel,
  cost,
  affordable,
  currencyIcon,
  onBuy,
}: {
  icon: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number;
  affordable: boolean;
  currencyIcon: string;
  onBuy: () => void;
}) {
  // Subiu de nível: a linha brilha e o pip novo entra pulando.
  const prev = useRef(level);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (level > prev.current) setFlash((n) => n + 1);
    prev.current = level;
  }, [level]);
  return (
    <li className="upgrade-row">
      {flash > 0 && <span key={flash} className="upgrade-flash" aria-hidden />}
      <ItemIcon id={icon} size={30} />
      <div className="upgrade-info">
        <span className="item-name">
          {name.toUpperCase()}{' '}
          <small>
            Nv{level}/{maxLevel}
          </small>
        </span>
        <small>{description}</small>
        <span className="pips" aria-hidden>
          {Array.from({ length: maxLevel }, (_, i) => (
            <span key={i} className={`${i < level ? 'on' : ''} ${flash && i === level - 1 ? 'new' : ''}`} />
          ))}
        </span>
      </div>
      {level >= maxLevel ? (
        <span className="tag tag-active">MÁX.</span>
      ) : (
        <button className="pbtn small" disabled={!affordable} onClick={onBuy}>
          <ItemIcon id={currencyIcon} size={20} />
          {cost}
        </button>
      )}
    </li>
  );
}

/** Máquina do laboratório: o cientista, o tubo borbulhante e o contador de pontos. */
function LabMachine({ points, absorbing }: { points: number; absorbing: { n: number; icons: number[] } | null }) {
  return (
    <div className="lab-machine" aria-hidden>
      <span className="lab-scientist">
        <TrainerSprite id="class-scientist" size={72} />
      </span>
      <span className={`lab-tube ${absorbing ? 'zap' : ''}`} key={`tube-${absorbing?.n ?? 0}`}>
        <i className="lab-liquid" />
        <i className="lab-bubble" />
        <i className="lab-bubble" />
        <i className="lab-bubble" />
      </span>
      {absorbing && (
        <span key={`in-${absorbing.n}`} className="lab-incoming">
          {absorbing.icons.map((id, i) => (
            <span key={i} style={{ ['--i' as string]: i }}>
              <PokemonSprite speciesId={id} kind="icon" />
            </span>
          ))}
          <PixelFx fx="levelup" scale={1} x="62%" y="55%" />
        </span>
      )}
      <span className="lab-panel">
        <small>PONTOS</small>
        <b key={points}>{points}</b>
      </span>
    </div>
  );
}

export function UpgradesScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const surplus = surplusDuplicates(state);
  const surplusPoints = surplus.reduce((sum, p) => sum + transferValue(p), 0);
  const preview = prestigePreview(state);
  const [nextChallenge, setNextChallenge] = useState<ChallengeId | null>(null);
  const current = CHALLENGES.find((c) => c.id === state.challenge);
  // Os Pokémon transferidos entram voando na máquina.
  const [absorbing, setAbsorbing] = useState<{ n: number; icons: number[] } | null>(null);

  return (
    <div className="upgrades-screen">
      <Window
        title={`LABORATÓRIO · ${state.research.points} PONTOS`}
        icon={<ItemIcon id="up-grade" size={24} />}
      >
        <LabMachine points={state.research.points} absorbing={absorbing} />
        <p className="hint">{T.lab.hint}</p>
        {surplus.length > 0 ? (
          <div className="transfer-box frame frame-dialog">
            <span className="transfer-icons">
              {surplus.slice(0, 8).map((p, i) => (
                <span key={p.uid} style={{ ['--i' as string]: i }}>
                  <PokemonSprite speciesId={p.speciesId} kind="icon" />
                </span>
              ))}
              {surplus.length > 8 && <small>+{surplus.length - 8}</small>}
            </span>
            <button
              className="pbtn small"
              onClick={() => {
                setAbsorbing({ n: (absorbing?.n ?? 0) + 1, icons: surplus.slice(0, 6).map((p) => p.speciesId) });
                engine.dispatch((s) => void transferDuplicates(s));
              }}
            >
              {T.lab.transferAll(surplus.length, surplusPoints)}
            </button>
          </div>
        ) : (
          <p className="hint">{T.lab.noDuplicates}</p>
        )}
        <ul className="upgrade-list">
          {RESEARCH.map((r) => {
            const level = researchLevel(state, r.id);
            const cost = upgradeCost(r, level);
            return (
              <UpgradeRow
                key={r.id}
                icon={RESEARCH_ICONS[r.id] ?? 'up-grade'}
                name={r.name}
                description={r.description}
                level={level}
                maxLevel={r.maxLevel}
                cost={cost}
                affordable={state.research.points >= cost}
                currencyIcon="up-grade"
                onBuy={() => engine.dispatch((s) => buyResearch(s, r.id))}
              />
            );
          })}
        </ul>
      </Window>

      <Window
        title={`NOVA JORNADA · ${state.prestige.points} PONTOS`}
        icon={<ItemIcon id="star-piece" size={24} />}
      >
        <p className="hint">{T.prestige.count(state.prestige.count)}</p>
        {current && (
          <div className="challenge-current frame frame-dialog">
            <p>
              <strong>Desafio em andamento: {current.name}.</strong> {current.description} Ao concluir a
              jornada: +{formatPercent(challengeBonus(state))} de pontos.
            </p>
            {state.challenge === 'nuzlocke' && state.nuzlocke && (
              <p className="hint alert">
                Áreas com captura usada: {state.nuzlocke.routes.length} · fora da jornada:{' '}
                {state.nuzlocke.fallen.length}
                {state.nuzlocke.fallen.length > 0 && (
                  <span className="transfer-icons">
                    {state.nuzlocke.fallen.slice(0, 12).map((uid) => {
                      const p = state.collection.find((x) => x.uid === uid);
                      return p ? <PokemonSprite key={uid} speciesId={p.speciesId} kind="icon" /> : null;
                    })}
                  </span>
                )}
              </p>
            )}
            <button
              className="pbtn small danger"
              onClick={async () => {
                if (await askConfirm('Desistir do desafio? As regras normais voltam e o bônus se perde.'))
                  engine.dispatch(abandonChallenge);
              }}
            >
              Desistir do desafio
            </button>
          </div>
        )}
        {canPrestige(state) ? (
          <div className="prestige-box frame frame-dialog">
            <p>{T.prestige.explain}</p>
            <fieldset className="challenge-pick">
              <legend>Desafio da próxima jornada (opcional)</legend>
              <label>
                <input
                  type="radio"
                  name="challenge"
                  checked={nextChallenge === null}
                  onChange={() => setNextChallenge(null)}
                />
                <span>Nenhum — regras normais</span>
              </label>
              {CHALLENGES.map((c) => (
                <label key={c.id}>
                  <input
                    type="radio"
                    name="challenge"
                    checked={nextChallenge === c.id}
                    onChange={() => setNextChallenge(c.id)}
                  />
                  <span>
                    <strong>{c.name}</strong> (+{formatPercent(c.bonus)} pontos)
                    {state.challengesWon.includes(c.id) && <span className="tag tag-active">CONCLUÍDO</span>}
                    <small>{c.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <button
              className="pbtn primary"
              onClick={async () => {
                if (await askConfirm(T.prestige.confirm(preview)))
                  engine.dispatch((s) => void prestigeReset(s, nextChallenge));
              }}
            >
              {T.prestige.gain(preview)}
            </button>
          </div>
        ) : (
          <p className="hint">{T.prestige.locked}</p>
        )}
        <ul className="upgrade-list">
          {PRESTIGE_UPGRADES.map((u) => {
            const level = prestigeLevel(state, u.id);
            const cost = upgradeCost(u, level);
            return (
              <UpgradeRow
                key={u.id}
                icon={PRESTIGE_ICONS[u.id] ?? 'star-piece'}
                name={u.name}
                description={u.description}
                level={level}
                maxLevel={u.maxLevel}
                cost={cost}
                affordable={state.prestige.points >= cost}
                currencyIcon="star-piece"
                onBuy={() => engine.dispatch((s) => buyPrestige(s, u.id))}
              />
            );
          })}
        </ul>
      </Window>
    </div>
  );
}
