// Tela POKéMON: equipe (ativo + reservas + apoio) no estilo FRLG, Caixa com a coleção e ficha de resumo.

import { useState } from 'react';
import {
  MASTERY_BONUS_PER_LEVEL,
  PASSIVE_SLOTS,
  RESERVE_SLOTS,
  getItem,
  getNature,
  getMove,
  formName,
  getRoute,
  getSpecies,
} from '../../game-data';
import {
  BONUS_KINDS,
  computeModifiers,
  masteryOf,
  passiveContributions,
  passiveSlotsUnlocked,
  type PassiveContribution,
} from '../../core/bonuses';
import {
  applyEvolutionItem,
  confirmEvolution,
  recordOf,
  setActive,
  setCompanion,
  toggleEvolutionLock,
  giveRareCandy,
  weekOf,
  weeklyMvp,
  type GameState,
} from '../../core/game';
import { isFallen } from '../../core/nuzlocke';
import { rngFrom } from '../../core/rng';
import {
  EMPTY_FILTER,
  TAG_IDS,
  filterActive,
  filterBox,
  renameTag,
  setFavorite,
  setTag,
  tagName,
  toggleFavorite,
  transferMany,
  transferPlan,
  type BoxFilter,
  type TagId,
} from '../../core/boxes';
import { addPassive, canTransfer, removePassive, transferPokemon, transferValue } from '../../core/meta';
import { learnableMoves, setMoveset } from '../../core/moveset';
import {
  NICKNAME_MAX,
  evsOf,
  isPerfect,
  movesOf,
  pokemonName,
  potential,
  setNickname,
  statsOf,
  type PokemonInstance,
} from '../../core/pokemon';
import { levelProgress } from '../../core/progression';
import { addReserve, removeReserve, reservePokemon, reserveSlotsUnlocked } from '../../core/team';
import { evolutionHint } from '../components/ActiveCard';
import { Depth } from './party/Depth';
import {
  Bar,
  ExpBar,
  HpBar,
  ItemIcon,
  PixelIcon,
  PokemonSprite,
  Shiny,
  TypeBadge,
  Window,
} from '../components/common';
import {
  BONUS_NAMES,
  STAT_NAMES,
  STATUS_TEXT,
  TYPE_NAMES,
  formatNumber,
  formatPercent,
  itemName,
  moveName,
  speciesName,
} from '../i18n/pt-BR';
import { useEngine } from '../useGame';

type Sort = 'level' | 'dex' | 'recent' | 'potential';

