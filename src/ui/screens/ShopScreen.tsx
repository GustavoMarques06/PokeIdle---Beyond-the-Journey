// LOJA: o POKé MART (itens básicos, em qualquer lugar), a Loja de Departamentos de Celadon,
// que vende todos os itens mas só para quem está na área dela, e o mercador viajante, que
// aparece de tempos em tempos com itens raros em promoção.
//
// Visual (11/11): uma cena de loja de verdade no alto (vendedor vivo, prateleiras, porta, elevador ou carroça),
// corredores com placas, vitrine em nichos, painel de compra com quantidade e a compra voando até o caixa.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  BALANCE,
  DEPT_STORE,
  assetUrl,
  FOSSILS,
  SHOP_CATALOG,
  SPECIES,
  getItem,
  getMove,
  getRoute,
  getSpecies,
  type DeptSection,
} from '../../game-data';
import { TM_SHELF, buyTm, tmLabel, tmShelf } from '../../core/tms';
import {
  atDeptStore,
  buy,
  buyAtDeptStore,
  buyFromMerchant,
  currentEncounters,
  deptStoreEntries,
  deptStoreUnlocked,
  incomePerHour,
  merchantUnlocked,
  selectRoute,
  shopEntries,
  type GameState,
} from '../../core/game';
import { ItemIcon, Money, PixelIcon, TrainerSprite, TypeBadge, Window } from '../components/common';
import { Balloon } from '../components/PixelUi';
import { PixelFx } from '../components/PixelFx';
import { phaseOf } from '../components/WorldBackdrop';
import {
  UPGRADE_TEXT,
  formatDuration,
  formatNumber,
  itemDescription,
  itemName,
  moveName,
  speciesName,
} from '../i18n/pt-BR';
import { audio } from '../audio';
import { useEngine } from '../useGame';
import { Countdown, Locked } from './activities/shared';
import { Empty } from '../components/Dynamic';

type Store = 'mart' | 'dept' | 'merchant';

const DEPT_SECTIONS: { id: DeptSection; label: string; icon: string }[] = [
  { id: 'balls', label: 'POKé BALLS', icon: 'great-ball' },
  { id: 'evolution', label: 'EVOLUÇÃO', icon: 'fire-stone' },
  { id: 'held', label: 'SEGURÁVEIS', icon: 'choice-band' },
  { id: 'training', label: 'TREINO', icon: 'macho-brace' },
  { id: 'other', label: 'OUTROS', icon: 'potion' },
  { id: 'berries', label: 'BERRIES', icon: 'berry-pouch' },
  { id: 'fossils', label: 'FÓSSEIS', icon: 'dome-fossil' },
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
  const missing = price - coins;
  const short = missing > 0 ? `Faltam ₽${formatNumber(missing)}` : '';
  if (income <= 0) return short ? <small className="farm-time short">{short}</small> : null;
  const left = roughTime((missing / income) * 3_600_000);
  return (
    <small
      className={`farm-time ${missing > 0 ? 'short' : ''}`}
      title={
        missing > 0
          ? `Faltam ${formatNumber(missing)} moedas: ${left} no ritmo atual.`
          : 'Tempo de jogo que este preço representa no ritmo atual de moedas.'
      }
    >
      {missing > 0 ? `${short} · ${left} de farm` : `${roughTime((price / income) * 3_600_000)} de farm`}
    </small>
  );
}

/** Minúsculas e sem acento: "pocao" acha "Poção". */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Todos os termos digitados aparecem no texto? */
const matches = (query: string, ...texts: string[]) => {
  const hay = fold(texts.join(' '));
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
};

// --- Conversa com a cena -------------------------------------------------------------------------

type Mood = 'say' | 'pick' | 'thanks' | 'broke';

interface ShopTalk {
  /** O vendedor fala (escolheu um item, faltou dinheiro…). */
  say: (text: string, mood?: Mood) => void;
  /** Compra feita: o item voa do nicho até o caixa. */
  bought: (id: string, qty: number, cost: number, from: Element | null) => void;
  /** Andar da Loja de Departamentos (muda com o corredor). */
  setFloor: (floor: number, label: string) => void;
}

