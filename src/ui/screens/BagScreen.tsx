// MOCHILA: bolsos de itens e o POKé MART (loja), no estilo da mochila do FRLG.

import { useState } from 'react';
import { BERRIES, FOSSILS, SHOP_CATALOG, getMove, getRoute, getSpecies } from '../../game-data';
import { applyEvolutionItem, buy, shopEntries, type GameState } from '../../core/game';
import { eatBerry } from '../../core/garden';
import { itemEvolution } from '../../core/progression';
import { ItemIcon, Money, PokemonSprite, TypeBadge, Window } from '../components/common';
import { ITEM_DESCRIPTIONS, UPGRADE_TEXT, itemName, moveName, speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

type Pocket = 'items' | 'tms' | 'mart';

export function BagScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const [pocket, setPocket] = useState<Pocket>('items');
  const owned = Object.entries(state.items).filter(([, n]) => n > 0);
  const [selected, setSelected] = useState<string | null>(owned[0]?.[0] ?? null);
  const available = shopEntries(state);
  const locked = SHOP_CATALOG.filter((e) => !available.includes(e));
  const eligible = selected
    ? state.collection.filter((p) => itemEvolution(p, selected, state.env.period) !== undefined)
    : [];
  const berry = selected ? BERRIES.find((b) => b.id === selected) : undefined;
  const fossil = selected ? FOSSILS.find((f) => f.item === selected) : undefined;

  return (
    <div className="bag-screen">
      <div className="bag-pockets">
        <button className={`pocket ${pocket === 'items' ? 'active' : ''}`} onClick={() => setPocket('items')}>
          <ItemIcon id="explorer-kit" size={30} /> ITENS
        </button>
        <button className={`pocket ${pocket === 'tms' ? 'active' : ''}`} onClick={() => setPocket('tms')}>
          <ItemIcon id="tm-case" size={30} /> TMs · {state.tms.length}
        </button>
        <button className={`pocket ${pocket === 'mart' ? 'active' : ''}`} onClick={() => setPocket('mart')}>
          <ItemIcon id="coin-case" size={30} /> POKé MART
        </button>
        <span className="bag-money frame frame-menu">
          <Money value={state.coins} />
        </span>
      </div>

      {pocket === 'items' ? (
        <>
          <Window frame="menu">
            <ul className="item-list">
              {owned.map(([id, n]) => (
                <li key={id}>
                  <button
                    className={`item-row ${selected === id ? 'selected' : ''}`}
                    onClick={() => setSelected(id)}
                  >
                    <ItemIcon id={id} size={30} />
                    <span className="item-name">{itemName(id).toUpperCase()}</span>
                    <span className="item-qty">×{n}</span>
                  </button>
                </li>
              ))}
              {!owned.length && <li className="hint">A mochila está vazia. Visite o POKé MART.</li>}
            </ul>
          </Window>
          {selected && (
            <div className="item-desc frame frame-dialog">
              <ItemIcon id={selected} size={48} />
              <div>
                <p>{ITEM_DESCRIPTIONS[selected] ?? itemName(selected)}</p>
                {berry && (state.items[selected] ?? 0) > 0 && (
                  <button
                    className="pbtn small"
                    onClick={() => engine.dispatch((s) => eatBerry(s, selected))}
                  >
                    Comer agora
                  </button>
                )}
                {fossil && (
                  <p className="hint">
                    Revive: {speciesName(fossil.speciesId)} em {fossil.hours} h.
                  </p>
                )}
                {eligible.length > 0 && (
                  <div className="item-use">
                    {eligible.map((p) => (
                      <button
                        key={p.uid}
                        className="pbtn evolve"
                        onClick={() => engine.dispatch((s) => applyEvolutionItem(s, p.uid, selected))}
                      >
                        <PokemonSprite speciesId={p.speciesId} kind="icon" /> Usar em{' '}
                        {speciesName(p.speciesId)} Nv
                        {p.level}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : pocket === 'tms' ? (
        <TmPocket state={state} />
      ) : (
        <Window frame="menu" title="POKé MART" icon={<ItemIcon id="coin-case" size={24} />}>
          <ul className="item-list mart">
            {available.map((entry) => {
              const isUpgrade = entry.kind === 'upgrade';
              const bought = isUpgrade && state.upgrades.includes(entry.id);
              return (
                <li key={entry.id} className="mart-row">
                  <ItemIcon id={isUpgrade ? 'dowsing-machine' : entry.id} size={30} />
                  <div className="mart-info">
                    <span className="item-name">{itemName(entry.id).toUpperCase()}</span>
                    <small>
                      {isUpgrade ? UPGRADE_TEXT[entry.id]?.description : ITEM_DESCRIPTIONS[entry.id]}
                    </small>
                  </div>
                  <div className="mart-buy">
                    {bought ? (
                      <span className="tag tag-active">ADQUIRIDO</span>
                    ) : (
                      <>
                        <button
                          className="pbtn small"
                          disabled={state.coins < entry.price}
                          onClick={() => engine.dispatch((s) => buy(s, entry.id))}
                        >
                          <Money value={entry.price} />
                        </button>
                        {!isUpgrade && (
                          <button
                            className="pbtn small"
                            disabled={state.coins < entry.price * 10}
                            onClick={() => engine.dispatch((s) => buy(s, entry.id, 10))}
                          >
                            ×10
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {locked.length > 0 && (
            <p className="hint">
              Mais produtos depois de vencer:{' '}
              {[...new Set(locked.map((e) => getRoute(e.requiresBoss!).boss?.name))].join(', ')}.
            </p>
          )}
        </Window>
      )}
    </div>
  );
}

/** TMs liberados: o golpe e quem da coleção pode aprendê-lo. */
function TmPocket({ state }: { state: GameState }) {
  if (!state.tms.length) {
    return (
      <Window frame="menu">
        <p className="hint">
          Nenhum TM ainda. Líderes de ginásio entregam TMs, e há outros na Torre de Batalha, no Game Corner e
          nas expedições. Ensine na tela POKéMON → Editar golpes.
        </p>
      </Window>
    );
  }
  return (
    <Window frame="menu" title="ESTOJO DE TMs" icon={<ItemIcon id="tm-case" size={24} />}>
      <ul className="item-list tm-list">
        {[...state.tms].sort().map((id) => {
          const mv = getMove(id);
          const learners = state.collection.filter((p) => getSpecies(p.speciesId).tmMoves.includes(id));
          return (
            <li key={id} className="tm-row">
              <ItemIcon id="tm" size={28} />
              <div className="mart-info">
                <span className="item-name">{moveName(id).toUpperCase()}</span>
                <small>
                  <TypeBadge type={mv.type} /> POD {mv.power} ·{' '}
                  {mv.category === 'physical' ? 'físico' : 'especial'}
                </small>
              </div>
              <span className="tm-learners">
                {learners.slice(0, 6).map((p) => (
                  <PokemonSprite key={p.uid} speciesId={p.speciesId} kind="icon" />
                ))}
                {learners.length > 6 && <small>+{learners.length - 6}</small>}
              </span>
            </li>
          );
        })}
      </ul>
    </Window>
  );
}
