// LOJA: o POKé MART (itens básicos, em qualquer lugar), a Loja de Departamentos de Celadon,
// que vende todos os itens mas só para quem está na área dela, e o mercador viajante, que
// aparece de tempos em tempos com itens raros em promoção.

import { useMemo, useState } from 'react';
import {
  BALANCE,
  DEPT_STORE,
  FOSSILS,
  SHOP_CATALOG,
  SPECIES,
  getItem,
  getMove,
  getRoute,
  type DeptSection,
} from '../../game-data';
import { TM_SHELF, buyTm, tmLabel, tmShelf } from '../../core/tms';
import {
  atDeptStore,
  buy,
  buyAtDeptStore,
  buyFromMerchant,
  deptStoreEntries,
  deptStoreUnlocked,
  incomePerHour,
  merchantUnlocked,
  selectRoute,
  shopEntries,
  type GameState,
} from '../../core/game';
import { ItemIcon, Money, TypeBadge, Window } from '../components/common';
import {
  UPGRADE_TEXT,
  formatDuration,
  itemDescription,
  itemName,
  moveName,
  speciesName,
} from '../i18n/pt-BR';
import { audio } from '../audio';
import { useEngine } from '../useGame';
import { Countdown, Locked } from './activities/shared';

/** Jingle de item recebido quando a compra deu certo (sem dinheiro ou estoque, nada toca). */
function gotItem<T>(result: T): T {
  if (result) audio.sfx('itemGet');
  return result;
}

type Store = 'mart' | 'dept' | 'merchant';

const DEPT_SECTIONS: { id: DeptSection; label: string }[] = [
  { id: 'balls', label: 'POKé BALLS' },
  { id: 'evolution', label: 'ITENS DE EVOLUÇÃO' },
  { id: 'held', label: 'ITENS SEGURÁVEIS' },
  { id: 'training', label: 'TREINO E HABILIDADES' },
  { id: 'other', label: 'OUTROS' },
  { id: 'berries', label: 'BERRIES' },
  { id: 'fossils', label: 'FÓSSEIS' },
];

/** Quem evolui com cada item (para a descrição na loja). */
const EVOLVES_WITH = new Map<string, string[]>();
for (const s of SPECIES)
  for (const e of s.evolutions)
    if (e.trigger === 'item') EVOLVES_WITH.set(e.item, [...(EVOLVES_WITH.get(e.item) ?? []), s.name]);

function describe(id: string): string {
  const species = EVOLVES_WITH.get(id);
  if (species) {
    return `Evolui ${species.slice(0, 3).join(', ')}${species.length > 3 ? ` e mais ${species.length - 3}` : ''}.`;
  }
  const fossil = FOSSILS.find((f) => f.item === id);
  if (fossil) return `Revive um ${speciesName(fossil.speciesId)} no laboratório de fósseis.`;
  return itemDescription(id);
}

