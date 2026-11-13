// MOCHILA, como nos portáteis: bolsos (itens, Poké Balls, berries e remédios, pedras e Megas, itens de segurar, TMs
// e itens-chave), a mochila em pixel art que balança ao trocar de bolso, a lista com a setinha e a caixa de texto
// fixa embaixo. Escolher um item abre o menu USAR / DAR / VENDER / CANCELAR; USAR e DAR mostram a equipe com quem
// PODE e quem NÃO PODE. As compras ficam na LOJA (ShopScreen).

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  BALANCE,
  BERRIES,
  FOSSILS,
  assetUrl,
  getLure,
  getMove,
  getRoute,
  isHeldItem,
  speciesOf,
  vitaminStat,
} from '../../game-data';
import {
  applyEvolutionItem,
  equipItem,
  giveVitamin,
  sellItem,
  sellPrice,
  type GameState,
} from '../../core/game';
import type { PokemonInstance } from '../../core/pokemon';
import { teamPokemon } from '../../core/team';
import { eatBerry } from '../../core/garden';
import { bossLook } from '../../core/rival';
import { activeLure, applyLure } from '../../core/lures';
import { itemEvolution } from '../../core/progression';
import { movesOf, pokemonName } from '../../core/pokemon';
import { TM_CATALOG, canLearnTm, teachTm, tmLabel, tmSources } from '../../core/tms';
import { ItemIcon, Money, PokemonSprite, TypeBadge, Window } from '../components/common';
import { PixelFx } from '../components/PixelFx';
import {
  formatDuration,
  formatNumber,
  itemDescription,
  itemName,
  moveName,
  speciesName,
} from '../i18n/pt-BR';
import { audio } from '../audio';
import { useEngine } from '../useGame';
import { Empty } from '../components/Dynamic';
import { askConfirm } from '../components/GameConfirm';
import {
  POCKETS,
  SORT_LABEL,
  itemPocket,
  keyItems,
  loadSeen,
  loadSort,
  nextSort,
  saveSeen,
  saveSort,
  type PocketId,
  type SortMode,
} from './bag/pockets';

type Action = 'menu' | 'use' | 'give' | 'sell' | null;

