// Janela de status do inicial: tipos, atributos-base, linha evolutiva e vantagens de tipo,
// tudo calculado a partir dos dados do jogo.

import { getSpecies, superEffectiveAgainst, typeEffectiveness } from '../../game-data';
import type { Species } from '../../game-data';
import { Bar, PokemonSprite, TypeBadge, Window } from '../components/common';
import { TYPE_NAMES } from '../i18n/pt-BR';

const STAT_LABELS = [
  ['hp', 'HP'],
  ['atk', 'ATQ'],
  ['def', 'DEF'],
  ['spAtk', 'A.ESP'],
  ['spDef', 'D.ESP'],
  ['spe', 'VEL'],
] as const;

const MAX_BADGES = 4;

/** Linha evolutiva a partir de `id`, com o nível de cada evolução. */
function evolutionLine(id: number): { id: number; level?: number }[] {
  const out: { id: number; level?: number }[] = [{ id }];
  let cur = getSpecies(id);
  for (let guard = 0; guard < 4; guard++) {
    const next = cur.evolutions[0];
    if (!next) break;
    out.push({ id: next.to, level: next.trigger === 'level' ? next.minLevel : undefined });
    cur = getSpecies(next.to);
  }
  return out;
}

function strongAgainst(species: Species): string[] {
  return [...new Set(species.types.flatMap(superEffectiveAgainst))];
}

function weakTo(species: Species): string[] {
  return Object.keys(TYPE_NAMES).filter((t) => typeEffectiveness(t, species.types) > 1);
}

function BadgeRow({ label, types }: { label: string; types: string[] }) {
  const shown = types.slice(0, MAX_BADGES);
  return (
    <div className="status-row-types">
      <dt>{label}</dt>
      <dd className="types">
        {shown.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
        {types.length > MAX_BADGES && <span className="more-types">+{types.length - MAX_BADGES}</span>}
      </dd>
    </div>
  );
}

export function StarterStatus({ speciesId }: { speciesId: number }) {
  const species = getSpecies(speciesId);
  const line = evolutionLine(speciesId);

  return (
    <Window
      title={
        <>
          Nº{String(species.id).padStart(3, '0')} {species.name.toUpperCase()}
        </>
      }
      className="starter-status"
    >
      <div className="status-head">
        <span className="types">
          {species.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </span>
        <span className="status-genus">{species.genus}</span>
      </div>

      <dl className="status-stats">
        {STAT_LABELS.map(([key, label]) => (
          <div key={key} className="status-stat">
            <dt>{label}</dt>
            <dd>{species.baseStats[key]}</dd>
            <Bar value={species.baseStats[key]} max={130} tone="grass" />
          </div>
        ))}
      </dl>

      <div className="status-evo" aria-label="Linha evolutiva">
        {line.map((step, i) => (
          <span key={step.id} className="status-evo-step">
            {i > 0 && (
              <span className="status-evo-arrow">›{step.level ? <small>Nv{step.level}</small> : null}</span>
            )}
            <PokemonSprite speciesId={step.id} kind="icon" />
          </span>
        ))}
      </div>

      <dl className="status-matchups">
        <BadgeRow label="FORTE" types={strongAgainst(species)} />
        <BadgeRow label="FRACO" types={weakTo(species)} />
      </dl>
    </Window>
  );
}