function PartySlot({
  p,
  active,
  selected,
  bonus,
  role,
  onClick,
}: {
  p: PokemonInstance;
  active?: boolean;
  selected: boolean;
  bonus?: PassiveContribution;
  role?: string;
  onClick: () => void;
}) {
  const stats = statsOf(p);
  return (
    <button
      className={`party-slot frame ${active ? 'frame-slotActive party-slot-active' : 'frame-slot'} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <PokemonSprite speciesId={p.speciesId} kind="icon" className="party-icon" />
      <span className="party-name">
        {pokemonName(p).toUpperCase()}
        {p.shiny && <Shiny />}
      </span>
      <span className="party-lv">Nv{p.level}</span>
      <HpBar value={p.currentHp} max={stats.hp} />
      <span className="party-hp">
        {p.currentHp}/{stats.hp}
      </span>
      {active && <span className="party-role">ATIVO · LUTANDO</span>}
      {role && <span className="party-role">{role}</span>}
      {bonus && (
        <span className="party-bonus">
          {bonus.duplicate
            ? 'Espécie repetida: sem bônus'
            : `+${formatPercent(bonus.effective)} ${BONUS_NAMES[bonus.kind]}`}
        </span>
      )}
    </button>
  );
}

export function PartyScreen({ state }: { state: GameState }) {
  const [selected, setSelected] = useState(state.activeUid);
  const unlocked = passiveSlotsUnlocked(state);
  const contributions = passiveContributions(state);
  const reserves = reservePokemon(state);
  const reserveSlots = reserveSlotsUnlocked(state);
  const active = state.collection.find((p) => p.uid === state.activeUid)!;
  const current = state.collection.find((p) => p.uid === selected) ?? active;

  return (
    <div className="party-screen">
      <div className="party-board">
        <PartySlot
          p={active}
          active
          selected={selected === active.uid}
          onClick={() => setSelected(active.uid)}
        />
        <div className="party-support party-reserves">
          {RESERVE_SLOTS.map((slot, i) => {
            // Só o próximo espaço trancado aparece: os outros surgem quando liberarem.
            if (i > reserveSlots) return null;
            if (i === reserveSlots) {
              return (
                <div key={i} className="party-slot frame frame-slotEmpty locked">
                  <PixelIcon name="lock" scale={2} />
                  <span>
                    {state.challenge === 'solo'
                      ? 'Reserva bloqueada pelo desafio'
                      : `Reserva libera ao concluir ${getRoute(slot.requiresRoute).name}`}
                  </span>
                </div>
              );
            }
            const p = reserves[i];
            if (!p) {
              return (
                <div key={i} className="party-slot frame frame-slotEmpty">
                  <span>RESERVA {i + 1} — vazia</span>
                  <small>Entra quando o ativo desmaia. Escolha na Caixa e use “Reserva”.</small>
                </div>
              );
            }
            return (
              <PartySlot
                key={i}
                p={p}
                role={`RESERVA ${i + 1} · ${p.currentHp > 0 ? 'PRONTA' : 'DESMAIADA'}`}
                selected={selected === p.uid}
                onClick={() => setSelected(p.uid)}
              />
            );
          })}
        </div>
        <div className="party-support">
          {PASSIVE_SLOTS.map((slot, i) => {
            if (i > unlocked) return null;
            if (i === unlocked) {
              return (
                <div key={i} className="party-slot frame frame-slotEmpty locked">
                  <PixelIcon name="lock" scale={2} />
                  <span>Libera ao concluir {getRoute(slot.requiresRoute).name}</span>
                </div>
              );
            }
            const c = contributions[i];
            const p = c && state.collection.find((x) => x.uid === c.uid);
            if (!p) {
              return (
                <div key={i} className="party-slot frame frame-slotEmpty">
                  <span>APOIO {i + 1} — vazio</span>
                  <small>Escolha um Pokémon na Caixa e use “Apoio”.</small>
                </div>
              );
            }
            return (
              <PartySlot
                key={i}
                p={p}
                bonus={c}
                selected={selected === p.uid}
                onClick={() => setSelected(p.uid)}
              />
            );
          })}
        </div>
      </div>

      <TeamBonuses state={state} />
      <Summary state={state} p={current} />

      <BoxWindow state={state} selected={selected} onSelect={setSelected} />
    </div>
  );
}

/** Caixa: filtros, ordenação, etiquetas e seleção múltipla para ações em lote. */
function BoxWindow({
  state,
  selected,
  onSelect,
}: {
  state: GameState;
  selected: number;
  onSelect: (uid: number) => void;
}) {
  const engine = useEngine();
  const [sort, setSort] = useState<Sort>('level');
  const [filter, setFilter] = useState<BoxFilter>(EMPTY_FILTER);
  const [showFilters, setShowFilters] = useState(false);
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [editTags, setEditTags] = useState(false);
  const patch = (p: Partial<BoxFilter>) => setFilter((f) => ({ ...f, ...p }));
  const box = filterBox(state, filter, speciesName).sort((a, b) =>
    sort === 'level'
      ? b.level - a.level || a.uid - b.uid
      : sort === 'dex'
        ? a.speciesId - b.speciesId || b.level - a.level
        : sort === 'potential'
          ? potential(b.ivs) - potential(a.ivs) || b.level - a.level
          : b.uid - a.uid,
  );
  const pickedSet = new Set(picked);
  const plan = transferPlan(state, picked);
  const planPoints = plan.reduce((sum, p) => sum + transferValue(p), 0);
  const allFavorite =
    picked.length > 0 && picked.every((uid) => state.collection.find((p) => p.uid === uid)?.favorite);
  const togglePick = (uid: number) =>
    setPicked((list) => (list.includes(uid) ? list.filter((x) => x !== uid) : [...list, uid]));
  const exitMulti = () => {
    setMulti(false);
    setPicked([]);
  };
  const checks = [
    ['favorites', 'Favoritos'],
    ['shiny', 'Shiny'],
    ['perfect', 'Perfeitos'],
    ['duplicates', 'Repetidos'],
  ] as const;

  return (
    <Window
      title={`CAIXA · ${filterActive(filter) ? `${box.length} DE ` : ''}${state.collection.length} POKéMON`}
      icon={<ItemIcon id="pokemon-box" size={24} />}
      actions={
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
          <option value="level">Nível</option>
          <option value="dex">Nº Pokédex</option>
          <option value="potential">Potencial</option>
          <option value="recent">Recentes</option>
        </select>
      }
    >
      <div className="box-toolbar">
        <input
          type="search"
          value={filter.text}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder="Buscar nome ou nº…"
          aria-label="Buscar na Caixa"
        />
        <button
          className={`pbtn small ${showFilters || filterActive(filter) ? 'on' : ''}`}
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filtros{filterActive(filter) ? ' •' : ''}
        </button>
        <button
          className={`pbtn small ${multi ? 'on' : ''}`}
          aria-pressed={multi}
          onClick={() => (multi ? exitMulti() : setMulti(true))}
        >
          {multi ? 'Concluir seleção' : 'Selecionar vários'}
        </button>
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
          {checks.map(([key, label]) => (
            <label key={key} className="box-check">
              <input
                type="checkbox"
                checked={filter[key]}
                onChange={(e) => patch({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <button
            className="pbtn small"
            onClick={() => setFilter(EMPTY_FILTER)}
            disabled={!filterActive(filter)}
          >
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
          <button className="pbtn small" onClick={() => setPicked(box.map((p) => p.uid))}>
            Todos os {box.length} filtrados
          </button>
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

      {!box.length && <p className="hint">Nenhum Pokémon com esses filtros.</p>}
      <ul className="pc-box">
        {box.map((p) => {
          const on = multi ? pickedSet.has(p.uid) : p.uid === selected;
          return (
            <li key={p.uid}>
              <button
                className={`pc-cell ${on ? 'selected' : ''} ${p.uid === state.activeUid ? 'is-active' : ''} ${state.passives.includes(p.uid) ? 'is-support' : ''} ${state.battleTeam.includes(p.uid) ? 'is-reserve' : ''} ${busyLabel(state, p.uid) ? 'is-away' : ''}`}
                onClick={() => (multi ? togglePick(p.uid) : onSelect(p.uid))}
                aria-pressed={multi ? on : undefined}
                aria-label={`${speciesName(p.speciesId)} nível ${p.level}${p.shiny ? ', shiny' : ''}${p.favorite ? ', favorito' : ''}${p.tag ? `, ${tagName(state, p.tag)}` : ''}`}
                title={`${speciesName(p.speciesId)} Nv. ${p.level}${p.favorite ? ' · favorito' : ''}${p.tag ? ` · ${tagName(state, p.tag)}` : ''}`}
              >
                <PokemonSprite speciesId={p.speciesId} kind="icon" />
                <span>Nv{p.level}</span>
                {p.shiny && <Shiny />}
                {p.pendingEvolution && <span className="pc-evo" />}
                {isPerfect(p.ivs) && (
                  <span className="pc-perfect" title="Perfeito">
                    31
                  </span>
                )}
                {p.favorite && <PixelIcon name="star" scale={1} className="pc-fav" />}
                {p.tag && <span className={`pc-tag tag-dot tag-${p.tag}`} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </Window>
  );
}

/** Onde o Pokémon está, quando não está disponível para a batalha. */
function busyLabel(state: GameState, uid: number): string | null {
  if (isFallen(state, uid)) return 'FORA DA JORNADA';
  if (state.daycare.uids.includes(uid)) return 'NA CRECHE';
  if (state.training.slots.some((s) => s.uid === uid)) return 'NO TREINO';
  if (state.expeditions.some((e) => e.uids.includes(uid))) return 'EM EXPEDIÇÃO';
  return null;
}

function TeamBonuses({ state }: { state: GameState }) {
  const mods = computeModifiers(state);
  const kinds = BONUS_KINDS.filter((k) => mods.passive[k] > 0);
  const types = Object.entries(mods.typeDamage).sort((a, b) => b[1] - a[1]);
  if (!kinds.length && !types.length) return null;
  return (
    <Window title="BÔNUS DA EQUIPE DE APOIO" frame="dialog" className="team-bonuses">
      <ul className="bonus-list">
        {kinds.map((k) => (
          <li key={k}>
            <span>{BONUS_NAMES[k]}</span>
            <strong>+{formatPercent(mods.passive[k])}</strong>
          </li>
        ))}
        {types.map(([t, v]) => (
          <li key={t}>
            <span>
              Dano contra <TypeBadge type={t} />
            </span>
            <strong>+{formatPercent(v)}</strong>
          </li>
        ))}
      </ul>
      <p className="hint">
        Cada Pokémon de apoio dá um bônus pelo seu tipo principal e dano extra contra os tipos que ele vence.
        Bônus iguais valem 50% do anterior e têm teto; espécies repetidas não contam. {TYPE_NAMES.fire} →
        dano, {TYPE_NAMES.rock} → defesa, {TYPE_NAMES.electric} → velocidade, {TYPE_NAMES.psychic} → EXP,{' '}
        {TYPE_NAMES.normal} → moedas, {TYPE_NAMES.bug} → captura, {TYPE_NAMES.water} → cura.
      </p>
    </Window>
  );
}

/** Histórico de batalha do Pokémon (como ativo). */
function BattleRecordRow({ p, weekWins }: { p: PokemonInstance; weekWins: number }) {
  const r = recordOf(p);
  return (
    <div className="battle-record">
      <h4>HISTÓRICO</h4>
      <dl>
        <dt>Vitórias</dt>
        <dd>{formatNumber(r.wins)}</dd>
        <dt>Nesta semana</dt>
        <dd>{formatNumber(weekWins)}</dd>
        <dt>Críticos</dt>
        <dd>{formatNumber(r.crits)}</dd>
        <dt>Dano causado</dt>
        <dd>{formatNumber(r.damage)}</dd>
        <dt>Capturas ajudadas</dt>
        <dd>{formatNumber(r.captures)}</dd>
        <dt>Desmaios</dt>
        <dd>{formatNumber(r.faints)}</dd>
      </dl>
    </div>
  );
}

/** Apelido: texto com botão; Enter ou "OK" grava, vazio volta ao nome da espécie. */
function NicknameField({ p }: { p: PokemonInstance }) {
  const engine = useEngine();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(p.nickname ?? '');
  const save = () => {
    engine.dispatch((s) => {
      const target = s.collection.find((x) => x.uid === p.uid);
      if (target) setNickname(target, text);
    });
    setEditing(false);
  };
  if (!editing) {
    return (
      <button className="link-btn" onClick={() => setEditing(true)}>
        {p.nickname ? `${p.nickname} · trocar` : 'dar apelido'}
      </button>
    );
  }
  return (
    <form
      className="nickname-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        value={text}
        maxLength={NICKNAME_MAX}
        placeholder={getSpecies(p.speciesId).name}
        onChange={(e) => setText(e.target.value)}
        aria-label="Apelido"
        autoFocus
      />
      <button type="submit" className="pbtn small">
        OK
      </button>
    </form>
  );
}

function Summary({ state, p }: { state: GameState; p: PokemonInstance }) {
  const mvp = weeklyMvp(state, state.lastTimerAt);
  const engine = useEngine();
  const species = getSpecies(p.speciesId);
  const stats = statsOf(p);
  const moves = movesOf(p);
  const [editing, setEditing] = useState(false);
  const away = busyLabel(state, p.uid);
  const isActive = p.uid === state.activeUid;
  const isSupport = state.passives.includes(p.uid);
  const freeSlot = state.passives.length < passiveSlotsUnlocked(state);
  const isReserve = reservePokemon(state).some((r) => r.uid === p.uid);
  const freeReserve = reservePokemon(state).length < reserveSlotsUnlocked(state);
  const nature = getNature(p.nature);
  const mastery = masteryOf(state, p.speciesId);
  const itemEvos = species.evolutions.filter((e) => e.trigger === 'item');
  const hint = evolutionHint(state, p.uid);
  const evs = evsOf(p);

  return (
    <Window
      title={
        <>
          Nº{String(species.id).padStart(3, '0')} {pokemonName(p).toUpperCase()}{' '}
          <span className="lv">Nv{p.level}</span>
        </>
      }
      icon={<ItemIcon id="poke-ball" size={24} />}
      className="summary"
    >
      <div className="summary-top">
        <div className="summary-portrait">
          <PokemonSprite speciesId={p.speciesId} kind="front" shiny={p.shiny} form={p.form} pixelScale={2} />
          {mvp?.uid === p.uid && <span className="mvp-tag">MVP DA SEMANA</span>}
          {state.companion?.uid === p.uid && <span className="companion-tag">ACOMPANHANTE</span>}
        </div>
        <dl className="summary-info">
          <dt>TIPO</dt>
          <dd className="types">
            {species.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </dd>
          <dt>ESPÉCIE</dt>
          <dd>
            {species.genus}
            {p.nickname && <small className="nature-mods">{species.name}</small>}
          </dd>
          <dt>APELIDO</dt>
          <dd>
            <NicknameField key={p.uid} p={p} />
          </dd>
          <dt>POTENCIAL</dt>
          <dd>
            {potential(p.ivs)}% {isPerfect(p.ivs) && <span className="tag tag-active">PERFEITO</span>}
          </dd>
          <dt>NATUREZA</dt>
          <dd>
            {nature?.name ?? 'Neutra'}
            {nature?.up && nature.down && (
              <small className="nature-mods">
                +{STAT_NAMES[nature.up]} · −{STAT_NAMES[nature.down]}
              </small>
            )}
          </dd>
          {formName(p.speciesId, p.form) && (
            <>
              <dt>FORMA</dt>
              <dd>{formName(p.speciesId, p.form)}</dd>
            </>
          )}
          <dt>ORIGEM</dt>
          <dd>{p.caughtOn}</dd>
          <dt>MAESTRIA</dt>
          <dd>
            {mastery.level}
            {mastery.next ? <Bar value={mastery.points} max={mastery.next} tone="gold" /> : ' (máx.)'}
          </dd>
        </dl>
      </div>
      {mastery.level > 0 && (
        <p className="hint">
          Maestria {mastery.level}: +{formatPercent(mastery.level * MASTERY_BONUS_PER_LEVEL)} de dano e −
          {formatPercent(mastery.level * MASTERY_BONUS_PER_LEVEL)} de dano recebido quando ativo.
        </p>
      )}
      <HpBar value={p.currentHp} max={stats.hp} />
      <ExpBar progress={levelProgress(p)} />
      {hint && <p className={`evo-hint ${p.pendingEvolution ? 'ready' : ''}`}>{hint}</p>}

      <div className="summary-cols">
        <table className="stat-table">
          <tbody>
            {(Object.keys(STAT_NAMES) as (keyof typeof STAT_NAMES)[]).map((k) => (
              <tr
                key={k}
                className={k === nature?.up ? 'nat-up' : k === nature?.down ? 'nat-down' : ''}
                title={
                  k === nature?.up
                    ? '+10% pela natureza'
                    : k === nature?.down
                      ? '−10% pela natureza'
                      : undefined
                }
              >
                <th>{STAT_NAMES[k].toUpperCase()}</th>
                <td>{k === 'hp' ? `${p.currentHp}/${stats.hp}` : stats[k]}</td>
                <td className="iv">
                  IV{p.ivs[k]} · EV{evs[k]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="move-list">
          <li className="move-list-head">
            <span>{p.moveset?.length ? 'GOLPES ESCOLHIDOS' : 'GOLPES (AUTOMÁTICO)'}</span>
            <button className="pbtn small" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Fechar' : 'Editar'}
            </button>
          </li>
          {moves.map((m) => {
            const mv = getMove(m);
            return (
              <li key={m} className={`move type-bg-${mv.type}`}>
                <span className="move-name">{moveName(m).toUpperCase()}</span>
                <span className="move-meta">
                  <TypeBadge type={mv.type} /> POD {mv.power}
                  {mv.ailment && (
                    <span
                      className="move-ailment"
                      title={`${STATUS_TEXT[mv.ailment].name}: ${mv.ailmentChance}%`}
                    >
                      {' '}
                      {STATUS_TEXT[mv.ailment].short} {mv.ailmentChance}%
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {editing && <MoveEditor state={state} p={p} />}

      <Depth state={state} p={p} />

      <BattleRecordRow
        p={p}
        weekWins={state.mvp.week === weekOf(state.lastTimerAt) ? (state.mvp.wins[p.uid] ?? 0) : 0}
      />

      <div className="summary-actions">
        {isActive ? (
          <span className="tag tag-active">EM BATALHA</span>
        ) : away ? (
          <span className="tag">{away}</span>
        ) : (
          <button className="pbtn primary" onClick={() => engine.dispatch((s) => setActive(s, p.uid))}>
            Enviar à batalha
          </button>
        )}
        {!isActive && !isSupport && !isReserve && !away && freeSlot && (
          <button className="pbtn" onClick={() => engine.dispatch((s) => addPassive(s, p.uid))}>
            Apoio
          </button>
        )}
        {isSupport && (
          <button className="pbtn" onClick={() => engine.dispatch((s) => removePassive(s, p.uid))}>
            Tirar do apoio
          </button>
        )}
        {!isActive && !isSupport && !isReserve && !away && freeReserve && (
          <button className="pbtn" onClick={() => engine.dispatch((s) => addReserve(s, p.uid))}>
            Reserva
          </button>
        )}
        {isReserve && (
          <button className="pbtn" onClick={() => engine.dispatch((s) => removeReserve(s, p.uid))}>
            Tirar da reserva
          </button>
        )}
        <button
          className={`pbtn ${state.companion?.uid === p.uid ? '' : 'companion-btn'}`}
          title="O acompanhante anda com você no cartão e no mapa, ganha amizade com o tempo e às vezes acha itens."
          onClick={() =>
            engine.dispatch((s, now) =>
              setCompanion(s, s.companion?.uid === p.uid ? null : p.uid, now, rngFrom(s)),
            )
          }
        >
          {state.companion?.uid === p.uid ? 'Deixar de acompanhar' : 'Acompanhante'}
        </button>
        {p.pendingEvolution && (
          <button className="pbtn evolve" onClick={() => engine.dispatch((s) => confirmEvolution(s, p.uid))}>
            Evoluir → {speciesName(p.pendingEvolution)}
          </button>
        )}
        {itemEvos.map((e) =>
          e.trigger === 'item' &&
          (state.items[e.item] ?? 0) > 0 &&
          (!e.time || e.time === state.env.period) ? (
            <button
              key={e.item}
              className="pbtn evolve"
              onClick={() => engine.dispatch((s) => applyEvolutionItem(s, p.uid, e.item))}
            >
              <ItemIcon id={e.item} size={24} /> {getItem(e.item)?.name} → {speciesName(e.to)}
            </button>
          ) : null,
        )}
        {(state.items['rare-candy'] ?? 0) > 0 && p.level < 100 && (
          <button className="pbtn" onClick={() => engine.dispatch((s) => giveRareCandy(s, p.uid))}>
            <ItemIcon id="rare-candy" size={24} /> Rare Candy ×{state.items['rare-candy']}
          </button>
        )}
        {(p.evolutionLocked || ((state.items.everstone ?? 0) > 0 && species.evolutions.length > 0)) && (
          <button className="pbtn" onClick={() => engine.dispatch((s) => toggleEvolutionLock(s, p.uid))}>
            <ItemIcon id="everstone" size={24} /> {p.evolutionLocked ? 'Liberar evolução' : 'Travar evolução'}
          </button>
        )}
        <button
          className={`pbtn ${p.favorite ? 'on' : ''}`}
          aria-pressed={!!p.favorite}
          title="Favoritos não podem ser transferidos, nem pela limpeza de duplicatas."
          onClick={() => engine.dispatch((s) => toggleFavorite(s, p.uid))}
        >
          <PixelIcon name="star" scale={1} /> {p.favorite ? 'Favorito' : 'Favoritar'}
        </button>
        <label className="tag-select">
          <span className={`tag-dot ${p.tag ? `tag-${p.tag}` : 'tag-none'}`} aria-hidden />
          <select
            value={p.tag ?? ''}
            aria-label="Etiqueta"
            onChange={(e) =>
              engine.dispatch((s) => setTag(s, [p.uid], (e.target.value || null) as TagId | null))
            }
          >
            <option value="">Sem etiqueta</option>
            {TAG_IDS.map((t) => (
              <option key={t} value={t}>
                {tagName(state, t)}
              </option>
            ))}
          </select>
        </label>
        {canTransfer(state, p.uid) && (
          <button
            className="pbtn danger"
            onClick={() => engine.dispatch((s) => void transferPokemon(s, p.uid))}
          >
            Transferir (+{transferValue(p)} pesquisa)
          </button>
        )}
      </div>
      {itemEvos.length > 0 && (
        <p className="hint">
          Evolui com{' '}
          {itemEvos
            .map((e) =>
              e.trigger === 'item'
                ? `${itemName(e.item)}${e.time ? (e.time === 'day' ? ' (de dia)' : ' (à noite)') : ''}`
                : '',
            )
            .join(', ')}{' '}
          (Mochila → Loja).
        </p>
      )}
    </Window>
  );
}

/** Escolha dos 4 golpes: aprendidos por nível + TMs liberados que a espécie aceita. */
function MoveEditor({ state, p }: { state: GameState; p: PokemonInstance }) {
  const engine = useEngine();
  const options = learnableMoves(state, p);
  const chosen = p.moveset?.length ? p.moveset : movesOf(p);
  const toggle = (move: string) => {
    const next = chosen.includes(move) ? chosen.filter((m) => m !== move) : [...chosen, move].slice(-4);
    if (next.length) engine.dispatch((s) => setMoveset(s, p.uid, next));
  };
  return (
    <div className="move-editor frame frame-dialog">
      <p className="hint">
        Escolha até 4 golpes. Golpes de TM vêm dos líderes de ginásio, da Torre, do Game Corner e das
        expedições ({state.tms.length} TMs).
      </p>
      <ul className="move-options">
        {options.map(({ move, source }) => {
          const mv = getMove(move);
          const on = chosen.includes(move);
          return (
            <li key={move}>
              <button
                className={`move-option type-bg-${mv.type} ${on ? 'on' : ''}`}
                onClick={() => toggle(move)}
              >
                <span className="move-name">
                  {on && <PixelIcon name="check" scale={1} />} {moveName(move).toUpperCase()}
                </span>
                <span className="move-meta">
                  <TypeBadge type={mv.type} /> POD {mv.power}{' '}
                  {source === 'tm' && <ItemIcon id="tm" size={18} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button className="pbtn small" onClick={() => engine.dispatch((s) => setMoveset(s, p.uid, []))}>
        Voltar ao automático
      </button>
    </div>
  );
}