export function BagScreen({ state }: { state: GameState }) {
  const [pocket, setPocket] = useState<PocketId>('items');
  const [selected, setSelected] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [sort, setSort] = useState<SortMode>(loadSort);
  const owned = useMemo(() => Object.entries(state.items).filter(([, n]) => n > 0), [state.items]);
  const [seen, setSeen] = useState(() => loadSeen(owned.map(([id]) => id)));

  // Itens de cada bolso, na ordem escolhida (TIPO é a ordem em que o jogo guarda).
  const byPocket = useMemo(() => {
    const map = new Map<PocketId, [string, number][]>(POCKETS.map((p) => [p.id, []]));
    for (const entry of owned) map.get(itemPocket(entry[0]))!.push(entry);
    for (const list of map.values()) {
      if (sort === 'name') list.sort((a, b) => itemName(a[0]).localeCompare(itemName(b[0])));
      if (sort === 'count') list.sort((a, b) => b[1] - a[1]);
    }
    map.set(
      'key',
      keyItems(state.upgrades).map((id) => [id, 1]),
    );
    return map;
  }, [owned, sort, state.upgrades]);
  const list = byPocket.get(pocket) ?? [];
  const current = selected && list.some(([id]) => id === selected) ? selected : (list[0]?.[0] ?? null);
  const index = POCKETS.findIndex((p) => p.id === pocket);
  const def = POCKETS[index];

  const goPocket = (id: PocketId) => {
    if (id === pocket) return;
    setPocket(id);
    setSelected(null);
    setAction(null);
    audio.sfx('zipper');
  };
  const step = (d: 1 | -1) => goPocket(POCKETS[(index + d + POCKETS.length) % POCKETS.length].id);
  const choose = (id: string) => {
    setSelected(id);
    setAction(pocket === 'key' ? null : 'menu');
    audio.sfx('cursor');
    if (!seen.has(id)) {
      const next = new Set(seen).add(id);
      setSeen(next);
      saveSeen(next);
    }
  };
  const newIn = (id: PocketId) => (byPocket.get(id) ?? []).some(([item]) => !seen.has(item));

  return (
    <div className="bag-screen bag2">
      <aside className="bag-side">
        <div className="bag-figure">
          <button className="bag-arrow" onClick={() => step(-1)} aria-label="Bolso anterior">
            ◀
          </button>
          <span
            key={pocket}
            className="bag-sprite"
            style={
              {
                ['--f' as string]: def.frame,
                backgroundImage: `url(${assetUrl('sprites/ui/bag.png')})`,
              } as CSSProperties
            }
            aria-hidden
          />
          <button className="bag-arrow" onClick={() => step(1)} aria-label="Próximo bolso">
            ▶
          </button>
        </div>
        <h3 className="bag-pocket-name">{def.label}</h3>
        <div className="bag-tabs" role="tablist" aria-label="Bolsos da mochila">
          {POCKETS.map((p) => {
            const count = p.id === 'tms' ? state.tms.length : (byPocket.get(p.id)?.length ?? 0);
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={p.id === pocket}
                className={`bag-tab ${p.id === pocket ? 'active' : ''}`}
                style={{ ['--f' as string]: p.frame } as CSSProperties}
                onClick={() => goPocket(p.id)}
                title={`${p.label} · ${count}`}
              >
                <ItemIcon id={p.icon} size={26} />
                {p.id !== 'tms' && p.id !== 'key' && newIn(p.id) && <i className="bag-tab-new" aria-hidden />}
              </button>
            );
          })}
        </div>
        <span className="bag-money frame frame-menu">
          <Money value={state.coins} />
        </span>
      </aside>

      <section className="bag-main">
        {pocket === 'tms' ? (
          <TmPocket state={state} />
        ) : (
          <>
            <div className="bag-list-head">
              <span>
                {list.length} {list.length === 1 ? 'item' : 'itens'}
              </span>
              {pocket !== 'key' && (
                <button
                  className="pbtn small"
                  onClick={() => {
                    const m = nextSort(sort);
                    setSort(m);
                    saveSort(m);
                  }}
                >
                  ORGANIZAR: {SORT_LABEL[sort]}
                </button>
              )}
            </div>
            <ScrollList>
              {list.map(([id, n]) => (
                <li key={id}>
                  <button
                    className={`item-row ${current === id ? 'selected' : ''}`}
                    onClick={() => choose(id)}
                    aria-haspopup={pocket === 'key' ? undefined : 'menu'}
                  >
                    <ItemIcon id={id} size={30} />
                    <span className="item-name">
                      {(id === 'tm-case' ? 'Estojo de TMs' : itemName(id)).toUpperCase()}
                    </span>
                    {!seen.has(id) && pocket !== 'key' && <span className="bag-new">NOVO</span>}
                    {pocket !== 'key' && (
                      <span key={n} className="item-qty">
                        ×{n}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {!list.length && (
                <li>
                  <Empty icon={def.icon}>
                    Nada neste bolso. Os itens chegam pelas lutas, pela LOJA e pelas atividades.
                  </Empty>
                </li>
              )}
            </ScrollList>
          </>
        )}
      </section>

      {pocket !== 'tms' && current && (
        <ItemBox
          key={current}
          state={state}
          id={current}
          keyItem={pocket === 'key'}
          action={selected === current ? action : null}
          setAction={setAction}
        />
      )}
    </div>
  );
}

/** Lista com as setas ▲▼ piscando quando há mais itens para cima ou para baixo. */
function ScrollList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ up: false, down: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const up = el.scrollTop > 2;
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setEdges((e) => (e.up === up && e.down === down ? e : { up, down }));
  }, []);
  // A cada desenho (a lista muda de tamanho ao trocar de bolso ou de ordem) e quando a caixa muda de tamanho.
  useEffect(() => measure());
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  return (
    <div className="bag-list-wrap frame frame-menu">
      {edges.up && (
        <span className="bag-scroll up" aria-hidden>
          ▲
        </span>
      )}
      <ul ref={ref} className="item-list bag-list" onScroll={measure}>
        {children}
      </ul>
      {edges.down && (
        <span className="bag-scroll down" aria-hidden>
          ▼
        </span>
      )}
    </div>
  );
}

/** Caixa de texto do item (sempre à vista) com o menu de ação e a escolha do Pokémon. */
function ItemBox({
  state,
  id,
  keyItem,
  action,
  setAction,
}: {
  state: GameState;
  id: string;
  keyItem: boolean;
  action: Action;
  setAction: (a: Action) => void;
}) {
  const engine = useEngine();
  const have = state.items[id] ?? 0;
  const team = teamPokemon(state);
  const berry = BERRIES.some((b) => b.id === id);
  const lure = getLure(id);
  const lureNow = lure ? activeLure(state, lure.kind) : null;
  const fossil = FOSSILS.find((f) => f.item === id);
  const vitamin = !!vitaminStat(id);
  const evolvers = state.collection.filter((p) => itemEvolution(p, id, state.env.period) !== undefined);
  const evolutionItem = evolvers.length > 0 || itemPocket(id) === 'stones';
  const canUse = !keyItem && have > 0 && (berry || !!lure || vitamin || evolutionItem);
  const canGive = !keyItem && have > 0 && isHeldItem(id);
  const canSell = !keyItem && have > 0 && sellPrice(id) > 0;
  // Ao abrir o menu ou a escolha do Pokémon, a caixa vem para a vista (no celular ela fica abaixo da lista).
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    if (action) box.current?.scrollIntoView({ block: 'nearest' });
  }, [action]);

  const use = () => {
    if (berry) {
      engine.dispatch((s) => eatBerry(s, id));
      audio.sfx('munch');
      setAction(null);
    } else if (lure) {
      engine.dispatch((s) => applyLure(s, id));
      audio.sfx('item');
      setAction(null);
    } else setAction('use');
  };

  return (
    <footer ref={box} className="bag-desc frame frame-dialog">
      <span className="item-desc-art">
        <ItemIcon id={id} size={48} />
      </span>
      <div className="bag-desc-text">
        <p>{itemDescription(id) || itemName(id)}</p>
        {fossil && (
          <p className="hint">
            Revive: {speciesName(fossil.speciesId)} em {fossil.hours} h.
          </p>
        )}
        {lureNow && (
          <p className="hint">
            Ativo: {itemName(lureNow.item)}, {formatDuration(lureNow.ms)} restantes
            {lure?.kind === 'incense' && lureNow.item !== id ? ' (usar troca o incenso)' : ''}
          </p>
        )}
        {action === 'use' && (vitamin || evolutionItem) && (
          <PartyPicker
            title={vitamin ? `Dar ${itemName(id)} a quem?` : `Usar ${itemName(id)} em quem?`}
            list={vitamin ? team : uniqueBy([...evolvers, ...team])}
            can={(p) => (vitamin ? true : evolvers.includes(p))}
            onPick={(p) => {
              engine.dispatch((s) =>
                vitamin ? giveVitamin(s, p.uid, id) : applyEvolutionItem(s, p.uid, id),
              );
              audio.sfx(vitamin ? 'item' : 'evolve');
              setAction(null);
            }}
            onCancel={() => setAction('menu')}
          />
        )}
        {action === 'give' && (
          <PartyPicker
            title={`Dar ${itemName(id)} para segurar?`}
            list={team}
            can={(p) => p.held !== id}
            note={(p) => (p.held ? `segura ${itemName(p.held)}` : undefined)}
            onPick={(p) => {
              engine.dispatch((s) => equipItem(s, p.uid, id));
              audio.sfx('item');
              setAction(null);
            }}
            onCancel={() => setAction('menu')}
          />
        )}
        {action === 'sell' && <SellBox state={state} id={id} onBack={() => setAction('menu')} />}
      </div>
      {action === 'menu' && (
        <ul className="bag-menu frame frame-menu" role="menu">
          <li>
            <button role="menuitem" disabled={!canUse} onClick={use}>
              {berry ? 'COMER' : 'USAR'}
            </button>
          </li>
          <li>
            <button role="menuitem" disabled={!canGive} onClick={() => setAction('give')}>
              DAR
            </button>
          </li>
          <li>
            <button role="menuitem" disabled={!canSell} onClick={() => setAction('sell')}>
              VENDER
            </button>
          </li>
          <li>
            <button role="menuitem" onClick={() => setAction(null)}>
              CANCELAR
            </button>
          </li>
        </ul>
      )}
    </footer>
  );
}

