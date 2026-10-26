// Componentes visuais reutilizáveis: sprites, ícones, molduras, barras e rótulos de tipo.

import type { ReactNode } from 'react';
import { assetUrl, badgeSprite, getItem, getSpecies, trainerSprite } from '../../game-data';
import { TYPE_NAMES } from '../i18n/pt-BR';
import { ICONS, iconSvg, type IconName } from '../theme/icons';

type SpriteKind = 'front' | 'back' | 'icon';

export function PokemonSprite({
  speciesId,
  kind,
  shiny = false,
  className = '',
  silhouette = false,
  pixelScale,
}: {
  speciesId: number;
  kind: SpriteKind;
  shiny?: boolean;
  className?: string;
  silhouette?: boolean;
  /** Exibe no tamanho natural × escala inteira (pixels uniformes), limitado pela caixa. */
  pixelScale?: number;
}) {
  const s = getSpecies(speciesId).sprites;
  const path =
    kind === 'icon'
      ? s.icon
      : kind === 'front'
        ? (shiny && s.frontShiny) || s.front
        : (shiny && s.backShiny) || s.back;
  const size = kind !== 'icon' && pixelScale ? getSpecies(speciesId).spriteSize?.[kind] : undefined;
  return (
    <img
      style={size ? { width: size[0] * pixelScale!, height: size[1] * pixelScale! } : undefined}
      className={`sprite sprite-${kind} ${size ? 'pixel-scaled' : ''} ${silhouette ? 'silhouette' : ''} ${className}`}
      src={assetUrl(path)}
      alt={silhouette ? '???' : getSpecies(speciesId).name}
      draggable={false}
    />
  );
}

/** Sprite de item da PokéAPI (também usado como ícone de menus). */
export function ItemIcon({
  id,
  size = 24,
  className = '',
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const item = getItem(id);
  return (
    <img
      className={`item-icon ${className}`}
      src={assetUrl(item?.sprite)}
      alt={item?.name ?? id}
      width={size}
      height={size}
      draggable={false}
    />
  );
}

const iconCache = new Map<string, string>();

/** Ícone original em pixel art (ver theme/icons.ts). `scale` = px de tela por pixel. */
export function PixelIcon({
  name,
  scale = 2,
  className = '',
  title,
  palette,
}: {
  name: IconName;
  scale?: number;
  className?: string;
  title?: string;
  palette?: Record<string, string>;
}) {
  const def = ICONS[name];
  const key = `${name}:${JSON.stringify(palette ?? {})}`;
  let uri = iconCache.get(key);
  if (!uri) {
    uri = `data:image/svg+xml,${encodeURIComponent(iconSvg(def, palette))}`;
    iconCache.set(key, uri);
  }
  const w = Math.max(...def.rows.map((r) => r.length));
  const h = def.rows.length;
  return (
    <img
      className={`pixel-icon ${className}`}
      src={uri}
      width={w * scale}
      height={h * scale}
      alt={title ?? ''}
      title={title}
      draggable={false}
    />
  );
}

/** Rótulo de tipo no estilo dos jogos de GBA. */
export function TypeBadge({ type }: { type: string }) {
  return <span className={`type-badge type-${type}`}>{(TYPE_NAMES[type] ?? type).toUpperCase()}</span>;
}

function pct(value: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
}

/** Barra de HP clássica: etiqueta "HP" amarela e preenchimento verde/amarelo/vermelho. */
export function HpBar({ value, max, label = true }: { value: number; max: number; label?: boolean }) {
  const p = pct(value, max);
  const tone = p > 50 ? 'good' : p > 20 ? 'warn' : 'bad';
  return (
    <div
      className="hpbar"
      role="progressbar"
      aria-label="HP"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {label && <span className="hpbar-label">HP</span>}
      <span className="hpbar-track">
        <span className={`hpbar-fill tone-${tone}`} style={{ width: `${p}%` }} />
      </span>
    </div>
  );
}

export function ExpBar({ progress, label = true }: { progress: number; label?: boolean }) {
  return (
    <div
      className="expbar"
      role="progressbar"
      aria-label="EXP"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {label && <span className="expbar-label">EXP</span>}
      <span className="expbar-track">
        <span className="expbar-fill" style={{ width: `${progress * 100}%` }} />
      </span>
    </div>
  );
}

/** Barra genérica de progresso (rotas, maestria, conquistas). */
export function Bar({
  value,
  max,
  tone = 'gold',
}: {
  value: number;
  max: number;
  tone?: 'gold' | 'exp' | 'grass';
}) {
  return (
    <span
      className={`pbar pbar-${tone}`}
      role="progressbar"
      aria-valuenow={Math.round(pct(value, max))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="pbar-fill" style={{ width: `${pct(value, max)}%` }} />
    </span>
  );
}

/** Janela com moldura pixelada e barra de título opcional. */
export function Window({
  title,
  icon,
  frame = 'menu',
  className = '',
  children,
  actions,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  frame?: 'menu' | 'dialog' | 'dex' | 'card' | 'paper' | 'screen' | 'status';
  className?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className={`window frame frame-${frame} ${className}`}>
      {title && (
        <header className="window-title">
          {icon}
          <h3>{title}</h3>
          {actions && <span className="window-actions">{actions}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

/** "₽ 1.234" com o ícone de moeda. */
export function Money({ value }: { value: number }) {
  return (
    <span className="money">
      <ItemIcon id="amulet-coin" size={24} />
      <PixelIcon name="pokedollar" scale={2} title="Pokédólares" />
      {Math.floor(value).toLocaleString('pt-BR')}
    </span>
  );
}

/**
 * Sprite de treinador (Showdown, estilo FRLG, quadro de 80×80). `head` mostra só
 * busto/rosto ampliado 2×, para caber em placas pequenas como o HUD.
 */
export function TrainerSprite({
  id,
  size = 80,
  head = false,
  className = '',
}: {
  id: string;
  size?: number;
  head?: boolean;
  className?: string;
}) {
  const img = head ? size * 2 : size;
  return (
    <span
      className={`trainer-sprite ${head ? 'head' : ''} ${className}`}
      style={{ width: size, height: head ? size * 0.6 : size }}
    >
      <img
        src={assetUrl(trainerSprite(id))}
        alt=""
        width={img}
        height={img}
        style={head ? { marginLeft: -size / 2, marginTop: -size * 0.16 } : undefined}
        draggable={false}
      />
    </span>
  );
}

export function BadgeIcon({
  id,
  name,
  earned,
  size = 24,
}: {
  id: string;
  name: string;
  earned: boolean;
  size?: number;
}) {
  return (
    <img
      className={`badge-icon ${earned ? '' : 'missing'}`}
      src={assetUrl(badgeSprite(id))}
      width={size}
      height={size}
      alt={name}
      title={earned ? name : `${name} (não obtida)`}
      draggable={false}
    />
  );
}

export function Shiny() {
  return <PixelIcon name="star" scale={1} className="shiny-star" title="Shiny" />;
}
