// PC: o sistema de armazenamento dos portáteis. Equipe no alto, a caixa aberta (6×5) com nome e
// papel de parede, ‹ › e a faixa de caixas para navegar. Pokémon se movem arrastando ou com
// "Mover" + clique no destino (ocupado = troca), inclusive para a equipe. Busca e filtros apagam quem não bate, sem tirar
// ninguém do lugar; a seleção múltipla faz as ações em lote. A ficha da Equipe aparece embaixo.

import { useEffect, useRef, useState } from 'react';
import {
  EMPTY_FILTER,
  TAG_IDS,
  filterActive,
  filterBox,
  renameTag,
  setFavorite,
  setTag,
  tagName,
  transferMany,
  transferPlan,
  type BoxFilter,
} from '../../core/boxes';
import type { GameState } from '../../core/game';
import { transferValue } from '../../core/meta';
import {
  BOX_NAME_MAX,
  BOX_SIZE,
  WALLPAPERS,
  WALLPAPER_NAMES,
  boxName,
  boxWallpaper,
  findInPc,
  movePc,
  pcLayout,
  renameBox,
  setWallpaper,
  sortPc,
  type PcSort,
  type PcSpot,
} from '../../core/pc';
import { isPerfect, pokemonName, type PokemonInstance } from '../../core/pokemon';
import { placeInTeam, removeFromTeam, reservePokemon, reserveSlotsUnlocked } from '../../core/team';
import { audio } from '../audio';
import { GenderMark, ItemIcon, PixelIcon, PokemonSprite, Shiny } from '../components/common';
import { genderOf } from '../../core/gender';
import { useHotkeys } from '../hotkeys';
import { TYPE_NAMES, speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';
import { Summary, busyLabel } from './PartyScreen';
import { PC_DRAG, TEAM_DRAG, teamDropProps } from './teamDrag';

const SORTS: { id: PcSort; label: string }[] = [
  { id: 'dex', label: 'Nº da Pokédex' },
  { id: 'level', label: 'Nível' },
  { id: 'potential', label: 'Potencial' },
  { id: 'type', label: 'Tipo' },
  { id: 'recent', label: 'Mais recentes' },
];

const CHECKS = [
  ['favorites', 'Favoritos'],
  ['shiny', 'Shiny'],
  ['perfect', 'Perfeitos'],
  ['duplicates', 'Repetidos'],
] as const;

/** Arrastar sobre ‹ › por este tempo troca de caixa (para levar o Pokémon a outra caixa). */
const DRAG_FLIP_MS = 450;

export function PcScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const boxes = pcLayout(state);
  const byUid = new Map(state.collection.map((p) => [p.uid, p]));
  const [selected, setSelected] = useState(() => boxes[0].slots.find((u) => u) ?? state.activeUid);
  const [box, setBox] = useState(() => findInPc(boxes, selected)?.box ?? 0);
  const [holding, setHolding] = useState<PcSpot | null>(null);
  const [dragFrom, setDragFrom] = useState<PcSpot | null>(null);
  const [notice, setNotice] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [filter, setFilter] = useState<BoxFilter>(EMPTY_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [editTags, setEditTags] = useState(false);
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const flipTimer = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const current = boxes[Math.min(box, boxes.length - 1)];
  const stored = boxes.reduce((n, b) => n + b.slots.filter((u) => u).length, 0);
  const filtering = filterActive(filter);
  const matches = new Set(filterBox(state, filter, speciesName).map((p) => p.uid));
  const pickedSet = new Set(picked);
  const plan = transferPlan(state, picked);
  const planPoints = plan.reduce((sum, p) => sum + transferValue(p), 0);
  const allFavorite = picked.length > 0 && picked.every((uid) => byUid.get(uid)?.favorite);
  const heldMon = holding ? byUid.get(boxes[holding.box]?.slots[holding.slot] ?? 0) : undefined;
  const team = [
    { uid: state.activeUid, role: 'LUTANDO' },
    ...reservePokemon(state).map((p, i) => ({ uid: p.uid, role: `${i + 2}º DA EQUIPE` })),
  ];
  const freeSlots = Math.max(0, reserveSlotsUnlocked(state) - (team.length - 1));
  const shown = byUid.get(selected) ?? byUid.get(state.activeUid)!;
  const patch = (p: Partial<BoxFilter>) => setFilter((f) => ({ ...f, ...p }));

  useHotkeys({ Escape: () => setHolding(null) }, !!holding);
  useEffect(() => () => clearTimeout(flipTimer.current), []);

  const goBox = (i: number) => {
    setBox((i + boxes.length) % boxes.length);
    setRenaming(false);
    audio.sfx('cursor');
  };

  const move = (from: PcSpot, to: PcSpot) => {
    if (from.box === to.box && from.slot === to.slot) return;
    const uid = boxes[from.box].slots[from.slot];
    engine.dispatch((s) => void movePc(s, from, to));
    setSelected(uid);
    audio.sfx('click');
  };

  /** Leva um Pokémon do PC para a equipe: numa vaga livre ou no lugar de `target`, que volta para o PC. */
  const toTeam = (uid: number, target?: number) => {
    const p = byUid.get(uid);
    if (!p) return;
    const busy = busyLabel(state, uid);
    let placed = false;
    engine.dispatch((s) => void (placed = placeInTeam(s, uid, target)));
    setNotice(
      placed ? '' : busy ? `${pokemonName(p)} não está disponível: ${busy}.` : 'A equipe está cheia.',
    );
    if (placed) setSelected(uid);
    audio.sfx(placed ? 'click' : 'miss');
  };

  /** Clique na equipe ou numa vaga: solta quem está sendo movido; sem ninguém, mostra a ficha. */
  const onTeamClick = (target?: number) => {
    if (holding) {
      const uid = boxes[holding.box]?.slots[holding.slot];
      setHolding(null);
      if (uid) toTeam(uid, target);
    } else if (target) setSelected(target);
  };

  const onCell = (spot: PcSpot, uid: number) => {
    if (holding) {
      move(holding, spot);
      setHolding(null);
    } else if (multi) {
      if (uid) setPicked((l) => (l.includes(uid) ? l.filter((x) => x !== uid) : [...l, uid]));
    } else if (uid) {
      setSelected(uid);
      audio.sfx('cursor');
    }
  };

  /** Solta na faixa de caixas: vai para o primeiro espaço livre daquela caixa. */
  const dropOnBox = (target: number) => {
    if (!dragFrom) return;
    const slot = boxes[target].slots.findIndex((u) => !u);
    if (slot >= 0) move(dragFrom, { box: target, slot });
    setDragFrom(null);
  };

  const flipWhileDragging = (dir: 1 | -1) => {
    clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => goBox(box + dir), DRAG_FLIP_MS);
  };

  const selectedSpot = findInPc(boxes, selected);
  const label = (p: PokemonInstance) =>
    `${pokemonName(p)} Nv. ${p.level}${p.shiny ? ', shiny' : ''}${p.favorite ? ', favorito' : ''}${p.tag ? `, ${tagName(state, p.tag)}` : ''}`;

  return (
    <div className="pcs">
      <div className="pcs-terminal">
        <header className="pcs-head">
          <span className="pcs-led" aria-hidden />
          <strong>PC DE {state.trainerName.toUpperCase()}</strong>
          <small>
            {stored} GUARDADOS · {boxes.length} CAIXAS
          </small>
        </header>

        {/* Equipe: fora das caixas, como nos portáteis. Clique para ver a ficha. */}
        <div className="pcs-team" aria-label="Equipe">
          <span className="pcs-team-label">EQUIPE</span>
          {team.map(({ uid, role }) => {
            const p = byUid.get(uid);
            if (!p) return null;
            return (
              <button
                key={uid}
                className={`pcs-team-mon ${selected === uid ? 'selected' : ''}`}
                onClick={() => onTeamClick(uid)}
                draggable={team.length > 1}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData(TEAM_DRAG, String(uid));
                }}
                {...teamDropProps((from) => toTeam(from, uid))}
                title={`${role}: ${label(p)}`}
                aria-label={`${role}: ${label(p)}`}
              >
                <PokemonSprite speciesId={p.speciesId} kind="icon" />
                <small>{role === 'ATIVO' ? 'ATIVO' : role.split(' ')[0].slice(0, 3)}</small>
              </button>
            );
          })}
          {Array.from({ length: freeSlots }, (_, i) => (
            <button
              key={i}
              className="pcs-team-mon free"
              onClick={() => onTeamClick()}
              {...teamDropProps((from) => toTeam(from))}
              title="Vaga livre: arraste um Pokémon da caixa para cá"
              aria-label="Vaga livre na equipe"
            >
              <span className="pcs-team-plus" aria-hidden>
                +
              </span>
              <small>VAGA</small>
            </button>
          ))}
        </div>
        {notice && (
          <p className="pcs-notice" role="status">
            {notice}
          </p>
        )}

        <div className="pcs-box">
          <div className="pcs-box-head">
            <button
              className="pcs-arrow prev"
              onClick={() => goBox(box - 1)}
              onDragEnter={() => flipWhileDragging(-1)}
              onDragLeave={() => clearTimeout(flipTimer.current)}
              title="Caixa anterior"
              aria-label="Caixa anterior"
            />
            {renaming ? (
              <form
                className="pcs-plate"
                onSubmit={(e) => {
                  e.preventDefault();
                  setRenaming(false);
                }}
              >
                <input
                  autoFocus
                  defaultValue={boxName(current, box)}
                  maxLength={BOX_NAME_MAX}
                  aria-label="Nome da caixa"
                  onBlur={(e) => {
                    const name = e.target.value;
                    engine.dispatch((s) => renameBox(s, box, name));
                    setRenaming(false);
                  }}
                />
              </form>
            ) : (
              <button className="pcs-plate" onClick={() => setRenaming(true)} title="Renomear a caixa">
                <strong>{boxName(current, box)}</strong>
                <small>
                  {current.slots.filter((u) => u).length}/{BOX_SIZE}
                </small>
              </button>
            )}
            <button
              className="pcs-arrow next"
              onClick={() => goBox(box + 1)}
              onDragEnter={() => flipWhileDragging(1)}
              onDragLeave={() => clearTimeout(flipTimer.current)}
              title="Próxima caixa"
              aria-label="Próxima caixa"
            />
          </div>

          <ul className={`pcs-grid wp-${boxWallpaper(current, box)} ${holding ? 'holding' : ''}`}>
            {current.slots.map((uid, slot) => {
              const p = uid ? byUid.get(uid) : undefined;
              const spot = { box, slot };
              const on = multi ? pickedSet.has(uid) : uid === selected;
              const isHeld = holding?.box === box && holding.slot === slot;
              return (
                <li key={slot}>
                  <button
                    className={`pcs-cell ${p ? '' : 'empty'} ${on ? 'selected' : ''} ${isHeld ? 'held' : ''} ${p && filtering && !matches.has(uid) ? 'dim' : ''} ${p && busyLabel(state, uid) ? 'away' : ''}`}
                    draggable={!!p}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', `${box}:${slot}`);
                      e.dataTransfer.setData(PC_DRAG, String(uid));
                      setDragFrom(spot);
                      setHolding(null);
                    }}
                    onDragEnd={() => {
                      setDragFrom(null);
                      clearTimeout(flipTimer.current);
                    }}
                    onDragOver={(e) => {
                      if (dragFrom || e.dataTransfer.types.includes(TEAM_DRAG)) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const member = Number(e.dataTransfer.getData(TEAM_DRAG));
                      if (dragFrom) move(dragFrom, spot);
                      else if (member) engine.dispatch((s) => void removeFromTeam(s, member));
                      setDragFrom(null);
                    }}
                    onClick={() => onCell(spot, uid)}
                    aria-pressed={multi && p ? on : undefined}
                    aria-label={p ? label(p) : `Espaço ${slot + 1} vazio`}
                    title={
                      p
                        ? `${label(p)}${busyLabel(state, uid) ? ` · ${busyLabel(state, uid)}` : ''}`
                        : undefined
                    }
                  >
                    {p && (
                      <>
                        <PokemonSprite speciesId={p.speciesId} kind="icon" />
                        <span className="pcs-lv">{p.level}</span>
                        <GenderMark gender={genderOf(p)} />
                        {p.shiny && <Shiny />}
                        {p.favorite && <PixelIcon name="star" scale={1} className="pcs-fav" />}
                        {p.tag && <span className={`pcs-tag tag-dot tag-${p.tag}`} aria-hidden />}
                        {isPerfect(p.ivs) && <span className="pcs-perfect" title="Perfeito" />}
                        {p.pendingEvolution && <span className="pcs-evo" title="Pronto para evoluir" />}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="pcs-box-foot">
            <span className="pcs-walls" role="group" aria-label="Papel de parede">
              {WALLPAPERS.map((w) => (
                <button
                  key={w}
                  className={`pcs-wall wp-${w} ${boxWallpaper(current, box) === w ? 'on' : ''}`}
                  title={`Papel de parede: ${WALLPAPER_NAMES[w]}`}
                  aria-label={`Papel de parede: ${WALLPAPER_NAMES[w]}`}
                  onClick={() => engine.dispatch((s) => setWallpaper(s, box, w))}
                />
              ))}
            </span>
            {selectedSpot && !multi && !holding && (
              <button
                className="pbtn small"
                onClick={() => {
                  setHolding(selectedSpot);
                  setBox(selectedSpot.box);
                }}
              >
                Mover
              </button>
            )}
          </div>
        </div>

        {/* No toque não há arrastar: as ações do Pokémon selecionado ficam à mão, logo abaixo da caixa. */}
        {!multi && !holding && (
          <div className="pcs-actions" role="toolbar" aria-label="Ações do Pokémon selecionado">
            <strong>{pokemonName(shown)}</strong>
            {selectedSpot ? (
              <>
                <button
                  className="pbtn small primary"
                  onClick={() => {
                    if (freeSlots > 0) toTeam(selected);
                    else {
                      setHolding(selectedSpot);
                      setBox(selectedSpot.box);
                      setNotice('Toque em quem vai sair da equipe.');
                    }
                  }}
                >
                  {freeSlots > 0 ? 'Pôr na equipe' : 'Trocar na equipe'}
                </button>
                <button
                  className="pbtn small"
                  onClick={() => {
                    setHolding(selectedSpot);
                    setBox(selectedSpot.box);
                  }}
                >
                  Mover
                </button>
              </>
            ) : (
              <button
                className="pbtn small"
                disabled={team.length < 2}
                onClick={() => engine.dispatch((s) => void removeFromTeam(s, selected))}
              >
                Tirar da equipe
              </button>
            )}
            <button
              className="pbtn small"
              onClick={() => sheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Ver ficha
            </button>
          </div>
        )}

        {/* Todas as caixas: quanto cada uma está cheia (e quantos batem com a busca). */}
        <nav className="pcs-boxes" aria-label="Caixas">
          {boxes.map((b, i) => {
            const count = b.slots.filter((u) => u).length;
            const hits = filtering ? b.slots.filter((u) => u && matches.has(u)).length : 0;
            return (
              <button
                key={i}
                className={`pcs-mini wp-${boxWallpaper(b, i)} ${i === box ? 'on' : ''}`}
                onClick={() => goBox(i)}
                onDragOver={(e) => dragFrom && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOnBox(i);
                }}
                title={`${boxName(b, i)}: ${count}/${BOX_SIZE}`}
                aria-label={`${boxName(b, i)}, ${count} de ${BOX_SIZE}`}
              >
                <span>{i + 1}</span>
                <i style={{ height: `${(count / BOX_SIZE) * 100}%` }} />
                {hits > 0 && <b className="pcs-hits">{hits}</b>}
              </button>
            );
          })}
        </nav>
      </div>

      {holding && heldMon && (
        <div className="pcs-holding" role="status">
          <PokemonSprite speciesId={heldMon.speciesId} kind="icon" />
          <span>
            Movendo <strong>{pokemonName(heldMon)}</strong>: clique num espaço (de qualquer caixa) ou na
            equipe para soltar. Ocupado = troca de lugar.
          </span>
          <button className="pbtn small" onClick={() => setHolding(null)}>
            Cancelar
          </button>
        </div>
      )}

      <div className="box-toolbar">
        <input
          type="search"
          value={filter.text}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder="Buscar nome ou nº…"
          aria-label="Buscar no PC"
        />
        <button
          className={`pbtn small ${showFilters || filtering ? 'on' : ''}`}
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filtros{filtering ? ' •' : ''}
        </button>
        <button
          className={`pbtn small ${multi ? 'on' : ''}`}
          aria-pressed={multi}
          onClick={() => {
            setMulti((v) => !v);
            setPicked([]);
            setHolding(null);
          }}
        >
          {multi ? 'Concluir seleção' : 'Selecionar vários'}
        </button>
        <select
          value=""
          aria-label="Organizar as caixas"
          onChange={(e) => {
            const by = e.target.value as PcSort;
            const name = SORTS.find((x) => x.id === by)?.label;
            if (by && window.confirm(`Organizar todas as caixas por ${name}? Os Pokémon mudam de lugar.`))
              engine.dispatch((s) => sortPc(s, by));
          }}
        >
          <option value="">Organizar…</option>
          {SORTS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      </div>

      {showFilters && (
        <div className="box-filters frame frame-dialog">
          <label>
            Tipo
            <select
              value={filter.type}
              onChange={(e) => patch({ type: e.target.value as BoxFilter['type'] })}
            >
              <option value="">Todos</option>
              {Object.entries(TYPE_NAMES).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etiqueta
            <select value={filter.tag} onChange={(e) => patch({ tag: e.target.value as BoxFilter['tag'] })}>
              <option value="">Todas</option>
              <option value="none">Sem etiqueta</option>
              {TAG_IDS.map((t) => (
                <option key={t} value={t}>
                  {tagName(state, t)}
                </option>
              ))}
            </select>
          </label>
          {CHECKS.map(([key, text]) => (
            <label key={key} className="box-check">
              <input
                type="checkbox"
                checked={filter[key]}
                onChange={(e) => patch({ [key]: e.target.checked })}
              />
              {text}
            </label>
          ))}
          <button className="pbtn small" onClick={() => setFilter(EMPTY_FILTER)} disabled={!filtering}>
            Limpar filtros
          </button>
          <button className="pbtn small" onClick={() => setEditTags((v) => !v)} aria-expanded={editTags}>
            Renomear etiquetas
          </button>
          {editTags && (
            <ul className="tag-names">
              {TAG_IDS.map((t) => (
                <li key={t}>
                  <span className={`tag-dot tag-${t}`} aria-hidden />
                  <input
                    defaultValue={tagName(state, t)}
                    maxLength={16}
                    aria-label={`Nome da etiqueta ${tagName(state, t)}`}
                    onBlur={(e) => engine.dispatch((s) => renameTag(s, t, e.target.value))}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {multi && (
        <div className="box-bulk frame frame-dialog" role="toolbar" aria-label="Ações para os selecionados">
          <span>
            <strong>{picked.length}</strong> selecionado(s)
          </span>
          <button className="pbtn small" onClick={() => setPicked(current.slots.filter((u) => u))}>
            Toda a caixa
          </button>
          {filtering && (
            <button
              className="pbtn small"
              onClick={() => setPicked([...matches].filter((u) => findInPc(boxes, u)))}
            >
              Todos os filtrados
            </button>
          )}
          <button className="pbtn small" disabled={!picked.length} onClick={() => setPicked([])}>
            Limpar
          </button>
          <button
            className="pbtn small"
            disabled={!picked.length}
            onClick={() => engine.dispatch((s) => setFavorite(s, picked, !allFavorite))}
          >
            {allFavorite ? 'Tirar dos favoritos' : 'Favoritar'}
          </button>
          <span className="tag-picker" role="group" aria-label="Etiquetar">
            {TAG_IDS.map((t) => (
              <button
                key={t}
                className={`tag-dot tag-${t}`}
                title={`Etiquetar: ${tagName(state, t)}`}
                aria-label={`Etiquetar: ${tagName(state, t)}`}
                disabled={!picked.length}
                onClick={() => engine.dispatch((s) => setTag(s, picked, t))}
              />
            ))}
            <button
              className="tag-dot tag-none"
              title="Tirar etiqueta"
              aria-label="Tirar etiqueta"
              disabled={!picked.length}
              onClick={() => engine.dispatch((s) => setTag(s, picked, null))}
            />
          </span>
          <button
            className="pbtn small danger"
            disabled={!plan.length}
            title="Só duplicatas livres e que não são favoritas; sempre fica ao menos um de cada espécie."
            onClick={() => {
              const ask = `Transferir ${plan.length} Pokémon para o Laboratório por ${planPoints} pontos de pesquisa?`;
              if (!window.confirm(ask)) return;
              engine.dispatch((s) => void transferMany(s, picked));
              setPicked([]);
            }}
          >
            Transferir {plan.length} (+{planPoints} pesquisa)
          </button>
        </div>
      )}

      {!multi && shown && (
        <div ref={sheetRef}>
          <Summary state={state} p={shown} />
        </div>
      )}
      {!stored && (
        <p className="hint">
          <ItemIcon id="poke-ball" size={20} /> Seus Pokémon capturados ficam guardados aqui.
        </p>
      )}
    </div>
  );
}