const uniqueBy = (list: PokemonInstance[]) => [...new Map(list.map((p) => [p.uid, p])).values()];

/** Escolha do Pokémon, como nos jogos: os ícones da equipe com PODE ou NÃO PODE. */
function PartyPicker({
  title,
  list,
  can,
  note,
  onPick,
  onCancel,
}: {
  title: string;
  list: PokemonInstance[];
  can: (p: PokemonInstance) => boolean;
  note?: (p: PokemonInstance) => string | undefined;
  onPick: (p: PokemonInstance) => void;
  onCancel: () => void;
}) {
  return (
    <div className="bag-picker">
      <p className="bag-picker-title">{title}</p>
      <ul>
        {list.slice(0, 12).map((p) => {
          const ok = can(p);
          return (
            <li key={p.uid}>
              <button
                className={`bag-pick ${ok ? 'can' : 'cannot'}`}
                disabled={!ok}
                onClick={() => onPick(p)}
              >
                <PokemonSprite speciesId={p.speciesId} kind="icon" form={p.form} shiny={p.shiny} />
                <span className="bag-pick-name">
                  {pokemonName(p)} <small>Nv{p.level}</small>
                </span>
                <span className="bag-pick-tag">{ok ? 'PODE' : 'NÃO PODE'}</span>
                {note?.(p) && <small className="bag-pick-note">{note(p)}</small>}
              </button>
            </li>
          );
        })}
      </ul>
      <button className="pbtn small" onClick={onCancel}>
        VOLTAR
      </button>
    </div>
  );
}

