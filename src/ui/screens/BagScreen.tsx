// MOCHILA: bolsos de itens e de TMs, no estilo da mochila do FRLG. As compras ficam na
// tela LOJA (ShopScreen).

import { useState } from 'react';
import {
  BALANCE,
  BERRIES,
  FOSSILS,
  getLure,
  getMove,
  getRoute,
  getSpecies,
  isHeldItem,
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
import { teamPokemon } from '../../core/team';
import { eatBerry } from '../../core/garden';
import { bossLook } from '../../core/rival';
import { activeLure, applyLure } from '../../core/lures';
import { itemEvolution } from '../../core/progression';
import { movesOf, pokemonName } from '../../core/pokemon';
import { TM_CATALOG, canLearnTm, teachTm, tmLabel, tmSources } from '../../core/tms';
import { ItemIcon, Money, PixelIcon, PokemonSprite, TypeBadge, Window } from '../components/common';
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

type Pocket = 'items' | 'tms';

export function BagScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const [pocket, setPocket] = useState<Pocket>('items');
  const owned = Object.entries(state.items).filter(([, n]) => n > 0);
  const [selected, setSelected] = useState<string | null>(owned[0]?.[0] ?? null);
  const eligible = selected
    ? state.collection.filter((p) => itemEvolution(p, selected, state.env.period) !== undefined)
    : [];
  const berry = selected ? BERRIES.find((b) => b.id === selected) : undefined;
  const fossil = selected ? FOSSILS.find((f) => f.item === selected) : undefined;
  // Itens seguráveis e vitaminas podem ser usados direto na equipe.
  const team = teamPokemon(state);
  const holdable = !!selected && isHeldItem(selected);
  const vitamin = !!selected && !!vitaminStat(selected);
  const lure = selected ? getLure(selected) : undefined;
  const lureNow = lure ? activeLure(state, lure.kind) : null;

  return (
    <div className="bag-screen">
      <div className="bag-pockets">
        <span key={pocket} className={`bag-art pocket-${pocket}`} aria-hidden>
          <PixelIcon name="bag" scale={5} palette={pocket === 'tms' ? { c: '#e8a040' } : undefined} />
        </span>
        <button className={`pocket ${pocket === 'items' ? 'active' : ''}`} onClick={() => setPocket('items')}>
          <ItemIcon id="explorer-kit" size={30} /> ITENS
        </button>
        <button className={`pocket ${pocket === 'tms' ? 'active' : ''}`} onClick={() => setPocket('tms')}>
          <ItemIcon id="tm-case" size={30} /> TMs · {state.tms.length}
        </button>
        <span className="bag-money frame frame-menu">
          <Money value={state.coins} />
        </span>
      </div>

      {pocket === 'items' ? (
        <>
          <Window frame="menu">
            <ul className="item-list bag-list">
              {owned.map(([id, n], i) => (
                <li key={id} style={{ ['--i' as string]: Math.min(i, 12) }}>
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
              {!owned.length && <li className="hint">A mochila está vazia. Compre itens na LOJA.</li>}
            </ul>
          </Window>
          {selected && (
            <div className="item-desc frame frame-dialog" key={selected}>
              <span className="item-desc-art">
                <ItemIcon id={selected} size={48} />
              </span>
              <div>
                <p>{itemDescription(selected) || itemName(selected)}</p>
                {berry && (state.items[selected] ?? 0) > 0 && (
                  <button
                    className="pbtn small"
                    onClick={() => engine.dispatch((s) => eatBerry(s, selected))}
                  >
                    Comer agora
                  </button>
                )}
                {lure && (state.items[selected] ?? 0) > 0 && (
                  <div className="item-use">
                    <button
                      className="pbtn small primary"
                      onClick={() => {
                        engine.dispatch((s) => applyLure(s, selected));
                        audio.sfx('click');
                      }}
                    >
                      Usar ({lure.minutes} min)
                    </button>
                    {lureNow && (
                      <span className="hint">
                        Ativo: {itemName(lureNow.item)}, {formatDuration(lureNow.ms)} restantes
                        {lure.kind === 'incense' && lureNow.item !== selected
                          ? ' (usar troca o incenso)'
                          : ''}
                      </span>
                    )}
                  </div>
                )}
                {(holdable || vitamin) && (
                  <div className="item-use">
                    {team.map((p) => (
                      <button
                        key={p.uid}
                        className="pbtn small"
                        disabled={holdable && p.held === selected}
                        onClick={() =>
                          engine.dispatch((s) =>
                            holdable ? equipItem(s, p.uid, selected!) : giveVitamin(s, p.uid, selected!),
                          )
                        }
                      >
                        <PokemonSprite speciesId={p.speciesId} kind="icon" />{' '}
                        {holdable ? 'Equipar em' : 'Dar a'} {speciesName(p.speciesId)}
                        {holdable && p.held ? ` (troca ${itemName(p.held)})` : ''}
                      </button>
                    ))}
                  </div>
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
                <SellBox state={state} id={selected} />
              </div>
            </div>
          )}
        </>
      ) : (
        <TmPocket state={state} />
      )}
    </div>
  );
}

/** Venda pela metade do preço de loja; vender tudo de um item caro pede confirmação. */
function SellBox({ state, id }: { state: GameState; id: string }) {
  const engine = useEngine();
  const have = state.items[id] ?? 0;
  const unit = sellPrice(id);
  // Moedas que sobem da venda (a chave reinicia a animação a cada venda).
  const [sold, setSold] = useState<{ n: number; amount: number } | null>(null);
  if (have <= 0) return null;
  if (unit <= 0) return <p className="hint">Este item não tem valor de venda.</p>;
  const sell = (qty: number) => {
    if (
      qty > 1 &&
      unit * qty >= 20_000 &&
      !window.confirm(`Vender ${qty}× ${itemName(id)} por ${unit * qty} moedas?`)
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
      {!list.length && <p className="hint">Nenhum TM ainda.</p>}
      <ul className="item-list tm-list">
        {list.map(({ move }) => {
          const mv = getMove(move);
          const have = owned.has(move);
          const learners = state.collection.filter((p) => getSpecies(p.speciesId).tmMoves.includes(move));
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
    .filter((p) => canLearnTm(state, p.speciesId, move))
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
