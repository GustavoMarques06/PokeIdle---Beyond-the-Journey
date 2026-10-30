// Tela POKéMON: a equipe (até 6, em ordem: o 1º luta) no estilo FRLG e a ficha de resumo. A
// coleção fica no PC (PcScreen), que reaproveita a ficha daqui.

import { useState } from 'react';
import {
  BALANCE,
  MASTERY_BONUS_PER_LEVEL,
  TEAM_SIZE,
  TEAM_SLOTS,
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
import { TAG_IDS, setTag, tagName, toggleFavorite, type TagId } from '../../core/boxes';
import { busyUids } from '../../core/collection';
import { canTransfer, transferPokemon, transferValue } from '../../core/meta';
import { learnableMoves, relearnMove, relearnableMoves, setMoveset } from '../../core/moveset';
import { genderOf } from '../../core/gender';
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
import {
  addToTeam,
  moveInTeam,
  removeFromTeam,
  reservePokemon,
  reserveSlotsUnlocked,
  teamPokemon,
  teamSlotsUnlocked,
} from '../../core/team';
import { evolutionHint } from '../evolutionHint';
import { Depth } from './party/Depth';
import { Presets } from './party/Presets';
import {
  Bar,
  ExpBar,
  GenderMark,
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
import { useShownPokemon } from '../evolutionView';

function PartySlot({
  p: real,
  lead,
  selected,
  bonus,
  onClick,
}: {
  p: PokemonInstance;
  lead?: boolean;
  selected: boolean;
  bonus?: PassiveContribution;
  onClick: () => void;
}) {
  const p = useShownPokemon(real);
  const stats = statsOf(p);
  const fainted = p.currentHp <= 0;
  return (
    <button
      className={`party-slot frame ${lead ? 'frame-slotActive party-slot-active' : 'frame-slot'} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <PokemonSprite speciesId={p.speciesId} kind="icon" className="party-icon" />
      <span className="party-name">
        {pokemonName(p).toUpperCase()}
        <GenderMark gender={genderOf(p)} />
        {p.shiny && <Shiny />}
      </span>
      <span className="party-lv">Nv{p.level}</span>
      <HpBar value={p.currentHp} max={stats.hp} />
      <span className="party-hp">
        {p.currentHp}/{stats.hp}
      </span>
      <span className="party-role">
        {lead ? 'LUTANDO' : fainted ? 'DESMAIADO' : 'ESPERANDO A VEZ'}
        {bonus &&
          (bonus.duplicate
            ? ' · espécie repetida: sem bônus'
            : ` · +${formatPercent(bonus.effective)} ${BONUS_NAMES[bonus.kind]}`)}
      </span>
    </button>
  );
}

/** Pokémon que podem entrar na equipe: fora dela, livres e (no Nuzlocke) ainda na jornada. */
function teamCandidates(state: GameState): PokemonInstance[] {
  const busy = busyUids(state);
  return state.collection
    .filter((p) => !busy.has(p.uid) && !isFallen(state, p.uid))
    .sort((a, b) => b.level - a.level || a.speciesId - b.speciesId);
}

const PICKER_PAGE = 40;

/** Lista para escolher quem entra na vaga livre, sem sair da tela. */
function TeamPicker({
  state,
  onPick,
  onClose,
}: {
  state: GameState;
  onPick: (uid: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PICKER_PAGE);
  const q = query.trim().toLowerCase();
  const all = teamCandidates(state).filter(
    (p) =>
      !q || pokemonName(p).toLowerCase().includes(q) || speciesName(p.speciesId).toLowerCase().includes(q),
  );
  return (
    <div className="team-picker frame frame-menu">
      <div className="team-picker-head">
        <strong>QUEM ENTRA NA EQUIPE?</strong>
        <button className="pbtn small" onClick={onClose}>
          Fechar
        </button>
      </div>
      <input
        className="team-picker-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar pelo nome…"
        aria-label="Buscar Pokémon"
        autoFocus
      />
      {all.length === 0 ? (
        <p className="hint">Nenhum Pokémon livre{q ? ' com esse nome' : ''}.</p>
      ) : (
        <ul className="team-picker-list">
          {all.slice(0, limit).map((p) => (
            <li key={p.uid}>
              <button onClick={() => onPick(p.uid)}>
                <PokemonSprite speciesId={p.speciesId} kind="icon" />
                <span className="team-picker-name">
                  {pokemonName(p)}
                  {p.shiny && <Shiny />}
                </span>
                <span className="team-picker-types">
                  {getSpecies(p.speciesId).types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </span>
                <span className="team-picker-lv">Nv{p.level}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {all.length > limit && (
        <button className="pbtn small" onClick={() => setLimit((n) => n + PICKER_PAGE)}>
          Mostrar mais ({all.length - limit})
        </button>
      )}
    </div>
  );
}

export function PartyScreen({ state, onOpenPc }: { state: GameState; onOpenPc?: () => void }) {
  const engine = useEngine();
  const [selected, setSelected] = useState(state.activeUid);
  const [picking, setPicking] = useState(false);
  const team = teamPokemon(state);
  const slots = teamSlotsUnlocked(state);
  const free = slots - team.length;
  const bonusOf = new Map(passiveContributions(state).map((c) => [c.uid, c]));
  const active = state.collection.find((p) => p.uid === state.activeUid)!;
  const current = state.collection.find((p) => p.uid === selected) ?? active;
  const nextLock = state.challenge === 'solo' ? undefined : TEAM_SLOTS[slots - 1];

  return (
    <div className="party-screen">
      <div className="party-board">
        <h3 className="party-group">
          EQUIPE {team.length}/{TEAM_SIZE}
          <small>o 1º luta; se desmaiar, entra o próximo</small>
        </h3>
        {team.map((p, i) => (
          <div key={p.uid} className={`team-row ${i === 0 ? 'lead' : ''}`}>
            <PartySlot
              p={p}
              lead={i === 0}
              selected={selected === p.uid}
              bonus={bonusOf.get(p.uid)}
              onClick={() => setSelected(p.uid)}
            />
            <div className="team-row-tools">
              <button
                className="pbtn tiny"
                disabled={i === 0}
                title={i === 1 ? 'Pôr para lutar' : 'Subir na ordem'}
                aria-label={`Subir ${pokemonName(p)}`}
                onClick={() => engine.dispatch((s) => void moveInTeam(s, p.uid, -1))}
              >
                ▲
              </button>
              <button
                className="pbtn tiny"
                disabled={i === team.length - 1}
                title="Descer na ordem"
                aria-label={`Descer ${pokemonName(p)}`}
                onClick={() => engine.dispatch((s) => void moveInTeam(s, p.uid, 1))}
              >
                ▼
              </button>
              <button
                className="pbtn tiny"
                disabled={team.length < 2}
                title={
                  team.length < 2
                    ? 'A equipe precisa de pelo menos um Pokémon'
                    : 'Tirar da equipe (volta para o PC)'
                }
                aria-label={`Tirar ${pokemonName(p)} da equipe`}
                onClick={() => engine.dispatch((s) => void removeFromTeam(s, p.uid))}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {free > 0 &&
          (picking ? (
            <TeamPicker
              state={state}
              onClose={() => setPicking(false)}
              onPick={(uid) => {
                engine.dispatch((s) => void addToTeam(s, uid));
                setSelected(uid);
                if (free <= 1) setPicking(false);
              }}
            />
          ) : (
            <button className="party-empty party-add" onClick={() => setPicking(true)}>
              <span className="party-empty-plus">+</span>
              <span>
                Adicionar Pokémon ({free} {free > 1 ? 'vagas livres' : 'vaga livre'})
              </span>
            </button>
          ))}
        {slots < TEAM_SIZE && (
          <div className="party-empty locked">
            <PixelIcon name="lock" scale={2} />
            <span>
              {nextLock
                ? `Mais uma vaga ao concluir ${getRoute(nextLock.requiresRoute).name}`
                : 'Lobo solitário: só um Pokémon'}
            </span>
          </div>
        )}
      </div>

      <TeamBonuses state={state} />
      <Summary state={state} p={current} />
      <Presets state={state} />

      {/* A coleção mora no PC (PcScreen); daqui só se abre o PC. */}
      <button className="pc-open frame frame-menu" onClick={onOpenPc}>
        <ItemIcon id="pokemon-box" size={32} />
        <span>
          <strong>ABRIR O PC</strong>
          <small>{state.collection.length} Pokémon guardados · mover, organizar e transferir</small>
        </span>
      </button>
    </div>
  );
}

/** Onde o Pokémon está, quando não está disponível para a batalha. */
export function busyLabel(state: GameState, uid: number): string | null {
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
  // Com um Pokémon só, ainda não há equipe para somar bônus: o painel espera o segundo chegar.
  if (state.battleTeam.length === 0 || (!kinds.length && !types.length)) return null;
  return (
    <Window title="BÔNUS DA EQUIPE" frame="dialog" className="team-bonuses">
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
      <p className="hint">Cada Pokémon da equipe soma um bônus pelo tipo dele.</p>
      <details className="bonus-help">
        <summary>Como funciona</summary>
        <p className="hint">
          O bônus vem do tipo principal, e cada um também dá dano extra contra os tipos que vence. Bônus
          iguais valem 50% do anterior e têm teto; espécies repetidas não contam. {TYPE_NAMES.fire} → dano,{' '}
          {TYPE_NAMES.rock} → defesa, {TYPE_NAMES.electric} → velocidade, {TYPE_NAMES.psychic} → EXP,{' '}
          {TYPE_NAMES.normal} → moedas, {TYPE_NAMES.bug} → captura, {TYPE_NAMES.water} → cura.
        </p>
      </details>
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

export function Summary({ state, p: real }: { state: GameState; p: PokemonInstance }) {
  const p = useShownPokemon(real);
  const mvp = weeklyMvp(state, state.lastTimerAt);
  const engine = useEngine();
  const species = getSpecies(p.speciesId);
  const stats = statsOf(p);
  const moves = movesOf(p);
  const [editing, setEditing] = useState(false);
  const away = busyLabel(state, p.uid);
  const isActive = p.uid === state.activeUid;
  const inTeam = reservePokemon(state).some((r) => r.uid === p.uid);
  const freeSlot = reservePokemon(state).length < reserveSlotsUnlocked(state);
  const nature = getNature(p.nature);
  const mastery = masteryOf(state, p.speciesId);
  const itemEvos = species.evolutions.filter((e) => e.trigger === 'item');
  const hint = evolutionHint(state, p.uid);
  const evs = evsOf(p);

  return (
    <Window
      title={
        <>
          Nº{String(species.id).padStart(3, '0')} {pokemonName(p).toUpperCase()}
          <GenderMark gender={genderOf(p)} /> <span className="lv">Nv{p.level}</span>
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
          {p.ball && (
            <>
              <dt>BOLA</dt>
              <dd className="summary-ball">
                <ItemIcon id={p.ball} size={20} /> {itemName(p.ball)}
              </dd>
            </>
          )}
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
          <span className="tag tag-active">LUTANDO</span>
        ) : away ? (
          <span className="tag">{away}</span>
        ) : (
          <button
            className="pbtn primary"
            title={
              inTeam || freeSlot
                ? 'Vira o 1º da equipe'
                : 'A equipe está cheia: este entra no lugar de quem está lutando'
            }
            onClick={() => engine.dispatch((s) => setActive(s, p.uid))}
          >
            Pôr para lutar
          </button>
        )}
        {!isActive && !inTeam && !away && (
          <button
            className="pbtn"
            disabled={!freeSlot}
            title={freeSlot ? 'Entra no fim da equipe' : 'A equipe está cheia'}
            onClick={() => engine.dispatch((s) => void addToTeam(s, p.uid))}
          >
            Pôr na equipe
          </button>
        )}
        {(inTeam || (isActive && reservePokemon(state).length > 0)) && (
          <button className="pbtn" onClick={() => engine.dispatch((s) => void removeFromTeam(s, p.uid))}>
            Tirar da equipe
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

const SOURCE_TAG = { egg: 'OVO', relearn: 'LEMBRADO' } as const;

/** Escolha dos 4 golpes: por nível, TMs, golpes de ovo e os lembrados no Relembrador. */
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
        Escolha até 4 golpes. Golpes de TM vêm dos líderes de ginásio, da Torre, do Game Corner, das
        expedições e da Loja de Departamentos ({state.tms.length} TMs; veja o estojo na MOCHILA).
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
                  {(source === 'egg' || source === 'relearn') && (
                    <span className={`move-source src-${source}`}>{SOURCE_TAG[source]}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button className="pbtn small" onClick={() => engine.dispatch((s) => setMoveset(s, p.uid, []))}>
        Voltar ao automático
      </button>
      <Relearner state={state} p={p} />
    </div>
  );
}

/** Relembrador: golpes da pré-evolução que este Pokémon pode voltar a usar, pagando. */
function Relearner({ state, p }: { state: GameState; p: PokemonInstance }) {
  const engine = useEngine();
  const options = relearnableMoves(p);
  if (!options.length) return null;
  const cost = BALANCE.relearnCost;
  return (
    <div className="relearner">
      <h4>
        RELEMBRADOR <small>golpes da pré-evolução · {formatNumber(cost)} cada</small>
      </h4>
      <ul className="move-options">
        {options.map((move) => {
          const mv = getMove(move);
          return (
            <li key={move}>
              <button
                className={`move-option type-bg-${mv.type}`}
                disabled={state.coins < cost}
                title={state.coins < cost ? 'Dinheiro insuficiente' : `Lembrar por ${formatNumber(cost)}`}
                onClick={() => engine.dispatch((s) => relearnMove(s, p.uid, move))}
              >
                <span className="move-name">{moveName(move).toUpperCase()}</span>
                <span className="move-meta">
                  <TypeBadge type={mv.type} /> POD {mv.power} · Lembrar
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