/** Venda pela metade do preço de loja; vender tudo de um item caro pede confirmação. */
function SellBox({ state, id, onBack }: { state: GameState; id: string; onBack?: () => void }) {
  const engine = useEngine();
  const have = state.items[id] ?? 0;
  const unit = sellPrice(id);
  // Moedas que sobem da venda (a chave reinicia a animação a cada venda).
  const [sold, setSold] = useState<{ n: number; amount: number } | null>(null);
  if (have <= 0) return null;
  if (unit <= 0) return <p className="hint">Este item não tem valor de venda.</p>;
  const sell = async (qty: number) => {
    if (
      qty > 1 &&
      unit * qty >= 20_000 &&
      !(await askConfirm(`Vender ${qty}× ${itemName(id)} por ${unit * qty} moedas?`))
    )
      return;
    engine.dispatch((s) => sellItem(s, id, qty));
    audio.sfx('coin');
    setSold((v) => ({ n: (v?.n ?? 0) + 1, amount: unit * qty }));
  };
  return (
    <div className="sell-box">
      {sold && (
        <span key={sold.n} className="sell-fx" aria-hidden>
          <PixelFx fx="coins" scale={2} x="50%" y="50%" />
          <b>+₽{formatNumber(sold.amount)}</b>
        </span>
      )}
      <span>
        Vender por <Money value={unit} /> cada
      </span>
      <button className="pbtn small" onClick={() => sell(1)}>
        Vender 1
      </button>
      {have > 1 && (
        <button className="pbtn small" onClick={() => sell(have)}>
          Vender todos ({have}) · <Money value={unit * have} />
        </button>
      )}
      {onBack && (
        <button className="pbtn small" onClick={onBack}>
          VOLTAR
        </button>
      )}
    </div>
  );
}

/** Estojo de TMs: o catálogo inteiro (os que faltam mostram onde conseguir) e o ensino direto. */
function TmPocket({ state }: { state: GameState }) {
  const [onlyOwned, setOnlyOwned] = useState(state.tms.length > 0);
  const [open, setOpen] = useState<string | null>(null);
  const owned = new Set(state.tms);
  const list = TM_CATALOG.filter((t) => !onlyOwned || owned.has(t.move));
  return (
    <Window
      frame="menu"
      title={`ESTOJO DE TMs · ${state.tms.length}/${TM_CATALOG.length}`}
      icon={<ItemIcon id="tm-case" size={24} />}
    >
      <p className="hint">
        Um TM liberado ensina quantas vezes você quiser. Líderes de ginásio entregam TMs; outros vêm da Torre,
        do Game Corner, das expedições e da prateleira de TMs da Loja de Departamentos.
      </p>
      <label className="check">
        <input type="checkbox" checked={onlyOwned} onChange={(e) => setOnlyOwned(e.target.checked)} /> Só os
        que eu tenho
      </label>
      {!list.length && <Empty icon="tm-case">Nenhum TM ainda. Os líderes de ginásio dão os primeiros.</Empty>}
      <ul className="item-list tm-list">
        {list.map(({ move }) => {
          const mv = getMove(move);
          const have = owned.has(move);
          const learners = state.collection.filter((p) =>
            speciesOf(p.speciesId, p.form).tmMoves.includes(move),
          );
          return (
            <li key={move} className={`tm-entry ${have ? '' : 'missing'}`}>
              <button
                className={`tm-row ${open === move ? 'selected' : ''}`}
                aria-expanded={open === move}
                onClick={() => setOpen(open === move ? null : move)}
              >
                <span className={`tm-disc type-bg-${mv.type}`}>
                  <ItemIcon id="tm" size={28} />
                </span>
                <div className="mart-info">
                  <span className="item-name">
                    {tmLabel(move)} · {have ? moveName(move).toUpperCase() : moveName(move)}
                  </span>
                  <small>
                    <TypeBadge type={mv.type} /> POD {mv.power} · PRE {mv.accuracy} ·{' '}
                    {mv.category === 'physical' ? 'físico' : 'especial'}
                  </small>
                </div>
                <span className="tm-learners">
                  {learners.slice(0, 5).map((p) => (
                    <PokemonSprite key={p.uid} speciesId={p.speciesId} kind="icon" />
                  ))}
                  {learners.length > 5 && <small>+{learners.length - 5}</small>}
                </span>
              </button>
              {open === move &&
                (have ? (
                  <TmTeach state={state} move={move} />
                ) : (
                  <p className="tm-where">{tmSourceText(state, move)}</p>
                ))}
            </li>
          );
        })}
      </ul>
    </Window>
  );
}

