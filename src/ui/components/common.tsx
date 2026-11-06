// Componentes visuais reutilizáveis: sprites, ícones, molduras, barras e rótulos de tipo.

import { useEffect, useRef, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react';
import { usePerfMode } from '../perfMode';
import {
  PLAYER_AVATARS,
  assetUrl,
  badgeSprite,
  formSprite,
  isMegaForm,
  getItem,
  getSpecies,
  spriteFeet,
  type PlayerAvatar,
  type TrainerOutfit,
} from '../../game-data';
import { TYPE_NAMES, formatNumber } from '../i18n/pt-BR';
import { useTrainerSprite } from '../outfit';
import { spindaPattern, useSpindaSprite } from '../spinda';
import { ICONS, iconSvg, type IconName } from '../theme/icons';

type SpriteKind = 'front' | 'back' | 'icon';

export function PokemonSprite({
  speciesId,
  kind,
  shiny = false,
  className = '',
  silhouette = false,
  pixelScale,
  form,
}: {
  speciesId: number;
  kind: SpriteKind;
  shiny?: boolean;
  className?: string;
  silhouette?: boolean;
  /** Exibe no tamanho natural × escala inteira (pixels uniformes), limitado pela caixa. */
  pixelScale?: number;
  /** Forma alternativa (Unown, Deerling, Castform…). */
  form?: string;
}) {
  const s = getSpecies(speciesId).sprites;
  const formPath = kind === 'icon' ? undefined : formSprite(speciesId, form, kind, shiny);
  // Ícone da Mega (equipe): só existe para as formas Mega.
  const megaIcon =
    kind === 'icon' && isMegaForm(speciesId, form)
      ? `sprites/pokemon/forms/icon/${speciesId}-${form}.png`
      : undefined;
  const path =
    megaIcon ??
    formPath ??
    (kind === 'icon'
      ? s.icon
      : kind === 'front'
        ? (shiny && s.frontShiny) || s.front
        : (shiny && s.backShiny) || s.back);
  const spots = kind === 'icon' ? null : spindaPattern(speciesId, form);
  const src = useSpindaSprite(assetUrl(path), spots, shiny);
  const feet = formPath && kind !== 'icon' ? spriteFeet(speciesId, kind, form) : undefined;
  const size =
    kind !== 'icon' && pixelScale
      ? feet
        ? ([feet[5], feet[6]] as [number, number])
        : getSpecies(speciesId).spriteSize?.[kind]
      : undefined;
  return (
    <SpriteImage
      style={size ? { width: size[0] * pixelScale!, height: size[1] * pixelScale! } : undefined}
      className={`sprite sprite-${kind} ${size ? 'pixel-scaled' : ''} ${silhouette ? 'silhouette' : ''} ${className}`}
      src={src}
      alt={silhouette ? '???' : getSpecies(speciesId).name}
    />
  );
}

/**
 * Sprite de Pokémon. São GIFs animados, de até 271 quadros, e o navegador decodifica e redesenha cada um o tempo todo; no
 * modo Desempenho fica só o primeiro quadro, num canvas (nada mais a decodificar nem a repintar).
 */
export function SpriteImage({
  src,
  alt,
  className,
  style,
  onLoad,
  onError,
}: {
  src?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const perf = usePerfMode();
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!perf || !src) return;
    const image = new Image();
    image.onload = () => {
      const el = canvas.current;
      if (el) {
        el.width = image.naturalWidth;
        el.height = image.naturalHeight;
        el.getContext('2d')?.drawImage(image, 0, 0);
      }
      onLoad?.();
    };
    image.onerror = () => onError?.();
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
    // onLoad e onError mudam a cada render; só importa redesenhar quando o sprite muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perf, src]);
  if (perf) return <canvas ref={canvas} className={className} style={style} role="img" aria-label={alt} />;
  return (
    <img
      className={className}
      style={style}
      src={src}
      alt={alt}
      draggable={false}
      onLoad={onLoad}
      onError={onError}
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
  if (item?.icon && !item.sprite) {
    return (
      <PixelIcon
        name={item.icon.glyph as IconName}
        scale={size / 9}
        palette={{ c: item.icon.color }}
        className={`item-icon ${className}`}
        title={item.name}
      />
    );
  }
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
        <span className="hpbar-lag" style={{ width: `${p}%` }} />
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
      {formatNumber(value)}
    </span>
  );
}

/** Centro da cabeça dos avatares de jogador no quadro de 80×80 (todos alinhados ao Red). */
const AVATAR_HEAD = { x: 39, y: 21 };

/**
 * Sprite de treinador (Showdown, estilo FRLG, quadro de 80×80). `head` mostra só
 * busto/rosto ampliado 2×, para caber em placas pequenas como o HUD; nos avatares de jogador,
 * um busto quadrado que preenche a placa. `outfit` repinta a roupa dos avatares de jogador.
 */
export function TrainerSprite({
  id,
  size = 80,
  head = false,
  className = '',
  outfit,
}: {
  id: string;
  size?: number;
  head?: boolean;
  className?: string;
  outfit?: TrainerOutfit;
}) {
  const src = useTrainerSprite(id, outfit);
  if (head && PLAYER_AVATARS.includes(id as PlayerAvatar)) {
    // Ampliação inteira (pixels iguais); o recorte quadrado fica centrado na cabeça.
    const k = Math.max(1, Math.round(size / 24));
    const half = size / k / 2;
    return (
      <span className={`trainer-sprite head bust ${className}`} style={{ width: size, height: size }}>
        <img
          src={src}
          alt=""
          width={80 * k}
          height={80 * k}
          style={{ marginLeft: -(AVATAR_HEAD.x - half) * k, marginTop: -(AVATAR_HEAD.y - half) * k }}
          draggable={false}
        />
      </span>
    );
  }
  const img = head ? size * 2 : size;
  return (
    <span
      className={`trainer-sprite ${head ? 'head' : ''} ${className}`}
      style={{ width: size, height: head ? size * 0.6 : size }}
    >
      <img
        src={src}
        alt=""
        width={img}
        height={img}
        style={head ? { marginLeft: -size / 2, marginTop: -size * 0.16 } : undefined}
        draggable={false}
      />
    </span>
  );
}

/** O sprite inteiro do treinador numa <img> (chefe na cena de batalha), com a roupa. */
export function TrainerImage({
  id,
  outfit,
  ...rest
}: { id: string; outfit?: TrainerOutfit } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'id' | 'src'>) {
  return <img src={useTrainerSprite(id, outfit)} draggable={false} {...rest} />;
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

/** ♂ azul / ♀ vermelho (nada para espécies sem gênero). */
export function GenderMark({ gender }: { gender: 'm' | 'f' | null | undefined }) {
  if (!gender) return null;
  return (
    <span className={`gender gender-${gender}`} title={gender === 'm' ? 'Macho' : 'Fêmea'}>
      {gender === 'm' ? '♂' : '♀'}
    </span>
  );
}

export function Shiny() {
  return <PixelIcon name="star" scale={1} className="shiny-star" title="Shiny" />;
}
