// Ficha do Pokémon, parte "profundidade": habilidade, item segurado, amizade, IVs/EVs e itens de treino.

import { useState } from 'react';
import {
  BALANCE,
  BERRIES,
  HELD_ITEMS,
  VITAMINS,
  abilitiesOf,
  getAbility,
  getHeldItem,
  type StatKey,
} from '../../../game-data';
import {
  equipItem,
  feedBerry,
  unequipItem,
  giveAbilityCapsule,
  giveAbilityPatch,
  giveBottleCap,
  giveVitamin,
  type GameState,
} from '../../../core/game';
import {
  abilityOf,
  abilitySlotOf,
  evRoom,
  evsOf,
  evTotal,
  friendshipOf,
  type PokemonInstance,
} from '../../../core/pokemon';
import { Bar, ItemIcon } from '../../components/common';
import { STAT_NAMES, itemName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';

const STAT_KEYS = Object.keys(STAT_NAMES) as StatKey[];

export function Depth({ state, p }: { state: GameState; p: PokemonInstance }) {
  const [tab, setTab] = useState<'kit' | 'train'>('kit');
  return (
    <section className="depth">
      <div className="depth-tabs" role="tablist">
        <button className={tab === 'kit' ? 'active' : ''} role="tab" onClick={() => setTab('kit')}>
          HABILIDADE E ITEM
        </button>
        <button className={tab === 'train' ? 'active' : ''} role="tab" onClick={() => setTab('train')}>
          AMIZADE E TREINO
        </button>
      </div>
      {tab === 'kit' ? <Kit state={state} p={p} /> : <Train state={state} p={p} />}
    </section>
  );
}

function Kit({ state, p }: { state: GameState; p: PokemonInstance }) {
  const engine = useEngine();
  const ability = abilityOf(p);
  const slot = abilitySlotOf(p);
  const list = abilitiesOf(p.speciesId);
  const held = getHeldItem(p.held);
  const inBag = HELD_ITEMS.filter((h) => (state.items[h.id] ?? 0) > 0 && h.id !== p.held);

  return (
    <div className="depth-body">
      <div className="depth-row">
        <h4>HABILIDADE</h4>
        <p>
          <strong>{ability.name}</strong>
          {slot === 2 && <span className="tag tag-active">OCULTA</span>}
        </p>
        <small>{ability.description}</small>
        {list.length > 1 && (
          <small className="muted">
            Possíveis:{' '}
            {list
              .map((id, i) => (id ? `${getAbility(id).name}${i === 2 ? ' (oculta)' : ''}` : null))
              .filter(Boolean)
              .join(' · ')}
          </small>
        )}
        <div className="depth-actions">
          <button
            className="pbtn small"
            disabled={(state.items['ability-capsule'] ?? 0) <= 0 || (!list[1] && slot !== 2)}
            onClick={() => engine.dispatch((s) => giveAbilityCapsule(s, p.uid))}
            title="Troca entre as duas habilidades comuns"
          >
            <ItemIcon id="ability-capsule" size={18} /> Cápsula ×{state.items['ability-capsule'] ?? 0}
          </button>
          <button
            className="pbtn small"
            disabled={(state.items['ability-patch'] ?? 0) <= 0 || !list[2] || slot === 2}
            onClick={() => engine.dispatch((s) => giveAbilityPatch(s, p.uid))}
            title="Libera a habilidade oculta"
          >
            <ItemIcon id="ability-patch" size={18} /> Patch ×{state.items['ability-patch'] ?? 0}
          </button>
        </div>
      </div>

      <div className="depth-row">
        <h4>ITEM SEGURADO</h4>
        {held ? (
          <div className="held-now">
            <ItemIcon id={held.id} size={32} />
            <div>
              <strong>{held.name}</strong>
              <small>{held.description}</small>
            </div>
            <button className="pbtn small" onClick={() => engine.dispatch((s) => unequipItem(s, p.uid))}>
              Remover
            </button>
          </div>
        ) : (
          <small className="muted">Nenhum. Escolha um item da Mochila abaixo.</small>
        )}
        <details className="held-more" open={!held}>
          <summary>
            {held ? `Trocar item (${inBag.length} na Mochila)` : `Itens na Mochila (${inBag.length})`}
          </summary>
          <ul className="held-pick">
            {inBag.map((h) => (
              <li key={h.id}>
                <button
                  className="pbtn small"
                  title={`${h.name}: ${h.description}`}
                  onClick={() => engine.dispatch((s) => equipItem(s, p.uid, h.id))}
                >
                  <ItemIcon id={h.id} size={20} /> {h.name} ×{state.items[h.id]}
                </button>
              </li>
            ))}
            {!inBag.length && (
              <li className="muted">
                Nada na Mochila. Há itens na Loja de Depto., em raides e em Pokémon selvagens.
              </li>
            )}
          </ul>
        </details>
      </div>
    </div>
  );
}

function Train({ state, p }: { state: GameState; p: PokemonInstance }) {
  const engine = useEngine();
  const evs = evsOf(p);
  const friendship = friendshipOf(p);
  const t = BALANCE.training;
  const berries = BERRIES.filter((b) => (state.items[b.id] ?? 0) > 0);
  const bottleOk = p.level >= t.bottleCapMinLevel && (state.items['bottle-cap'] ?? 0) > 0;

  return (
    <div className="depth-body">
      <div className="depth-row">
        <h4>AMIZADE</h4>
        <Bar value={friendship} max={BALANCE.friendship.max} tone="grass" />
        <small>
          {friendship}/{BALANCE.friendship.max}. Sobe com vitórias, níveis e berries; quem evolui por afeto
          precisa de {BALANCE.friendship.evolve}.
        </small>
        <ul className="held-pick">
          {berries.map((b) => (
            <li key={b.id}>
              <button
                className="pbtn small"
                onClick={() => engine.dispatch((s) => feedBerry(s, p.uid, b.id))}
                title={`Alimentar: +${BALANCE.friendship.berry} de amizade`}
              >
                <ItemIcon id={b.id} size={20} /> {itemName(b.id)} ×{state.items[b.id]}
              </button>
            </li>
          ))}
          {!berries.length && <li className="muted">Sem berries na Mochila (plante no Jardim).</li>}
        </ul>
      </div>

      <div className="depth-row">
        <h4>
          IVs E EVs{' '}
          <small>
            EV total {evTotal(p)}/{t.maxTotal}
          </small>
        </h4>
        <table className="ev-table">
          <tbody>
            {STAT_KEYS.map((k) => (
              <tr key={k}>
                <th>{STAT_NAMES[k]}</th>
                <td>
                  <Bar value={p.ivs[k]} max={31} tone="gold" />
                  <small>IV {p.ivs[k]}</small>
                </td>
                <td>
                  <Bar value={evs[k]} max={t.maxPerStat} tone="exp" />
                  <small>EV {evs[k]}</small>
                </td>
                <td className="ev-actions">
                  {VITAMINS.filter((v) => v.stat === k).map((v) => (
                    <button
                      key={v.id}
                      className="pbtn small"
                      disabled={
                        (state.items[v.id] ?? 0) <= 0 ||
                        evRoom(p, k) <= 0 ||
                        (p.vitaminEvs?.[k] ?? 0) >= t.vitaminCap
                      }
                      title={`${v.name} ×${state.items[v.id] ?? 0}: +${t.vitaminEvs} EVs (vitaminas até ${t.vitaminCap})`}
                      onClick={() => engine.dispatch((s) => giveVitamin(s, p.uid, v.id))}
                    >
                      <ItemIcon id={v.id} size={16} />×{state.items[v.id] ?? 0}
                    </button>
                  ))}
                  <button
                    className="pbtn small"
                    disabled={!bottleOk || p.ivs[k] >= 31}
                    title={`Tampa de Garrafa: leva o IV a 31 (Nv. ${t.bottleCapMinLevel}+)`}
                    onClick={() => engine.dispatch((s) => giveBottleCap(s, p.uid, k))}
                  >
                    <ItemIcon id="bottle-cap" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <small className="muted">
          EVs: Campo de Treino (ATIVIDADES), vitaminas e duplicatas. Cada 4 EVs = +1 no atributo.
        </small>
      </div>
    </div>
  );
}