/** Onde conseguir um TM que o jogador ainda não tem. */
function tmSourceText(state: GameState, move: string): string {
  const parts = tmSources(move).map((src) => {
    switch (src.kind) {
      case 'boss': {
        const boss = bossLook(state, getRoute(src.routeId).boss!);
        return `${boss.name} (${boss.title})`;
      }
      case 'shop':
        return `Loja de Departamentos por ${formatNumber(src.price)}${
          src.requiresBoss && !state.routes[src.requiresBoss]?.bossDefeated
            ? ` depois de vencer ${bossLook(state, getRoute(src.requiresBoss).boss!).name} (${getRoute(src.requiresBoss).name})`
            : ''
        }`;
      case 'tower':
        return 'prêmio da Torre de Batalha';
      case 'gamecorner':
        return 'prêmio do Game Corner';
      case 'expedition':
        return 'expedições';
    }
  });
  return `Onde conseguir: ${parts.join(' · ')}.`;
}

/** Ensinar o TM: quem da coleção aprende e qual golpe sai. */
function TmTeach({ state, move }: { state: GameState; move: string }) {
  const engine = useEngine();
  const [uid, setUid] = useState<number | null>(null);
  const learners = state.collection
    .filter((p) => canLearnTm(state, p.speciesId, move, p.form))
    .sort(
      (a, b) => Number(b.uid === state.activeUid) - Number(a.uid === state.activeUid) || b.level - a.level,
    );
  if (!learners.length) return <p className="tm-where">Ninguém da sua coleção aprende este golpe.</p>;
  const p = learners.find((x) => x.uid === uid);
  const teach = (replace?: string) => {
    engine.dispatch((s) => {
      const ok = teachTm(s, p!.uid, move, replace);
      if (ok) audio.sfx('itemGet');
      return ok;
    });
    setUid(null);
  };
  return (
    <div className="tm-teach">
      <ul className="pc-box picker">
        {learners.map((x) => {
          const knows = movesOf(x).includes(move);
          return (
            <li key={x.uid}>
              <button
                className={`pc-cell ${uid === x.uid ? 'selected' : ''}`}
                disabled={knows}
                onClick={() => setUid(x.uid)}
                title={`${pokemonName(x)} Nv. ${x.level}${knows ? ' (já usa este golpe)' : ''}`}
              >
                <PokemonSprite speciesId={x.speciesId} kind="icon" />
                <span>{knows ? 'JÁ USA' : `Nv${x.level}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {p && (
        <div className="tm-replace">
          <p>
            Ensinar {moveName(move).toUpperCase()} a {pokemonName(p).toUpperCase()}
            {movesOf(p).length >= BALANCE.maxMoves ? '. Qual golpe sai?' : '?'}
          </p>
          <div className="tm-replace-moves">
            {movesOf(p).length < BALANCE.maxMoves && (
              <button className="pbtn small primary" onClick={() => teach()}>
                Ensinar
              </button>
            )}
            {movesOf(p).length >= BALANCE.maxMoves &&
              movesOf(p).map((m) => (
                <button key={m} className={`pbtn small type-bg-${getMove(m).type}`} onClick={() => teach(m)}>
                  Esquecer {moveName(m)}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
