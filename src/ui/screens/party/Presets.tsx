// EQUIPES SALVAS: guardar a equipe e os itens com um nome, trocar de equipe com
// um clique e ligar uma equipe a um desafio (ela entra sozinha e a de antes volta no fim).

import { useState } from 'react';
import { BALANCE } from '../../../game-data';
import { findPokemon } from '../../../core/collection';
import type { GameState } from '../../../core/game';
import {
  PRESET_NAME_MAX,
  PRESET_USES,
  applyPreset,
  deletePreset,
  renamePreset,
  savePreset,
  setPresetUse,
  unavailableMembers,
  updatePreset,
  type PresetUse,
  type TeamPreset,
} from '../../../core/presets';
import { ItemIcon, PokemonSprite, Window } from '../../components/common';
import { itemName, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { askConfirm } from '../../components/GameConfirm';

export const PRESET_USE_NAMES: Record<PresetUse, string> = {
  boss: 'Ginásios e treinadores',
  raid: 'Raides',
  tower: 'Torre de Batalha',
  tournament: 'Torneio',
  legendary: 'Lendários',
  ghost: 'Duelo fantasma',
};

function PresetRow({ state, preset }: { state: GameState; preset: TeamPreset }) {
  const engine = useEngine();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const members = [preset.active, ...preset.reserves];
  const missing = unavailableMembers(state, preset);
  const inUse =
    preset.active === state.activeUid &&
    preset.reserves.length === state.battleTeam.length &&
    preset.reserves.every((uid, i) => state.battleTeam[i] === uid);
  const wild = state.battle.kind === 'wild';

  return (
    <li className={`preset-row frame frame-slot ${inUse ? 'in-use' : ''}`}>
      <div className="preset-head">
        {renaming ? (
          <form
            className="preset-rename"
            onSubmit={(e) => {
              e.preventDefault();
              engine.dispatch((s) => renamePreset(s, preset.id, name));
              setRenaming(false);
            }}
          >
            <input
              value={name}
              maxLength={PRESET_NAME_MAX}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              aria-label="Nome da equipe"
            />
            <button className="pbtn small">OK</button>
          </form>
        ) : (
          <button className="preset-name" title="Renomear" onClick={() => setRenaming(true)}>
            {preset.name.toUpperCase()}
          </button>
        )}
        {inUse && <span className="preset-tag">EM CAMPO</span>}
      </div>
      <ul className="preset-members">
        {members.map((uid, i) => {
          const p = findPokemon(state, uid);
          const held = preset.held[uid];
          return (
            <li
              key={uid}
              title={
                p
                  ? `${speciesName(p.speciesId)} Nv. ${p.level}${held ? ` · ${itemName(held)}` : ''}`
                  : 'Não está mais na coleção'
              }
            >
              {p ? (
                <PokemonSprite speciesId={p.speciesId} kind="icon" />
              ) : (
                <span className="preset-gone">?</span>
              )}
              {i === 0 && <small>ATIVO</small>}
              {held && <ItemIcon id={held} size={14} className="preset-held" />}
            </li>
          );
        })}
      </ul>
      {missing > 0 && (
        <p className="hint alert">
          {missing === 1
            ? 'Um membro está ocupado ou saiu da coleção e fica de fora.'
            : `${missing} membros estão ocupados ou saíram da coleção e ficam de fora.`}
        </p>
      )}
      <div className="preset-actions">
        <button
          className="pbtn small primary"
          disabled={inUse || !wild}
          title={wild ? undefined : 'Termine o desafio atual primeiro'}
          onClick={() => engine.dispatch((s) => applyPreset(s, preset.id))}
        >
          Usar
        </button>
        <button
          className="pbtn small"
          title="Regrava com a equipe e os itens de agora"
          onClick={() => engine.dispatch((s) => updatePreset(s, preset.id))}
        >
          Regravar
        </button>
        <label className="preset-use">
          <span>Entrar sozinha em</span>
          <select
            value={preset.use ?? ''}
            onChange={(e) =>
              engine.dispatch((s) => setPresetUse(s, preset.id, (e.target.value || null) as PresetUse | null))
            }
          >
            <option value="">Nenhum desafio</option>
            {PRESET_USES.map((u) => (
              <option key={u} value={u}>
                {PRESET_USE_NAMES[u]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="pbtn small danger"
          onClick={async () => {
            if (await askConfirm(`Apagar a equipe “${preset.name}”? Os Pokémon continuam na coleção.`))
              engine.dispatch((s) => deletePreset(s, preset.id));
          }}
        >
          Apagar
        </button>
      </div>
    </li>
  );
}

export function Presets({ state }: { state: GameState }) {
  const engine = useEngine();
  const [name, setName] = useState('');
  const list = state.presets ?? [];
  const full = list.length >= BALANCE.presets.max;
  return (
    <Window
      title={`EQUIPES SALVAS · ${list.length}/${BALANCE.presets.max}`}
      icon={<ItemIcon id="pokemon-box" size={24} />}
      className="presets"
    >
      <p className="hint">
        Guarde a equipe e os itens deles. Ligada a um desafio, a equipe entra sozinha quando ele começa e a
        equipe de antes volta quando ele acaba.
      </p>
      {list.length > 0 && (
        <ul className="preset-list">
          {list.map((p) => (
            <PresetRow key={p.id} state={state} preset={p} />
          ))}
        </ul>
      )}
      <form
        className="preset-new"
        onSubmit={(e) => {
          e.preventDefault();
          engine.dispatch((s) => savePreset(s, name));
          setName('');
        }}
      >
        <input
          value={name}
          maxLength={PRESET_NAME_MAX}
          placeholder={`Equipe ${list.length + 1}`}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nome da nova equipe"
          disabled={full}
        />
        <button className="pbtn small" disabled={full}>
          Salvar equipe atual
        </button>
      </form>
      {state.presetReturn && (
        <p className="hint alert">A equipe de antes volta a campo quando o desafio atual terminar.</p>
      )}
    </Window>
  );
}
