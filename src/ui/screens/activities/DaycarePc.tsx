// PC da Creche: janela flutuante no visual do PC para escolher o hóspede. Mostra as suas caixas de verdade (quem não
// pode ir fica apagado, com o motivo), busca por nome, filtro "só os que combinam" com o hóspede que já está lá e uma
// fileira de pares sugeridos. Tocar num Pokémon abre a ficha dele (sprite, grupos de ovo, item, IVs e se o casal
// gera ovos); "Deixar na Creche" confirma.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { getHeldItem, getSpecies } from '../../../game-data';
import { busyUids } from '../../../core/collection';
import { canBreed, incompatibility, putInDaycare } from '../../../core/daycare';
import type { GameState } from '../../../core/game';
import { genderOf } from '../../../core/gender';
import { boxName, boxWallpaper, pcLayout } from '../../../core/pc';
import { isPerfect, pokemonName, type PokemonInstance } from '../../../core/pokemon';
import { audio } from '../../audio';
import { GenderMark, ItemIcon, PokemonSprite, Shiny, TypeBadge } from '../../components/common';
import { itemName, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';

const EGG_GROUPS: Record<string, string> = {
  monster: 'Monstro',
  water1: 'Água 1',
  water2: 'Água 2',
  water3: 'Água 3',
  bug: 'Inseto',
  flying: 'Voador',
  ground: 'Campo',
  fairy: 'Fada',
  plant: 'Planta',
  humanshape: 'Humanoide',
  mineral: 'Mineral',
  indeterminate: 'Amorfo',
  ditto: 'Ditto',
  dragon: 'Dragão',
  'no-eggs': 'Sem ovos',
  undiscovered: 'Sem ovos',
};

const REASON = {
  species: 'não gera ovos',
  groups: 'sem grupo de ovos em comum',
  gender: 'precisam ser macho e fêmea (ou um Ditto)',
} as const;

const ivSum = (p: PokemonInstance) => Object.values(p.ivs).reduce((a, b) => a + b, 0);

/** Por que este Pokémon não pode entrar na Creche agora (ou null). */
function blockedReason(state: GameState, p: PokemonInstance, busy: Set<number>): string | null {
  if (getSpecies(p.speciesId).legendary) return 'Lendários não ficam na Creche';
  if (state.daycare.uids.includes(p.uid)) return 'Já está na Creche';
  if (busy.has(p.uid)) return 'Ocupado (equipe, treino ou expedição)';
  return null;
}

export function DaycarePc({ state, onClose }: { state: GameState; onClose: () => void }) {
  const engine = useEngine();
  const boxes = pcLayout(state);
  const busy = busyUids(state);
  const partner = state.daycare.uids.map((uid) => state.collection.find((p) => p.uid === uid)).find(Boolean);
  const byUid = useMemo(() => new Map(state.collection.map((p) => [p.uid, p])), [state.collection]);
  const firstWithFree = Math.max(
    0,
    boxes.findIndex((b) => b.slots.some((uid) => uid && !blockedReason(state, byUid.get(uid)!, busy))),
  );
  const [box, setBox] = useState(firstWithFree);
  const [query, setQuery] = useState('');
  const [onlyMatch, setOnlyMatch] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && !(e.target instanceof HTMLInputElement))
        setBox((b) => (b + boxes.length - 1) % boxes.length);
      else if (e.key === 'ArrowRight' && !(e.target instanceof HTMLInputElement))
        setBox((b) => (b + 1) % boxes.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [boxes.length, onClose]);

  const matches = (p: PokemonInstance) => !!partner && incompatibility(partner, p) === null;
  const free = (p: PokemonInstance) => !blockedReason(state, p, busy);
  // Pares sugeridos: os livres que combinam, os de melhores IVs primeiro.
  const suggestions = partner
    ? state.collection
        .filter((p) => free(p) && matches(p))
        .sort((a, b) => ivSum(b) - ivSum(a))
        .slice(0, 8)
    : [];
  const q = query.trim().toLowerCase();
  const searching = q.length > 0 || onlyMatch;
  const results = searching
    ? state.collection
        .filter((p) => free(p))
        .filter(
          (p) =>
            !q ||
            pokemonName(p).toLowerCase().includes(q) ||
            speciesName(p.speciesId).toLowerCase().includes(q),
        )
        .filter((p) => !onlyMatch || matches(p))
        .sort((a, b) => a.speciesId - b.speciesId || b.level - a.level)
    : [];
  const current = boxes[Math.min(box, boxes.length - 1)];
  const sel = selected !== null ? byUid.get(selected) : undefined;

  const choose = (uid: number) => {
    audio.sfx('cursor');
    setSelected(uid);
  };
  const confirm = () => {
    if (!sel) return;
    audio.sfx('itemGet');
    engine.dispatch((s) => void putInDaycare(s, sel.uid));
    setLeaving(true);
    window.setTimeout(onClose, 320);
  };

  const cell = (p: PokemonInstance | undefined, key: number) => {
    if (!p)
      return (
        <li key={key}>
          <span className="pcs-cell empty" aria-hidden />
        </li>
      );
    const reason = blockedReason(state, p, busy);
    const love = !reason && matches(p);
    return (
      <li key={key}>
        <button
          className={`pcs-cell ${reason ? 'dim' : ''} ${selected === p.uid ? 'selected' : ''} ${love ? 'love' : ''}`}
          disabled={!!reason}
          onClick={() => choose(p.uid)}
          title={`${pokemonName(p)} Nv. ${p.level}${reason ? ` · ${reason}` : love ? ' · combina!' : ''}`}
          aria-label={`${pokemonName(p)} nível ${p.level}${reason ? `, ${reason}` : ''}`}
        >
          <PokemonSprite speciesId={p.speciesId} kind="icon" />
          <span className="pcs-lv">{p.level}</span>
          <GenderMark gender={genderOf(p)} />
          {p.shiny && <Shiny />}
          {isPerfect(p.ivs) && <span className="pcs-perfect" title="Perfeito" />}
          {love && (
            <span className="dpc-heart" aria-hidden>
              ♥
            </span>
          )}
        </button>
      </li>
    );
  };

  return createPortal(
    <div
      className={`modal-backdrop dpc-backdrop ${leaving ? 'leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Escolher hóspede da Creche"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pcs dpc">
        <div className="pcs-terminal">
          <header className="pcs-head">
            <span className="pcs-led" aria-hidden />
            <strong>PC · HÓSPEDE DA CRECHE</strong>
            <button className="dpc-close" onClick={onClose} aria-label="Fechar" title="Fechar (Esc)">
              ×
            </button>
          </header>

          {partner && (
            <div className="dpc-partner">
              <PokemonSprite speciesId={partner.speciesId} kind="icon" shiny={partner.shiny} />
              <span>
                Par para <strong>{pokemonName(partner)}</strong> <GenderMark gender={genderOf(partner)} /> ·{' '}
                {getSpecies(partner.speciesId)
                  .eggGroups.map((g) => EGG_GROUPS[g] ?? g)
                  .join(' / ')}
              </span>
            </div>
          )}

          <div className="dpc-tools">
            <input
              type="search"
              className="dpc-search"
              placeholder="Procurar pelo nome…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Procurar Pokémon pelo nome"
            />
            {partner && (
              <button
                className={`pbtn small ${onlyMatch ? 'primary' : ''}`}
                onClick={() => setOnlyMatch((v) => !v)}
              >
                ♥ Só os que combinam
              </button>
            )}
          </div>

          {suggestions.length > 0 && !searching && (
            <div className="dpc-suggest">
              <small>PARES SUGERIDOS</small>
              <ul>
                {suggestions.map((p, i) => (
                  <li key={p.uid} style={{ animationDelay: `${i * 50}ms` }}>
                    <button
                      className={selected === p.uid ? 'on' : ''}
                      onClick={() => choose(p.uid)}
                      title={`${pokemonName(p)} Nv. ${p.level} · IVs ${ivSum(p)}/186`}
                    >
                      <PokemonSprite speciesId={p.speciesId} kind="icon" shiny={p.shiny} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="dpc-body">
            <div className="pcs-box">
              {searching ? (
                <p className="dpc-results">
                  {results.length
                    ? `${results.length} encontrado${results.length > 1 ? 's' : ''}`
                    : 'Nenhum Pokémon livre com esse filtro.'}
                </p>
              ) : (
                <div className="pcs-box-head">
                  <button
                    className="pcs-arrow prev"
                    onClick={() => setBox((b) => (b + boxes.length - 1) % boxes.length)}
                    title="Caixa anterior"
                    aria-label="Caixa anterior"
                  />
                  <span className="pcs-plate">
                    <strong>{boxName(current, box)}</strong>
                    <small>{current.slots.filter((uid) => uid && free(byUid.get(uid)!)).length} livres</small>
                  </span>
                  <button
                    className="pcs-arrow next"
                    onClick={() => setBox((b) => (b + 1) % boxes.length)}
                    title="Próxima caixa"
                    aria-label="Próxima caixa"
                  />
                </div>
              )}
              <ul
                key={searching ? 'busca' : box}
                className={`pcs-grid dpc-grid wp-${boxWallpaper(current, box)}`}
              >
                {searching
                  ? results.map((p) => cell(p, p.uid))
                  : current.slots.map((uid, i) => cell(uid ? byUid.get(uid) : undefined, i))}
              </ul>
            </div>

            <aside className={`dpc-card ${sel ? 'has' : ''}`}>
              {sel ? (
                <Detail key={sel.uid} p={sel} partner={partner} onConfirm={confirm} />
              ) : (
                <div className="dpc-empty">
                  <span className="dpc-egg" aria-hidden />
                  <p>Toque num Pokémon para ver a ficha dele.</p>
                  <small>♥ = combina com o hóspede que já está na Creche.</small>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Detail({
  p,
  partner,
  onConfirm,
}: {
  p: PokemonInstance;
  partner?: PokemonInstance;
  onConfirm: () => void;
}) {
  const sp = getSpecies(p.speciesId);
  const why = partner ? incompatibility(partner, p) : canBreed(p.speciesId) ? null : 'species';
  const held = getHeldItem(p.held);
  const ivs = ivSum(p);
  return (
    <div className="dpc-detail">
      <div className={`dpc-stage ${partner && !why ? 'love' : ''}`}>
        <PokemonSprite speciesId={p.speciesId} kind="front" shiny={p.shiny} form={p.form} pixelScale={2} />
        {partner && !why && (
          <span className="dpc-hearts" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
      <strong className="dpc-name">
        {pokemonName(p).toUpperCase()} <GenderMark gender={genderOf(p)} /> {p.shiny && <Shiny />}
      </strong>
      <small>
        Nv{p.level} · {speciesName(p.speciesId)}
      </small>
      <span className="dpc-types">
        {sp.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </span>
      <dl className="dpc-facts">
        <dt>Grupo de ovos</dt>
        <dd>{sp.eggGroups.map((g) => EGG_GROUPS[g] ?? g).join(' / ') || '—'}</dd>
        <dt>IVs</dt>
        <dd>
          <span className="dpc-iv" style={{ '--iv': ivs / 186 } as CSSProperties} />
          {ivs}/186
        </dd>
        <dt>Item</dt>
        <dd>
          {held ? (
            <>
              <ItemIcon id={held.id} size={16} /> {itemName(held.id)}
            </>
          ) : (
            'nenhum'
          )}
        </dd>
      </dl>
      <p className={`dpc-verdict ${why ? 'no' : partner ? 'yes' : ''}`}>
        {why === 'species'
          ? 'Este não gera ovos, mas ganha níveis na Creche.'
          : partner
            ? why
              ? `Com ${pokemonName(partner)}: ${REASON[why]}.`
              : `♥ Combina com ${pokemonName(partner)}! Logo vem um ovo.`
            : 'Depois escolha o par dele.'}
      </p>
      <button className="pbtn primary dpc-go" onClick={onConfirm}>
        Deixar na Creche
      </button>
    </div>
  );
}