/** Renda por hora (recalculada só quando a rota ou o nível do ativo mudam, ou a cada amostra). */
function useIncome(state: GameState): number {
  const active = state.collection.find((p) => p.uid === state.activeUid);
  const key = `${state.currentRouteId}:${state.activeUid}:${active?.level}:${state.history.length}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => incomePerHour(state, state.lastTimerAt), [key]);
}

/** Tempo arredondado: "< 1 min", "≈ 25 min", "≈ 3 h 10 min", "≈ 2 dias". */
function roughTime(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return '< 1 min';
  if (min < 60) return `≈ ${min} min`;
  const h = Math.floor(min / 60);
  if (h >= 48) return `≈ ${Math.round(h / 24)} dias`;
  const rest = Math.round((min % 60) / 10) * 10;
  return `≈ ${h} h${rest ? ` ${rest} min` : ''}`;
}

/** "≈ 25 min de farm" ao lado do preço, para dar noção do quanto o item custa de verdade. */
function FarmTime({ price, coins, income }: { price: number; coins: number; income: number }) {
  if (income <= 0) return null;
  const missing = price - coins;
  const text = roughTime((price / income) * 3_600_000);
  return (
    <small
      className={`farm-time ${missing > 0 ? 'short' : ''}`}
      title={
        missing > 0
          ? `Faltam ${missing} moedas: ${roughTime((missing / income) * 3_600_000)} no ritmo atual.`
          : 'Tempo de jogo que este preço representa no ritmo atual de moedas.'
      }
    >
      {text} de farm
    </small>
  );
}

export function ShopScreen({ state }: { state: GameState }) {
  // Quem já está em Celadon abre direto na Loja de Departamentos.
  const [store, setStore] = useState<Store>(atDeptStore(state) ? 'dept' : 'mart');
  const income = useIncome(state);
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
        <button
          className={`pocket ${store === 'merchant' ? 'active' : ''} ${state.merchant ? 'pocket-alert' : ''}`}
          onClick={() => setStore('merchant')}
        >
          <ItemIcon id="vs-seeker" size={30} /> MERCADOR{state.merchant ? ' !' : ''}
        </button>
        <span className="bag-money frame frame-menu">
          <Money value={state.coins} />
        </span>
      </div>
      {store === 'mart' ? (
        <Mart state={state} income={income} />
      ) : store === 'dept' ? (
        <DeptStore state={state} income={income} />
      ) : (
        <Merchant state={state} income={income} />
      )}
    </div>
  );
}

/** POKé MART: itens básicos, liberados pelos chefes vencidos. Compra-se de qualquer lugar. */
function Mart({ state, income }: { state: GameState; income: number }) {
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
              <ItemIcon id={isUpgrade && !getItem(entry.id) ? 'dowsing-machine' : entry.id} size={30} />
              <div className="mart-info">
                <span className="item-name">{itemName(entry.id).toUpperCase()}</span>
                <small>{isUpgrade ? UPGRADE_TEXT[entry.id]?.description : itemDescription(entry.id)}</small>
                {!bought && <FarmTime price={entry.price} coins={state.coins} income={income} />}
              </div>
              <div className="mart-buy">
                {bought ? (
                  <span className="tag tag-active">ADQUIRIDO</span>
                ) : (
                  <>
                    <button
                      className="pbtn small"
                      disabled={state.coins < entry.price}
                      onClick={() => engine.dispatch((s) => gotItem(buy(s, entry.id)))}
                    >
                      <Money value={entry.price} />
                    </button>
                    {!isUpgrade && (
                      <button
                        className="pbtn small"
                        disabled={state.coins < entry.price * 10}
                        onClick={() => engine.dispatch((s) => gotItem(buy(s, entry.id, 10)))}
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
function DeptStore({ state, income }: { state: GameState; income: number }) {
  const engine = useEngine();
  const route = getRoute(DEPT_STORE.routeId);
  const unlocked = deptStoreUnlocked(state);
  const here = atDeptStore(state);
  const entries = deptStoreEntries(state);

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
                    <FarmTime price={entry.price} coins={state.coins} income={income} />
                  </div>
                  <div className="mart-buy">
                    <button
                      className="pbtn small"
                      disabled={!here || state.coins < entry.price}
                      onClick={() => engine.dispatch((s) => gotItem(buyAtDeptStore(s, entry.id)))}
                    >
                      <Money value={entry.price} />
                    </button>
                    {entry.price * 10 <= 50_000 && (
                      <button
                        className="pbtn small"
                        disabled={!here || state.coins < entry.price * 10}
                        onClick={() => engine.dispatch((s) => gotItem(buyAtDeptStore(s, entry.id, 10)))}
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
      <TmShelf state={state} here={here} income={income} />
    </Window>
  );
}

/** 4º andar: TMs. Os de prêmio desde o início; os dos líderes, depois do Campeão da região. */
function TmShelf({ state, here, income }: { state: GameState; here: boolean; income: number }) {
  const engine = useEngine();
  const shelf = tmShelf(state);
  const locked = TM_SHELF.length - shelf.length;
  return (
    <section className="dept-section tm-shelf">
      <h4>
        TMs · {state.tms.length}/{TM_SHELF.length}
      </h4>
      <ul className="item-list mart">
        {shelf.map((entry) => {
          const mv = getMove(entry.move);
          const have = state.tms.includes(entry.move);
          return (
            <li key={entry.move} className="mart-row">
              <span className={`tm-disc type-bg-${mv.type}`}>
                <ItemIcon id="tm" size={24} />
              </span>
              <div className="mart-info">
                <span className="item-name">
                  {tmLabel(entry.move)} {moveName(entry.move).toUpperCase()}
                  {have && <small> · já tem</small>}
                </span>
                <small>
                  <TypeBadge type={mv.type} /> POD {mv.power} · PRE {mv.accuracy} ·{' '}
                  {mv.category === 'physical' ? 'físico' : 'especial'}
                </small>
                {!have && <FarmTime price={entry.price} coins={state.coins} income={income} />}
              </div>
              <div className="mart-buy">
                <button
                  className="pbtn small"
                  disabled={!here || have || state.coins < entry.price}
                  onClick={() => engine.dispatch((s) => gotItem(buyTm(s, entry.move)))}
                >
                  {have ? 'TEM' : <Money value={entry.price} />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {locked > 0 && (
        <p className="hint">
          Mais {locked} TMs chegam à prateleira conforme você vence ginásios; os TMs dos líderes de uma região
          entram depois do Campeão dela.
        </p>
      )}
    </section>
  );
}

/** Mercador viajante: ofertas com desconto e estoque limitado, de qualquer lugar, por pouco tempo. */
function Merchant({ state, income }: { state: GameState; income: number }) {
  const engine = useEngine();
  if (!merchantUnlocked(state)) {
    return (
      <Window frame="menu" title="MERCADOR VIAJANTE" icon={<ItemIcon id="vs-seeker" size={24} />}>
        <Locked routeId={BALANCE.merchant.unlock} />
      </Window>
    );
  }
  const m = state.merchant;
  const now = state.lastTimerAt;
  return (
    <Window frame="menu" title="MERCADOR VIAJANTE" icon={<ItemIcon id="vs-seeker" size={24} />}>
      {!m ? (
        <p className="hint">
          O mercador está na estrada. Ele aparece a cada {BALANCE.merchant.minHours}–
          {BALANCE.merchant.maxHours} h
          {state.nextMerchantAt > now
            ? ` (próxima visita em cerca de ${formatDuration(state.nextMerchantAt - now)})`
            : ''}
          , fica {BALANCE.merchant.activeMinutes} min e vende itens raros com até{' '}
          {Math.round(BALANCE.merchant.discount[1] * 100)}% de desconto.
        </p>
      ) : (
        <>
          <p className="hint">
            “Tenho coisas que você não acha em loja nenhuma por esse preço!” Vai embora em{' '}
            <Countdown until={m.until} now={now} done="saindo…" />. Estoque limitado.
          </p>
          <ul className="item-list mart">
            {m.offers.map((o) => (
              <li key={o.id} className={`mart-row ${o.stock <= 0 ? 'sold-out' : ''}`}>
                <ItemIcon id={o.id} size={30} />
                <div className="mart-info">
                  <span className="item-name">
                    {itemName(o.id).toUpperCase()}{' '}
                    <span className="tag tag-sale">−{Math.round((1 - o.price / o.fullPrice) * 100)}%</span>
                  </span>
                  <small>{describe(o.id)}</small>
                  <small>
                    De <s>{o.fullPrice}</s> · {o.stock > 0 ? `restam ${o.stock}` : 'esgotado'}
                  </small>
                  {o.stock > 0 && <FarmTime price={o.price} coins={state.coins} income={income} />}
                </div>
                <div className="mart-buy">
                  <button
                    className="pbtn small"
                    disabled={o.stock <= 0 || state.coins < o.price}
                    onClick={() => {
                      engine.dispatch((s, t) => gotItem(buyFromMerchant(s, o.id, t)));
                    }}
                  >
                    <Money value={o.price} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Window>
  );
}