const TalkContext = createContext<ShopTalk>({ say: () => {}, bought: () => {}, setFloor: () => {} });

// --- Corredores ----------------------------------------------------------------------------------

/** Placas de corredor: uma categoria por vez, para a vitrine não virar uma rolagem sem fim. */
function AisleSigns<T extends string>({
  aisles,
  current,
  onPick,
}: {
  aisles: { id: T; label: string; icon: string }[];
  current: T;
  onPick: (id: T) => void;
}) {
  return (
    <div className="aisle-signs" role="group" aria-label="Corredores">
      {aisles.map((c, i) => (
        <button
          key={c.id}
          className={`aisle-sign ${current === c.id ? 'active' : ''}`}
          aria-pressed={current === c.id}
          style={{ ['--i' as string]: i }}
          onClick={() => {
            audio.sfx('cursor');
            onPick(c.id);
          }}
        >
          <span className="aisle-num">{i + 1}</span>
          <ItemIcon id={c.icon} size={30} />
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}

type MartGroup = 'balls' | 'evolution' | 'upgrades' | 'other';

const MART_GROUPS: { id: MartGroup; label: string; icon: string }[] = [
  { id: 'balls', label: 'BOLAS', icon: 'poke-ball' },
  { id: 'evolution', label: 'EVOLUÇÃO', icon: 'thunder-stone' },
  { id: 'upgrades', label: 'MELHORIAS', icon: 'up-grade' },
  { id: 'other', label: 'OUTROS', icon: 'potion' },
];

const martGroup = (entry: { id: string; kind?: string }): MartGroup =>
  entry.kind === 'upgrade'
    ? 'upgrades'
    : entry.id.endsWith('-ball')
      ? 'balls'
      : EVOLVES_WITH.has(entry.id)
        ? 'evolution'
        : 'other';

// --- Vitrine e painel de compra --------------------------------------------------------------------

interface Product {
  key: string;
  /** Ícone que voa até o caixa e aparece no balão. */
  flyId: string;
  icon: ReactNode;
  name: string;
  desc: ReactNode;
  price: number;
  /** Máximo por compra (antes do dinheiro): 1 para melhorias e TMs, o estoque no mercador. */
  max: number;
  have?: number;
  tag?: ReactNode;
  /** Motivo para não dar para comprar agora (já tem, longe da loja…). */
  blocked?: string;
  buy: (s: GameState, qty: number, now: number) => boolean;
}

interface LockedProduct {
  key: string;
  icon: string;
  hint: string;
}

const PICK_LINES = ['{item}? Ótima escolha!', 'Ah, {item}! Sai bastante.', '{item}, é pra já!', 'Esse {item} é dos bons.'];

/** Vitrine em nichos: clicar escolhe; o painel em cima mostra o item grande, a quantidade e o COMPRAR. */
function Showcase({
  state,
  income,
  products,
  locked = [],
}: {
  state: GameState;
  income: number;
  products: Product[];
  locked?: LockedProduct[];
}) {
  const engine = useEngine();
  const talk = useContext(TalkContext);
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const slots = useRef(new Map<string, HTMLElement>());
  const current = products.find((p) => p.key === selected);
  const affordable = current ? Math.floor(state.coins / Math.max(1, current.price)) : 0;
  const max = current ? Math.max(0, Math.min(current.max, affordable, 99)) : 0;
  const n = Math.max(1, Math.min(qty, Math.max(1, max)));

  const pick = (p: Product) => {
    audio.sfx('cursor');
    setSelected(p.key);
    setQty(1);
    if (p.blocked) talk.say(p.blocked, 'say');
    else if (state.coins < p.price)
      talk.say(`Hmm… faltam ₽${formatNumber(p.price - state.coins)}. Volte quando tiver mais!`, 'broke');
    else talk.say(PICK_LINES[p.key.length % PICK_LINES.length].replace('{item}', p.name), 'pick');
  };

  const purchase = () => {
    if (!current || current.blocked || max <= 0) return;
    let ok = false;
    engine.dispatch((s, now) => {
      ok = current.buy(s, n, now);
    });
    if (ok) {
      audio.sfx('coin');
      audio.sfx('itemGet');
      talk.bought(current.flyId, n, current.price * n, slots.current.get(current.key) ?? null);
      setQty(1);
    }
  };

  return (
    <>
      {current && (
        <div className="buy-panel frame frame-dialog" key={current.key}>
          <span className="buy-art">{current.icon}</span>
          <div className="buy-info">
            <strong>
              {current.name.toUpperCase()}
              {current.have ? <small> · na mochila: {current.have}</small> : null}
            </strong>
            <small>{current.desc}</small>
            {!current.blocked && <FarmTime price={current.price * n} coins={state.coins} income={income} />}
          </div>
          <div className="buy-actions">
            {current.blocked ? (
              <span className="tag tag-active">{current.blocked}</span>
            ) : (
              <>
                {current.max > 1 && (
                  <span className="buy-qty" role="group" aria-label="Quantidade">
                    <button className="pbtn small" disabled={n <= 1} onClick={() => setQty(n - 1)}>
                      −
                    </button>
                    <b>{n}</b>
                    <button className="pbtn small" disabled={n >= max} onClick={() => setQty(n + 1)}>
                      +
                    </button>
                    <button className="pbtn small" disabled={max < 10} onClick={() => setQty(10)}>
                      ×10
                    </button>
                    <button className="pbtn small" disabled={max <= 1} onClick={() => setQty(max)}>
                      MÁX
                    </button>
                  </span>
                )}
                <button className="pbtn primary buy-go" disabled={max <= 0} onClick={purchase}>
                  COMPRAR · <Money value={current.price * n} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <ul className="showcase">
        {products.map((p, i) => {
          const short = !p.blocked && state.coins < p.price;
          return (
            <li key={p.key} style={{ ['--i' as string]: Math.min(i, 16) }}>
              <button
                ref={(el) => {
                  if (el) slots.current.set(p.key, el);
                  else slots.current.delete(p.key);
                }}
                className={`niche ${selected === p.key ? 'selected' : ''} ${short ? 'short' : ''} ${p.blocked ? 'blocked' : ''}`}
                onClick={() => pick(p)}
                title={p.name}
              >
                {p.tag && <span className="niche-tag">{p.tag}</span>}
                {!!p.have && <span className="niche-have">tem {formatNumber(p.have)}</span>}
                <span className="niche-icon">{p.icon}</span>
                <span className="niche-text">
                  <span className="niche-name">{p.name}</span>
                  <span className="price-tag">
                    <PixelIcon name="pokedollar" scale={2} />
                    {formatNumber(p.price)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {locked.map((l) => (
          <li key={l.key}>
            <button className="niche locked" onClick={() => talk.say(l.hint, 'say')} title={l.hint}>
              <span className="niche-icon">
                <ItemIcon id={l.icon} size={60} />
              </span>
              <PixelIcon name="lock" scale={2} className="niche-lock" />
              <span className="niche-text">
                <span className="niche-name">???</span>
                <small className="niche-hint">bloqueado</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// --- A cena no alto ----------------------------------------------------------------------------

const GREETINGS: Record<Store, string[]> = {
  mart: ['Bem-vindo ao POKé MART!', 'Poké Balls fresquinhas hoje!', 'Precisa de algo para a jornada?'],
  dept: ['Bem-vindo! Aqui tem de tudo.', 'Cada andar, um corredor!', 'TMs novos na prateleira!'],
  merchant: ['Coisas raras, preço de amigo!', 'Corre que o estoque acaba!', 'Vim de longe só pra você!'],
};

/** Dica do vendedor: a bola que mais combina com a rota de agora. */
function ballTip(state: GameState): string | null {
  const sold = new Set([
    ...shopEntries(state).map((e) => e.id),
    ...(atDeptStore(state) ? deptStoreEntries(state).map((e) => e.id) : []),
  ]);
  const enc = currentEncounters(state, state.currentRouteId);
  if (!enc.length) return null;
  const share = (...types: string[]) =>
    enc.filter((e) => getSpecies(e.speciesId).types.some((t) => types.includes(t))).length / enc.length;
  const level = enc.reduce((sum, e) => sum + (e.minLevel + e.maxLevel) / 2, 0) / enc.length;
  if (state.env.period === 'night' && sold.has('dusk-ball')) return 'À noite a Dusk Ball pega muito melhor!';
  if (share('water', 'bug') >= 0.4 && sold.has('net-ball'))
    return 'Por aqui tem muito Pokémon de Água e Inseto: leve Net Balls!';
  if (level <= 20 && sold.has('nest-ball')) return 'Os Pokémon daqui são de nível baixo: a Nest Ball é perfeita.';
  if (sold.has('ultra-ball')) return 'A Ultra Ball nunca decepciona.';
  return null;
}

/** Quem atende em cada loja (sprites em pose parada, sem a pose de batalha). */
const CLERK: Record<Store, { sprite: string; name: string }> = {
  mart: { sprite: 'class-clerk-boss', name: 'GERENTE' },
  dept: { sprite: 'class-waitress', name: 'ATENDENTE' },
  merchant: { sprite: 'class-backpacker', name: 'MERCADOR' },
};

/** Arte de cada loja (scripts/build-shop.py): fundo e frente, com o vendedor no meio. */
const SCENE_ART: Record<Store, { back: string; front: string; night?: string }> = {
  mart: { back: 'mart-back', front: 'mart-front' },
  dept: { back: 'dept-back', front: 'dept-front' },
  merchant: { back: 'road-back', front: 'road-front', night: 'road-night-back' },
};

function ShopScene({
  state,
  store,
  away,
  talk,
  idle,
  floor,
  sale,
  visit,
  registerRef,
}: {
  state: GameState;
  store: Store;
  away: boolean;
  talk: { text: string; mood: Mood; n: number } | null;
  idle: boolean;
  floor: { n: number; label: string };
  sale: { id: string; n: number } | null;
  visit: { spent: number; items: number };
  registerRef: RefObject<HTMLSpanElement | null>;
}) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setLine((n) => n + 1), 7000);
    return () => clearInterval(timer);
  }, []);
  const tip = useMemo(() => ballTip(state), [state.currentRouteId, state.env.period]); // eslint-disable-line react-hooks/exhaustive-deps
  const phase = phaseOf(state);
  const night = phase === 'night';
  const art = SCENE_ART[store];
  const greetings = [...GREETINGS[store], ...(store === 'mart' && tip ? [tip] : [])];
  const text = away
    ? 'VOLTO LOGO! (o mercador está na estrada)'
    : (talk?.text ?? greetings[line % greetings.length]);
  const mood = away ? 'say' : (talk?.mood ?? 'say');
  const url = (name: string) => `url(${assetUrl(`sprites/shop/${name}.png`)})`;
  return (
    <div className={`shop-scene store-${store} phase-${phase} ${away ? 'away' : ''}`} aria-hidden>
      <div className="ss-stage" style={{ backgroundImage: url(night && art.night ? art.night : art.back) }}>
        {store === 'mart' && (
          <span className="ss-door">
            <i />
            <i />
          </span>
        )}
        {store === 'dept' && (
          <span className="ss-elevator" key={`lift-${floor.n}`}>
            <span className="ss-lights">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((f) => (
                <i key={f} className={f === floor.n ? 'on' : ''} />
              ))}
            </span>
            <i />
            <i />
          </span>
        )}
        {store === 'merchant' && night && (
          <>
            <span className="ss-glow" style={{ left: 322 }} />
            <span className="ss-glow" style={{ left: 564 }} />
            <span className="ss-fire">
              <PixelIcon name="flame" scale={3} />
            </span>
          </>
        )}
        {!away && (
          <span className={`ss-clerk mood-${mood}`} key={`clerk-${talk?.n ?? 0}`}>
            <TrainerSprite id={CLERK[store].sprite} size={160} />
            {idle && !talk ? (
              <span className="ss-balloon">
                <Balloon kind="dots" scale={2} />
              </span>
            ) : mood === 'thanks' ? (
              <span className="ss-balloon">
                <Balloon kind="heart" scale={2} />
              </span>
            ) : mood === 'broke' ? (
              <span className="ss-balloon">
                <Balloon kind="alert" scale={2} />
              </span>
            ) : null}
          </span>
        )}
        <span className="ss-front" style={{ backgroundImage: url(art.front) }} />
        <span ref={registerRef} className="ss-register" key={`reg-${sale?.n ?? 0}`}>
          <span className="ss-screen">{sale ? 'OBRIGADO!' : store === 'merchant' ? '₽ ₽ ₽' : 'CAIXA'}</span>
          <i className={`ss-drawer ${sale ? 'open' : ''}`} />
        </span>
        {visit.items > 0 && (
          <span className="ss-bag" title="Compras desta visita" key={`bag-${visit.items}`}>
            <PixelIcon name="bag" scale={3} palette={{ c: '#d8b070' }} />
            <small>
              {visit.items} {visit.items === 1 ? 'item' : 'itens'} · ₽{formatNumber(visit.spent)}
            </small>
          </span>
        )}
        {sale && (
          <span key={`sold-${sale.n}`} className="ss-sold">
            <PixelFx fx="coins" scale={2} x="50%" y="50%" />
          </span>
        )}
      </div>
      {store === 'mart' && <span className="ss-sign">POKé MART</span>}
      <span className="ss-money" key={`money-${sale?.n ?? 0}`}>
        <PixelIcon name="pokedollar" scale={2} />
        {formatNumber(state.coins)}
      </span>
      {store === 'dept' && (
        <span className="ss-sign" key={`floor-${floor.n}`}>
          {floor.n}º ANDAR · {floor.label}
        </span>
      )}
      <span className="ss-say" key={`say-${talk?.n ?? 0}-${line}-${store}`}>
        {!away && <b className="ss-who">{CLERK[store].name}</b>}
        {text}
        <i className="ss-caret" />
      </span>
    </div>
  );
}

// --- Tela --------------------------------------------------------------------------------------

export function ShopScreen({ state }: { state: GameState }) {
  // Quem já está em Celadon abre direto na Loja de Departamentos.
  const [store, setStore] = useState<Store>(atDeptStore(state) ? 'dept' : 'mart');
  const income = useIncome(state);
  const [query, setQuery] = useState('');
  const [talk, setTalk] = useState<{ text: string; mood: Mood; n: number } | null>(null);
  const [sale, setSale] = useState<{ id: string; n: number } | null>(null);
  const [flight, setFlight] = useState<{ id: string; n: number; x: number; y: number; dx: number; dy: number } | null>(
    null,
  );
  const [visit, setVisit] = useState({ spent: 0, items: 0 });
  const [floor, setFloorState] = useState({ n: 2, label: 'POKé BALLS' });
  const [lastAction, setLastAction] = useState(() => Date.now());
  const [idle, setIdle] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const register = useRef<HTMLSpanElement>(null);
  const counter = useRef(0);

  // A fala some sozinha depois de um tempo; parado muito tempo, o vendedor fica com "…".
  useEffect(() => {
    if (!talk) return;
    const timer = setTimeout(() => setTalk((t) => (t === talk ? null : t)), 3200);
    return () => clearTimeout(timer);
  }, [talk]);
  useEffect(() => {
    const timer = setTimeout(() => setIdle(true), 14_000);
    return () => clearTimeout(timer);
  }, [lastAction]);
  /** O jogador fez algo: o vendedor sai do "…" e o relógio do tédio recomeça. */
  const touch = useCallback(() => {
    setIdle(false);
    setLastAction(Date.now());
  }, []);

  const say = useCallback((text: string, mood: Mood = 'say') => {
    counter.current++;
    setTalk({ text, mood, n: counter.current });
    touch();
  }, [touch]);

  const bought = useCallback(
    (id: string, qty: number, cost: number, from: Element | null) => {
      counter.current++;
      const n = counter.current;
      setSale({ id, n });
      setVisit((v) => ({ spent: v.spent + cost, items: v.items + qty }));
      setTalk({ text: `Obrigado! ${qty > 1 ? `${qty}× ` : ''}${itemName(id)} na sua mochila.`, mood: 'thanks', n });
      touch();
      // O item voa do nicho até o caixa (em pixels da tela, descontando o zoom da interface).
      const box = root.current;
      const to = register.current;
      if (box && from && to) {
        const r = box.getBoundingClientRect();
        const zoom = r.width / box.offsetWidth || 1;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x = (a.left + a.width / 2 - r.left) / zoom;
        const y = (a.top + a.height / 2 - r.top) / zoom;
        setFlight({
          id,
          n,
          x,
          y,
          dx: (b.left + b.width / 2 - r.left) / zoom - x,
          dy: (b.top + b.height / 3 - r.top) / zoom - y,
        });
      }
      setTimeout(() => setSale((s) => (s?.n === n ? null : s)), 1600);
    },
    [touch],
  );

  const setFloor = useCallback((n: number, label: string) => setFloorState({ n, label }), []);
  const ctx = useMemo<ShopTalk>(() => ({ say, bought, setFloor }), [say, bought, setFloor]);
  const away = store === 'merchant' && (!merchantUnlocked(state) || !state.merchant);

  return (
    <TalkContext.Provider value={ctx}>
      <div className="bag-screen shop-screen" ref={root}>
        <ShopScene
          state={state}
          store={store}
          away={away}
          talk={talk}
          idle={idle}
          floor={floor}
          sale={sale}
          visit={visit}
          registerRef={register}
        />
        {flight && (
          <span
            key={flight.n}
            className="shop-fly"
            style={{
              left: flight.x,
              top: flight.y,
              ['--dx' as string]: `${flight.dx}px`,
              ['--dy' as string]: `${flight.dy}px`,
            }}
            onAnimationEnd={() => setFlight((f) => (f?.n === flight.n ? null : f))}
            aria-hidden
          >
            <ItemIcon id={flight.id} size={60} />
          </span>
        )}
        <div className="bag-pockets">
          <button
            className={`pocket ${store === 'mart' ? 'active' : ''}`}
            onClick={() => {
              setStore('mart');
              touch();
            }}
          >
            <ItemIcon id="coin-case" size={30} /> POKé MART
          </button>
          <button
            className={`pocket ${store === 'dept' ? 'active' : ''}`}
            onClick={() => {
              setStore('dept');
              touch();
            }}
            title={DEPT_STORE.name}
          >
            <ItemIcon id="dowsing-machine" size={30} /> LOJA DE DEPTO.
          </button>
          <button
            className={`pocket ${store === 'merchant' ? 'active' : ''} ${state.merchant ? 'pocket-alert' : ''}`}
            onClick={() => {
              setStore('merchant');
              touch();
            }}
          >
            <ItemIcon id="vs-seeker" size={30} /> MERCADOR{state.merchant ? ' !' : ''}
          </button>
        </div>
        {store !== 'merchant' && (
          <input
            className="shop-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar item (ex.: pedra, cura, bola)…"
            aria-label="Procurar item na loja"
          />
        )}
        {store === 'mart' ? (
          <Mart state={state} income={income} query={query} />
        ) : store === 'dept' ? (
          <DeptStore state={state} income={income} query={query} />
        ) : (
          <Merchant state={state} income={income} />
        )}
      </div>
    </TalkContext.Provider>
  );
}

/** POKé MART: itens básicos, liberados pelos chefes vencidos. Compra-se de qualquer lugar. */
function Mart({ state, income, query }: { state: GameState; income: number; query: string }) {
  const available = shopEntries(state);
  const locked = SHOP_CATALOG.filter((e) => !available.includes(e));
  const [group, setGroup] = useState<MartGroup>('balls');
  const aisles = MART_GROUPS.filter((g) => available.some((e) => martGroup(e) === g.id));
  const current = aisles.some((c) => c.id === group) ? group : (aisles[0]?.id ?? 'balls');
  const searching = query.trim().length > 0;
  const shown = available.filter((e) =>
    searching
      ? matches(
          query,
          itemName(e.id),
          e.kind === 'upgrade' ? (UPGRADE_TEXT[e.id]?.description ?? '') : itemDescription(e.id),
        )
      : martGroup(e) === current,
  );
  const products: Product[] = shown.map((entry) => {
    const isUpgrade = entry.kind === 'upgrade';
    const icon = isUpgrade && !getItem(entry.id) ? 'dowsing-machine' : entry.id;
    const owned = isUpgrade && state.upgrades.includes(entry.id);
    return {
      key: entry.id,
      flyId: icon,
      icon: <ItemIcon id={icon} size={60} />,
      name: itemName(entry.id),
      desc: isUpgrade ? UPGRADE_TEXT[entry.id]?.description : itemDescription(entry.id),
      price: entry.price,
      max: isUpgrade ? 1 : 99,
      have: isUpgrade ? undefined : state.items[entry.id],
      tag: owned ? 'TEM' : undefined,
      blocked: owned ? 'Já adquirido!' : undefined,
      buy: (s, qty) => buy(s, entry.id, isUpgrade ? 1 : qty),
    };
  });
  const lockedShown: LockedProduct[] = searching
    ? []
    : locked
        .filter((e) => martGroup(e) === current)
        .map((e) => ({
          key: e.id,
          icon: e.kind === 'upgrade' && !getItem(e.id) ? 'dowsing-machine' : e.id,
          hint: `Esse chega depois que você vencer ${getRoute(e.requiresBoss!).boss?.name ?? 'o próximo chefe'}!`,
        }));
  return (
    <Window frame="menu" className="shop-window">
      {state.challenge === 'frugal' && (
        <p className="hint">Desafio “Mochila vazia”: o Poké Mart não vende Poké Balls nesta jornada.</p>
      )}
      {!searching && aisles.length > 1 && <AisleSigns aisles={aisles} current={current} onPick={setGroup} />}
      {products.length === 0 && lockedShown.length === 0 && (
        <Empty icon="dowsing-machine">Nada encontrado aqui. Tente outra palavra ou a Loja de Departamentos.</Empty>
      )}
      <Showcase state={state} income={income} products={products} locked={lockedShown} />
    </Window>
  );
}

/** Loja de Departamentos: todos os itens, mas só se compra estando na área dela. */
function DeptStore({ state, income, query }: { state: GameState; income: number; query: string }) {
  const engine = useEngine();
  const talk = useContext(TalkContext);
  const [section, setSection] = useState<DeptSection | 'tms'>('balls');
  const route = getRoute(DEPT_STORE.routeId);
  const unlocked = deptStoreUnlocked(state);
  const here = atDeptStore(state);
  const entries = deptStoreEntries(state);
  const searching = query.trim().length > 0;
  const aisles: { id: DeptSection | 'tms'; label: string; icon: string }[] = [
    ...DEPT_SECTIONS.filter((sec) => entries.some((e) => e.section === sec.id)),
    { id: 'tms', label: 'TMs', icon: 'tm-case' },
  ];
  const openSection = aisles.some((c) => c.id === section) ? section : aisles[0].id;
  const floorIndex = aisles.findIndex((a) => a.id === openSection);
  const floorLabel = aisles[floorIndex]?.label ?? '';
  useEffect(() => {
    talk.setFloor(floorIndex + 1, floorLabel);
  }, [talk, floorIndex, floorLabel]);

  const away = here ? undefined : `Só dá para comprar estando em ${route.name}.`;
  const items: Product[] = entries
    .filter((e) => (searching ? matches(query, itemName(e.id), describe(e.id)) : e.section === openSection))
    .map((entry) => ({
      key: entry.id,
      flyId: entry.id,
      icon: <ItemIcon id={entry.id} size={60} />,
      name: itemName(entry.id),
      desc: describe(entry.id),
      price: entry.price,
      max: 99,
      have: state.items[entry.id],
      blocked: away,
      buy: (s, qty) => buyAtDeptStore(s, entry.id, qty),
    }));
  const tms: Product[] =
    searching || openSection === 'tms'
      ? tmShelf(state)
          .filter((t) => matches(query, moveName(t.move), tmLabel(t.move)))
          .map((entry) => {
            const mv = getMove(entry.move);
            const have = state.tms.includes(entry.move);
            return {
              key: `tm-${entry.move}`,
              flyId: 'tm',
              icon: (
                <span className={`tm-disc type-bg-${mv.type}`}>
                  <ItemIcon id="tm" size={60} />
                </span>
              ),
              name: `${tmLabel(entry.move)} ${moveName(entry.move)}`,
              desc: (
                <>
                  <TypeBadge type={mv.type} /> POD {mv.power} · PRE {mv.accuracy} ·{' '}
                  {mv.category === 'physical' ? 'físico' : 'especial'}
                </>
              ),
              price: entry.price,
              max: 1,
              tag: have ? 'TEM' : undefined,
              blocked: have ? 'Você já tem esse TM.' : away,
              buy: (s) => buyTm(s, entry.move),
            };
          })
      : [];
  const lockedTms = TM_SHELF.length - tmShelf(state).length;

  return (
    <Window frame="menu" className="shop-window dept-store">
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
      ) : null}
      {state.challenge === 'frugal' && (
        <p className="hint">Desafio “Mochila vazia”: só a Master Ball continua à venda entre as bolas.</p>
      )}
      {!searching && <AisleSigns aisles={aisles} current={openSection} onPick={setSection} />}
      {searching && !items.length && !tms.length && (
        <Empty icon="dowsing-machine">Nada encontrado. Tente outra palavra.</Empty>
      )}
      <Showcase state={state} income={income} products={[...items, ...tms]} />
      {openSection === 'tms' && !searching && lockedTms > 0 && (
        <p className="hint">
          Mais {lockedTms} TMs chegam à prateleira conforme você vence ginásios; os TMs dos líderes de uma região
          entram depois do Campeão dela.
        </p>
      )}
    </Window>
  );
}

/** Mercador viajante: ofertas com desconto e estoque limitado, de qualquer lugar, por pouco tempo. */
function Merchant({ state, income }: { state: GameState; income: number }) {
  if (!merchantUnlocked(state)) {
    return (
      <Window frame="menu" className="shop-window">
        <Locked routeId={BALANCE.merchant.unlock} />
      </Window>
    );
  }
  const m = state.merchant;
  const now = state.lastTimerAt;
  const products: Product[] = (m?.offers ?? []).map((o) => ({
    key: o.id,
    flyId: o.id,
    icon: <ItemIcon id={o.id} size={60} />,
    name: itemName(o.id),
    desc: (
      <>
        {describe(o.id)} De <s>₽{formatNumber(o.fullPrice)}</s> · {o.stock > 0 ? `restam ${o.stock}` : 'esgotado'}
      </>
    ),
    price: o.price,
    max: Math.max(0, o.stock),
    have: state.items[o.id],
    tag: <span className="tag tag-sale">−{Math.round((1 - o.price / o.fullPrice) * 100)}%</span>,
    blocked: o.stock <= 0 ? 'Esgotado!' : undefined,
    buy: (s, qty, t) => {
      let ok = false;
      for (let i = 0; i < qty; i++) ok = buyFromMerchant(s, o.id, t) || ok;
      return ok;
    },
  }));
  return (
    <Window frame="menu" className="shop-window">
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
            Vai embora em <Countdown until={m.until} now={now} done="saindo…" />. Estoque limitado.
          </p>
          <Showcase state={state} income={income} products={products} />
        </>
      )}
    </Window>
  );
}
