// LOJA: o POKé MART (itens básicos, em qualquer lugar) e a Loja de Departamentos de
// Celadon, que vende todos os itens mas só para quem está na área dela.

import { useState } from 'react';
import { DEPT_STORE, FOSSILS, SHOP_CATALOG, SPECIES, getRoute, type DeptSection } from '../../game-data';
import {
  atDeptStore,
  buy,
  buyAtDeptStore,
  deptStoreEntries,
  deptStoreUnlocked,
  selectRoute,
  shopEntries,
  type GameState,
} from '../../core/game';
import { ItemIcon, Money, Window } from '../components/common';
import { ITEM_DESCRIPTIONS, UPGRADE_TEXT, itemName, speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

type Store = 'mart' | 'dept';

const DEPT_SECTIONS: { id: DeptSection; label: string }[] = [
  { id: 'balls', label: 'POKé BALLS' },
  { id: 'evolution', label: 'ITENS DE EVOLUÇÃO' },
  { id: 'other', label: 'OUTROS' },
  { id: 'berries', label: 'BERRIES' },
  { id: 'fossils', label: 'FÓSSEIS' },
];

/** Quem evolui com cada item (para a descrição na loja). */
const EVOLVES_WITH = new Map<string, string[]>();
for (const s of SPECIES)
  for (const e of s.evolutions)
    if (e.trigger === 'item') EVOLVES_WITH.set(e.item, [...(EVOLVES_WITH.get(e.item) ?? []), s.name]);

export function ShopScreen({ state }: { state: GameState }) {
  // Quem já está em Celadon abre direto na Loja de Departamentos.
  const [store, setStore] = useState<Store>(atDeptStore(state) ? 'dept' : 'mart');
  return (
    <div className="bag-screen shop-screen">
      <div className="bag-pockets">
        <button className={`pocket ${store === 'mart' ? 'active' : ''}`} onClick={() => setStore('mart')}>
          <ItemIcon id="coin-case" size={30} /> POKé MART
        </button>
        <button
          className={`pocket ${store === 'dept' ? 'active' : ''}`}
          onClick={() => setStore('dept')}
          title={DEPT_STORE.name}
        >
          <ItemIcon id="dowsing-machine" size={30} /> LOJA DE DEPTO.
        </button>
        <span className="bag-money frame frame-menu">
          <Money value={state.coins} />
        </span>
      </div>
      {store === 'mart' ? <Mart state={state} /> : <DeptStore state={state} />}
    </div>
  );
}

/** POKé MART: itens básicos, liberados pelos chefes vencidos. Compra-se de qualquer lugar. */
function Mart({ state }: { state: GameState }) {
  const engine = useEngine();
  const available = shopEntries(state);
  const locked = SHOP_CATALOG.filter((e) => !available.includes(e));
  return (
    <Window frame="menu" title="POKé MART" icon={<ItemIcon id="coin-case" size={24} />}>
      {state.challenge === 'frugal' && (
        <p className="hint">Desafio “Mochila vazia”: o Poké Mart não vende Poké Balls nesta jornada.</p>
      )}
      <ul className="item-list mart">
        {available.map((entry) => {
          const isUpgrade = entry.kind === 'upgrade';
          const bought = isUpgrade && state.upgrades.includes(entry.id);
          return (
            <li key={entry.id} className="mart-row">
              <ItemIcon id={isUpgrade ? 'dowsing-machine' : entry.id} size={30} />
              <div className="mart-info">
                <span className="item-name">{itemName(entry.id).toUpperCase()}</span>
                <small>{isUpgrade ? UPGRADE_TEXT[entry.id]?.description : ITEM_DESCRIPTIONS[entry.id]}</small>
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
  );
}

/** Loja de Departamentos: todos os itens, mas só se compra estando na área dela. */
function DeptStore({ state }: { state: GameState }) {
  const engine = useEngine();
  const route = getRoute(DEPT_STORE.routeId);
  const unlocked = deptStoreUnlocked(state);
  const here = atDeptStore(state);
  const entries = deptStoreEntries(state);
  const describe = (id: string) => {
    const species = EVOLVES_WITH.get(id);
    if (species) {
      return `Evolui ${species.slice(0, 3).join(', ')}${species.length > 3 ? ` e mais ${species.length - 3}` : ''}.`;
    }
    const fossil = FOSSILS.find((f) => f.item === id);
    if (fossil) return `Revive um ${speciesName(fossil.speciesId)} no laboratório de fósseis.`;
    return ITEM_DESCRIPTIONS[id] ?? '';
  };

  return (
    <Window
      frame="menu"
      title={DEPT_STORE.name.toUpperCase()}
      icon={<ItemIcon id="dowsing-machine" size={24} />}
      className="dept-store"
    >
      {!unlocked ? (
        <p className="hint">
          A maior loja de Kanto fica em {route.name}. Avance na campanha até lá para encontrá-la.
        </p>
      ) : !here ? (
        <div className="dept-away frame frame-dialog">
          <p>
            A loja fica em <strong>{route.name}</strong> ({route.region}). Vá até lá para comprar — enquanto
            estiver na área, você treina nos encontros dela.
          </p>
          <button
            className="pbtn small primary"
            disabled={state.battle.kind !== 'wild'}
            onClick={() => engine.dispatch((s, now) => selectRoute(s, DEPT_STORE.routeId, now))}
          >
            Ir para {route.name}
          </button>
        </div>
      ) : (
        <p className="hint">
          Bem-vindo! Aqui tem de tudo. Os preços valem enquanto você estiver em {route.name}.
        </p>
      )}
      {state.challenge === 'frugal' && (
        <p className="hint">Desafio “Mochila vazia”: só a Master Ball continua à venda entre as bolas.</p>
      )}
      {DEPT_SECTIONS.map((sec) => {
        const list = entries.filter((e) => e.section === sec.id);
        if (!list.length) return null;
        return (
          <section key={sec.id} className="dept-section">
            <h4>{sec.label}</h4>
            <ul className="item-list mart">
              {list.map((entry) => (
                <li key={entry.id} className="mart-row">
                  <ItemIcon id={entry.id} size={30} />
                  <div className="mart-info">
                    <span className="item-name">
                      {itemName(entry.id).toUpperCase()}
                      {(state.items[entry.id] ?? 0) > 0 && <small> · tem {state.items[entry.id]}</small>}
                    </span>
                    <small>{describe(entry.id)}</small>
                  </div>
                  <div className="mart-buy">
                    <button
                      className="pbtn small"
                      disabled={!here || state.coins < entry.price}
                      onClick={() => engine.dispatch((s) => buyAtDeptStore(s, entry.id))}
                    >
                      <Money value={entry.price} />
                    </button>
                    {entry.price * 10 <= 50_000 && (
                      <button
                        className="pbtn small"
                        disabled={!here || state.coins < entry.price * 10}
                        onClick={() => engine.dispatch((s) => buyAtDeptStore(s, entry.id, 10))}
                      >
                        ×10
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Window>
  );
}
